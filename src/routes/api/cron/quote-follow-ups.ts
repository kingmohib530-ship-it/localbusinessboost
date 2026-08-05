import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadBusinessTwilioCredentials } from "@/lib/twilioCredentials.server";
import { checkSmsQuota, checkSmsHourlyRateLimit } from "@/lib/planLimits.server";
import { SERVICE_TYPE_LABELS, type ServiceTypeKey } from "@/lib/serviceTypes";

// Same constant-time comparison approach as verifyWebhook in
// stripe.server.ts and verifyTwilioRequestWithToken in twilio.server.ts - a
// naive `===` on the cron secret short-circuits on the first mismatched
// byte.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Runs once a day (see vercel.json), so a step scheduled_for any time
// today or earlier is due - no need for hour-level precision on a
// day-granularity feature.
const MAX_STEPS_PER_RUN = 200;

const MESSAGE_BY_DAY: Record<
  number,
  { withPrice: (service: string, price: number) => string; noPrice: (service: string) => string }
> = {
  1: {
    withPrice: (service, price) =>
      `quick follow-up on the $${price} estimate for your ${service}. Any questions I can answer before you decide?`,
    noPrice: (service) => `following up on the estimate we gave for your ${service}. Any questions before you decide?`,
  },
  5: {
    withPrice: (service, price) =>
      `checking back on your ${service} quote ($${price}). Want to get it on the schedule, or is timing still up in the air?`,
    noPrice: (service) => `checking back on your ${service} estimate. Want to get it scheduled, or still deciding?`,
  },
  14: {
    withPrice: (service, price) =>
      `it's been a couple weeks since we quoted your ${service} at $${price}. Still want that done? Happy to take another look if anything's changed.`,
    noPrice: (service) =>
      `it's been a couple weeks since we gave you an estimate for your ${service}. Still interested? Happy to take another look.`,
  },
};

// HVAC labels already carry the acronym capitalized correctly; every other
// label is a single capitalized word that reads better lowercase mid-sentence
// ("your plumbing" rather than "your Plumbing").
function lowerServiceLabel(label: string): string {
  return label.startsWith("HVAC") ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

function serviceLabelFor(serviceType: string | null): string {
  if (!serviceType) return "service";
  const label = SERVICE_TYPE_LABELS[serviceType as ServiceTypeKey];
  return label ? lowerServiceLabel(label) : "service";
}

function buildMessage(
  dayOffset: number,
  customerName: string | null,
  serviceType: string | null,
  quotedPrice: number | null,
): string {
  const greeting = customerName ? `Hi ${customerName}, ` : "Hi there, ";
  const serviceLabel = serviceLabelFor(serviceType);
  const templates = MESSAGE_BY_DAY[dayOffset];
  const body = quotedPrice != null ? templates.withPrice(serviceLabel, quotedPrice) : templates.noPrice(serviceLabel);
  return greeting + body;
}

interface DueStep {
  id: string;
  follow_up_id: string;
  day_offset: number;
  quote_follow_ups: {
    id: string;
    user_id: string;
    conversation_id: string;
    service_type: string | null;
    quoted_price: number | null;
    quoted_at: string;
    status: string;
  } | null;
}

export const Route = createFileRoute("/api/cron/quote-follow-ups")({
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
          const { data: dueSteps, error: dueErr } = await supabaseAdmin
            .from("quote_follow_up_steps")
            .select("id, follow_up_id, day_offset, quote_follow_ups(id, user_id, conversation_id, service_type, quoted_price, quoted_at, status)")
            .eq("status", "pending")
            .lte("scheduled_for", new Date().toISOString())
            .limit(MAX_STEPS_PER_RUN);

          if (dueErr) {
            console.error("[cron/quote-follow-ups] failed to load due steps", dueErr);
            return Response.json({ error: "Failed to load due steps" }, { status: 500 });
          }

          for (const step of (dueSteps || []) as unknown as DueStep[]) {
            const followUp = step.quote_follow_ups;
            if (!followUp || followUp.status !== "active") continue;

            // Atomic claim, same pending -> sending flip execute-step.ts
            // uses, so a step can't get processed twice.
            const { data: claimed } = await supabaseAdmin
              .from("quote_follow_up_steps")
              .update({ status: "sending" })
              .eq("id", step.id)
              .eq("status", "pending")
              .select("id")
              .maybeSingle();
            if (!claimed) continue;

            const { data: conversation } = await supabaseAdmin
              .from("conversations")
              .select("customer_identifier, customer_name")
              .eq("id", followUp.conversation_id)
              .maybeSingle();
            if (!conversation) {
              await supabaseAdmin.from("quote_follow_up_steps").update({ status: "failed" }).eq("id", step.id);
              failed++;
              continue;
            }

            // If the customer has replied again since the quote, they're
            // already re-engaged in a live conversation - don't talk over
            // it with an automated nudge.
            const { data: lastInbound } = await supabaseAdmin
              .from("conversation_messages")
              .select("sent_at")
              .eq("conversation_id", followUp.conversation_id)
              .eq("direction", "inbound")
              .order("sent_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (lastInbound && new Date(lastInbound.sent_at) > new Date(followUp.quoted_at)) {
              await supabaseAdmin.from("quote_follow_up_steps").update({ status: "skipped" }).eq("id", step.id);
              skipped++;
              continue;
            }

            const [credentials, quota, hourlyOk] = await Promise.all([
              loadBusinessTwilioCredentials(followUp.user_id),
              checkSmsQuota(followUp.user_id),
              checkSmsHourlyRateLimit(followUp.user_id),
            ]);

            if (!credentials || !quota.allowed || !hourlyOk.allowed) {
              await supabaseAdmin.from("quote_follow_up_steps").update({ status: "failed" }).eq("id", step.id);
              failed++;
              continue;
            }

            const message = buildMessage(
              step.day_offset,
              conversation.customer_name,
              followUp.service_type,
              followUp.quoted_price,
            );

            const twilioRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`,
                },
                body: new URLSearchParams({
                  From: credentials.phoneNumber,
                  To: conversation.customer_identifier,
                  Body: message,
                }).toString(),
              },
            );

            if (!twilioRes.ok) {
              const twilioErr = await twilioRes.text();
              console.error("[cron/quote-follow-ups] Twilio send failed", twilioErr);
              await supabaseAdmin.from("quote_follow_up_steps").update({ status: "failed" }).eq("id", step.id);
              failed++;
              continue;
            }

            const now = new Date().toISOString();
            await supabaseAdmin
              .from("quote_follow_up_steps")
              .update({ status: "sent", sent_at: now, sent_message: message })
              .eq("id", step.id);

            await supabaseAdmin.from("conversation_messages").insert({
              conversation_id: followUp.conversation_id,
              user_id: followUp.user_id,
              direction: "outbound",
              message,
              sent_at: now,
            });
            await supabaseAdmin
              .from("conversations")
              .update({ last_message_at: now })
              .eq("id", followUp.conversation_id);

            sent++;
          }

          return Response.json({ sent, skipped, failed });
        } catch (err) {
          console.error("[cron/quote-follow-ups]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
