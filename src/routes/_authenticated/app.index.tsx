import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, UserPlus, FileClock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/StatusDot";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export const Route = createFileRoute("/_authenticated/app/")({
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

interface AppointmentRow {
  id: string;
  estimated_value: number | null;
  created_at: string;
  status: string;
}

type NeedsYouItem =
  | {
      kind: "unanswered";
      id: string;
      conversationId: string;
      customerName: string;
      customerIdentifier: string;
      channel: string;
      since: string;
    }
  | { kind: "lead"; id: string; businessName: string; since: string }
  | {
      kind: "quote";
      id: string;
      conversationId: string;
      customerName: string;
      customerIdentifier: string;
      serviceType: string | null;
      quotedPrice: number | null;
      since: string;
    };

const NEEDS_YOU_LIMIT = 3;
/** Looks like a phone number (E.164 or close enough) - safe to offer a tel: link for. */
const PHONE_LIKE = /^\+?[\d\s().-]{7,}$/;

function daysAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

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
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [hasAnyHistory, setHasAnyHistory] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAllNeedsYou, setShowAllNeedsYou] = useState(false);
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

        const [
          { data: profileData, error: profileErr },
          { data: conversationData, error: conversationErr },
          { data: messageData, error: messageErr },
          { data: leadData, error: leadErr },
          { data: quoteData, error: quoteErr },
          { data: appointmentData, error: appointmentErr },
          { count: everConversationCount },
          { count: everLeadCount },
          { count: everAppointmentCount },
        ] = await Promise.all([
          supabase.from("profiles").select("full_name, business_name").eq("id", user.id).single(),
          supabase
            .from("conversations")
            .select("id, customer_name, customer_identifier, channel, status")
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
          profileErr || conversationErr || messageErr || leadErr || quoteErr || appointmentErr;
        if (firstErr) {
          console.error("[overview] failed to load one or more queries", firstErr);
          setError("Some of your dashboard data couldn't load. What did load is still accurate.");
        }

        setProfile(profileData);
        setConversations((conversationData as ConversationRow[]) ?? []);
        setMessages((messageData as MessageRow[]) ?? []);
        setLeads((leadData as LeadRow[]) ?? []);
        setQuotes((quoteData as QuoteRow[]) ?? []);
        setAppointments((appointmentData as AppointmentRow[]) ?? []);
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

  // Needs You: combined across three item types, ranked by business
  // urgency rather than recency. Type first (a customer actively waiting
  // on a reply outranks an aging quote, which outranks a fresh unworked
  // lead), then oldest-first within each type - see the report for why
  // this ordering, not a single shared "urgency score" across unrelated
  // tables.
  const needsYouAll = useMemo<NeedsYouItem[]>(() => {
    const latestByConversation = new Map<string, MessageRow>();
    for (const m of messages) {
      if (!m.conversation_id || !m.sent_at) continue;
      if (!latestByConversation.has(m.conversation_id))
        latestByConversation.set(m.conversation_id, m);
    }
    const conversationById = new Map(conversations.map((c) => [c.id, c]));

    const unanswered: NeedsYouItem[] = conversations
      .filter((c) => {
        const last = latestByConversation.get(c.id);
        return last?.direction === "inbound";
      })
      .map((c) => ({
        kind: "unanswered" as const,
        id: `unanswered-${c.id}`,
        conversationId: c.id,
        customerName: c.customer_name || "Unknown caller",
        customerIdentifier: c.customer_identifier,
        channel: c.channel,
        since: latestByConversation.get(c.id)?.sent_at || new Date().toISOString(),
      }))
      .sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime());

    // A quote only counts as "stale" past the day-1 automated nudge - a
    // quote sent an hour ago isn't neglected yet, the follow-up sequence
    // is still doing its job.
    const STALE_QUOTE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;
    const staleQuotes: NeedsYouItem[] = quotes
      .filter((q) => Date.now() - new Date(q.quoted_at).getTime() >= STALE_QUOTE_THRESHOLD_MS)
      .map((q) => {
        const convo = conversationById.get(q.conversation_id);
        return {
          kind: "quote" as const,
          id: `quote-${q.id}`,
          conversationId: q.conversation_id,
          customerName: convo?.customer_name || "Unknown customer",
          customerIdentifier: convo?.customer_identifier || "",
          serviceType: q.service_type,
          quotedPrice: q.quoted_price,
          since: q.quoted_at,
        };
      })
      .sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime());

    const newLeads: NeedsYouItem[] = leads
      .map((l) => ({
        kind: "lead" as const,
        id: `lead-${l.id}`,
        businessName: l.business_name || "Unnamed prospect",
        since: l.created_at,
      }))
      .sort((a, b) => new Date(a.since).getTime() - new Date(b.since).getTime());

    return [...unanswered, ...staleQuotes, ...newLeads];
  }, [conversations, messages, quotes, leads]);

  const needsYouVisible = needsYouAll.filter((item) => !dismissed.has(item.id));
  const needsYouShown = showAllNeedsYou
    ? needsYouVisible
    : needsYouVisible.slice(0, NEEDS_YOU_LIMIT);

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

  const name = profile?.business_name || profile?.full_name || null;
  const isFirstRun = !loading && !error && !hasAnyHistory;
  const isCaughtUp = !loading && !error && hasAnyHistory && needsYouVisible.length === 0;
  // A load error can leave needsYouVisible empty for a reason that has
  // nothing to do with being caught up - don't claim confidently that
  // nothing needs attention when we couldn't actually check.
  const isUncertainDueToError = !loading && error && needsYouVisible.length === 0;

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

        {/* Needs You */}
        <section aria-labelledby="needs-you-heading" className="mb-8">
          {loading ? (
            <NeedsYouSkeleton />
          ) : isFirstRun ? (
            <FirstRunState />
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-3 gap-3">
                <h2 id="needs-you-heading" className="lv-section text-foreground">
                  Needs you
                </h2>
                {needsYouVisible.length > 0 && (
                  <span className="lv-meta text-muted-foreground whitespace-nowrap">
                    {needsYouShown.length} of {needsYouVisible.length} open items, by urgency
                  </span>
                )}
              </div>
              {isCaughtUp ? (
                <CaughtUpState />
              ) : isUncertainDueToError ? (
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
                    {needsYouShown.map((item) => (
                      <NeedsYouCard
                        key={item.id}
                        item={item}
                        onDismiss={() => dismiss(item.id)}
                        reducedMotion={reducedMotion}
                      />
                    ))}
                  </ul>
                  {!showAllNeedsYou && needsYouVisible.length > NEEDS_YOU_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setShowAllNeedsYou(true)}
                      className="inline-flex items-center gap-1 lv-label text-primary hover:underline mt-3"
                    >
                      View all {needsYouVisible.length}{" "}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </>
              )}
            </>
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
      </div>
    </div>
  );
}

function NeedsYouCard({
  item,
  onDismiss,
  reducedMotion,
}: {
  item: NeedsYouItem;
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

  const { icon: Icon, title, detail, status, action } = describeItem(item);

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
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="lv-body text-foreground font-medium truncate" title={title}>
            {title}
          </p>
          <div className="flex items-center gap-2 min-w-0">
            <StatusDot status={status} className="shrink-0" />
            <span className="lv-meta text-muted-foreground/40">·</span>
            <p className="lv-meta text-muted-foreground truncate" title={detail}>
              {detail}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
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

function describeItem(item: NeedsYouItem) {
  if (item.kind === "unanswered") {
    const isPhone = PHONE_LIKE.test(item.customerIdentifier);
    return {
      icon: MessageSquare,
      title: item.customerName,
      detail: `Waiting ${daysAgo(item.since)} for a reply · ${item.channel === "web_chat" ? "Web chat" : "Text"}`,
      status: "waiting_on_you" as const,
      action:
        item.channel === "web_chat" ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/app/web-chat">Reply</Link>
          </Button>
        ) : isPhone ? (
          <Button asChild size="sm" variant="outline">
            <a href={`tel:${item.customerIdentifier}`}>Call back</a>
          </Button>
        ) : null,
    };
  }
  if (item.kind === "quote") {
    const isPhone = PHONE_LIKE.test(item.customerIdentifier);
    const priceText = item.quotedPrice ? `$${item.quotedPrice.toLocaleString()}` : "quote";
    return {
      icon: FileClock,
      title: item.customerName,
      detail: `${priceText}${item.serviceType ? ` · ${item.serviceType}` : ""} · sent ${daysAgo(item.since)} ago, no reply`,
      status: "stale" as const,
      action: isPhone ? (
        <Button asChild size="sm" variant="outline">
          <a href={`tel:${item.customerIdentifier}`}>Follow up</a>
        </Button>
      ) : null,
    };
  }
  return {
    icon: UserPlus,
    title: item.businessName,
    detail: `New lead · found ${daysAgo(item.since)} ago`,
    status: "new" as const,
    action: (
      <Button asChild size="sm" variant="outline">
        <Link to="/app/agents">View</Link>
      </Button>
    ),
  };
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
      <p className="lv-meta text-muted-foreground truncate">{label}</p>
      <p className="lv-numbers text-[22px] text-foreground leading-tight mt-1">{value}</p>
      {delta && <p className="lv-meta text-muted-foreground mt-0.5">{delta}</p>}
    </div>
  );
}

function NeedsYouSkeleton() {
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

function CaughtUpState() {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-6 text-center">
      <p className="lv-body text-foreground font-medium">You're caught up</p>
      <p className="lv-meta text-muted-foreground mt-1">Nothing needs your attention right now.</p>
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
