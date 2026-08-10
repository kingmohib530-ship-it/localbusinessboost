/**
 * Coach / Daily Brief card generation. One shared engine, used by both the
 * live /app/coach page (via /api/coach/brief, recomputed on every visit so
 * a call the contractor already returned doesn't still show as open) and
 * the daily-brief cron (which persists the same output into daily_briefs
 * as a frozen historical record).
 *
 * Every card here is a direct read of data that already exists elsewhere
 * in this app - no invented numbers, no probabilities, no estimated
 * revenue. A card is only ever included when there is something real to
 * show; an empty result set means no card, not a placeholder.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SERVICE_TYPE_LABELS, type ServiceTypeKey } from "@/lib/serviceTypes";

export type CoachCardSeverity = "urgent" | "attention" | "info" | "positive";

export interface CoachCard {
  /** Stable identifier for this card type, e.g. "missed_calls" - used as a React key and for analytics later. */
  id: string;
  severity: CoachCardSeverity;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
  count: number;
}

/** 'YYYY-MM-DD' for a given instant in a given IANA timezone. */
function localDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function serviceLabel(serviceType: string | null): string | null {
  if (!serviceType) return null;
  return SERVICE_TYPE_LABELS[serviceType as ServiceTypeKey] || null;
}

/** Digits only, last 10 - good enough to compare two US phone numbers that may be formatted differently, not for storage or validation. */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10);
}

/**
 * Missed calls where the auto-text-back itself never went out (quota
 * exceeded, Twilio error) - conversations.status stays 'received' in
 * exactly that case (see missed-call.ts). This is the one unambiguous
 * "nobody has reached this customer at all" signal in the conversations
 * table: once an auto-text succeeds, sms-reply.ts always sends an
 * immediate AI (or canned-fallback) reply to anything the customer sends
 * back, so there is no reliable "customer replied and is still waiting on
 * the business" state to detect separately.
 */
async function missedCallsCard(userId: string): Promise<CoachCard | null> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("conversations")
    .select("id, customer_identifier, started_at")
    .eq("user_id", userId)
    .eq("channel", "sms")
    .eq("status", "received")
    .gte("started_at", since)
    .order("started_at", { ascending: true });

  if (!data || data.length === 0) return null;

  const oldestHours = Math.floor(
    (Date.now() - new Date(data[0].started_at).getTime()) / (1000 * 60 * 60),
  );
  const plural = data.length === 1 ? "call" : "calls";
  return {
    id: "missed_calls",
    severity: "urgent",
    title: `Return ${data.length} missed ${plural}`,
    detail:
      data.length === 1
        ? `This customer called ${oldestHours}h ago and never got a text back.`
        : `These customers called and never got a text back. The oldest was ${oldestHours}h ago.`,
    actionLabel: "Call customers",
    actionHref: "/app/receptionist",
    count: data.length,
  };
}

/**
 * Quotes given (via the AI receptionist) that haven't turned into a
 * booking yet - the same quote_follow_ups table the Day 1/5/14 nudge
 * sequence already tracks. Only "still active" (no response yet), since
 * there is no tracked "declined" state anywhere in this schema.
 */
async function estimatesCard(userId: string): Promise<CoachCard | null> {
  const { data } = await supabaseAdmin
    .from("quote_follow_ups")
    .select("id, quoted_at, quoted_price, service_type")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("quoted_at", { ascending: true });

  if (!data || data.length === 0) return null;

  const oldestDays = daysSince(data[0].quoted_at);
  const plural = data.length === 1 ? "estimate" : "estimates";
  const oldestLabel = serviceLabel(data[0].service_type);
  return {
    id: "estimates",
    severity: "attention",
    title: `Follow up on ${data.length} ${plural}`,
    detail:
      data.length === 1
        ? `${oldestLabel ? `Your ${oldestLabel} estimate` : "This estimate"} has been waiting ${oldestDays} day${oldestDays === 1 ? "" : "s"} with no response.`
        : `The oldest${oldestLabel ? ` (${oldestLabel})` : ""} has been waiting ${oldestDays} day${oldestDays === 1 ? "" : "s"}.`,
    actionLabel: "Send follow-ups",
    actionHref: "/app/receptionist",
    count: data.length,
  };
}

/** Today's confirmed/pending jobs, in this business's own local calendar day. */
async function scheduleCard(userId: string, timezone: string): Promise<CoachCard | null> {
  // A window wide enough to contain "today" in any timezone, filtered
  // precisely against the business's local date below.
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data } = await supabaseAdmin
    .from("appointments")
    .select("id, customer_name, service_type, scheduled_at, status")
    .eq("user_id", userId)
    .in("status", ["pending", "confirmed"])
    .gte("scheduled_at", windowStart)
    .lte("scheduled_at", windowEnd)
    .order("scheduled_at", { ascending: true });

  if (!data) return null;

  const today = localDateString(new Date(), timezone);
  const todays = data.filter((a) => localDateString(new Date(a.scheduled_at), timezone) === today);
  if (todays.length === 0) return null;

  const items = todays.map((a) => {
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(a.scheduled_at));
    const label = serviceLabel(a.service_type) || a.service_type;
    return `${time} ${label}`;
  });

  return {
    id: "todays_schedule",
    severity: "info",
    title: "Today's schedule",
    detail: items.join(" · "),
    actionLabel: "Open calendar",
    actionHref: "/app/calendar",
    count: todays.length,
  };
}

/**
 * Completed jobs with no review request sent yet. Joined in application
 * code, not SQL - there is no foreign key between appointments and
 * review_requests, only a shared customer_phone string that may be
 * formatted differently between the two, hence the normalize-and-compare
 * instead of a direct equality join.
 */
async function reviewAskCard(userId: string): Promise<CoachCard | null> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: completed }, { data: requested }] = await Promise.all([
    supabaseAdmin
      .from("appointments")
      .select("id, customer_name, customer_phone, scheduled_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .not("customer_phone", "is", null)
      .gte("scheduled_at", since),
    // Bounded to the same window as the completed-jobs query above - a
    // review request for one of those jobs can only have been sent on or
    // after the job itself, so it can't fall outside this window either.
    // Without this, the query re-fetches every review request this
    // business has ever sent, on every single Coach page load.
    supabaseAdmin
      .from("review_requests")
      .select("customer_phone")
      .eq("user_id", userId)
      .gte("sent_at", since),
  ]);

  if (!completed || completed.length === 0) return null;

  const alreadyRequested = new Set((requested || []).map((r) => normalizePhone(r.customer_phone)));
  const missing = completed.filter(
    (a) => a.customer_phone && !alreadyRequested.has(normalizePhone(a.customer_phone)),
  );
  if (missing.length === 0) return null;

  const plural = missing.length === 1 ? "job" : "jobs";
  return {
    id: "review_asks",
    severity: "positive",
    title: "Ask for reviews",
    detail:
      missing.length === 1
        ? `${missing[0].customer_name || "One completed job"} hasn't received a review request yet.`
        : `${missing.length} completed ${plural} still haven't received a review request.`,
    actionLabel: "Send requests",
    actionHref: "/app/reputation",
    count: missing.length,
  };
}

/**
 * Consumer-marketplace matches waiting on this business to accept or
 * decline. Time-sensitive (first-accept-wins across matched businesses),
 * already surfaced in /app/network - this card is a pointer to it, not a
 * second copy of that feature.
 */
async function networkRequestsCard(userId: string): Promise<CoachCard | null> {
  const { data } = await supabaseAdmin
    .from("consumer_request_matches")
    .select("id, request_id, consumer_requests(service_type, city)")
    .eq("user_id", userId)
    .eq("status", "pending");

  if (!data || data.length === 0) return null;

  const plural = data.length === 1 ? "request" : "requests";
  const first = data[0] as unknown as {
    consumer_requests: { service_type: string; city: string } | null;
  };
  const firstLabel = first.consumer_requests
    ? `${serviceLabel(first.consumer_requests.service_type) || first.consumer_requests.service_type} in ${first.consumer_requests.city}`
    : null;

  return {
    id: "network_requests",
    severity: "attention",
    title: `${data.length} new customer ${plural}`,
    detail:
      data.length === 1 && firstLabel
        ? `${firstLabel}. Other businesses can accept it first.`
        : "Waiting on your response. Other businesses can accept them first.",
    actionLabel: "Review requests",
    actionHref: "/app/network",
    count: data.length,
  };
}

/**
 * Generates today's full card list for one business. Cards are returned
 * in a fixed, deliberate order (most time-sensitive first) rather than
 * sorted by count or severity - matches how the brief should read top to
 * bottom, not how urgent any single card happens to be today.
 */
export async function generateDailyBriefCards(
  userId: string,
  timezone: string,
): Promise<CoachCard[]> {
  const [missedCalls, estimates, schedule, reviewAsk, networkRequests] = await Promise.all([
    missedCallsCard(userId),
    estimatesCard(userId),
    scheduleCard(userId, timezone),
    reviewAskCard(userId),
    networkRequestsCard(userId),
  ]);

  return [missedCalls, estimates, schedule, reviewAsk, networkRequests].filter(
    (card): card is CoachCard => card !== null,
  );
}
