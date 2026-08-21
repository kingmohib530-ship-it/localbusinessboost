import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadBusinessTelnyxNumber, sendTelnyxSms } from "@/lib/telnyxProvisioning.server";
import { checkReviewRequestQuota, checkSmsHourlyRateLimit } from "@/lib/planLimits.server";

// Same constant-time comparison approach as the other cron routes and
// verifyWebhook in stripe.server.ts - a naive `===` on the cron secret
// short-circuits on the first mismatched byte.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

const MAX_PER_RUN = 200;

// Same 30-day review-opportunity window Jobs/Coach already use for "did
// this job recently finish" - reused here so a first deployment never
// mass-texts every completed job in the account's history. appointments
// has no completed_at column, and updated_at is bumped by ANY edit (notes,
// value, a status flip unrelated to completion), so an old job touched
// today would wrongly look eligible - scheduled_at is the real job-time
// field that isn't affected by later, unrelated edits.
const ELIGIBILITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// How long a "pending" claim can sit unfinished before a later run is
// allowed to treat it as abandoned (crashed/timed-out mid-send) rather
// than actively in flight. Generous relative to a single serverless
// invocation's real duration, short relative to the 30-day eligibility
// window, so a genuinely stuck job doesn't wait long for a chance to
// recover, but two truly concurrent runs can never both see a fresh claim
// as stale.
const STALE_PENDING_MS = 15 * 60 * 1000;

// Postgres error code for a unique_violation - review_requests_appointment_id_key
// (a partial unique index on appointment_id) is what actually stops two
// overlapping runs from both texting the same completed job on a first
// attempt. Retries of an existing row go through a conditional UPDATE
// instead (see reclaim logic below), guarded the same way
// quote-follow-ups.ts's atomic step claim is: an update only succeeds if
// the row is still in the state we expect it to be in.
const UNIQUE_VIOLATION = "23505";

interface CompletedAppointment {
  id: string;
  user_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  service_type: string | null;
  status: string;
}

interface ExistingReviewRequest {
  id: string;
  appointment_id: string | null;
  status: string | null;
  claimed_at: string | null;
  send_attempted_at: string | null;
}

function buildMessage(customerName: string | null, serviceType: string | null): string {
  const nameStr = customerName ? `, ${customerName.split(" ")[0]}` : "";
  const jobStr = serviceType ? ` for your ${serviceType.toLowerCase()}` : "";
  const reviewLink = "https://search.google.com/local/reviews";
  return `Hi${nameStr}! Thanks for choosing us${jobStr} — we hope everything went smoothly! If you have a moment, an honest Google review means the world to a small business: ${reviewLink} 🙏\n\nManaged by Lanavix`;
}

export const Route = createFileRoute("/api/cron/review-requests")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization") || "";
        const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
        if (!process.env.CRON_SECRET || !timingSafeEqualStr(authHeader, expected)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let sent = 0;
        let skipped = 0;
        let failed = 0;

        try {
          const cutoffIso = new Date(Date.now() - ELIGIBILITY_WINDOW_MS).toISOString();
          const staleCutoffIso = new Date(Date.now() - STALE_PENDING_MS).toISOString();

          // Never invent a phone number to text - customer_phone must be a
          // real value already on the appointment, only a job actually
          // marked completed (never cancelled/no_show) is eligible at all,
          // and it must have happened recently - not every completed job
          // this business has ever had.
          const { data: candidates, error: candErr } = await supabaseAdmin
            .from("appointments")
            .select("id, user_id, customer_name, customer_phone, service_type, status")
            .eq("status", "completed")
            .not("customer_phone", "is", null)
            .gte("scheduled_at", cutoffIso)
            .order("scheduled_at", { ascending: true })
            .limit(MAX_PER_RUN);

          if (candErr) {
            console.error("[cron/review-requests] failed to load completed appointments", candErr);
            return Response.json(
              { error: "Failed to load completed appointments" },
              { status: 500 },
            );
          }

          const appts = (candidates || []) as CompletedAppointment[];
          if (appts.length === 0) {
            return Response.json({ sent, skipped, failed });
          }

          // One batched lookup instead of a query per appointment - status
          // and claimed_at decide whether each one is untouched, terminal,
          // or a candidate for reclaim.
          const apptIds = appts.map((a) => a.id);
          const { data: existingRows } = await supabaseAdmin
            .from("review_requests")
            .select("id, appointment_id, status, claimed_at, send_attempted_at")
            .in("appointment_id", apptIds);
          const existingByAppt = new Map<string, ExistingReviewRequest>();
          for (const r of (existingRows || []) as ExistingReviewRequest[]) {
            if (r.appointment_id) existingByAppt.set(r.appointment_id, r);
          }

          for (const appt of appts) {
            if (appt.status !== "completed" || !appt.customer_phone) continue;

            const existing = existingByAppt.get(appt.id) ?? null;
            let claimedId: string;

            if (!existing) {
              // First attempt for this job - the unique index is the only
              // thing standing between two overlapping runs both claiming
              // it for the first time.
              const { data: inserted, error: insertErr } = await supabaseAdmin
                .from("review_requests")
                .insert({
                  user_id: appt.user_id,
                  appointment_id: appt.id,
                  customer_name: appt.customer_name,
                  customer_phone: appt.customer_phone,
                  job_description: appt.service_type,
                  status: "pending",
                  sent_at: null,
                  claimed_at: new Date().toISOString(),
                  send_attempted_at: null,
                })
                .select("id")
                .single();
              if (insertErr) {
                if (insertErr.code === UNIQUE_VIOLATION) {
                  skipped++;
                } else {
                  console.error("[cron/review-requests] failed to claim appointment", insertErr);
                }
                continue;
              }
              claimedId = inserted.id;
            } else if (existing.status === "sent") {
              // Terminal - never resend once a text has actually gone out.
              skipped++;
              continue;
            } else if (existing.status === "failed") {
              // A confirmed failure (quota/number missing, or Telnyx
              // explicitly rejected the send) is safe to retry on any
              // later run - compare-and-swap on status so only one
              // concurrent run can win the reclaim. send_attempted_at
              // resets to null so this fresh attempt gets its own honest
              // record of whether it ever reached the actual Telnyx call.
              const { data: reclaimed } = await supabaseAdmin
                .from("review_requests")
                .update({
                  status: "pending",
                  claimed_at: new Date().toISOString(),
                  sent_at: null,
                  send_attempted_at: null,
                })
                .eq("id", existing.id)
                .eq("status", "failed")
                .select("id")
                .maybeSingle();
              if (!reclaimed) {
                skipped++;
                continue;
              }
              claimedId = reclaimed.id;
            } else {
              // pending - normally means another run is actively working
              // it right now, so leave it alone. Only reclaim if its own
              // claimed_at is old enough that it can only be an abandoned
              // claim from an interrupted prior run, AND send_attempted_at
              // is still null - meaning whatever crashed did so before
              // Telnyx was ever contacted. A pending row where Telnyx *was*
              // already attempted is never auto-reclaimed here, since we
              // have no way to know whether that attempt actually went
              // through - the only way that request is retried is a human
              // sending manually from Jobs/Reviews. The reclaim itself is
              // still a conditional update (status/claimed_at/send_attempted_at
              // must all still match what we just read) so two runs racing
              // to reclaim the same stale row still can't both win.
              const { data: reclaimed } = await supabaseAdmin
                .from("review_requests")
                .update({ claimed_at: new Date().toISOString() })
                .eq("id", existing.id)
                .eq("status", "pending")
                .lt("claimed_at", staleCutoffIso)
                .is("send_attempted_at", null)
                .select("id")
                .maybeSingle();
              if (!reclaimed) {
                skipped++;
                continue;
              }
              claimedId = reclaimed.id;
            }

            const [telnyxNumber, quota, hourlyOk] = await Promise.all([
              loadBusinessTelnyxNumber(appt.user_id),
              checkReviewRequestQuota(appt.user_id),
              checkSmsHourlyRateLimit(appt.user_id),
            ]);

            if (!telnyxNumber || !quota.allowed || !hourlyOk.allowed) {
              // A temporary blocker (no active plan, no number provisioned
              // yet) shouldn't kill this job's automation forever - marking
              // it "failed" rather than leaving it silently untouched is
              // what makes it eligible for the reclaim path above the next
              // time the plan/number situation has changed.
              await supabaseAdmin
                .from("review_requests")
                .update({ status: "failed" })
                .eq("id", claimedId);
              failed++;
              continue;
            }

            const message = buildMessage(appt.customer_name, appt.service_type);

            // Persisted before the actual network call, not just held in
            // memory - if the process dies mid-send, the stale-pending
            // reclaim above sees this set and permanently refuses to
            // auto-retry, since we'd have no way to know whether Telnyx
            // already sent the text.
            await supabaseAdmin
              .from("review_requests")
              .update({ send_attempted_at: new Date().toISOString() })
              .eq("id", claimedId);

            let sendResult: { ok: true } | { ok: false; error: string };
            try {
              sendResult = await sendTelnyxSms(telnyxNumber, appt.customer_phone, message);
            } catch (err) {
              // Ambiguous: the request may have reached Telnyx and gone
              // out before the network call itself failed. Deliberately
              // left "pending" with send_attempted_at already set, which
              // is now permanently outside the stale-pending reclaim's
              // `send_attempted_at IS NULL` guard - this job will not be
              // auto-retried again. A human can still send manually.
              console.error("[cron/review-requests] Telnyx send threw (ambiguous)", err);
              continue;
            }

            if (!sendResult.ok) {
              // A confirmed rejection from Telnyx (a real error response,
              // not a network failure) is unambiguous - safe to mark
              // failed and retry later.
              console.error("[cron/review-requests] Telnyx send failed", sendResult.error);
              await supabaseAdmin
                .from("review_requests")
                .update({ status: "failed" })
                .eq("id", claimedId);
              failed++;
              continue;
            }

            await supabaseAdmin
              .from("review_requests")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", claimedId);
            sent++;
          }

          return Response.json({ sent, skipped, failed });
        } catch (err) {
          console.error("[cron/review-requests]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
