/**
 * Business Memory V1: a few high-confidence, deterministic observations
 * about how THIS business's own history actually looks - never an LLM
 * feature, never a probability, never a cross-business comparison. Every
 * memory here is a plain aggregate over real rows this business already
 * owns, gated behind a minimum sample size so a business with almost no
 * history gets no memories at all rather than a misleading one.
 *
 * Kept separate from business_facts on purpose: business_facts is what
 * the owner told Lanavix (services offered, hours, pricing); this is what
 * Lanavix observed happening.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WINDOW_DAYS = 90;

// Conservative, deliberately small floors - see the Slice 9 report for why
// each was chosen. A "most common" claim additionally requires the top
// count to beat the runner-up outright; a tie proves nothing.
const MIN_SAMPLES_FOR_SERVICE = 5;
const MIN_SAMPLES_FOR_VALUE = 3;
const MIN_SAMPLES_FOR_SOURCE_SECTION = 3;
// conversation_intelligence is sparse and write-only elsewhere in this
// codebase (see the pre-Slice-6 architecture investigation) - held to a
// higher floor than the other memories precisely because it's the
// least-trusted source here.
const MIN_SAMPLES_FOR_TIME_TO_BOOK = 5;

const SOURCE_LABEL: Record<string, string> = {
  manual: "Added manually",
  inbound_sms: "Inbound SMS",
  lead_blast: "Outreach",
  web_chat: "Web chat",
};

interface AppointmentRow {
  service_type: string;
  status: string;
  source: string;
}

interface QuoteRow {
  quoted_price: number | null;
}

interface ConversationIntelligenceRow {
  time_to_book_minutes: number | null;
}

export interface BusinessMemory {
  windowDays: number;
  commonService: { label: string; count: number } | null;
  typicalQuoteValue: { median: number; sampleSize: number } | null;
  bookingsBySource: { source: string; label: string; count: number }[] | null;
  typicalTimeToBookMinutes: { median: number; sampleSize: number } | null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Most common service among appointments that actually happened or are
 * still on the books - cancelled/no_show jobs never occurred, so they
 * shouldn't shape "what this business usually does." Requires a real
 * majority, not a tie, over a minimum sample.
 */
function computeCommonService(bookedAppts: AppointmentRow[]): BusinessMemory["commonService"] {
  if (bookedAppts.length < MIN_SAMPLES_FOR_SERVICE) return null;
  const counts = new Map<string, number>();
  for (const a of bookedAppts) {
    counts.set(a.service_type, (counts.get(a.service_type) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [topService, topCount] = sorted[0];
  const runnerUpCount = sorted[1]?.[1] ?? 0;
  if (topCount < 2 || topCount === runnerUpCount) return null;
  return { label: topService, count: topCount };
}

/**
 * Typical quoted value - quote_follow_ups.quoted_price only, never mixed
 * with appointments.estimated_value. These answer different questions
 * ("what do we usually quote" vs. "what's a booked job actually worth"),
 * so keeping them separate isn't just simpler, it also means there's no
 * double-counting question to guard against for the same lifecycle.
 */
function computeTypicalQuoteValue(quotes: QuoteRow[]): BusinessMemory["typicalQuoteValue"] {
  const prices = quotes.map((q) => q.quoted_price).filter((p): p is number => p !== null);
  if (prices.length < MIN_SAMPLES_FOR_VALUE) return null;
  return { median: median(prices), sampleSize: prices.length };
}

/**
 * Real counts of booked/completed jobs by source - never a conversion
 * rate, since there's no reliable exposure/denominator data (how many
 * inquiries each source actually generated) to compute one honestly.
 */
function computeBookingsBySource(
  bookedAppts: AppointmentRow[],
): BusinessMemory["bookingsBySource"] {
  if (bookedAppts.length < MIN_SAMPLES_FOR_SOURCE_SECTION) return null;
  const counts = new Map<string, number>();
  for (const a of bookedAppts) {
    counts.set(a.source, (counts.get(a.source) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([source, count]) => ({ source, label: SOURCE_LABEL[source] ?? source, count }))
    .sort((a, b) => b.count - a.count);
}

function computeTypicalTimeToBook(
  rows: ConversationIntelligenceRow[],
): BusinessMemory["typicalTimeToBookMinutes"] {
  const minutes = rows.map((r) => r.time_to_book_minutes).filter((m): m is number => m !== null);
  if (minutes.length < MIN_SAMPLES_FOR_TIME_TO_BOOK) return null;
  return { median: Math.round(median(minutes)), sampleSize: minutes.length };
}

export async function generateBusinessMemory(userId: string): Promise<BusinessMemory> {
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: apptData }, { data: quoteData }, { data: ciData }] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select("service_type, status, source")
      .eq("user_id", userId)
      .gte("created_at", sinceIso),
    supabaseAdmin
      .from("quote_follow_ups")
      .select("quoted_price")
      .eq("user_id", userId)
      .gte("quoted_at", sinceIso)
      .not("quoted_price", "is", null),
    // business_id is a real FK to auth.users - the one part of
    // conversation_intelligence's linkage that's actually reliable.
    // outcome='booked' is the only outcome that ever gets a real
    // time_to_book_minutes value written (see sms-inbound.ts /
    // web-chat/$business_id.ts).
    supabaseAdmin
      .from("conversation_intelligence")
      .select("time_to_book_minutes")
      .eq("business_id", userId)
      .eq("outcome", "booked")
      .not("time_to_book_minutes", "is", null)
      .gte("created_at", sinceIso),
  ]);

  const bookedAppts = ((apptData as AppointmentRow[]) ?? []).filter(
    (a) => a.status !== "cancelled" && a.status !== "no_show",
  );

  return {
    windowDays: WINDOW_DAYS,
    commonService: computeCommonService(bookedAppts),
    typicalQuoteValue: computeTypicalQuoteValue((quoteData as QuoteRow[]) ?? []),
    bookingsBySource: computeBookingsBySource(bookedAppts),
    typicalTimeToBookMinutes: computeTypicalTimeToBook(
      (ciData as ConversationIntelligenceRow[]) ?? [],
    ),
  };
}
