import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTwilioRequest } from "@/lib/twilio.server";
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

          const isValid = await verifyTwilioRequest(request, rawBody);
          if (!isValid) {
            console.warn("[missed-call] invalid Twilio signature");
            return new Response("Forbidden", { status: 403 });
          }

          const params = new URLSearchParams(rawBody);
          const callerPhone = params.get("From") || "";
          const calledNumber = params.get("To") || "";
          const callStatus = params.get("CallStatus") || "";

          // Only handle no-answer / busy / failed calls
          if (!["no-answer", "busy", "failed"].includes(callStatus)) {
            return EMPTY_TWIML;
          }

          // Cap by caller phone number so one forged/looping caller can't
          // trigger unlimited outbound SMS + AI spend.
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

          // Match the business that actually owns the called number —
          // not just whichever profile happens to be first in the table.
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id, business_name, industry, greeting_message")
            .eq("twilio_phone_number", calledNumber)
            .maybeSingle();

          if (!profile) {
            return EMPTY_TWIML;
          }

          // Save the missed call
          const { data: missedCall } = await supabaseAdmin
            .from("missed_calls")
            .insert({
              user_id: profile.id,
              caller_phone: callerPhone,
              status: "texted",
            })
            .select()
            .single();

          // Send auto-text via Twilio
          const twilioSid = process.env.TWILIO_ACCOUNT_SID;
          const twilioToken = process.env.TWILIO_AUTH_TOKEN;
          const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

          const [quota, hourlyOk] = missedCall
            ? await Promise.all([checkSmsQuota(profile.id), checkSmsHourlyRateLimit(profile.id)])
            : [{ allowed: false }, { allowed: false }];

          if (twilioSid && twilioToken && twilioFrom && missedCall && quota.allowed && hourlyOk.allowed) {
            const businessName = profile.business_name || "the team";
            const service = profile.industry || "our services";

            const autoMessage =
              profile.greeting_message ||
              `Hi! This is ${businessName}. Sorry we missed your call — we're on a job right now. We'd love to help you with ${service}. What do you need? Reply here and we'll get back to you ASAP 👇`;

            await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                },
                body: new URLSearchParams({
                  From: twilioFrom,
                  To: callerPhone,
                  Body: autoMessage,
                }).toString(),
              },
            );

            // Save outbound message to conversation
            await supabaseAdmin.from("sms_conversations").insert({
              missed_call_id: missedCall.id,
              user_id: profile.id,
              caller_phone: callerPhone,
              direction: "outbound",
              message: autoMessage,
            });
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
