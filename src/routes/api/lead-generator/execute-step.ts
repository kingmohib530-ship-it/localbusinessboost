import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadBusinessTelnyxNumber, sendTelnyxSms } from "@/lib/telnyxProvisioning.server";
import type { Json } from "@/integrations/supabase/types";

const AUTH_ERROR = "Authentication required. Please sign in.";

interface OutreachEntry {
  channel: string;
  sent_at: string;
  message: string;
  response: string | null;
}

export const Route = createFileRoute("/api/lead-generator/execute-step")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const user = userData.user;

          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_rate_limit", {
            p_user_id: user.id,
            p_route: "lead-generator-execute-step",
            p_max_requests: 60,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json(
              { error: "Too many requests. Please wait a bit and try again." },
              { status: 429 },
            );
          }

          const { lead_id, step_id } = await request.json();
          if (!lead_id || !step_id) {
            return Response.json({ error: "lead_id and step_id are required" }, { status: 400 });
          }

          // Verify the lead belongs to the authenticated user before doing
          // anything else — step_id alone doesn't prove ownership.
          const { data: lead, error: leadErr } = await supabaseAdmin
            .from("lead_profiles")
            .select("*")
            .eq("id", lead_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (leadErr || !lead) {
            return Response.json({ error: "Lead not found" }, { status: 404 });
          }

          const { data: stepExists, error: stepErr } = await supabaseAdmin
            .from("lead_sequences")
            .select("id")
            .eq("id", step_id)
            .eq("lead_id", lead_id)
            .maybeSingle();
          if (stepErr || !stepExists) {
            return Response.json({ error: "Sequence step not found" }, { status: 404 });
          }

          // Atomic claim: flips pending -> sending only if it's still
          // pending, so two concurrent calls for the same step can't both
          // pass the status check and both fire the Telnyx send.
          const { data: step, error: claimErr } = await supabaseAdmin
            .from("lead_sequences")
            .update({ status: "sending" })
            .eq("id", step_id)
            .eq("lead_id", lead_id)
            .eq("status", "pending")
            .select("*")
            .maybeSingle();
          if (claimErr) {
            return Response.json(
              { error: "Something went wrong. Please try again." },
              { status: 500 },
            );
          }
          if (!step) {
            return Response.json(
              { error: "Step is already in progress or completed" },
              { status: 409 },
            );
          }

          let sendError: string | null = null;

          if (step.channel === "sms") {
            if (!lead.phone) {
              return Response.json(
                { error: "This lead has no phone number on file" },
                { status: 400 },
              );
            }
            const telnyxNumber = await loadBusinessTelnyxNumber(user.id);
            if (!telnyxNumber) {
              return Response.json(
                {
                  error: "Set up your phone number in Receptionist Setup before sending outreach.",
                },
                { status: 400 },
              );
            }

            const sendResult = await sendTelnyxSms(telnyxNumber, lead.phone, step.message_template);
            if (!sendResult.ok) {
              sendError = sendResult.error;
            }
          } else {
            // sendExternalEmail (email.server.ts) now exists for transactional
            // mail (audit reports, contact form), but cold outbound lead
            // sequences are a different call - deliverability/compliance
            // (CAN-SPAM, sender reputation) needs a deliberate decision
            // before this sends real email. voicemail_drop and linkedin have
            // no integration at all. None of the three can actually send
            // yet, so the step is left unsent rather than logged and marked
            // "sent" as if it went out.
            sendError = `${step.channel} outreach isn't wired up to send yet.`;
          }

          if (sendError) {
            await supabaseAdmin
              .from("lead_sequences")
              .update({ status: "failed" })
              .eq("id", step_id);
            const status = step.channel === "sms" ? 502 : 501;
            return Response.json(
              { error: step.channel === "sms" ? `Failed to send: ${sendError}` : sendError },
              { status },
            );
          }

          const now = new Date().toISOString();
          await supabaseAdmin
            .from("lead_sequences")
            .update({ status: "sent", sent_at: now })
            .eq("id", step_id);

          const outreachEntry: OutreachEntry = {
            channel: step.channel,
            sent_at: now,
            message: step.message_template,
            response: null,
          };
          const history = Array.isArray(lead.outreach_history) ? lead.outreach_history : [];
          const updatedHistory = [...history, outreachEntry] as unknown as Json;

          await supabaseAdmin
            .from("lead_profiles")
            .update({
              outreach_history: updatedHistory,
              status: lead.status === "new" ? "contacted" : lead.status,
              updated_at: now,
            })
            .eq("id", lead_id);

          return Response.json({ success: true, sentAt: now });
        } catch (err) {
          console.error("[lead-generator/execute-step]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
