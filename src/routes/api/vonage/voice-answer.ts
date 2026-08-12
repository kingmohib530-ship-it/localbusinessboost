import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyVonageWebhookSignature } from "@/lib/vonage.server";
import { findBusinessByVonageNumber, sendVonageSms } from "@/lib/vonageProvisioning.server";
import { checkSmsQuota, checkSmsHourlyRateLimit } from "@/lib/planLimits.server";

// Do nothing further and let the call end - matches Twilio's old
// `<Response></Response>` empty-TwiML behavior (silent disconnect, no
// spoken announcement). Vonage's answer_url must return valid NCCO
// synchronously regardless of outcome, so every path below returns this
// shape even on a lookup miss or rate-limit hit.
const EMPTY_NCCO = () => Response.json([]);

/**
 * Vonage's answer_url for the one Application every provisioned number is
 * linked to. Fires on every call that reaches a Lanavix-owned number -
 * by design, a business only reaches this number via *conditional*
 * forwarding (no-answer/busy) from their real line, so unlike the old
 * Twilio setup there's no separate terminal CallStatus to wait for: a
 * call landing here at all already means the real phone missed it. See
 * PhoneForwardingSetup.tsx for the forwarding instructions this depends on.
 */
export const Route = createFileRoute("/api/vonage/voice-answer")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const callerPhone = url.searchParams.get("from") || "";
          const calledNumber = url.searchParams.get("to") || "";

          // Cap by caller phone number before doing any lookup or write -
          // bounds abuse from a forged/looping caller regardless of
          // whether their "to" number matches a real business.
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_anon_rate_limit", {
            p_ip_address: callerPhone,
            p_route: "vonage-voice-answer",
            p_max_requests: 5,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[voice-answer] rate limit check failed");
            return EMPTY_NCCO();
          }
          if (!allowed) {
            return EMPTY_NCCO();
          }

          const business = await findBusinessByVonageNumber(calledNumber);
          if (!business) {
            await supabaseAdmin.from("unmatched_vonage_webhooks").insert({
              route: "voice-answer",
              to_number: calledNumber,
              from_number: callerPhone,
            });
            return EMPTY_NCCO();
          }

          const isValid = await verifyVonageWebhookSignature(request, "");
          if (!isValid) {
            console.warn("[voice-answer] invalid Vonage signature");
            return new Response("Forbidden", { status: 403 });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, business_name, industry, greeting_message")
            .eq("id", business.userId)
            .maybeSingle();

          if (!profile) {
            return EMPTY_NCCO();
          }

          // Save the call as a new conversation, status "received" — only
          // flipped to "texted" once Vonage actually confirms the send.
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

            const sendResult = await sendVonageSms(calledNumber, callerPhone, autoMessage);

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
              console.error("[voice-answer] Vonage send failed", sendResult.error);
            }
          }

          return EMPTY_NCCO();
        } catch (err) {
          console.error("[voice-answer]", err);
          return EMPTY_NCCO();
        }
      },
    },
  },
});
