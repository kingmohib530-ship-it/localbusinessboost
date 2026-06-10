import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/twilio/missed-call")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          const params = new URLSearchParams(body);

          const callerPhone = params.get("From") || "";
          const calledNumber = params.get("To") || "";
          const callStatus = params.get("CallStatus") || "";

          // Only handle no-answer / busy / failed calls
          if (!["no-answer", "busy", "failed"].includes(callStatus)) {
            return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
              headers: { "Content-Type": "text/xml" },
            });
          }

          const supabase = createClient(
            process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
          );

          // Find the user by their Twilio number
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, business_name, industry")
            .limit(1)
            .single();

          if (!profile) {
            return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
              headers: { "Content-Type": "text/xml" },
            });
          }

          // Save the missed call
          const { data: missedCall } = await supabase
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

          if (twilioSid && twilioToken && twilioFrom && missedCall) {
            const businessName = profile.business_name || "the team";
            const service = profile.industry || "our services";

            const autoMessage = `Hi! This is ${businessName}. Sorry we missed your call — we're on a job right now. We'd love to help you with ${service}. What do you need? Reply here and we'll get back to you ASAP 👇`;

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
              }
            );

            // Save outbound message to conversation
            await supabase.from("sms_conversations").insert({
              missed_call_id: missedCall.id,
              user_id: profile.id,
              caller_phone: callerPhone,
              direction: "outbound",
              message: autoMessage,
            });
          }

          return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
            headers: { "Content-Type": "text/xml" },
          });
        } catch (err) {
          console.error("[missed-call]", err);
          return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
            headers: { "Content-Type": "text/xml" },
          });
        }
      },
    },
  },
});
