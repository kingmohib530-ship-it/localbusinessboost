import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTelnyxWebhookSignature } from "@/lib/telnyx.server";
import { sendTelnyxSms } from "@/lib/telnyxProvisioning.server";

/**
 * PHASE 0 SPIKE - not wired to any real call yet. Telnyx AI Assistant
 * webhook tool: `escalate`, called when the AI can't handle something
 * itself (per the business's own free-text escalation_rules). Notifies
 * the owner by SMS - reuses profile.owner_phone and sendTelnyxSms, both
 * already in production for other flows.
 *
 * Deliberately does not write a `conversations` row: conversations.channel
 * only allows 'sms' | 'web_chat' today (checked against the live DB
 * constraint), no 'voice_ai' value exists yet. Widening that, and giving
 * escalations a real place in the dashboard, is Phase 1 scope - this spike
 * only proves the notification path works.
 */

const ACK = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/telnyx/voice-ai/escalate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const isValid = await verifyTelnyxWebhookSignature(request, rawBody);
          if (!isValid) {
            console.warn("[telnyx/voice-ai/escalate] invalid signature");
            return new Response("Forbidden", { status: 403 });
          }

          let body: Record<string, unknown> = {};
          try {
            body = JSON.parse(rawBody || "{}");
          } catch {
            console.error("[telnyx/voice-ai/escalate] non-JSON body", rawBody);
            return ACK({ status: "error", message: "Could not read the request." }, 400);
          }

          // PHASE 0: always log the raw payload - remove once the real
          // shape is confirmed.
          console.log("[telnyx/voice-ai/escalate] raw payload", JSON.stringify(body));

          const businessUserId =
            typeof body.business_user_id === "string" ? body.business_user_id : "";
          const callerPhone = typeof body.caller_phone === "string" ? body.caller_phone : "";
          const reason =
            typeof body.reason === "string" && body.reason.trim()
              ? body.reason.trim()
              : "no reason given";

          if (!businessUserId) {
            console.error("[telnyx/voice-ai/escalate] missing business_user_id");
            return ACK({ status: "error", message: "Missing business context." }, 400);
          }

          const { data: profile, error } = await supabaseAdmin
            .from("profiles")
            .select("business_name, owner_phone, telnyx_number")
            .eq("id", businessUserId)
            .maybeSingle();

          if (error || !profile) {
            console.error("[telnyx/voice-ai/escalate] profile lookup failed", error);
            return ACK({
              status: "error",
              message: "Could not reach the business - take a detailed message instead.",
            });
          }

          if (!profile.owner_phone || !profile.telnyx_number) {
            console.warn(
              "[telnyx/voice-ai/escalate] business has no owner_phone or telnyx_number configured",
            );
            return ACK({
              status: "no_notification_configured",
              message: "Take a detailed message - no one can be reached automatically right now.",
            });
          }

          const notifyText = `Lanavix: a caller on your live AI line needs a human. Reason: ${reason}. Caller: ${callerPhone || "unknown number"}.`;
          const sendResult = await sendTelnyxSms(
            profile.telnyx_number,
            profile.owner_phone,
            notifyText,
          );

          if (!sendResult.ok) {
            console.error("[telnyx/voice-ai/escalate] owner notification failed", sendResult.error);
            return ACK({
              status: "error",
              message: "Could not notify the business right now - take a detailed message.",
            });
          }

          return ACK({
            status: "success",
            escalated: true,
            message: "The business has been notified and will follow up.",
          });
        } catch (err) {
          console.error("[telnyx/voice-ai/escalate]", err);
          return ACK({ status: "error", message: "Something went wrong escalating this." }, 500);
        }
      },
    },
  },
});
