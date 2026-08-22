import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserPlus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot, type LvStatus } from "@/components/StatusDot";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { daysAgo, formatTime } from "@/lib/timeFormat";

export const Route = createFileRoute("/_authenticated/app/")({
  // The one place a returning user gets sent into the onboarding wizard -
  // specifically here, not in the parent _authenticated guard, so this
  // check runs once on landing at /app rather than on every dashboard
  // navigation. Preserved from current main's Overview (the redesign
  // branch's version dropped this gate - see the Slice 1 report).
  beforeLoad: async ({ context }) => {
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", context.user.id)
      .maybeSingle();
    if (data?.onboarding_completed === false) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: Overview,
});

interface Profile {
  full_name: string | null;
  business_name: string | null;
}

interface ConversationRow {
  id: string;
  customer_name: string | null;
  customer_identifier: string;
  channel: string;
  status: string | null;
  // Slice 11's real conversation-start timestamp - the same field
  // Business Memory's typicalTimeToBookMinutes is measured from, so it's
  // the only honest source for a live waiting-time comparison (Slice 12).
  started_at: string | null;
}

interface MessageRow {
  conversation_id: string | null;
  direction: string | null;
  sent_at: string | null;
}

interface LeadRow {
  id: string;
  business_name: string | null;
  created_at: string;
}

interface QuoteRow {
  id: string;
  conversation_id: string;
  service_type: string | null;
  quoted_price: number | null;
  quoted_at: string;
}

interface QuoteStepRow {
  follow_up_id: string;
}

interface AppointmentRow {
  id: string;
  estimated_value: number | null;
  created_at: string;
  status: string;
}

interface TodayAppointmentRow {
  id: string;
  customer_name: string;
  service_type: string;
  scheduled_at: string;
  status: string;
}

// Opportunity Intelligence reads two broader queries than the ones above -
// Needs You's `quotes` is scoped to status=active only (all it needs for
// staleness), and `appointments` excludes cancelled and is windowed to two
// weeks (all it needs for This Week's revenue tile). Neither can answer
// "what's the full current state of every recent opportunity," so this is
// a second, deliberately separate read rather than widening those two and
// risking a regression in logic that's already shipped and approved.
interface OpportunityQuoteRow {
  id: string;
  conversation_id: string;
  service_type: string | null;
  quoted_price: number | null;
  quoted_at: string;
  status: string;
}

interface OpportunityAppointmentRow {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  service_type: string;
  scheduled_at: string;
  status: string;
  estimated_value: number | null;
  // Real FK (Slice 7) - populated by both automated booking paths at
  // appointment creation, null for manual Calendar appointments and any
  // appointment created before this column existed.
  conversation_id: string | null;
  source: string;
}

// Attribution (Slice 8) - what Lanavix can honestly claim about an
// opportunity, strictly in that order of evidence strength:
//   unattributed        - no real conversation trail at all (manual, or a
//                          historical/unlinkable row)
//   lanavix_assisted    - a real Lanavix conversation is behind this job
//                          (explicit conversation_id, or - for a row from
//                          before that column existed - the channel itself
//                          already proves it: source is inbound_sms or
//                          web_chat, both only ever set by the automated
//                          booking paths)
//   automation_touched  - assisted, AND at least one Day 1/5/14 automated
//                          follow-up step actually sent before the booking
// This is evidence of participation, not a claim of causing the outcome -
// automation_touched never implies Lanavix caused the booking, only that
// it happened.
type AttributionLevel = "unattributed" | "lanavix_assisted" | "automation_touched";

const ATTRIBUTION_LABEL: Record<AttributionLevel, string | null> = {
  unattributed: null,
  lanavix_assisted: "Lanavix assisted",
  automation_touched: "Automation followed up",
};

// source values that only ever get set by an automated booking path (see
// telnyx/sms-inbound.ts and web-chat/$business_id.ts) - real evidence of
// participation on its own, with no relationship to guess at, for rows
// created before appointments.conversation_id existed. lead_blast is
// deliberately excluded: it's the outbound B2B prospecting flow, a
// different product surface from the inbound conversation lifecycle this
// attribution model describes.
const LANAVIX_SOURCES = new Set(["inbound_sms", "web_chat"]);

type OpportunityState = "needs_you" | "working" | "booked" | "won" | "lost";

interface Opportunity {
  id: string;
  customerName: string;
  state: OpportunityState;
  value: number | null;
  reason: string;
  actionLabel: string;
  actionHref: string;
  since: string;
  attribution: AttributionLevel;
  // Business Memory V1 (Slice 9/10) secondary context - only ever set from
  // quote_follow_ups.quoted_price, never appointments.estimated_value (see
  // business-memory.server.ts: the two answer different questions and
  // shouldn't be mixed). Null for any opportunity not built directly from a
  // quote row, and for a quote-derived one whose deviation from this
  // business's own typical quote didn't clear the noise threshold.
  quoteMemoryNote: string | null;
  // Business Memory V1 (Slice 9/12) secondary context - only ever set for
  // an unresolved opportunity (needs_you/working) with a real, known
  // conversation.started_at. Never set for booked/won/lost opportunities
  // (Slice 12's own scope - a resolved job isn't "still waiting" on
  // anything), and never backed by a phone-match guess.
  waitingTimeNote: string | null;
  // Decision Support V1 (Slice 13) - a plain restatement of the existing
  // state, never a new state machine. Only ever set for needs_you
  // ("Needs attention") or working ("Lanavix handling"); null for
  // booked/won/lost, where the existing state label already says
  // everything worth saying and a third "no action needed" label would
  // just be noise (see the Slice 13 report).
  decisionLabel: "Needs attention" | "Lanavix handling" | null;
  // Decision Support V1 (Slice 13) - one composed, deterministic sentence
  // explaining decisionLabel, with quoteMemoryNote/waitingTimeNote folded
  // in as supporting clauses when they qualify. Memory only ever adds
  // context here; it can never change decisionLabel or this opportunity's
  // state. Null whenever decisionLabel is null.
  decisionExplanation: string | null;
  // Safe Actions V1 (Slice 15) - the raw quote_follow_ups.id, only for an
  // opportunity built directly from a quote row (never an appointment or
  // bare conversation). This is the one thing the "Mark lost" quick
  // action needs that customerName/reason/etc. don't already carry.
  quoteId: string | null;
}

// The two Business Memory signals Opportunity Intelligence reuses (see
// src/lib/business-memory.server.ts) - deliberately not the full
// BusinessMemory shape: Overview has no use for commonService or
// bookingsBySource, and declaring only what's consumed keeps it obvious
// this slice reused Slice 9's aggregation rather than recomputing
// anything client-side.
interface BusinessMemorySignals {
  typicalQuoteValue: { median: number; sampleSize: number } | null;
  typicalTimeToBookMinutes: { median: number; sampleSize: number } | null;
}

// A large enough gap to be a genuinely notable pattern rather than routine
// quote-to-quote variance (home-services quotes for the same business can
// legitimately range from a small diagnostic to a full install). 30% keeps
// a $1,550 quote silent against a $1,525 median while still surfacing a
// quote that's meaningfully out of this business's usual range.
const QUOTE_DEVIATION_THRESHOLD_PCT = 30;

/**
 * Factual, non-predictive comparison of one quote against this business's
 * own median known quote - never a claim about likelihood to close, never
 * an adjective ("expensive", "risky"), just the calculated percentage.
 * Returns null below the noise threshold or when either side of the
 * comparison isn't real (no quote value, or Business Memory hasn't cleared
 * its own minimum sample size for this business yet).
 */
function quoteValueNote(
  quotedPrice: number | null,
  typicalQuoteValue: BusinessMemorySignals["typicalQuoteValue"],
): string | null {
  if (quotedPrice === null || !typicalQuoteValue || typicalQuoteValue.median <= 0) return null;
  const pct = Math.round(
    ((quotedPrice - typicalQuoteValue.median) / typicalQuoteValue.median) * 100,
  );
  if (Math.abs(pct) < QUOTE_DEVIATION_THRESHOLD_PCT) return null;
  return pct > 0
    ? `${pct}% above your typical known quote`
    : `${Math.abs(pct)}% below your typical known quote`;
}

// Conservative on purpose: exceeding the median by a single minute proves
// nothing. Both a relative and an absolute floor have to clear before this
// renders, so a business whose typical booking time is short (e.g. 20 min)
// doesn't get flagged over a routine extra 10-15 minutes, and a business
// whose typical time is long (e.g. 2 hours) doesn't get flagged the moment
// it's technically 1.5x over if that's still a small number of minutes.
const WAITING_TIME_RELATIVE_THRESHOLD = 1.5;
const WAITING_TIME_ABSOLUTE_THRESHOLD_MINUTES = 30;

/**
 * Factual, non-predictive comparison of how long this specific opportunity
 * has been waiting against how long this business's own bookings usually
 * take - never a countdown, never a claim the customer is at risk of
 * leaving, just a plain observation. Returns null whenever either side of
 * the comparison isn't real (no reliable conversation start, or Business
 * Memory hasn't cleared its own minimum sample size), or when the gap is
 * still small enough to be routine.
 */
function waitingTimeMemoryNote(
  startedAt: string | null | undefined,
  typicalTimeToBookMinutes: BusinessMemorySignals["typicalTimeToBookMinutes"],
): string | null {
  if (!startedAt || !typicalTimeToBookMinutes || typicalTimeToBookMinutes.median <= 0) return null;
  const startedMs = new Date(startedAt).getTime();
  if (isNaN(startedMs)) return null;
  const elapsedMinutes = (Date.now() - startedMs) / 60000;
  if (elapsedMinutes < 0) return null;
  const typical = typicalTimeToBookMinutes.median;
  const clearsRelative = elapsedMinutes >= WAITING_TIME_RELATIVE_THRESHOLD * typical;
  const clearsAbsolute = elapsedMinutes - typical >= WAITING_TIME_ABSOLUTE_THRESHOLD_MINUTES;
  if (!clearsRelative || !clearsAbsolute) return null;
  return "waiting longer than your typical booking time";
}

/**
 * Decision Support V1 (Slice 13): composes one deterministic sentence for
 * an unresolved (needs_you/working) opportunity from its already-real
 * state reason, with quoteMemoryNote/waitingTimeNote folded in as
 * supporting clauses when they qualify. Memory can only add a factual
 * clause here - it never changes baseSentence, never changes
 * decisionLabel, and never implies risk, probability, or urgency.
 */
function decisionExplanation(
  baseSentence: string,
  quoteMemoryNote: string | null,
  waitingTimeNote: string | null,
): string {
  const clauses: string[] = [];
  if (quoteMemoryNote) clauses.push(`This quote is ${quoteMemoryNote}.`);
  if (waitingTimeNote) clauses.push(`This has also been ${waitingTimeNote}.`);
  return clauses.length > 0 ? `${baseSentence}. ${clauses.join(" ")}` : `${baseSentence}.`;
}

const OPPORTUNITY_LIMIT = 8;

const OPPORTUNITY_STATE_TO_DOT: Record<OpportunityState, LvStatus> = {
  needs_you: "waiting_on_you",
  working: "automated",
  booked: "booked",
  won: "done",
  lost: "failed",
};

const OPPORTUNITY_STATE_LABEL: Record<OpportunityState, string> = {
  needs_you: "Needs you",
  working: "Lanavix working",
  booked: "Booked",
  won: "Won",
  lost: "Lost",
};

/** Digits only, last 10 - the same heuristic phone match Jobs, Quotes, and
 * Coach already use to bridge tables with no real foreign key between
 * them. Not a reliable identity match, just the best available one. */
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

function appointmentToOpportunity(
  a: OpportunityAppointmentRow,
  reviewRequestPhones: Set<string>,
  automationTouched = false,
): Opportunity {
  const state: OpportunityState =
    a.status === "completed"
      ? "won"
      : a.status === "cancelled" || a.status === "no_show"
        ? "lost"
        : "booked";
  let reason: string;
  if (state === "won") {
    const normPhone = normalizePhone(a.customer_phone);
    reason =
      normPhone && reviewRequestPhones.has(normPhone) ? "Review request sent" : "Job completed";
  } else if (state === "lost") {
    reason = a.status === "no_show" ? "Marked as no-show" : "Cancelled";
  } else {
    reason = "Job scheduled";
  }
  const assisted = !!a.conversation_id || LANAVIX_SOURCES.has(a.source);
  const attribution: AttributionLevel = automationTouched
    ? "automation_touched"
    : assisted
      ? "lanavix_assisted"
      : "unattributed";
  return {
    id: `appt-${a.id}`,
    customerName: a.customer_name,
    state,
    value: a.estimated_value,
    reason,
    actionLabel: "View job",
    actionHref: "/app/jobs",
    since: a.scheduled_at,
    attribution,
    // An appointment's value is estimated_value, a different field from
    // the quote history Business Memory's median is built from - never
    // carried forward here (see the Opportunity.quoteMemoryNote comment).
    quoteMemoryNote: null,
    // Booked/won/lost is always this function's state (see above) - a
    // resolved job is never "still waiting," so waiting-time context is
    // out of scope here by construction, not just by choice.
    waitingTimeNote: null,
    // Decision Support (Slice 13) is scoped to needs_you/working only -
    // see the interface comment.
    decisionLabel: null,
    decisionExplanation: null,
    // An appointment is never built from a quote row directly - see the
    // Opportunity.quoteId comment.
    quoteId: null,
  };
}

// Slice 14: new leads (outbound prospecting via the Lead Generator) are a
// genuinely different signal from an opportunity's needs_you state - a
// lead isn't a customer conversation lifecycle, so it can't be part of
// the Action Queue's eligibility model. Preserved as its own small,
// separate block instead of folded into the queue (see the Slice 14
// report for why unanswered conversations and stale quotes - the two
// other former "Needs You" item kinds - were removed from here:
// they're now sourced directly from Opportunity Intelligence's own
// needs_you state instead of a second, parallel computation).
interface NewLeadItem {
  id: string;
  businessName: string;
  since: string;
}

const NEW_LEADS_LIMIT = 3;
const ACTION_QUEUE_LIMIT = 5;

/** Most recent Monday 00:00 local time. */
function startOfWeek(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDelta(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? "new this week" : null;
  const diff = current - previous;
  if (diff === 0) return "flat vs last week";
  const pct = Math.round((diff / previous) * 100);
  return `${diff > 0 ? "+" : ""}${pct}% vs last week`;
}

function Overview() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [quotesWithPendingStep, setQuotesWithPendingStep] = useState<Set<string>>(new Set());
  const [quotesWithSentStep, setQuotesWithSentStep] = useState<Set<string>>(new Set());
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppointmentRow[]>([]);
  const [opportunityQuotes, setOpportunityQuotes] = useState<OpportunityQuoteRow[]>([]);
  const [opportunityAppointments, setOpportunityAppointments] = useState<
    OpportunityAppointmentRow[]
  >([]);
  const [reviewRequestPhones, setReviewRequestPhones] = useState<Set<string>>(new Set());
  const [hasAnyHistory, setHasAnyHistory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAllNewLeads, setShowAllNewLeads] = useState(false);
  const [businessMemory, setBusinessMemory] = useState<BusinessMemorySignals | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    async function load() {
      try {
        setError("");
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const twoWeeksAgoIso = new Date(Date.now() - 14 * 86400000).toISOString();
        const thirtyDaysAgoIso = new Date(Date.now() - 30 * 86400000).toISOString();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart.getTime() + 86400000);

        const [
          { data: profileData, error: profileErr },
          { data: conversationData, error: conversationErr },
          { data: messageData, error: messageErr },
          { data: leadData, error: leadErr },
          { data: quoteData, error: quoteErr },
          { data: appointmentData, error: appointmentErr },
          { data: todayAppointmentData, error: todayAppointmentErr },
          { data: opportunityQuoteData, error: opportunityQuoteErr },
          { data: opportunityAppointmentData, error: opportunityAppointmentErr },
          { data: reviewRequestData, error: reviewRequestErr },
          { count: everConversationCount },
          { count: everLeadCount },
          { count: everAppointmentCount },
        ] = await Promise.all([
          supabase.from("profiles").select("full_name, business_name").eq("id", user.id).single(),
          supabase
            .from("conversations")
            .select("id, customer_name, customer_identifier, channel, status, started_at")
            .eq("user_id", user.id)
            .neq("status", "booked"),
          supabase
            .from("conversation_messages")
            .select("conversation_id, direction, sent_at")
            .eq("user_id", user.id)
            .order("sent_at", { ascending: false })
            .limit(300),
          supabase
            .from("lead_profiles")
            .select("id, business_name, created_at")
            .eq("user_id", user.id)
            .eq("status", "new")
            .gte("created_at", twoWeeksAgoIso),
          supabase
            .from("quote_follow_ups")
            .select("id, conversation_id, service_type, quoted_price, quoted_at")
            .eq("user_id", user.id)
            .eq("status", "active"),
          supabase
            .from("appointments")
            .select("id, estimated_value, created_at, status")
            .eq("user_id", user.id)
            .neq("status", "cancelled")
            .gte("created_at", twoWeeksAgoIso),
          supabase
            .from("appointments")
            .select("id, customer_name, service_type, scheduled_at, status")
            .eq("user_id", user.id)
            .neq("status", "cancelled")
            .gte("scheduled_at", todayStart.toISOString())
            .lt("scheduled_at", todayEnd.toISOString())
            .order("scheduled_at", { ascending: true }),
          // Opportunity Intelligence: every quote status (not just active),
          // so a booked/cancelled/completed quote can also be represented -
          // Needs You's own `quotes` query above intentionally only fetches
          // active ones.
          supabase
            .from("quote_follow_ups")
            .select("id, conversation_id, service_type, quoted_price, quoted_at, status")
            .eq("user_id", user.id)
            .order("quoted_at", { ascending: false })
            .limit(50),
          // Every recent appointment status (not just non-cancelled), for
          // the same reason - This Week's `appointments` query above
          // deliberately excludes cancelled ones.
          supabase
            .from("appointments")
            .select(
              "id, customer_name, customer_phone, service_type, scheduled_at, status, estimated_value, conversation_id, source",
            )
            .eq("user_id", user.id)
            .order("scheduled_at", { ascending: false })
            .limit(50),
          // Same 30-day phone-matched "already asked" signal Jobs/Coach use.
          supabase
            .from("review_requests")
            .select("customer_phone")
            .eq("user_id", user.id)
            .gte("sent_at", thirtyDaysAgoIso),
          supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("lead_profiles")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        const firstErr =
          profileErr ||
          conversationErr ||
          messageErr ||
          leadErr ||
          quoteErr ||
          appointmentErr ||
          todayAppointmentErr ||
          opportunityQuoteErr ||
          opportunityAppointmentErr ||
          reviewRequestErr;
        if (firstErr) {
          console.error("[overview] failed to load one or more queries", firstErr);
          setError("Some of your dashboard data couldn't load. What did load is still accurate.");
        }

        // Same real signal Quotes itself uses to decide open vs.
        // needs-follow-up (quote_follow_up_steps, not the quote's raw
        // age) - fetched as a second pass since it depends on which quote
        // ids came back above. Scoped to opportunityQuoteData's ids (every
        // status, not just active) since Attribution (Slice 8) also needs
        // to know which quotes ever had a step actually SENT, not just
        // which active ones have one still PENDING - one query answers
        // both instead of two.
        const relevantQuoteIds = ((opportunityQuoteData as OpportunityQuoteRow[]) ?? []).map(
          (q) => q.id,
        );
        let pendingStepQuoteIds = new Set<string>();
        let sentStepQuoteIds = new Set<string>();
        if (relevantQuoteIds.length > 0) {
          const { data: stepData, error: stepErr } = await supabase
            .from("quote_follow_up_steps")
            .select("follow_up_id, status")
            .in("follow_up_id", relevantQuoteIds)
            .in("status", ["pending", "sent"]);
          if (stepErr) {
            console.error("[overview] failed to load quote_follow_up_steps", stepErr);
          } else {
            const rows = (stepData as (QuoteStepRow & { status: string })[]) ?? [];
            pendingStepQuoteIds = new Set(
              rows.filter((s) => s.status === "pending").map((s) => s.follow_up_id),
            );
            sentStepQuoteIds = new Set(
              rows.filter((s) => s.status === "sent").map((s) => s.follow_up_id),
            );
          }
        }

        setProfile(profileData);
        setConversations((conversationData as ConversationRow[]) ?? []);
        setMessages((messageData as MessageRow[]) ?? []);
        setLeads((leadData as LeadRow[]) ?? []);
        setQuotes((quoteData as QuoteRow[]) ?? []);
        setQuotesWithPendingStep(pendingStepQuoteIds);
        setQuotesWithSentStep(sentStepQuoteIds);
        setAppointments((appointmentData as AppointmentRow[]) ?? []);
        setTodayAppointments((todayAppointmentData as TodayAppointmentRow[]) ?? []);
        setOpportunityQuotes((opportunityQuoteData as OpportunityQuoteRow[]) ?? []);
        setOpportunityAppointments(
          (opportunityAppointmentData as OpportunityAppointmentRow[]) ?? [],
        );
        setReviewRequestPhones(
          new Set(
            ((reviewRequestData as { customer_phone: string }[]) ?? [])
              .map((r) => normalizePhone(r.customer_phone))
              .filter((p): p is string => !!p),
          ),
        );
        setHasAnyHistory(
          (everConversationCount ?? 0) > 0 ||
            (everLeadCount ?? 0) > 0 ||
            (everAppointmentCount ?? 0) > 0,
        );
      } catch (e) {
        console.error("[overview]", e);
        setError("Couldn't load your Overview. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Business Memory (Slice 9) reused as secondary opportunity context - a
  // separate, isolated fetch of the same endpoint Coach already calls, not
  // duplicated aggregation logic. Observational only: fails silently with
  // no error banner, since a missing memory note is never worth surfacing
  // a second error state for on top of the main Overview load above.
  useEffect(() => {
    async function loadBusinessMemory() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/coach/business-memory", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setBusinessMemory(data.memory ?? null);
        else console.error("[overview] business memory load failed", data.error);
      } catch (err) {
        console.error("[overview] business memory load failed", err);
      }
    }
    loadBusinessMemory();
  }, []);

  // New leads (Lead Generator prospecting) - a separate signal from
  // Opportunity Intelligence entirely (see the NewLeadItem comment above),
  // preserved unchanged from the old Needs You section's own lead
  // handling: oldest-first.
  const newLeads = useMemo<NewLeadItem[]>(() => {
    return [...leads]
      .map((l) => ({
        id: `lead-${l.id}`,
        businessName: l.business_name || "Unnamed prospect",
        since: l.created_at,
      }))
      .sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime());
  }, [leads]);

  const newLeadsVisible = newLeads.filter((item) => !dismissed.has(item.id));
  const newLeadsShown = showAllNewLeads
    ? newLeadsVisible
    : newLeadsVisible.slice(0, NEW_LEADS_LIMIT);

  // Opportunity Intelligence: one row per real customer lifecycle, built
  // with precedence so the same underlying opportunity never shows up
  // twice in contradictory states. Quotes go first, since
  // quote_follow_ups.conversation_id is a real foreign key back to
  // conversations - any conversation a quote already represents is never
  // separately listed as "needs a reply." A quote that's been marked
  // booked is, in turn, resolved forward to the appointment it became
  // (phone-matched - there's no real link from a quote to an appointment,
  // only from a quote to its conversation), so a won/lost/booked job is
  // represented once, by whichever entity actually reflects its current
  // state, not by both the quote and the job.
  const opportunities = useMemo<Opportunity[]>(() => {
    const latestByConversation = new Map<string, MessageRow>();
    for (const m of messages) {
      if (!m.conversation_id || !m.sent_at) continue;
      if (!latestByConversation.has(m.conversation_id))
        latestByConversation.set(m.conversation_id, m);
    }
    const conversationById = new Map(conversations.map((c) => [c.id, c]));
    // A conversation is already represented elsewhere - by its quote, or
    // (Slice 7) directly by an appointment that carries a real
    // conversation_id from an automated booking with no quote step at all
    // - and should never also show up as "still needs a reply."
    const claimedConversationIds = new Set([
      ...opportunityQuotes.map((q) => q.conversation_id),
      ...opportunityAppointments.map((a) => a.conversation_id).filter((id): id is string => !!id),
    ]);
    const usedApptIds = new Set<string>();
    const list: Opportunity[] = [];

    for (const q of opportunityQuotes) {
      const convo = conversationById.get(q.conversation_id);
      const customerName = convo?.customer_name || convo?.customer_identifier || "Unknown customer";

      // A quote only exists because of a real conversation FK, so it's
      // always at least "assisted" - "automation_touched" additionally
      // requires a step that actually fired (status='sent'), never just a
      // still-pending one, so a quote whose Day 1 nudge hasn't gone out
      // yet is never shown as if automation already acted.
      const quoteAttribution: AttributionLevel = quotesWithSentStep.has(q.id)
        ? "automation_touched"
        : "lanavix_assisted";
      // Slice 10: reuses Business Memory's typicalQuoteValue, the one
      // signal computed from the same field (quote_follow_ups.quoted_price)
      // this opportunity's own value already comes from - never mixed with
      // an appointment's estimated_value.
      const quoteMemoryNote = quoteValueNote(
        q.quoted_price,
        businessMemory?.typicalQuoteValue ?? null,
      );

      if (q.status === "active") {
        const working = quotesWithPendingStep.has(q.id);
        // Slice 12: needs_you/working only - an active quote is still
        // genuinely unresolved, so its underlying conversation's real
        // started_at is the honest lifecycle start to compare against
        // Business Memory's typical time-to-book.
        const waitingTimeNote = waitingTimeMemoryNote(
          convo?.started_at ?? null,
          businessMemory?.typicalTimeToBookMinutes ?? null,
        );
        // Slice 13: reuses the exact same real state this opportunity
        // already resolved to above - "working" means quote_follow_up_steps
        // genuinely still has a pending step, never an inference.
        const decisionLabel = working ? "Lanavix handling" : "Needs attention";
        const decisionExplanationText = decisionExplanation(
          working
            ? "Automated follow-up is still scheduled"
            : "Follow-ups are finished and the customer hasn't booked",
          quoteMemoryNote,
          waitingTimeNote,
        );
        list.push({
          id: `quote-${q.id}`,
          customerName,
          state: working ? "working" : "needs_you",
          value: q.quoted_price,
          reason: working
            ? "Automated follow-up scheduled"
            : "Follow-ups finished - customer hasn't booked",
          actionLabel: "View quote",
          actionHref: `/app/quotes?quote=${q.id}`,
          since: q.quoted_at,
          attribution: quoteAttribution,
          quoteMemoryNote,
          waitingTimeNote,
          decisionLabel,
          decisionExplanation: decisionExplanationText,
          quoteId: q.id,
        });
      } else if (q.status === "cancelled" || q.status === "completed") {
        list.push({
          id: `quote-${q.id}`,
          customerName,
          state: "lost",
          value: q.quoted_price,
          reason: "Quote didn't convert",
          actionLabel: "View quote",
          actionHref: `/app/quotes?quote=${q.id}`,
          since: q.quoted_at,
          attribution: quoteAttribution,
          quoteMemoryNote,
          // Resolved (lost) - out of Slice 12's scope, see the interface comment.
          waitingTimeNote: null,
          // Resolved (lost) - Decision Support (Slice 13) is scoped to
          // needs_you/working; a lost opportunity gets no recommendation
          // that could imply it's still active.
          decisionLabel: null,
          decisionExplanation: null,
          // Already lost - Slice 15's "Mark lost" quick action only ever
          // renders for state === "needs_you" anyway, but this is still a
          // real quote-backed opportunity, so the id is accurate.
          quoteId: q.id,
        });
      } else if (q.status === "booked") {
        // Slice 7: prefer the real conversation_id FK when the appointment
        // has one (every automated booking sets it now); the phone-match
        // heuristic is only a fallback for historical rows created before
        // this column existed, or where it's genuinely absent.
        const explicitMatch = opportunityAppointments.find(
          (a) => !usedApptIds.has(a.id) && a.conversation_id === q.conversation_id,
        );
        const normPhone = convo ? normalizePhone(convo.customer_identifier) : null;
        const phoneMatch =
          !explicitMatch && normPhone
            ? opportunityAppointments.find(
                (a) => !usedApptIds.has(a.id) && normalizePhone(a.customer_phone) === normPhone,
              )
            : undefined;
        const matchedAppt = explicitMatch ?? phoneMatch;
        if (matchedAppt) {
          usedApptIds.add(matchedAppt.id);
          list.push(
            appointmentToOpportunity(
              matchedAppt,
              reviewRequestPhones,
              quotesWithSentStep.has(q.id),
            ),
          );
        } else {
          // Known booked, but no matching job row found (e.g. the AI
          // booked it in a different conversation than we can trace, or
          // the phone match simply fails) - honest fallback rather than
          // guessing which appointment it was.
          list.push({
            id: `quote-${q.id}`,
            customerName,
            state: "booked",
            value: q.quoted_price,
            reason: "Booked",
            actionLabel: "View quote",
            actionHref: `/app/quotes?quote=${q.id}`,
            since: q.quoted_at,
            attribution: quoteAttribution,
            quoteMemoryNote,
            // Resolved (booked) - out of Slice 12's scope, see the interface comment.
            waitingTimeNote: null,
            // Resolved (booked) - Decision Support (Slice 13) is scoped to
            // needs_you/working only (see the Slice 13 report on why a
            // "no action needed" label was omitted for booked/won).
            decisionLabel: null,
            decisionExplanation: null,
            quoteId: q.id,
          });
        }
      }
    }

    for (const a of opportunityAppointments) {
      if (usedApptIds.has(a.id)) continue;
      list.push(appointmentToOpportunity(a, reviewRequestPhones));
    }

    for (const c of conversations) {
      if (claimedConversationIds.has(c.id)) continue;
      const last = latestByConversation.get(c.id);
      if (!last || last.direction !== "inbound" || !last.sent_at) continue;
      // Slice 12: this conversation IS the lifecycle - its own real
      // started_at is exactly the honest start point to compare.
      const bareConvoWaitingTimeNote = waitingTimeMemoryNote(
        c.started_at,
        businessMemory?.typicalTimeToBookMinutes ?? null,
      );
      list.push({
        id: `conv-${c.id}`,
        customerName: c.customer_name || c.customer_identifier,
        state: "needs_you",
        value: null,
        reason: "Waiting for your reply",
        actionLabel: "View conversation",
        actionHref: `/app/inbox?conversation=${c.id}`,
        since: last.sent_at,
        attribution: "lanavix_assisted",
        // No quote exists yet for a bare conversation - nothing to compare.
        quoteMemoryNote: null,
        waitingTimeNote: bareConvoWaitingTimeNote,
        decisionLabel: "Needs attention",
        decisionExplanation: decisionExplanation(
          "Customer is waiting for your reply",
          null,
          bareConvoWaitingTimeNote,
        ),
        // No quote exists yet for a bare conversation - see the
        // Opportunity.quoteId comment.
        quoteId: null,
      });
    }

    const priorityRank: Record<OpportunityState, number> = {
      needs_you: 0,
      working: 1,
      booked: 2,
      won: 3,
      lost: 4,
    };
    return list
      .sort((x, y) => {
        const p = priorityRank[x.state] - priorityRank[y.state];
        if (p !== 0) return p;
        return new Date(y.since).getTime() - new Date(x.since).getTime();
      })
      .slice(0, OPPORTUNITY_LIMIT);
  }, [
    conversations,
    messages,
    opportunityQuotes,
    quotesWithPendingStep,
    quotesWithSentStep,
    opportunityAppointments,
    reviewRequestPhones,
    businessMemory,
  ]);

  // Action Queue (Slice 14): the real human-required subset of Opportunity
  // Intelligence - needs_you only, never working/booked/won/lost (Lanavix-
  // handled or resolved items never belong in a human's action list).
  // Business Memory can only add context to an item already here (via
  // Decision Support's decisionExplanation); it never makes an opportunity
  // eligible on its own.
  //
  // Ordered unanswered conversations first, then exhausted quotes, oldest
  // waiting first within each - the same ordering the old Needs You
  // section used for these same two item types (see its removed comment),
  // deliberately not the newest-first order `opportunities` itself uses
  // above, which serves a different purpose (overall lifecycle recency,
  // not human urgency).
  const actionQueueAll = useMemo(() => {
    // Slice 16: actionHref can now carry a ?conversation=/?quote= deep-link
    // query string, so this checks the path prefix rather than exact
    // equality - the category, not the specific id, is what matters here.
    const categoryRank = (o: Opportunity) => (o.actionHref.startsWith("/app/inbox") ? 0 : 1);
    return opportunities
      .filter((o) => o.state === "needs_you")
      .sort((a, b) => {
        const rankDiff = categoryRank(a) - categoryRank(b);
        if (rankDiff !== 0) return rankDiff;
        return new Date(a.since).getTime() - new Date(b.since).getTime();
      });
  }, [opportunities]);
  const actionQueueShown = actionQueueAll.slice(0, ACTION_QUEUE_LIMIT);
  const hiddenActionQueueItems = actionQueueAll.slice(ACTION_QUEUE_LIMIT);
  const hasHiddenInboxItems = hiddenActionQueueItems.some((o) =>
    o.actionHref.startsWith("/app/inbox"),
  );
  const hasHiddenQuoteItems = hiddenActionQueueItems.some((o) =>
    o.actionHref.startsWith("/app/quotes"),
  );
  // Real count only (Phase 8) - never shown unless Lanavix is genuinely
  // still working on at least one opportunity.
  const workingOpportunityCount = opportunities.filter((o) => o.state === "working").length;
  // Slice 14: the Opportunities section below renders this instead of the
  // full `opportunities` list, so a needs_you item is never shown
  // prominently twice on the same page (see the Slice 14 report).
  const opportunitiesBelowQueue = opportunities.filter((o) => o.state !== "needs_you");

  // Only ever a sum of real, non-null values already visible in the list
  // above - never an estimate for opportunities where no price/value was
  // ever recorded, and never counting won/lost work as "currently" open.
  const workingValue = useMemo(() => {
    const relevant = opportunities.filter(
      (o) =>
        (o.state === "needs_you" || o.state === "working" || o.state === "booked") &&
        o.value !== null,
    );
    if (relevant.length === 0) return null;
    return relevant.reduce((sum, o) => sum + (o.value ?? 0), 0);
  }, [opportunities]);

  // One restrained, deterministic attribution summary - only ever counts
  // opportunities already in the list above (never a separate broader
  // query), and only ever sums real non-null values among the attributed
  // won ones specifically, never an estimate.
  const attributionSummary = useMemo(() => {
    const won = opportunities.filter((o) => o.state === "won");
    if (won.length === 0) return null;
    const assisted = won.filter((o) => o.attribution !== "unattributed");
    if (assisted.length === 0) return null;
    const knownValue = assisted
      .filter((o) => o.value !== null)
      .reduce((sum, o) => sum + (o.value ?? 0), 0);
    const hasKnownValue = assisted.some((o) => o.value !== null);
    return {
      assistedCount: assisted.length,
      wonCount: won.length,
      knownValue: hasKnownValue ? knownValue : null,
    };
  }, [opportunities]);

  // This Week / Last Week, Monday-anchored.
  const { thisWeek, lastWeek } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const lastWeekStart = new Date(weekStart.getTime() - 7 * 86400000);

    const inRange = (iso: string, start: Date, end: Date) => {
      const t = new Date(iso).getTime();
      return t >= start.getTime() && t < end.getTime();
    };

    const leadsThis = leads.filter((l) => inRange(l.created_at, weekStart, now)).length;
    const leadsLast = leads.filter((l) => inRange(l.created_at, lastWeekStart, weekStart)).length;
    const quotesThis = quotes.filter((q) => inRange(q.quoted_at, weekStart, now)).length;
    const quotesLast = quotes.filter((q) => inRange(q.quoted_at, lastWeekStart, weekStart)).length;
    const apptsThis = appointments.filter((a) => inRange(a.created_at, weekStart, now));
    const apptsLast = appointments.filter((a) => inRange(a.created_at, lastWeekStart, weekStart));
    const revenueThis = apptsThis.reduce((sum, a) => sum + (a.estimated_value || 0), 0);
    const revenueLast = apptsLast.reduce((sum, a) => sum + (a.estimated_value || 0), 0);

    return {
      thisWeek: {
        leads: leadsThis,
        quotes: quotesThis,
        jobs: apptsThis.length,
        revenue: revenueThis,
      },
      lastWeek: {
        leads: leadsLast,
        quotes: quotesLast,
        jobs: apptsLast.length,
        revenue: revenueLast,
      },
    };
  }, [leads, quotes, appointments]);

  function dismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  // Slice 15: called only after the server has actually confirmed the
  // "Mark lost" mutation - mirrors the exact new status the row now has,
  // rather than a separate "resolved" flag. opportunities/actionQueueAll
  // recompute from this automatically, so the item leaves the queue
  // because its real state changed (Phase 3), not because anything was
  // hidden client-side.
  function handleQuoteMarkedLost(quoteId: string) {
    setOpportunityQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: "cancelled" } : q)),
    );
  }

  const name = profile?.business_name || profile?.full_name || null;
  const isFirstRun = !loading && !error && !hasAnyHistory;
  const isQueueEmpty = !loading && !error && hasAnyHistory && actionQueueAll.length === 0;
  // A load error can leave actionQueueAll empty for a reason that has
  // nothing to do with being caught up - don't claim confidently that
  // nothing needs attention when we couldn't actually check.
  const isQueueUncertainDueToError = !loading && error && actionQueueAll.length === 0;

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[1080px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <h1 className="sr-only">Overview</h1>
        <p className="lv-body text-muted-foreground mb-6">
          {loading
            ? "Loading..."
            : name
              ? `Good to see you, ${name}.`
              : "What needs your attention today."}
        </p>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="lv-label text-destructive">Some data didn't load</p>
            <p className="lv-body text-foreground mt-0.5">{error}</p>
          </div>
        )}

        {/* Action Queue (Slice 14) - real, human-required items only. See
            the Slice 14 report for why this replaced the old "Needs You"
            section's unanswered-conversation and stale-quote handling
            rather than sitting alongside it as a second list. */}
        <section aria-labelledby="action-queue-heading" className="mb-8">
          {loading ? (
            <ActionQueueSkeleton />
          ) : isFirstRun ? (
            <FirstRunState />
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-3 gap-3">
                <h2 id="action-queue-heading" className="lv-section text-foreground">
                  Action queue
                </h2>
                {actionQueueAll.length > 0 && (
                  <span className="lv-meta text-muted-foreground whitespace-nowrap">
                    {actionQueueShown.length} of {actionQueueAll.length} need you
                  </span>
                )}
              </div>
              {isQueueEmpty ? (
                <ActionQueueEmptyState workingCount={workingOpportunityCount} />
              ) : isQueueUncertainDueToError ? (
                <div className="rounded-md border border-border bg-card px-4 py-6 text-center">
                  <p className="lv-body text-foreground font-medium">
                    Couldn't check for open items
                  </p>
                  <p className="lv-meta text-muted-foreground mt-1">
                    This section depends on data that didn't load. Refresh the page to try again.
                  </p>
                </div>
              ) : (
                <>
                  <ul className="space-y-2">
                    {actionQueueShown.map((o) => (
                      <OpportunityCard
                        key={o.id}
                        opportunity={o}
                        showQuickAction
                        onQuoteMarkedLost={handleQuoteMarkedLost}
                      />
                    ))}
                  </ul>
                  {(hasHiddenInboxItems || hasHiddenQuoteItems) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                      {hasHiddenInboxItems && (
                        <Link
                          to="/app/inbox"
                          className="inline-flex items-center gap-1 lv-label text-primary hover:underline"
                        >
                          View Inbox <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                      {hasHiddenQuoteItems && (
                        <Link
                          to="/app/quotes"
                          className="inline-flex items-center gap-1 lv-label text-primary hover:underline"
                        >
                          View Quotes <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>

        {/* New leads - a separate signal from the Action Queue (outbound
            prospecting, not a customer lifecycle) - only shown when there
            are real ones, never as an empty state of its own. */}
        {!loading && !isFirstRun && newLeadsVisible.length > 0 && (
          <section aria-labelledby="new-leads-heading" className="mb-8">
            <div className="flex items-baseline justify-between mb-3 gap-3">
              <h2 id="new-leads-heading" className="lv-section text-foreground">
                New leads
              </h2>
              <span className="lv-meta text-muted-foreground whitespace-nowrap">
                {newLeadsShown.length} of {newLeadsVisible.length}
              </span>
            </div>
            <ul className="space-y-2">
              {newLeadsShown.map((item) => (
                <NewLeadCard
                  key={item.id}
                  item={item}
                  onDismiss={() => dismiss(item.id)}
                  reducedMotion={reducedMotion}
                />
              ))}
            </ul>
            {!showAllNewLeads && newLeadsVisible.length > NEW_LEADS_LIMIT && (
              <button
                type="button"
                onClick={() => setShowAllNewLeads(true)}
                className="inline-flex items-center gap-1 lv-label text-primary hover:underline mt-3"
              >
                View all {newLeadsVisible.length}{" "}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </section>
        )}

        {/* Today's schedule */}
        <section aria-labelledby="today-heading" className="mb-8">
          <h2 id="today-heading" className="lv-section text-foreground mb-3">
            Today
          </h2>
          {loading ? (
            <Skeleton className="h-[60px] w-full rounded-md" />
          ) : todayAppointments.length === 0 ? (
            <div className="rounded-md border border-border bg-card px-4 py-4">
              <p className="lv-body text-muted-foreground">Nothing scheduled today.</p>
            </div>
          ) : (
            <ul className="rounded-md border border-border bg-card divide-y divide-border overflow-hidden">
              {todayAppointments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="lv-numbers text-foreground w-16 shrink-0">
                    {formatTime(a.scheduled_at)}
                  </span>
                  <span
                    className="lv-body text-foreground truncate flex-1 min-w-0"
                    title={a.customer_name}
                  >
                    {a.customer_name}
                  </span>
                  <span
                    className="lv-meta text-muted-foreground truncate shrink-0 max-w-[40%]"
                    title={a.service_type}
                  >
                    {a.service_type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* This Week */}
        <section aria-labelledby="this-week-heading">
          <h2 id="this-week-heading" className="lv-section text-foreground mb-1">
            This week
          </h2>
          <p className="lv-meta text-muted-foreground mb-3">
            Leads through to revenue · compared with last week
          </p>
          {loading ? (
            <ThisWeekSkeleton />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ThisWeekTile
                label="Leads received"
                value={thisWeek.leads}
                delta={formatDelta(thisWeek.leads, lastWeek.leads)}
              />
              <ThisWeekTile
                label="Quotes sent"
                value={thisWeek.quotes}
                delta={formatDelta(thisWeek.quotes, lastWeek.quotes)}
              />
              <ThisWeekTile
                label="Jobs booked"
                value={thisWeek.jobs}
                delta={formatDelta(thisWeek.jobs, lastWeek.jobs)}
              />
              <ThisWeekTile
                label="Revenue"
                value={`$${thisWeek.revenue.toLocaleString()}`}
                delta={formatDelta(thisWeek.revenue, lastWeek.revenue)}
              />
            </div>
          )}
        </section>

        {/* Opportunities */}
        <section aria-labelledby="opportunities-heading" className="mt-8">
          <h2 id="opportunities-heading" className="lv-section text-foreground mb-1">
            Opportunities
          </h2>
          <p className="lv-meta text-muted-foreground mb-3">
            Where each current customer opportunity stands, start to finish.
          </p>
          {loading ? (
            <OpportunitiesSkeleton />
          ) : opportunities.length === 0 ? (
            <div className="rounded-md border border-border bg-card px-4 py-6 text-center">
              <p className="lv-body text-foreground font-medium">No active opportunities yet</p>
              <p className="lv-meta text-muted-foreground mt-1">
                Once a customer reaches out or a job gets booked, it'll show up here.
              </p>
            </div>
          ) : (
            <>
              {workingValue !== null && (
                <p
                  className={`lv-meta text-muted-foreground ${attributionSummary ? "mb-1" : "mb-3"}`}
                >
                  <span className="lv-label text-foreground font-medium">
                    ${workingValue.toLocaleString()}
                  </span>{" "}
                  currently being worked
                </p>
              )}
              {attributionSummary && (
                <p className="lv-meta text-muted-foreground mb-3">
                  {attributionSummary.assistedCount} of {attributionSummary.wonCount} won job
                  {attributionSummary.wonCount === 1 ? "" : "s"} had Lanavix involvement
                  {attributionSummary.knownValue !== null &&
                    ` · $${attributionSummary.knownValue.toLocaleString()} known value`}
                </p>
              )}
              {/* Slice 14: needs_you opportunities are already visible in
                  the Action Queue above - excluded here so the same item
                  never appears twice as a prominent card on the same page.
                  workingValue/attributionSummary above still read the full
                  opportunities list, so those totals stay accurate. */}
              {opportunitiesBelowQueue.length > 0 ? (
                <ul className="space-y-2">
                  {opportunitiesBelowQueue.map((o) => (
                    <OpportunityCard key={o.id} opportunity={o} />
                  ))}
                </ul>
              ) : (
                <p className="lv-meta text-muted-foreground">
                  Every current opportunity needs your attention - see the queue above.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function NewLeadCard({
  item,
  onDismiss,
  reducedMotion,
}: {
  item: NewLeadItem;
  onDismiss: () => void;
  reducedMotion: boolean;
}) {
  const [leaving, setLeaving] = useState(false);

  function handleDismiss() {
    if (reducedMotion) {
      onDismiss();
      return;
    }
    setLeaving(true);
    window.setTimeout(onDismiss, 160);
  }

  const fullDetail = `New lead · found ${daysAgo(item.since)} ago`;

  return (
    <li
      className="overflow-hidden transition-[opacity,max-height,margin,padding] ease-out"
      style={{
        transitionDuration: reducedMotion ? "0ms" : "160ms",
        opacity: leaving ? 0 : 1,
        maxHeight: leaving ? 0 : 200,
        marginBottom: leaving ? 0 : undefined,
      }}
    >
      <div className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="lv-body text-foreground font-medium truncate" title={item.businessName}>
            {item.businessName}
          </p>
          <div className="flex items-center gap-2 min-w-0" title={fullDetail}>
            <StatusDot status="new" className="shrink-0" />
            <span className="lv-meta text-muted-foreground/40 shrink-0">·</span>
            <span className="lv-meta text-muted-foreground truncate">
              Found {daysAgo(item.since)} ago
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button asChild size="sm" variant="outline">
            <Link to="/app/agents">View</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-[38px] px-2 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </li>
  );
}

function OpportunityCard({
  opportunity,
  showQuickAction = false,
  onQuoteMarkedLost,
}: {
  opportunity: Opportunity;
  // Slice 15: the "Mark lost" quick action is Action-Queue-only - the
  // Opportunities section below reuses this same card for broader
  // lifecycle visibility, not quick actions, so it never passes this.
  showQuickAction?: boolean;
  onQuoteMarkedLost?: (quoteId: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [markingLost, setMarkingLost] = useState(false);
  const [markLostError, setMarkLostError] = useState("");

  const fullDetail = `${OPPORTUNITY_STATE_LABEL[opportunity.state]}${opportunity.value !== null ? ` · $${opportunity.value.toLocaleString()}` : ""} · ${opportunity.reason}`;
  // Attribution is only worth showing on a resolved job (booked/won/lost) -
  // needs_you/working rows are trivially always Lanavix-assisted by
  // construction (they only exist because of a real conversation/quote),
  // so labeling every one of those would be noise, not clarity. Never
  // rendered at all when unattributed - the absence of the line already
  // says it honestly.
  const showAttribution =
    (opportunity.state === "booked" ||
      opportunity.state === "won" ||
      opportunity.state === "lost") &&
    ATTRIBUTION_LABEL[opportunity.attribution] !== null;

  // Slice 15: the one direct mutation this slice adds, reusing quotes.tsx's
  // own updateStatus(quote, "cancelled") logic exactly (same status value,
  // same quote_follow_up_steps cleanup, same RLS-scoped ownership check via
  // the anon client) rather than inventing a new write path. Only ever
  // called for a real quote-backed needs_you opportunity - see the render
  // gate below.
  async function handleMarkLost() {
    if (!opportunity.quoteId) return;
    setMarkingLost(true);
    setMarkLostError("");
    const { error } = await supabase
      .from("quote_follow_ups")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", opportunity.quoteId);
    if (error) {
      console.error("[overview] failed to mark quote lost", error);
      setMarkLostError("Couldn't update this quote. Please try again.");
      setMarkingLost(false);
      return;
    }
    await supabase
      .from("quote_follow_up_steps")
      .update({ status: "cancelled" })
      .eq("follow_up_id", opportunity.quoteId)
      .eq("status", "pending");
    toast.success("Marked as lost.");
    setMarkingLost(false);
    setConfirmOpen(false);
    // No optimistic removal before this point - the queue only reflects
    // the change once the server has actually confirmed it (Phase 3/6).
    onQuoteMarkedLost?.(opportunity.quoteId);
  }

  const showMarkLost =
    showQuickAction && opportunity.state === "needs_you" && opportunity.quoteId !== null;

  return (
    <li className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <p
          className="lv-body text-foreground font-medium truncate"
          title={opportunity.customerName}
        >
          {opportunity.customerName}
        </p>
        <div className="flex items-center gap-2 min-w-0" title={fullDetail}>
          <StatusDot status={OPPORTUNITY_STATE_TO_DOT[opportunity.state]} className="shrink-0" />
          <span className="lv-meta text-muted-foreground/40 shrink-0">·</span>
          {opportunity.value !== null && (
            <>
              <span className="lv-meta text-foreground font-medium shrink-0">
                ${opportunity.value.toLocaleString()}
              </span>
              <span className="lv-meta text-muted-foreground/40 shrink-0">·</span>
            </>
          )}
          {/* Decision Support (Slice 13): needs_you/working opportunities
              show the decision label here instead of the raw reason - the
              fuller decisionExplanation line below composes that same
              reason (plus any memory context) into one sentence, so this
              slot never duplicates it. booked/won/lost keep the original
              plain reason, unchanged. */}
          <span className="lv-meta text-muted-foreground truncate">
            {opportunity.decisionLabel ?? opportunity.reason}
          </span>
        </div>
        {showAttribution && (
          <p className="lv-meta text-muted-foreground/70 mt-0.5">
            {ATTRIBUTION_LABEL[opportunity.attribution]}
          </p>
        )}
        {opportunity.decisionExplanation ? (
          <p className="lv-meta text-muted-foreground/70 mt-0.5">
            {opportunity.decisionExplanation}
          </p>
        ) : (
          opportunity.quoteMemoryNote && (
            <p className="lv-meta text-muted-foreground/70 mt-0.5">
              Business pattern: {opportunity.quoteMemoryNote}
            </p>
          )
        )}
        {markLostError && <p className="lv-meta text-destructive mt-0.5">{markLostError}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button asChild size="sm" variant="outline">
          <Link to={opportunity.actionHref}>{opportunity.actionLabel}</Link>
        </Button>
        {showMarkLost && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={markingLost}
            onClick={() => setConfirmOpen(true)}
          >
            Mark lost
          </Button>
        )}
      </div>
      {showMarkLost && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="lv-light">
            <AlertDialogHeader>
              <AlertDialogTitle>Mark this quote as lost?</AlertDialogTitle>
              <AlertDialogDescription>
                This stops any scheduled follow-ups for {opportunity.customerName}. You can reopen
                it later from the Quotes page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={markingLost}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleMarkLost();
                }}
                disabled={markingLost}
              >
                {markingLost ? "Marking lost..." : "Mark lost"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </li>
  );
}

function OpportunitiesSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[60px] w-full rounded-md" />
      ))}
    </div>
  );
}

function ThisWeekTile({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta: string | null;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="lv-meta text-muted-foreground truncate" title={label}>
        {label}
      </p>
      <p className="lv-numbers text-[22px] text-foreground leading-tight mt-1">{value}</p>
      {delta && <p className="lv-meta text-muted-foreground mt-0.5">{delta}</p>}
    </div>
  );
}

function ActionQueueSkeleton() {
  return (
    <div>
      <Skeleton className="h-5 w-40 mb-3" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[60px] w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

function ThisWeekSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[70px] w-full rounded-md" />
      ))}
    </div>
  );
}

// Phase 8 (Slice 14): restrained, honest copy - the secondary line only
// ever shows a real count of opportunities Lanavix is genuinely still
// working on, never a fabricated "all clear" flourish.
function ActionQueueEmptyState({ workingCount }: { workingCount: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-6 text-center">
      <p className="lv-body text-foreground font-medium">
        No actions need your attention right now.
      </p>
      {workingCount > 0 && (
        <p className="lv-meta text-muted-foreground mt-1">
          Lanavix is still working on {workingCount} opportunit{workingCount === 1 ? "y" : "ies"}.
        </p>
      )}
    </div>
  );
}

function FirstRunState() {
  return (
    <div className="rounded-md border border-border bg-card px-6 py-8 text-center">
      <p className="lv-section text-foreground">Welcome to Lanavix</p>
      <p className="lv-body text-muted-foreground mt-1 max-w-md mx-auto">
        Once customers start texting your business, or the Lead Generator finds prospects, they'll
        show up here first.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <Button asChild>
          <Link to="/app/agents">Run the Lead Generator</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/receptionist">Set up your receptionist</Link>
        </Button>
      </div>
    </div>
  );
}
