import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTelnyxWebhookSignature } from "@/lib/telnyx.server";
import {
  findBusinessByTelnyxNumber,
  sendTelnyxSms,
  hangupTelnyxCall,
  answerCallWithAiAssistant,
} from "@/lib/telnyxProvisioning.server";
import { checkSmsQuota, checkSmsHourlyRateLimit } from "@/lib/planLimits.server";

const ACK = () => new Response(null, { status: 200 });

// PHASE 0 SPIKE: one hardcoded test business/number gets routed to the
// Telnyx AI Assistant instead of the text-back flow below - see the Voice
// AI investigation. Not a real per-business toggle; remove once Phase 1
// replaces this with a real profiles column.
const PHASE_0_VOICE_AI_TEST_USER_ID = "c9af73d5-e5c6-43de-8a5f-f631aca92726";
const PHASE_0_VOICE_AI_ASSISTANT_ID = "assistant-dadbacf1-334d-411d-8227-bd05f9e9c354";

/**
 * Telnyx Call Control webhook for the one Connection every provisioned
 * number is linked to. Fires on every call.* event; only call.initiated
 * does real work here - a call landing on a Lanavix-owned number already
 * means the business's real phone missed it (customers only reach this
 * number via *conditional* forwarding, see PhoneForwardingSetup.tsx), so
 * there's no separate terminal status to wait for the way Twilio's
 * CallStatus worked.
 *
 * Telnyx's Call Control API is command-driven, not synchronous-markup-
 * in-response like Vonage's NCCO - after firing the text-back this
 * issues an explicit hangup command on the call rather than leaving it
 * to ring out, for a predictable caller experience.
 */
export const Route = createFileRoute("/api/telnyx/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const isValid = await verifyTelnyxWebhookSignature(request, rawBody);
          if (!isValid) {
            console.warn("[telnyx/voice] invalid signature");
            return new Response("Forbidden", { status: 403 });
          }

          const body = JSON.parse(rawBody || "{}");
          const eventType: string | undefined = body?.data?.event_type;
          if (eventType !== "call.initiated") {
            return ACK();
          }

          const payload = body?.data?.payload || {};
          const callControlId: string | undefined = payload.call_control_id;
          const callerPhone: string = payload.from || "";
          const calledNumber: string = payload.to || "";

          async function endCall() {
            if (callControlId) await hangupTelnyxCall(callControlId);
          }

          // Cap by caller phone number before doing any lookup or write -
          // bounds abuse from a forged/looping caller regardless of
          // whether their "to" number matches a real business.
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_anon_rate_limit", {
            p_ip_address: callerPhone,
            p_route: "telnyx-voice",
            p_max_requests: 5,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[telnyx/voice] rate limit check failed");
            await endCall();
            return ACK();
          }
          if (!allowed) {
            await endCall();
            return ACK();
          }

          const business = await findBusinessByTelnyxNumber(calledNumber);
          if (!business) {
            await supabaseAdmin.from("unmatched_telnyx_webhooks").insert({
              route: "voice",
              to_number: calledNumber,
              from_number: callerPhone,
            });
            await endCall();
            return ACK();
          }

          // PHASE 0 SPIKE: bypass text-back entirely for the one hardcoded
          // test business - answer the call and hand it straight to the
          // Assistant in one command instead.
          if (business.userId === PHASE_0_VOICE_AI_TEST_USER_ID) {
            if (callControlId) {
              const result = await answerCallWithAiAssistant(
                callControlId,
                PHASE_0_VOICE_AI_ASSISTANT_ID,
              );
              if (!result.ok) {
                console.error("[telnyx/voice] phase-0 AI assistant answer failed", result.error);
                await endCall();
              }
            }
            return ACK();
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, business_name, industry, greeting_message")
            .eq("id", business.userId)
            .maybeSingle();

          if (!profile) {
            await endCall();
            return ACK();
          }

          // Save the call as a new conversation, status "received" — only
          // flipped to "texted" once Telnyx actually confirms the send.
          const { data: conversation } = await supabaseAdmin
            .from("conversations")
            .insert({
              user_id: profile.id,
              channel: "sms",
              customer_identifier: callerPhone,
              status: "received",
            })
            .select()
            .single();

          const [quota, hourlyOk] = conversation
            ? await Promise.all([checkSmsQuota(profile.id), checkSmsHourlyRateLimit(profile.id)])
            : [{ allowed: false }, { allowed: false }];

          if (conversation && quota.allowed && hourlyOk.allowed) {
            const businessName = profile.business_name || "the team";
            const service = profile.industry || "our services";

            const autoMessage =
              profile.greeting_message ||
              `Hi! This is ${businessName}. Sorry we missed your call — we're on a job right now. We'd love to help you with ${service}. What do you need? Reply here and we'll get back to you ASAP.`;

            const sendResult = await sendTelnyxSms(calledNumber, callerPhone, autoMessage);

            if (sendResult.ok) {
              const now = new Date().toISOString();
              await Promise.all([
                supabaseAdmin
                  .from("conversations")
                  .update({ status: "texted", last_message_at: now })
                  .eq("id", conversation.id),
                supabaseAdmin.from("conversation_messages").insert({
                  conversation_id: conversation.id,
                  user_id: profile.id,
                  direction: "outbound",
                  message: autoMessage,
                  sent_at: now,
                }),
              ]);
            } else {
              console.error("[telnyx/voice] Telnyx send failed", sendResult.error);
            }
          }

          await endCall();
          return ACK();
        } catch (err) {
          console.error("[telnyx/voice]", err);
          return ACK();
        }
      },
    },
  },
});
