import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/twilio/sms-reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          const params = new URLSearchParams(body);

          const from = params.get("From") || "";
          const messageBody = params.get("Body") || "";

          const supabase = createClient(
            process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
          );

          // Find the most recent missed call from this number
          const { data: missedCall } = await supabase
            .from("missed_calls")
            .select("*, profiles(business_name, industry)")
            .eq("caller_phone", from)
            .order("called_at", { ascending: false })
            .limit(1)
            .single();

          if (!missedCall) {
            return new Response(
              `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks for reaching out! We'll be in touch shortly.</Message></Response>`,
              { headers: { "Content-Type": "text/xml" } }
            );
          }

          // Save inbound message
          await supabase.from("sms_conversations").insert({
            missed_call_id: missedCall.id,
            user_id: missedCall.user_id,
            caller_phone: from,
            direction: "inbound",
            message: messageBody,
          });

          // Update status to replied
          await supabase
            .from("missed_calls")
            .update({ status: "replied" })
            .eq("id", missedCall.id);

          // Get conversation history
          const { data: history } = await supabase
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
          await supabase.from("sms_conversations").insert({
            missed_call_id: missedCall.id,
            user_id: missedCall.user_id,
            caller_phone: from,
            direction: "outbound",
            message: aiReply,
          });

          // Send via Twilio
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${aiReply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</Message></Response>`,
            { headers: { "Content-Type": "text/xml" } }
          );
        } catch (err) {
          console.error("[sms-reply]", err);
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks! We'll be in touch shortly.</Message></Response>`,
            { headers: { "Content-Type": "text/xml" } }
          );
        }
      },
    },
  },
});
