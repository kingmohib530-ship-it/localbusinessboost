import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTwilioRequest } from "@/lib/twilio.server";

const FALLBACK_TWIML = (message: string) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );

export const Route = createFileRoute("/api/twilio/sms-reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();

          const isValid = await verifyTwilioRequest(request, rawBody);
          if (!isValid) {
            console.warn("[sms-reply] invalid Twilio signature");
            return new Response("Forbidden", { status: 403 });
          }

          const params = new URLSearchParams(rawBody);
          const from = params.get("From") || "";
          const messageBody = params.get("Body") || "";

          // Cap by caller phone — each inbound message triggers a billed
          // Anthropic call, so this is the cost-abuse backstop.
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_anon_rate_limit",
            {
              p_ip_address: from,
              p_route: "twilio-sms-reply",
              p_max_requests: 20,
              p_window_seconds: 3600,
            },
          );
          if (rlErr) {
            console.error("[sms-reply] rate limit check failed");
            return FALLBACK_TWIML("Thanks! We'll be in touch shortly.");
          }
          if (!allowed) {
            return FALLBACK_TWIML("Thanks for your message! We'll get back to you shortly.");
          }

          // Find the most recent missed call from this number
          const { data: missedCall } = await supabaseAdmin
            .from("missed_calls")
            .select("*, profiles(business_name, industry)")
            .eq("caller_phone", from)
            .order("called_at", { ascending: false })
            .limit(1)
            .single();

          if (!missedCall) {
            return FALLBACK_TWIML("Thanks for reaching out! We'll be in touch shortly.");
          }

          // Save inbound message
          await supabaseAdmin.from("sms_conversations").insert({
            missed_call_id: missedCall.id,
            user_id: missedCall.user_id,
            caller_phone: from,
            direction: "inbound",
            message: messageBody,
          });

          // Update status to replied
          await supabaseAdmin
            .from("missed_calls")
            .update({ status: "replied" })
            .eq("id", missedCall.id);

          // Get conversation history
          const { data: history } = await supabaseAdmin
            .from("sms_conversations")
            .select("direction, message")
            .eq("missed_call_id", missedCall.id)
            .order("sent_at", { ascending: true });

          // Generate AI reply
          const apiKey = process.env.ANTHROPIC_API_KEY;
          let aiReply = "Thanks for your message! We'll have someone reach out to you shortly.";

          if (apiKey) {
            const businessName = (missedCall as any).profiles?.business_name || "our business";
            const service = (missedCall as any).profiles?.industry || "our services";

            const conversationHistory = (history || []).map((m: { direction: string; message: string }) => ({
              role: m.direction === "outbound" ? "assistant" : "user",
              content: m.message,
            }));

            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-5",
                max_tokens: 200,
                system: `You are the friendly AI receptionist for ${businessName}, a ${service} business. Your job is to:
1. Understand what the customer needs
2. Answer basic questions about services
3. Try to book an appointment (ask for their availability)
4. Keep messages SHORT (under 2 sentences) — this is SMS
5. Be warm, professional, and helpful
6. If they want to book, ask "What days/times work best for you this week?"
7. If they seem booked, update with "Great! We'll confirm with you shortly."
Never make up prices. Never promise specific times. Keep it simple.`,
                messages: conversationHistory,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              aiReply = data.content?.[0]?.text || aiReply;
            }
          }

          // Save AI reply
          await supabaseAdmin.from("sms_conversations").insert({
            missed_call_id: missedCall.id,
            user_id: missedCall.user_id,
            caller_phone: from,
            direction: "outbound",
            message: aiReply,
          });

          return FALLBACK_TWIML(
            aiReply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
          );
        } catch (err) {
          console.error("[sms-reply]", err);
          return FALLBACK_TWIML("Thanks! We'll be in touch shortly.");
        }
      },
    },
  },
});
