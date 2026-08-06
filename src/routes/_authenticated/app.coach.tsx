import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PhoneMissed, Clock, CalendarDays, Star, Users, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMountReveal } from "@/hooks/use-mount-reveal";

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

const SEVERITY_COLOR: Record<CoachCardSeverity, string> = {
  urgent: "var(--destructive)",
  attention: "var(--warning)",
  info: "var(--hd-primary-2)",
  positive: "var(--success)",
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
  const { step, delay } = useMountReveal();

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
    <div className="p-8 max-w-3xl mx-auto">
      <div className={step} style={delay(0)}>
        <h1 className="text-2xl font-bold text-[var(--hd-fg)]">
          {greeting()}
          {businessName ? `, ${businessName}` : ""}.
        </h1>
        <p className="text-[var(--hd-muted)] mt-1">Here's what deserves your attention today.</p>
      </div>

      <div className="mt-8 space-y-3">
        {loading && (
          <div className="rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md p-6 text-[var(--hd-muted)] text-sm">
            Loading today's brief...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md p-6">
            <p className="text-sm text-[var(--destructive)]">{error}</p>
            <button
              onClick={loadBrief}
              className="mt-3 text-sm font-medium text-[var(--hd-primary-2)] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && cards.length === 0 && (
          <div className="rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md p-8 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto text-[var(--success)]" />
            <p className="mt-3 text-[var(--hd-fg)] font-medium">You're caught up.</p>
            <p className="text-sm text-[var(--hd-muted)] mt-1">
              Nothing needs your attention right now.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          cards.map((card, i) => {
            const Icon = CARD_ICON[card.id] || Clock;
            return (
              <div
                key={card.id}
                className={`rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md p-5 flex items-start gap-4 ${step}`}
                style={delay(i + 1)}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: `color-mix(in oklab, ${SEVERITY_COLOR[card.severity]} 15%, transparent)`,
                  }}
                >
                  <Icon className="h-4 w-4" style={{ color: SEVERITY_COLOR[card.severity] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--hd-fg)]">{card.title}</p>
                  <p className="text-sm text-[var(--hd-muted)] mt-0.5">{card.detail}</p>
                </div>
                <Link
                  to={card.actionHref}
                  className="shrink-0 text-sm font-medium px-3 py-1.5 rounded-lg border border-[var(--hd-border)] text-[var(--hd-fg)] hover:bg-white/[0.06] transition-colors"
                >
                  {card.actionLabel}
                </Link>
              </div>
            );
          })}
      </div>

      {history.length > 0 && (
        <div className="mt-12">
          <h2 className="text-sm font-semibold text-[var(--hd-muted)] uppercase tracking-wide">
            Brief history
          </h2>
          <div className="mt-3 rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md divide-y divide-[var(--hd-border)]">
            {history.map((row) => (
              <div key={row.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                <span className="text-[var(--hd-fg)]">{formatBriefDate(row.brief_date)}</span>
                <span className="text-[var(--hd-muted)]">
                  {Array.isArray(row.brief_payload) ? row.brief_payload.length : 0} item
                  {Array.isArray(row.brief_payload) && row.brief_payload.length === 1 ? "" : "s"}
                </span>
                <span className="text-[var(--hd-muted)] capitalize">{row.delivery_method}</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      row.delivery_status === "sent"
                        ? "color-mix(in oklab, var(--success) 15%, transparent)"
                        : row.delivery_status === "failed"
                          ? "color-mix(in oklab, var(--destructive) 15%, transparent)"
                          : "var(--hd-glass-strong)",
                    color:
                      row.delivery_status === "sent"
                        ? "var(--success)"
                        : row.delivery_status === "failed"
                          ? "var(--destructive)"
                          : "var(--hd-muted)",
                  }}
                >
                  {row.delivery_status}
                </span>
                <span className="text-[var(--hd-muted)]">
                  {row.opened_at ? "Opened" : "Not opened"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
