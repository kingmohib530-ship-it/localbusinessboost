import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTwilioRequestWithToken } from "@/lib/twilio.server";
import { findBusinessByTwilioNumber } from "@/lib/twilioCredentials.server";
import { checkSmsQuota, checkSmsHourlyRateLimit } from "@/lib/planLimits.server";

const EMPTY_TWIML = new Response(
  `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
  { headers: { "Content-Type": "text/xml" } },
);

export const Route = createFileRoute("/api/twilio/missed-call")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const params = new URLSearchParams(rawBody);
          const callerPhone = params.get("From") || "";
          const calledNumber = params.get("To") || "";
          const callStatus = params.get("CallStatus") || "";

          // Only handle no-answer / busy / failed calls
          if (!["no-answer", "busy", "failed"].includes(callStatus)) {
            return EMPTY_TWIML;
          }

          // Cap by caller phone number before doing any lookup or write -
          // this bounds abuse from a forged/looping caller regardless of
          // whether their "To" number matches a real business.
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_anon_rate_limit",
            {
              p_ip_address: callerPhone,
              p_route: "twilio-missed-call",
              p_max_requests: 5,
              p_window_seconds: 3600,
            },
          );
          if (rlErr) {
            console.error("[missed-call] rate limit check failed");
            return EMPTY_TWIML;
          }
          if (!allowed) {
            return EMPTY_TWIML;
          }

          // Which business owns the number this call landed on. Each
          // business now brings their own Twilio account, so this also
          // gives us the specific Auth Token needed to verify the
          // signature below - Twilio signs with the Auth Token of
          // whichever Twilio account owns the called number.
          const business = await findBusinessByTwilioNumber(calledNumber);
          if (!business) {
            await supabaseAdmin.from("unmatched_twilio_webhooks").insert({
              route: "missed-call",
              to_number: calledNumber,
              from_number: callerPhone,
            });
            return EMPTY_TWIML;
          }

          const isValid = await verifyTwilioRequestWithToken(request, rawBody, business.authToken);
          if (!isValid) {
            console.warn("[missed-call] invalid Twilio signature");
            return new Response("Forbidden", { status: 403 });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, business_name, industry, greeting_message")
            .eq("id", business.userId)
            .maybeSingle();

          if (!profile) {
            return EMPTY_TWIML;
          }

          // Save the call as a new conversation, status "received" — only
          // flipped to "texted" once Twilio actually confirms the send was
          // accepted, below.
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

            const twilioRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${business.accountSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${btoa(`${business.accountSid}:${business.authToken}`)}`,
                },
                body: new URLSearchParams({
                  From: calledNumber,
                  To: callerPhone,
                  Body: autoMessage,
                }).toString(),
              },
            );

            if (twilioRes.ok) {
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
              console.error("[missed-call] Twilio send failed", twilioRes.status, await twilioRes.text().catch(() => ""));
            }
          }

          return EMPTY_TWIML;
        } catch (err) {
          console.error("[missed-call]", err);
          return EMPTY_TWIML;
        }
      },
    },
  },
});
