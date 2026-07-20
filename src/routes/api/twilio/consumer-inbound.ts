import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyTwilioRequest } from "@/lib/twilio.server";

const CONSUMER_FOOTER = "\n\nPowered by Lanavix Local";

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TWIML = (message: string) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );

// Same fixed service-type set and pricing map as the Phase 2 inbound-SMS
// booking flow (sms-reply.ts) — duplicated here rather than imported so
// this file stands alone, per "add new files only."
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

// Maps a service-type key to the free-text `industry` values businesses
// pick during onboarding (see src/lib/auditApi.ts's Industry type).
const SERVICE_TYPE_TO_INDUSTRY: Record<ServiceTypeKey, string> = {
  hvac_tuneup: "HVAC",
  hvac_repair: "HVAC",
  hvac_install: "HVAC",
  plumbing: "Plumbing",
  plumbing_emergency: "Plumbing",
  roofing: "Roofing",
  electrical: "Electrician",
  cleaning: "Cleaning",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
};

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
        system: `You are Lanavix Local, a friendly SMS assistant that matches consumers to local home-service businesses. You are texting directly with a consumer (not a business).

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

          const isValid = await verifyTwilioRequest(request, rawBody);
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

          // Consumer-marketplace threads always have missed_call_id = null,
          // which cleanly distinguishes them from business-side (missed
          // call text-back) threads even if the same phone number happens
          // to also be a customer of some business elsewhere in the system.
          const { data: history } = await supabaseAdmin
            .from("sms_conversations")
            .select("direction, message")
            .eq("caller_phone", from)
            .is("missed_call_id", null)
            .order("sent_at", { ascending: true });

          await supabaseAdmin.from("sms_conversations").insert({
            caller_phone: from,
            direction: "inbound",
            message: messageBody,
          });

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
                .select("id, business_name, twilio_phone_number")
                .ilike("city", `%${extraction.city}%`)
                .ilike("industry", `%${industry}%`)
                .eq("subscription_status", "active")
                .eq("accept_consumer_leads", true)
                .order("created_at", { ascending: true })
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
                  finalMessage = `Booked! ${businessName} will see you on ${dateStr} at ${timeStr}. Reply CANCEL to reschedule${callClause}.`;

                  await supabaseAdmin.from("activity_log").insert({
                    user_id: match.id,
                    type: "consumer_marketplace_booking",
                    summary: `New Lanavix Network booking: ${industry} for ${extraction.customerName} on ${dateStr}`,
                    metadata: { appointmentId: appointment.id, serviceType: serviceKey, customerName: extraction.customerName, scheduledAt: new Date(scheduledMs).toISOString() },
                  });
                }
              }
            }
          }

          await supabaseAdmin.from("sms_conversations").insert({
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
