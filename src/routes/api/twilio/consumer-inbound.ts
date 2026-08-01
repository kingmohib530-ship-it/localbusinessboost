import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyPlatformTwilioRequest } from "@/lib/twilio.server";
import {
  ESTIMATED_VALUE_MAP,
  SERVICE_TYPE_TO_INDUSTRY,
  type ServiceTypeKey,
} from "@/lib/serviceTypes";

const CONSUMER_FOOTER = "\n\nPowered by Lanavix Network";

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TWIML = (message: string) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );

function deriveUrgency(scheduledMs: number): "emergency" | "same_day" | "this_week" | "scheduled" {
  const hoursOut = (scheduledMs - Date.now()) / (1000 * 60 * 60);
  if (hoursOut < 6) return "emergency";
  if (hoursOut < 24) return "same_day";
  if (hoursOut < 24 * 7) return "this_week";
  return "scheduled";
}

// A business needs a genuinely strong, measured score before the consumer
// confirmation claims a "top rating" — the neutral default (50) or an
// unremarkable score should never be advertised as top-tier.
const TOP_RATING_THRESHOLD = 80;

interface ConsumerExtraction {
  reply: string;
  qualified: boolean;
  confidence: "high" | "low";
  serviceType: ServiceTypeKey | "other" | null;
  city: string | null;
  scheduledAt: string | null;
  customerName: string | null;
  budgetRange: string | null;
}

async function runQualification(
  apiKey: string,
  conversationHistory: { role: string; content: string }[],
): Promise<ConsumerExtraction | null> {
  try {
    const now = new Date();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 350,
        system: `You are Lanavix Network, a friendly SMS assistant that matches consumers to local home-service businesses. You are texting directly with a consumer (not a business).

Current date/time (UTC): ${now.toISOString()} (${now.toLocaleDateString("en-US", { weekday: "long" })}).

Your job, over one or more messages, is to collect:
1. What service they need (must map to one of: hvac_tuneup, hvac_repair, hvac_install, plumbing, plumbing_emergency, roofing, electrical, cleaning, landscaping, pest_control, or "other" if nothing fits)
2. What city/area they're in
3. When they need it (resolve relative dates like "tomorrow" or "Friday" against the current date/time above; if no time of day given, ask or assume a reasonable business hour)
4. Their name (so the business knows who's coming)
5. Budget range (nice-to-have — ask once, but do not block booking on it if they skip it)

Keep messages SHORT (1-2 sentences, this is SMS) and conversational. Ask only for what's still missing — don't re-ask for things already given.

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "reply": "the next SMS to send them — a follow-up question, OR a short transition line like 'Let me find you someone' once everything is collected",
  "qualified": boolean,
  "confidence": "high" or "low",
  "serviceType": one of "hvac_tuneup", "hvac_repair", "hvac_install", "plumbing", "plumbing_emergency", "roofing", "electrical", "cleaning", "landscaping", "pest_control", "other", or null,
  "city": string or null,
  "scheduledAt": ISO 8601 UTC datetime string or null,
  "customerName": string or null,
  "budgetRange": string or null
}

Rules:
- qualified is true ONLY when serviceType, city, scheduledAt, AND customerName are all clearly known — not just requested.
- confidence is "high" only when scheduledAt is an unambiguous specific day/time and serviceType is a confident match. Use "low" for anything tentative ("maybe next week?").
- Never invent a name, city, or time the consumer didn't actually provide.
- "reply" must always be a real, sendable SMS — even when qualified is true, still include a short natural transition line there (the outcome of matching them to a business is handled separately, not by you).`,
        messages: conversationHistory,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text);
    if (typeof parsed?.reply !== "string" || typeof parsed?.qualified !== "boolean") return null;
    return parsed as ConsumerExtraction;
  } catch (err) {
    console.error("[consumer-inbound] qualification call failed", err);
    return null;
  }
}

export const Route = createFileRoute("/api/twilio/consumer-inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();

          const isValid = await verifyPlatformTwilioRequest(request, rawBody);
          if (!isValid) {
            console.warn("[consumer-inbound] invalid Twilio signature");
            return new Response("Forbidden", { status: 403 });
          }

          const params = new URLSearchParams(rawBody);
          const from = params.get("From") || "";
          const messageBody = params.get("Body") || "";

          // Cap by consumer phone — each message can trigger a billed
          // Anthropic call. A full qualify-and-book conversation needs a
          // few more turns than the business-side flow, hence the higher cap.
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_anon_rate_limit",
            {
              p_ip_address: from,
              p_route: "twilio-consumer-inbound",
              p_max_requests: 30,
              p_window_seconds: 3600,
            },
          );
          if (rlErr) {
            console.error("[consumer-inbound] rate limit check failed");
            return TWIML(`Thanks! We'll be in touch shortly.${CONSUMER_FOOTER}`);
          }
          if (!allowed) {
            return TWIML(`Too many messages right now — please try again in a bit.${CONSUMER_FOOTER}`);
          }

          // Consumer-marketplace threads have their own dedicated table,
          // separate from the business-side (missed-call text-back)
          // conversations table - this is a platform-wide matching flow,
          // not yet tied to any one business, so it doesn't fit the
          // per-business conversations model at all.
          const { data: history } = await supabaseAdmin
            .from("consumer_marketplace_messages")
            .select("direction, message, sent_at")
            .eq("caller_phone", from)
            .order("sent_at", { ascending: true });

          await supabaseAdmin.from("consumer_marketplace_messages").insert({
            caller_phone: from,
            direction: "inbound",
            message: messageBody,
          });

          // The booking confirmation tells consumers to reply CANCEL, so
          // this has to actually work rather than fall through to the AI
          // qualification flow (which has no notion of an existing
          // booking). Only cancellation is handled here, not a full
          // interactive reschedule - offering a new time back to the
          // business would need its own conversation flow, a deliberately
          // separate feature rather than something to fold in silently here.
          if (/^cancel$/i.test(messageBody.trim())) {
            const { data: activeAppt } = await supabaseAdmin
              .from("appointments")
              .select("id, user_id, service_type")
              .eq("customer_phone", from)
              .eq("source", "consumer_marketplace")
              .eq("status", "confirmed")
              .order("scheduled_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            let cancelMessage: string;
            if (activeAppt) {
              await supabaseAdmin.from("appointments").update({ status: "cancelled" }).eq("id", activeAppt.id);
              await supabaseAdmin.from("activity_log").insert({
                user_id: activeAppt.user_id,
                type: "consumer_marketplace_cancellation",
                summary: `Consumer cancelled their ${activeAppt.service_type} booking`,
                metadata: { appointmentId: activeAppt.id },
              });
              cancelMessage = "Your appointment has been cancelled. Text us again anytime you need service.";
            } else {
              cancelMessage = "You don't have an active booking to cancel. Let us know if you need something else!";
            }

            await supabaseAdmin.from("consumer_marketplace_messages").insert({
              caller_phone: from,
              direction: "outbound",
              message: cancelMessage,
              user_id: activeAppt?.user_id ?? null,
              appointment_id: activeAppt?.id ?? null,
            });

            return TWIML(`${cancelMessage}${CONSUMER_FOOTER}`);
          }

          const conversationHistory = [
            ...(history || []).map((m: { direction: string; message: string }) => ({
              role: m.direction === "outbound" ? "assistant" : "user",
              content: m.message,
            })),
            { role: "user", content: messageBody },
          ];

          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            return TWIML(`Thanks for reaching out! We'll be in touch shortly.${CONSUMER_FOOTER}`);
          }

          const extraction = await runQualification(apiKey, conversationHistory);
          if (!extraction) {
            return TWIML(`Sorry, could you say that again?${CONSUMER_FOOTER}`);
          }

          let finalMessage = extraction.reply;
          let matchedUserId: string | null = null;
          let appointmentId: string | null = null;

          const scheduledMs = extraction.scheduledAt ? Date.parse(extraction.scheduledAt) : NaN;
          const isFuture = !isNaN(scheduledMs) && scheduledMs > Date.now();

          if (extraction.qualified && extraction.confidence === "high" && isFuture && extraction.customerName) {
            const serviceKey = extraction.serviceType;
            const industry = serviceKey && serviceKey !== "other" ? SERVICE_TYPE_TO_INDUSTRY[serviceKey] : null;

            if (!industry) {
              finalMessage = "Sorry, we don't have that type of service in our network yet — we're adding more every week!";
            } else {
              const { data: matches } = await supabaseAdmin
                .from("profiles")
                .select("id, business_name, twilio_phone_number, lanavix_score")
                .ilike("city", `%${extraction.city}%`)
                .ilike("industry", `%${industry}%`)
                .in("subscription_status", ["active", "trialing"])
                .in("verification_status", ["verified", "pro", "elite"])
                .eq("accept_consumer_leads", true)
                .order("lanavix_score", { ascending: false })
                .limit(1);

              const match = matches?.[0];

              if (!match) {
                finalMessage = `Sorry, we don't have a partner for ${industry.toLowerCase()} in ${extraction.city} yet — we're growing fast, check back soon!`;
              } else {
                const estimatedValue =
                  serviceKey && serviceKey !== "other" && serviceKey in ESTIMATED_VALUE_MAP
                    ? ESTIMATED_VALUE_MAP[serviceKey as ServiceTypeKey]
                    : ESTIMATED_VALUE_MAP.default;

                const { data: appointment, error: apptErr } = await supabaseAdmin
                  .from("appointments")
                  .insert({
                    user_id: match.id,
                    customer_name: extraction.customerName,
                    customer_phone: from,
                    service_type: serviceKey && serviceKey !== "other" ? serviceKey : "other",
                    scheduled_at: new Date(scheduledMs).toISOString(),
                    status: "confirmed",
                    source: "consumer_marketplace",
                    estimated_value: estimatedValue,
                  })
                  .select()
                  .single();

                if (apptErr || !appointment) {
                  console.error("[consumer-inbound] failed to create appointment", apptErr);
                  finalMessage = "Sorry, something went wrong booking that — please try again in a moment.";
                } else {
                  matchedUserId = match.id;
                  appointmentId = appointment.id;

                  const dateStr = new Date(scheduledMs).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                  const timeStr = new Date(scheduledMs).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                  const businessName = match.business_name || "Your local pro";
                  const callClause = match.twilio_phone_number ? ` or call ${match.twilio_phone_number}` : "";
                  const ratingClause = match.lanavix_score >= TOP_RATING_THRESHOLD ? " This business has a top Lanavix rating." : "";
                  finalMessage = `Booked! ${businessName} will see you on ${dateStr} at ${timeStr}. Reply CANCEL to cancel${callClause}.${ratingClause}`;

                  await supabaseAdmin.from("activity_log").insert({
                    user_id: match.id,
                    type: "consumer_marketplace_booking",
                    summary: `New Lanavix Network booking: ${industry} for ${extraction.customerName} on ${dateStr}`,
                    metadata: { appointmentId: appointment.id, serviceType: serviceKey, customerName: extraction.customerName, scheduledAt: new Date(scheduledMs).toISOString() },
                  });

                  // Moat data: log this booking for pricing/scoring aggregation.
                  // location_zip stays null — nothing in this app captures a
                  // ZIP code anywhere (only free-text city).
                  const firstContactMs = history?.[0]?.sent_at ? new Date(history[0].sent_at).getTime() : Date.now();
                  await supabaseAdmin.from("conversation_intelligence").insert({
                    business_id: match.id,
                    consumer_phone: from,
                    service_type: serviceKey && serviceKey !== "other" ? serviceKey : "other",
                    location_zip: null,
                    price_mentioned: estimatedValue,
                    urgency_level: deriveUrgency(scheduledMs),
                    outcome: "booked",
                    time_to_book_minutes: Math.max(0, Math.round((Date.now() - firstContactMs) / 60000)),
                    source_channel: "consumer_marketplace",
                    ai_confidence_score: 0.85,
                  });
                }
              }
            }
          }

          await supabaseAdmin.from("consumer_marketplace_messages").insert({
            caller_phone: from,
            direction: "outbound",
            message: finalMessage,
            user_id: matchedUserId,
            appointment_id: appointmentId,
          });

          return TWIML(`${finalMessage}${CONSUMER_FOOTER}`);
        } catch (err) {
          console.error("[consumer-inbound]", err);
          return TWIML(`Thanks! We'll be in touch shortly.${CONSUMER_FOOTER}`);
        }
      },
    },
  },
});
