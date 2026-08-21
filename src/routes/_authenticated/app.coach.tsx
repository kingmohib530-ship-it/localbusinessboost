import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PhoneMissed, Clock, CalendarDays, Star, Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/coach")({
  component: CoachPage,
});

type CoachCardSeverity = "urgent" | "attention" | "info" | "positive";

interface CoachCard {
  id: string;
  severity: CoachCardSeverity;
  title: string;
  detail: string;
  actionLabel: string;
  actionHref: string;
  count: number;
}

interface BriefHistoryRow {
  id: string;
  brief_date: string;
  delivery_method: string;
  delivery_status: string;
  opened_at: string | null;
  brief_payload: CoachCard[];
}

const CARD_ICON: Record<string, typeof PhoneMissed> = {
  missed_calls: PhoneMissed,
  estimates: Clock,
  todays_schedule: CalendarDays,
  review_asks: Star,
  network_requests: Users,
};

// Severity is always shown as an icon color plus this text label together -
// never color alone, since color blindness and grayscale printing of an
// emailed brief both make color-only status unreadable.
const SEVERITY_META: Record<
  CoachCardSeverity,
  { label: string; iconBg: string; iconColor: string }
> = {
  urgent: { label: "Urgent", iconBg: "bg-destructive/10", iconColor: "text-destructive" },
  attention: {
    label: "Needs follow-up",
    iconBg: "bg-[var(--warning)]/15",
    iconColor: "text-[var(--warning)]",
  },
  info: { label: "Today", iconBg: "bg-accent", iconColor: "text-foreground" },
  positive: { label: "Opportunity", iconBg: "bg-primary/10", iconColor: "text-primary" },
};

const DELIVERY_STATUS_CLASS: Record<string, string> = {
  sent: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-accent text-muted-foreground",
  pending: "bg-accent text-muted-foreground",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatBriefDate(dateStr: string): string {
  // brief_date is a plain date (no time), so parse it as local to avoid a
  // UTC-midnight-vs-local-date off-by-one on the display.
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CoachPage() {
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [cards, setCards] = useState<CoachCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<BriefHistoryRow[]>([]);

  useEffect(() => {
    loadBrief();
    loadName();
    loadHistory();
  }, []);

  async function loadName() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("id", user.id)
      .maybeSingle();
    setBusinessName(data?.business_name ?? null);
  }

  async function loadBrief() {
    setLoading(true);
    setError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Please sign in again to see today's brief.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/coach/brief", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't load today's brief. Please try again.");
        setLoading(false);
        return;
      }
      setCards(data.cards || []);
    } catch {
      setError("Couldn't load today's brief. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  /** Marks today's push (if the cron already sent one) as opened - a read-only view otherwise. */
  async function markTodayOpened() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await supabase
      .from("daily_briefs")
      .update({ opened_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("brief_date", localDate)
      .is("opened_at", null);
  }

  async function loadHistory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("daily_briefs")
      .select("id, brief_date, delivery_method, delivery_status, opened_at, brief_payload")
      .eq("user_id", user.id)
      .order("brief_date", { ascending: false })
      .limit(14);
    setHistory((data as unknown as BriefHistoryRow[]) || []);
    markTodayOpened();
  }

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[720px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="mb-1.5">
          <h1 className="lv-page-title text-foreground">
            {greeting()}
            {businessName ? `, ${businessName}` : ""}.
          </h1>
          <p className="lv-body text-muted-foreground mt-1">
            Here's what deserves your attention today.
          </p>
        </div>
        <p className="lv-meta text-muted-foreground mb-6">
          Coach checks missed calls, open estimates, today's schedule, and completed jobs that
          haven't gotten a review request. For a live, item-by-item list, see{" "}
          <Link to="/app" className="text-primary underline underline-offset-2">
            Overview
          </Link>
          .
        </p>

        <div className="space-y-2.5">
          {loading && (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[76px] w-full rounded-md" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="lv-label text-destructive">Couldn't load today's brief</p>
              <p className="lv-body text-foreground mt-0.5">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2.5 min-h-[44px]"
                onClick={loadBrief}
              >
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && cards.length === 0 && (
            <div className="rounded-md border border-border py-12 px-6 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="lv-body text-foreground font-medium">You're caught up</p>
              <p className="lv-meta text-muted-foreground mt-1">
                Nothing needs your attention right now.
              </p>
            </div>
          )}

          {!loading &&
            !error &&
            cards.map((card) => {
              const Icon = CARD_ICON[card.id] || Clock;
              const meta = SEVERITY_META[card.severity];
              return (
                <div
                  key={card.id}
                  className="rounded-md border border-border bg-card p-4 md:p-5 flex items-start gap-3.5"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm",
                      meta.iconBg,
                    )}
                  >
                    <Icon className={cn("h-4 w-4", meta.iconColor)} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="lv-body text-foreground font-medium">{card.title}</p>
                      <span
                        className={cn(
                          "lv-meta font-semibold px-1.5 py-0.5 rounded-sm",
                          meta.iconBg,
                          meta.iconColor,
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="lv-meta text-muted-foreground">{card.detail}</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0 min-h-[44px]">
                    <Link to={card.actionHref}>{card.actionLabel}</Link>
                  </Button>
                </div>
              );
            })}
        </div>

        {history.length > 0 && (
          <div className="mt-10">
            <h2 className="lv-label text-muted-foreground uppercase tracking-wide">
              Brief history
            </h2>
            <div className="mt-2.5 rounded-md border border-border divide-y divide-border overflow-x-auto">
              {history.map((row) => (
                <div
                  key={row.id}
                  className="p-3.5 flex items-center justify-between gap-3 flex-wrap lv-meta"
                >
                  <span className="text-foreground font-medium">
                    {formatBriefDate(row.brief_date)}
                  </span>
                  <span className="text-muted-foreground">
                    {Array.isArray(row.brief_payload) ? row.brief_payload.length : 0} item
                    {Array.isArray(row.brief_payload) && row.brief_payload.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-muted-foreground capitalize">{row.delivery_method}</span>
                  <span
                    className={cn(
                      "font-semibold px-2 py-0.5 rounded-sm",
                      DELIVERY_STATUS_CLASS[row.delivery_status] || DELIVERY_STATUS_CLASS.pending,
                    )}
                  >
                    {row.delivery_status}
                  </span>
                  <span className="text-muted-foreground">
                    {row.opened_at ? "Opened" : "Not opened"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
