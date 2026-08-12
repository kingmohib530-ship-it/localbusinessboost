import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyVonageWebhookSignature } from "@/lib/vonage.server";
import { findBusinessByVonageNumber, sendVonageSms } from "@/lib/vonageProvisioning.server";
import { checkSmsQuota, checkSmsHourlyRateLimit } from "@/lib/planLimits.server";
import { ESTIMATED_VALUE_MAP, type ServiceTypeKey } from "@/lib/serviceTypes";
import { loadBusinessContext, buildReceptionistSystemPrompt, generateReceptionistReply, detectBooking, deriveUrgency } from "@/lib/aiReceptionist.server";
import { cancelActiveQuoteFollowUp, maybeStartQuoteFollowUp } from "@/lib/quoteFollowUps.server";

function businessFooter(): string {
  return "\n\nManaged by Lanavix";
}

// Unlike Twilio/Plivo, Vonage's inbound message webhook has no
// synchronous XML/JSON reply-in-response mechanism - it just wants a bare
// 2xx acknowledgment (anything else triggers Vonage's 24h retry policy),
// and any reply is a separate outbound Messages API call. That converges
// this route's shape with voice-answer.ts's: build the message, send it,
// then acknowledge, rather than returning the reply in the response body.
const ACK = () => new Response(null, { status: 200 });

export const Route = createFileRoute("/api/vonage/sms-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const params = JSON.parse(rawBody || "{}");
          const from = params.msisdn || "";
          const to = params.to || "";
          const messageBody = params.text || "";

          // Cap by caller phone before any lookup or write, since each
          // inbound message triggers a billed Anthropic call (the
          // cost-abuse backstop), and this also bounds the business lookup
          // below regardless of whether "to" matches a real business.
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_anon_rate_limit", {
            p_ip_address: from,
            p_route: "vonage-sms-inbound",
            p_max_requests: 20,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[sms-inbound] rate limit check failed");
            return ACK();
          }
          if (!allowed) {
            return ACK();
          }

          const business = await findBusinessByVonageNumber(to);
          if (!business) {
            await supabaseAdmin.from("unmatched_vonage_webhooks").insert({
              route: "sms-inbound",
              to_number: to,
              from_number: from,
            });
            return ACK();
          }

          const isValid = await verifyVonageWebhookSignature(request, rawBody);
          if (!isValid) {
            console.warn("[sms-inbound] invalid Vonage signature");
            return new Response("Forbidden", { status: 403 });
          }

          // Find the most recent sms-channel conversation with this
          // customer, scoped to the business that owns the number the
          // reply landed on (not just by customer phone number alone),
          // since the same customer could have texted a different
          // Lanavix business at some point.
          const { data: conversation } = await supabaseAdmin
            .from("conversations")
            .select("*, profiles(business_name, industry, business_hours, escalation_rules)")
            .eq("channel", "sms")
            .eq("user_id", business.userId)
            .eq("customer_identifier", from)
            .order("started_at", { ascending: false })
            .limit(1)
            .single();

          if (!conversation) {
            return ACK();
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

          // Starter plan's SMS/month cap, plus a flat per-hour abuse ceiling
          // that applies on every plan — skip the AI reply (and its
          // billable Anthropic call) once either limit is hit.
          if (conversation.user_id) {
            const [quota, hourlyOk] = await Promise.all([
              checkSmsQuota(conversation.user_id),
              checkSmsHourlyRateLimit(conversation.user_id),
            ]);
            if (!quota.allowed || !hourlyOk.allowed) {
              await sendVonageSms(to, from, `Thanks for your message! We'll get back to you shortly.${businessFooter()}`);
              return ACK();
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

          // Best-effort: did this exchange just confirm a booking, or give a
          // quote that didn't book? Never lets a failure here affect the SMS
          // reply already built above.
          if (apiKey) {
            try {
              const fullHistory = [...conversationHistory, { role: "assistant", content: aiReply }];
              const extraction = await detectBooking(apiKey, fullHistory);

              const scheduledMs = extraction?.scheduledAt ? Date.parse(extraction.scheduledAt) : NaN;
              const isFuture = !isNaN(scheduledMs) && scheduledMs > Date.now();
              const bookingConfirmed =
                !!extraction?.bookingConfirmed && extraction.confidence === "high" && isFuture && !!conversation.user_id;

              if (bookingConfirmed && extraction) {
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
                  console.error("[sms-inbound] failed to create appointment", apptErr);
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

                // Any quote follow-up sequence still waiting on this
                // conversation is no longer relevant now that it's booked.
                await cancelActiveQuoteFollowUp(conversation.id);
              } else if (conversation.user_id) {
                const quote = await maybeStartQuoteFollowUp(
                  apiKey,
                  conversation.id,
                  conversation.user_id,
                  fullHistory,
                  true,
                );
                if (quote?.quoteGiven && quote.confidence === "high") {
                  await supabaseAdmin.from("conversation_intelligence").insert({
                    business_id: conversation.user_id,
                    consumer_phone: from,
                    service_type: quote.serviceType,
                    location_zip: null,
                    price_mentioned: quote.quotedPrice,
                    urgency_level: null,
                    outcome: "quoted",
                    source_channel: "inbound_sms",
                    ai_confidence_score: 0.8,
                  });
                }
              }
            } catch (err) {
              console.error("[sms-inbound] booking/quote detection error", err);
            }
          }

          const sendResult = await sendVonageSms(to, from, `${aiReply}${businessFooter()}`);
          if (!sendResult.ok) {
            console.error("[sms-inbound] failed to send AI reply", sendResult.error);
          }

          return ACK();
        } catch (err) {
          console.error("[sms-inbound]", err);
          return ACK();
        }
      },
    },
  },
});
