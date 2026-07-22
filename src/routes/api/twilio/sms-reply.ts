import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTwilioRequest } from "@/lib/twilio.server";
import { checkSmsQuota, checkSmsHourlyRateLimit } from "@/lib/planLimits.server";

function businessFooter(): string {
  const consumerNumber = process.env.CONSUMER_TWILIO_PHONE_NUMBER;
  return consumerNumber
    ? `\n\nManaged by Lanavix — Need another service? Text ${consumerNumber}`
    : "\n\nManaged by Lanavix";
}

const FALLBACK_TWIML = (message: string) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}${businessFooter()}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );

const SERVICE_TYPE_KEYS = [
  "hvac_tuneup",
  "hvac_repair",
  "hvac_install",
  "plumbing",
  "plumbing_emergency",
  "roofing",
  "electrical",
  "cleaning",
  "landscaping",
  "pest_control",
] as const;
type ServiceTypeKey = (typeof SERVICE_TYPE_KEYS)[number];

const ESTIMATED_VALUE_MAP: Record<ServiceTypeKey | "default", number> = {
  hvac_tuneup: 150,
  hvac_repair: 450,
  hvac_install: 3500,
  plumbing: 400,
  plumbing_emergency: 650,
  roofing: 1200,
  electrical: 350,
  cleaning: 200,
  landscaping: 300,
  pest_control: 250,
  default: 400,
};

function deriveUrgency(scheduledMs: number): "emergency" | "same_day" | "this_week" | "scheduled" {
  const hoursOut = (scheduledMs - Date.now()) / (1000 * 60 * 60);
  if (hoursOut < 6) return "emergency";
  if (hoursOut < 24) return "same_day";
  if (hoursOut < 24 * 7) return "this_week";
  return "scheduled";
}

interface BookingExtraction {
  bookingConfirmed: boolean;
  customerName: string | null;
  serviceType: ServiceTypeKey | "other" | null;
  scheduledAt: string | null;
  confidence: "high" | "low";
}

/**
 * Best-effort structured extraction over the conversation so far: did the
 * customer and AI just agree on a specific time? This is a second,
 * conservative AI call (only acts on high-confidence, valid-future results)
 * — never allowed to throw, since a failed extraction must not break the
 * customer-facing SMS reply that already went out.
 */
async function detectBooking(
  apiKey: string,
  conversationHistory: { role: string; content: string }[],
): Promise<BookingExtraction | null> {
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
        max_tokens: 300,
        system: `You analyze an SMS conversation between a home-services business and a customer to detect whether a specific appointment was just confirmed.

Current date/time (UTC): ${now.toISOString()} (${now.toLocaleDateString("en-US", { weekday: "long" })}).

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "bookingConfirmed": boolean,
  "customerName": string or null,
  "serviceType": one of "hvac_tuneup", "hvac_repair", "hvac_install", "plumbing", "plumbing_emergency", "roofing", "electrical", "cleaning", "landscaping", "pest_control", "other", or null,
  "scheduledAt": ISO 8601 UTC datetime string or null,
  "confidence": "high" or "low"
}

Rules:
- bookingConfirmed is true ONLY if both a specific day/time AND the type of work are clearly agreed in the conversation — not just requested or discussed.
- Resolve relative dates ("tomorrow", "next Tuesday", "Friday morning") against the current date/time above. If no specific time of day was given, use a reasonable business hour (e.g. 9:00 or 14:00 local-agnostic UTC).
- serviceType must be your best match from the fixed list above, or "other" if it doesn't fit any category, or null if unclear.
- customerName is the customer's name ONLY if it was actually stated somewhere in the conversation; otherwise null. Never invent one.
- confidence is "high" only when the day/time and service are unambiguous. Use "low" for anything uncertain, partial, or tentative ("maybe Tuesday?").
- If nothing was confirmed, return bookingConfirmed: false and null for the other fields (except confidence: "low").`,
        messages: conversationHistory,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text);
    if (typeof parsed?.bookingConfirmed !== "boolean") return null;
    return parsed as BookingExtraction;
  } catch (err) {
    console.error("[sms-reply] booking detection failed", err);
    return null;
  }
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

          // Starter plan's SMS/month cap, plus a flat per-hour abuse ceiling
          // that applies on every plan — skip the AI reply (and its
          // billable Anthropic call) once either limit is hit.
          if (missedCall.user_id) {
            const [quota, hourlyOk] = await Promise.all([
              checkSmsQuota(missedCall.user_id),
              checkSmsHourlyRateLimit(missedCall.user_id),
            ]);
            if (!quota.allowed || !hourlyOk.allowed) {
              return FALLBACK_TWIML("Thanks for your message! We'll get back to you shortly.");
            }
          }

          // Get conversation history
          const { data: history } = await supabaseAdmin
            .from("sms_conversations")
            .select("direction, message")
            .eq("missed_call_id", missedCall.id)
            .order("sent_at", { ascending: true });

          // Generate AI reply
          const apiKey = process.env.ANTHROPIC_API_KEY;
          let aiReply = "Thanks for your message! We'll have someone reach out to you shortly.";

          const conversationHistory = (history || []).map((m: { direction: string; message: string }) => ({
            role: m.direction === "outbound" ? "assistant" : "user",
            content: m.message,
          }));

          if (apiKey) {
            const businessName = (missedCall as any).profiles?.business_name || "our business";
            const service = (missedCall as any).profiles?.industry || "our services";

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
          const { data: savedReply } = await supabaseAdmin
            .from("sms_conversations")
            .insert({
              missed_call_id: missedCall.id,
              user_id: missedCall.user_id,
              caller_phone: from,
              direction: "outbound",
              message: aiReply,
            })
            .select()
            .single();

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
                missedCall.user_id
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
                    user_id: missedCall.user_id,
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
                    .from("sms_conversations")
                    .update({ appointment_id: appointment.id })
                    .eq("id", savedReply.id);

                  // Moat data: log this booking for pricing/scoring aggregation.
                  // location_zip stays null — nothing in this app captures a
                  // ZIP code anywhere (profiles.city and the consumer flow
                  // both only ever collect free-text city).
                  const firstContactMs = missedCall.called_at ? new Date(missedCall.called_at).getTime() : Date.now();
                  await supabaseAdmin.from("conversation_intelligence").insert({
                    business_id: missedCall.user_id,
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
          );
        } catch (err) {
          console.error("[sms-reply]", err);
          return FALLBACK_TWIML("Thanks! We'll be in touch shortly.");
        }
      },
    },
  },
});
