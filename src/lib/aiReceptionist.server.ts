/**
 * Shared AI receptionist layer: one system prompt built from a business's
 * real profile settings and confirmed business_facts, used identically by
 * every conversation channel (SMS today, web chat next) instead of each
 * channel's route handler building its own copy of the same prompt.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type ServiceTypeKey } from "@/lib/serviceTypes";

export type ReceptionistChannel = "sms" | "web_chat";

/** How far out a confirmed appointment is, for conversation_intelligence's urgency_level. */
export function deriveUrgency(
  scheduledMs: number,
): "emergency" | "same_day" | "this_week" | "scheduled" {
  const hoursOut = (scheduledMs - Date.now()) / (1000 * 60 * 60);
  if (hoursOut < 6) return "emergency";
  if (hoursOut < 24) return "same_day";
  if (hoursOut < 24 * 7) return "this_week";
  return "scheduled";
}

export interface BusinessProfile {
  business_name: string | null;
  industry: string | null;
  business_hours: string | null;
  escalation_rules: string | null;
}

export interface BusinessContext {
  businessName: string;
  service: string;
  businessHours: string | null;
  escalationRules: string | null;
  knownFacts: string;
}

/**
 * Loads a business's confirmed, real facts (the business_facts table) and
 * folds them together with its profile settings into the context the
 * system prompt is built from. Capped at 40 facts so prompt size stays
 * bounded even for a business with a large fact list.
 */
export async function loadBusinessContext(
  userId: string,
  profile: BusinessProfile | null,
): Promise<BusinessContext> {
  const { data: facts } = await supabaseAdmin
    .from("business_facts")
    .select("fact_type, fact_text")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(40);

  const knownFacts = (facts || []).map((f) => `- (${f.fact_type}) ${f.fact_text}`).join("\n");

  return {
    businessName: profile?.business_name || "our business",
    service: profile?.industry || "our services",
    businessHours: profile?.business_hours?.trim() || null,
    escalationRules: profile?.escalation_rules?.trim() || null,
    knownFacts,
  };
}

/**
 * The one channel-specific difference in an otherwise identical prompt:
 * SMS needs to stay short because it's a text message, a chat widget can
 * hold a normal conversational reply length.
 */
function messageLengthRule(channel: ReceptionistChannel): string {
  return channel === "sms"
    ? "Keep messages SHORT (under 2 sentences) - this is SMS"
    : "Keep messages concise (2-3 sentences at most) - this is a website chat widget, not email";
}

export function buildReceptionistSystemPrompt(
  context: BusinessContext,
  channel: ReceptionistChannel,
): string {
  return `You are the friendly AI receptionist for ${context.businessName}, a ${context.service} business. Your job is to:
1. Understand what the customer needs
2. Answer basic questions about services
3. Try to book an appointment (ask for their availability)
4. ${messageLengthRule(channel)}
5. Be warm, professional, and helpful
6. If they want to book, ask "What days/times work best for you this week?"
7. If they seem booked, update with "Great! We'll confirm with you shortly."
${context.businessHours ? `\nBusiness hours: ${context.businessHours}` : ""}
${context.escalationRules ? `\nEscalation rules for this business (follow exactly when they apply): ${context.escalationRules}` : ""}
${context.knownFacts ? `\nKnown facts about this business (real and confirmed - use them when they answer the customer's question):\n${context.knownFacts}\n\nFor anything NOT covered by the facts above, never make up a price or promise a specific time - stay general and offer to follow up.` : "Never make up prices. Never promise specific times."}
Keep it simple.`;
}

/**
 * Single Anthropic call for the customer-facing reply. Returns null (never
 * throws) on any failure so callers can fall back to a canned message
 * rather than breaking the response already in flight.
 */
export async function generateReceptionistReply(
  apiKey: string,
  systemPrompt: string,
  conversationHistory: { role: string; content: string }[],
): Promise<string | null> {
  try {
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
        system: systemPrompt,
        messages: conversationHistory,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text || null;
  } catch (err) {
    console.error("[aiReceptionist] reply generation failed", err);
    return null;
  }
}

/**
 * Same grounding as buildReceptionistSystemPrompt, reshaped for Telnyx's AI
 * Assistant dynamic variables (a flat string map resolved into a static
 * Instructions template at call start - see the Voice AI phase-0 spike).
 * businessUserId and callerPhone ride along only so they can be bound as
 * hidden, non-model-supplied parameters on the book_appointment/escalate
 * webhook tools; they're never spoken or shown to the model as content.
 */
export function buildVoiceDynamicVariables(
  context: BusinessContext,
  businessUserId: string,
  callerPhone: string,
): Record<string, string> {
  return {
    business_user_id: businessUserId,
    caller_phone: callerPhone,
    business_name: context.businessName,
    service: context.service,
    business_hours:
      context.businessHours || "not specified - never make up hours, offer to have someone confirm",
    escalation_rules:
      context.escalationRules ||
      "none configured - use your own judgment on what needs a human callback",
    known_facts:
      context.knownFacts || "none confirmed yet - never invent a price or promise a specific time",
  };
}

export interface QuoteExtraction {
  quoteGiven: boolean;
  serviceType: ServiceTypeKey | "other" | null;
  quotedPrice: number | null;
  confidence: "high" | "low";
}

/**
 * Best-effort structured extraction: did the business just state a real
 * price or estimate for a specific service? Same conservative pattern as
 * detectBooking (a second AI call, high-confidence-only, never throws) -
 * used to decide whether to start the Day 1/5/14 follow-up sequence for a
 * quote that didn't turn into a booking.
 */
export async function detectQuote(
  apiKey: string,
  conversationHistory: { role: string; content: string }[],
): Promise<QuoteExtraction | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 250,
        system: `You analyze a conversation between a home-services business and a customer to detect whether the business just stated a real price or estimate for a specific service.

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "quoteGiven": boolean,
  "serviceType": one of "hvac_tuneup", "hvac_repair", "hvac_install", "plumbing", "plumbing_emergency", "roofing", "electrical", "cleaning", "landscaping", "pest_control", "other", or null,
  "quotedPrice": integer (whole dollars) or null,
  "confidence": "high" or "low"
}

Rules:
- quoteGiven is true ONLY if the business side of the conversation stated an actual number or price tied to a specific service - not just the customer asking about cost, and not just general talk about pricing.
- quotedPrice is the exact number the business stated, and ONLY that number. If the business gave a range ("$200 to $400") or a vague answer ("depends on the job"), set quotedPrice to null - never average a range or estimate a figure yourself. It is only ever a number that was literally said.
- serviceType must be your best match from the fixed list above, or "other" if it doesn't fit any category, or null if unclear.
- confidence is "high" only when a specific service and a specific number were both clearly stated. Use "low" for anything vague, a range, or tentative.
- If no price was ever stated, return quoteGiven: false, serviceType: null, quotedPrice: null, confidence: "low".`,
        messages: conversationHistory,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text);
    if (typeof parsed?.quoteGiven !== "boolean") return null;
    return parsed as QuoteExtraction;
  } catch (err) {
    console.error("[aiReceptionist] quote detection failed", err);
    return null;
  }
}

export interface BookingExtraction {
  bookingConfirmed: boolean;
  customerName: string | null;
  serviceType: ServiceTypeKey | "other" | null;
  scheduledAt: string | null;
  confidence: "high" | "low";
}

/**
 * Best-effort structured extraction over the conversation so far: did the
 * customer and AI just agree on a specific time? This is a second,
 * conservative AI call (only acts on high-confidence, valid-future results
 * - the caller's job, not this function's) - never throws, since a failed
 * extraction must not break the customer-facing reply that already went
 * out.
 */
export async function detectBooking(
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
        system: `You analyze a conversation between a home-services business and a customer to detect whether a specific appointment was just confirmed.

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
- bookingConfirmed is true ONLY if both a specific day/time AND the type of work are clearly agreed in the conversation - not just requested or discussed.
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
    console.error("[aiReceptionist] booking detection failed", err);
    return null;
  }
}
