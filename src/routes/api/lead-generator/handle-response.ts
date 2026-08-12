import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTelnyxWebhookSignature } from "@/lib/telnyx.server";
import { findBusinessByTelnyxNumber, sendTelnyxSms } from "@/lib/telnyxProvisioning.server";
import { classifyLeadResponse, syncLeadStatusToMonday } from "@/lib/leadGenerator.server";
import type { Json } from "@/integrations/supabase/types";

// No synchronous reply-in-response mechanism on Telnyx's inbound message
// webhook - a bare 2xx acknowledgment is all it wants (same as sms-inbound.ts).
const ACK = () => new Response(null, { status: 200 });

const STATUS_BY_CLASSIFICATION: Record<string, string> = {
  interested: "responded",
  asked_question: "responded",
  needs_time: "nurture",
  not_interested: "dead",
  stop: "dead",
  wrong_number: "dead",
};

export const Route = createFileRoute("/api/lead-generator/handle-response")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const isValid = await verifyTelnyxWebhookSignature(request, rawBody);
          if (!isValid) {
            console.warn("[lead-generator/handle-response] invalid signature");
            return new Response("Forbidden", { status: 403 });
          }

          const parsed = JSON.parse(rawBody || "{}");
          const eventType: string | undefined = parsed?.data?.event_type;
          if (eventType !== "message.received") {
            return ACK();
          }
          const payload = parsed?.data?.payload || {};
          const from: string = payload.from?.phone_number || "";
          const to: string = payload.to?.[0]?.phone_number || "";
          const body: string = payload.text || "";

          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_anon_rate_limit", {
            p_ip_address: from,
            p_route: "lead-generator-handle-response",
            p_max_requests: 20,
            p_window_seconds: 3600,
          });
          if (rlErr || !allowed) {
            return ACK();
          }

          // Which business's outbound Telnyx number received this reply.
          // Scopes the lead search to that business's own leads rather
          // than matching phone alone. No credentials to fetch here -
          // one platform Telnyx account sends/verifies for every business.
          const business = await findBusinessByTelnyxNumber(to);
          if (!business) {
            await supabaseAdmin.from("unmatched_telnyx_webhooks").insert({
              route: "lead-generator-handle-response",
              to_number: to,
              from_number: from,
            });
            return ACK();
          }

          const { data: lead } = await supabaseAdmin
            .from("lead_profiles")
            .select("*")
            .eq("user_id", business.userId)
            .eq("phone", from)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!lead) {
            return ACK();
          }

          const anthropicKey = process.env.ANTHROPIC_API_KEY;
          const classification = anthropicKey
            ? await classifyLeadResponse(anthropicKey, body)
            : "asked_question";

          const now = new Date().toISOString();
          const history = Array.isArray(lead.outreach_history) ? [...lead.outreach_history] : [];
          if (history.length > 0) {
            const last = history[history.length - 1] as Record<string, unknown>;
            if (last && last.response === null) {
              last.response = body;
            } else {
              history.push({ channel: "sms", sent_at: now, message: "", response: body });
            }
          } else {
            history.push({ channel: "sms", sent_at: now, message: "", response: body });
          }

          const newStatus: string =
            STATUS_BY_CLASSIFICATION[classification] || lead.status || "new";

          await supabaseAdmin
            .from("lead_profiles")
            .update({
              outreach_history: history as unknown as Json,
              status: newStatus,
              updated_at: now,
            })
            .eq("id", lead.id);

          if (lead.monday_item_id) {
            await syncLeadStatusToMonday(lead.monday_item_id, newStatus, lead.priority || "warm");
          }

          // No calendar/booking-link integration exists in this codebase —
          // rather than fabricate one, an "interested" reply gets an
          // automatic follow-up SMS asking for availability directly.
          if (classification === "interested") {
            const followUp = "Great! What day/time works best this week for a quick call?";
            const sendResult = await sendTelnyxSms(to, from, followUp);
            if (!sendResult.ok) {
              console.error(
                "[lead-generator/handle-response] follow-up send failed",
                sendResult.error,
              );
            }
          }

          return ACK();
        } catch (err) {
          console.error("[lead-generator/handle-response]", err);
          return ACK();
        }
      },
    },
  },
});
