import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTelnyxWebhookSignature } from "@/lib/telnyx.server";
import { sendTelnyxSms } from "@/lib/telnyxProvisioning.server";
import { sendExternalEmail } from "@/lib/email.server";

/**
 * PHASE 0 SPIKE - Telnyx AI Assistant webhook tool: `escalate`, called
 * when the AI can't handle something itself (per the business's own
 * free-text escalation_rules). Notifies the owner by email (real
 * capability already in this codebase - sendExternalEmail via Resend,
 * same integration daily-brief.ts and the contact form already use) and
 * by SMS when possible. SMS added second: the real text-back SMS path
 * and this one both call sendTelnyxSms with no messaging_profile_id in
 * the request - Telnyx resolves the profile purely from the `from`
 * number's own assignment, so there's no way for this code path to hit a
 * different profile than production text-back does. Switched to
 * email-primary because the test number's A2P 10DLC campaign isn't
 * registered yet (a real account/business step, not a code fix) and SMS
 * delivery through an unregistered campaign is commonly filtered by
 * carriers even when Telnyx's API accepts the send.
 *
 * profiles has no email column - the owner's email comes from Supabase
 * Auth directly (supabaseAdmin.auth.admin.getUserById), same lookup
 * daily-brief.ts already uses for its own email channel.
 *
 * RESEND_API_KEY must be configured for email to actually send -
 * sendEmail silently no-ops and logs if it's missing (see
 * email.server.ts) rather than erroring, so a missing key produces no
 * visible failure here, just no email. Not confirmed set for the Preview
 * environment specifically - same category of unknown as every other env
 * var this session, worth checking if the next test doesn't land.
 *
 * Only real model-supplied param is `reason`. business_user_id and
 * caller_phone come from voice_ai_call_context, looked up by the
 * call_control_id Telnyx sends in the x-telnyx-call-control-id request
 * header - same mechanism as book-appointment.ts, see that file's header
 * comment for why (the dashboard has no clear way to bind a fixed value
 * into a Body Parameter, so this sidesteps needing one at all).
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

          // PHASE 0: always log the raw payload and the call-control header -
          // remove once the real shape is confirmed.
          const callControlIdHeader = request.headers.get("x-telnyx-call-control-id");
          console.log(
            "[telnyx/voice-ai/escalate] raw payload",
            JSON.stringify(body),
            "x-telnyx-call-control-id:",
            callControlIdHeader,
          );

          const reason =
            typeof body.reason === "string" && body.reason.trim()
              ? body.reason.trim()
              : "no reason given";

          // Fall back to a call_control_id in the body defensively, same
          // reasoning as book-appointment.ts.
          const callControlId =
            callControlIdHeader ||
            (typeof body.call_control_id === "string" ? body.call_control_id : "");
          if (!callControlId) {
            console.error("[telnyx/voice-ai/escalate] no call_control_id in header or body");
            return ACK({ status: "error", message: "Missing call context." }, 400);
          }

          const { data: callContext, error: contextError } = await supabaseAdmin
            .from("voice_ai_call_context")
            .select("business_user_id, caller_phone")
            .eq("call_control_id", callControlId)
            .maybeSingle();

          if (contextError || !callContext) {
            console.error(
              "[telnyx/voice-ai/escalate] no call context found for",
              callControlId,
              contextError,
            );
            return ACK({ status: "error", message: "Missing business context." }, 400);
          }

          const businessUserId = callContext.business_user_id;
          const callerPhone = callContext.caller_phone || "";

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

          // profiles has no email column - pulled from Supabase Auth
          // directly, same lookup daily-brief.ts already uses.
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(businessUserId);
          const ownerEmail = authUser?.user?.email || null;

          const notifyText = `Lanavix: a caller on your live AI line needs a human. Reason: ${reason}. Caller: ${callerPhone || "unknown number"}.`;

          let notified = false;

          if (ownerEmail) {
            // sendExternalEmail never throws and returns void (best-
            // effort by design, see email.server.ts) - there's no success
            // signal to check, so this marks notified optimistically the
            // same way daily-brief.ts's own email channel does.
            await sendExternalEmail(
              ownerEmail,
              "Urgent: a caller needs you - Lanavix AI line",
              notifyText,
            );
            notified = true;
          } else {
            console.warn("[telnyx/voice-ai/escalate] business has no email on file");
          }

          if (profile.owner_phone && profile.telnyx_number) {
            const sendResult = await sendTelnyxSms(
              profile.telnyx_number,
              profile.owner_phone,
              notifyText,
            );
            if (sendResult.ok) {
              notified = true;
            } else {
              console.error("[telnyx/voice-ai/escalate] owner SMS send failed", sendResult.error);
            }
          } else {
            console.warn(
              "[telnyx/voice-ai/escalate] business has no owner_phone or telnyx_number configured",
            );
          }

          if (!notified) {
            return ACK({
              status: "no_notification_configured",
              message: "Take a detailed message - no one can be reached automatically right now.",
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
