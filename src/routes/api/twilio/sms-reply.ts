import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTwilioRequest } from "@/lib/twilio.server";
import { checkSmsQuota, checkSmsHourlyRateLimit } from "@/lib/planLimits.server";
import { ESTIMATED_VALUE_MAP, type ServiceTypeKey } from "@/lib/serviceTypes";
import { loadBusinessContext, buildReceptionistSystemPrompt, generateReceptionistReply, detectBooking } from "@/lib/aiReceptionist.server";

function businessFooter(): string {
  const consumerNumber = process.env.CONSUMER_TWILIO_PHONE_NUMBER;
  return consumerNumber
    ? `\n\nManaged by Lanavix — Need another service? Text ${consumerNumber}`
    : "\n\nManaged by Lanavix";
}

// Only worth showing on the first reply in a conversation - repeating it on
// every message in an ongoing back-and-forth just adds noise.
const FALLBACK_TWIML = (message: string, includeFooter = true) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}${includeFooter ? businessFooter() : ""}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );

function deriveUrgency(scheduledMs: number): "emergency" | "same_day" | "this_week" | "scheduled" {
  const hoursOut = (scheduledMs - Date.now()) / (1000 * 60 * 60);
  if (hoursOut < 6) return "emergency";
  if (hoursOut < 24) return "same_day";
  if (hoursOut < 24 * 7) return "this_week";
  return "scheduled";
}

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

          // Find the most recent sms-channel conversation with this number
          const { data: conversation } = await supabaseAdmin
            .from("conversations")
            .select("*, profiles(business_name, industry, business_hours, escalation_rules)")
            .eq("channel", "sms")
            .eq("customer_identifier", from)
            .order("started_at", { ascending: false })
            .limit(1)
            .single();

          if (!conversation) {
            return FALLBACK_TWIML("Thanks for reaching out! We'll be in touch shortly.");
          }

          const now = new Date().toISOString();

          // Save inbound message
          await supabaseAdmin.from("conversation_messages").insert({
            conversation_id: conversation.id,
            user_id: conversation.user_id,
            direction: "inbound",
            message: messageBody,
            sent_at: now,
          });

          // Update status to replied
          await supabaseAdmin
            .from("conversations")
            .update({ status: "replied", last_message_at: now })
            .eq("id", conversation.id);

          // Get conversation history
          const { data: history } = await supabaseAdmin
            .from("conversation_messages")
            .select("direction, message")
            .eq("conversation_id", conversation.id)
            .order("sent_at", { ascending: true });

          const isFirstReply = !(history || []).some((m) => m.direction === "outbound");

          // Starter plan's SMS/month cap, plus a flat per-hour abuse ceiling
          // that applies on every plan — skip the AI reply (and its
          // billable Anthropic call) once either limit is hit.
          if (conversation.user_id) {
            const [quota, hourlyOk] = await Promise.all([
              checkSmsQuota(conversation.user_id),
              checkSmsHourlyRateLimit(conversation.user_id),
            ]);
            if (!quota.allowed || !hourlyOk.allowed) {
              return FALLBACK_TWIML("Thanks for your message! We'll get back to you shortly.", isFirstReply);
            }
          }

          // Generate AI reply
          const apiKey = process.env.ANTHROPIC_API_KEY;
          let aiReply = "Thanks for your message! We'll have someone reach out to you shortly.";

          const conversationHistory = (history || []).map((m: { direction: string; message: string }) => ({
            role: m.direction === "outbound" ? "assistant" : "user",
            content: m.message,
          }));

          if (apiKey && conversation.user_id) {
            const context = await loadBusinessContext(conversation.user_id, (conversation as any).profiles ?? null);
            const systemPrompt = buildReceptionistSystemPrompt(context, "sms");
            const reply = await generateReceptionistReply(apiKey, systemPrompt, conversationHistory);
            if (reply) aiReply = reply;
          }

          // Save AI reply
          const { data: savedReply } = await supabaseAdmin
            .from("conversation_messages")
            .insert({
              conversation_id: conversation.id,
              user_id: conversation.user_id,
              direction: "outbound",
              message: aiReply,
            })
            .select()
            .single();

          await supabaseAdmin
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", conversation.id);

          // Best-effort: did this exchange just confirm a booking? Never lets
          // a failure here affect the SMS reply already built above.
          if (apiKey) {
            try {
              const fullHistory = [...conversationHistory, { role: "assistant", content: aiReply }];
              const extraction = await detectBooking(apiKey, fullHistory);

              const scheduledMs = extraction?.scheduledAt ? Date.parse(extraction.scheduledAt) : NaN;
              const isFuture = !isNaN(scheduledMs) && scheduledMs > Date.now();

              if (
                extraction?.bookingConfirmed &&
                extraction.confidence === "high" &&
                isFuture &&
                conversation.user_id
              ) {
                const serviceKey: ServiceTypeKey | "other" =
                  extraction.serviceType && extraction.serviceType !== null
                    ? extraction.serviceType
                    : "other";
                const estimatedValue =
                  serviceKey !== "other" && serviceKey in ESTIMATED_VALUE_MAP
                    ? ESTIMATED_VALUE_MAP[serviceKey as ServiceTypeKey]
                    : ESTIMATED_VALUE_MAP.default;

                const { data: appointment, error: apptErr } = await supabaseAdmin
                  .from("appointments")
                  .insert({
                    user_id: conversation.user_id,
                    customer_name: extraction.customerName || from,
                    customer_phone: from,
                    service_type: serviceKey,
                    scheduled_at: new Date(scheduledMs).toISOString(),
                    status: "confirmed",
                    source: "inbound_sms",
                    estimated_value: estimatedValue,
                  })
                  .select()
                  .single();

                if (apptErr) {
                  console.error("[sms-reply] failed to create appointment", apptErr);
                } else if (appointment && savedReply) {
                  await supabaseAdmin
                    .from("conversation_messages")
                    .update({ appointment_id: appointment.id })
                    .eq("id", savedReply.id);

                  // Moat data: log this booking for pricing/scoring aggregation.
                  // location_zip stays null — nothing in this app captures a
                  // ZIP code anywhere (profiles.city and the consumer flow
                  // both only ever collect free-text city).
                  const firstContactMs = conversation.started_at ? new Date(conversation.started_at).getTime() : Date.now();
                  await supabaseAdmin.from("conversation_intelligence").insert({
                    business_id: conversation.user_id,
                    consumer_phone: from,
                    service_type: serviceKey,
                    location_zip: null,
                    price_mentioned: estimatedValue,
                    urgency_level: deriveUrgency(scheduledMs),
                    outcome: "booked",
                    time_to_book_minutes: Math.max(0, Math.round((Date.now() - firstContactMs) / 60000)),
                    source_channel: "inbound_sms",
                    ai_confidence_score: 0.85,
                  });
                }
              }
            } catch (err) {
              console.error("[sms-reply] booking detection/creation error", err);
            }
          }

          return FALLBACK_TWIML(
            aiReply.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
            isFirstReply,
          );
        } catch (err) {
          console.error("[sms-reply]", err);
          return FALLBACK_TWIML("Thanks! We'll be in touch shortly.");
        }
      },
    },
  },
});
