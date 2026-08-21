import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusDot, type LvStatus } from "@/components/StatusDot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/jobs")({
  component: Jobs,
});

// A "job" here is exactly a real appointments row - the same table Calendar
// already owns and fully manages (create, reschedule, status, delete).
// This page is deliberately read-only: it's an operational summary across
// every job regardless of date, the one thing Calendar's day-at-a-time view
// doesn't give an owner, not a second place to edit appointments. Every
// status change still happens on Calendar; this page links there rather
// than duplicating that UI.
interface AppointmentRow {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  service_type: string;
  scheduled_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  estimated_value: number | null;
  source: string;
}

interface ReviewRequestRow {
  customer_phone: string;
}

interface LeadRow {
  id: string;
  business_name: string;
  phone: string | null;
}

type Bucket = "today" | "upcoming" | "completed" | "cancelled";

interface JobComputed extends AppointmentRow {
  bucket: Bucket;
  needsReview: boolean;
  matchedLeadName: string | null;
}

const TABS: { key: Bucket; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const BUCKET_TO_DOT: Record<Bucket, LvStatus> = {
  today: "waiting_on_you",
  upcoming: "booked",
  completed: "done",
  cancelled: "failed",
};

const BUCKET_LABEL: Record<Bucket, string> = {
  today: "Today",
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Added manually",
  inbound_sms: "Missed-call text-back",
  lead_blast: "Outreach",
  web_chat: "Web chat",
};

// Same 30-day window and same phone-normalized matching coach.server.ts's
// reviewAskCard already uses to decide whether a completed job still needs
// a review request - kept identical so a job Coach flags as needing a
// review is never called something else here.
const REVIEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function bucketFor(status: AppointmentRow["status"], scheduledAt: string): Bucket {
  if (status === "cancelled" || status === "no_show") return "cancelled";
  if (status === "completed") return "completed";
  // pending or confirmed: today (including anything overdue that never got
  // marked completed/cancelled - that's exactly the kind of thing an owner
  // needs to see, not something to quietly fold into "upcoming") vs. a real
  // future day.
  const scheduled = new Date(scheduledAt);
  return scheduled.getTime() <= endOfDay(new Date()).getTime() ? "today" : "upcoming";
}

function formatMoney(dollars: number | null): string {
  if (dollars === null) return "No amount on file";
  return `$${dollars.toLocaleString()}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

// Same short/compact style as timeFormat.ts's relativeTime, but that helper
// only ever measures time already passed (Date.now() - iso) - reusing it
// for a still-upcoming job today would put every future time in its
// "under a minute" bucket and print "just now" regardless of how far off
// the job actually is. This measures forward instead.
function startsIn(iso: string): string {
  const minutes = Math.floor((new Date(iso).getTime() - Date.now()) / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

function nextActionFor(j: JobComputed): string {
  if (j.bucket === "cancelled") {
    return j.status === "no_show" ? "Marked as no-show" : "Cancelled";
  }
  if (j.bucket === "completed") {
    return j.needsReview ? "Hasn't gotten a review request yet" : "Review request already sent";
  }
  const scheduled = new Date(j.scheduled_at);
  const isPastDue = scheduled.getTime() < Date.now() && j.bucket === "today";
  if (isPastDue && startOfDay(scheduled).getTime() !== startOfDay(new Date()).getTime()) {
    return `Was scheduled for ${formatDateTime(j.scheduled_at)} - update its status in Calendar`;
  }
  if (isPastDue) {
    return `Should have started at ${formatDateTime(j.scheduled_at)} - update its status in Calendar`;
  }
  return j.bucket === "today"
    ? `Starts ${startsIn(j.scheduled_at)}`
    : `Scheduled for ${formatDateTime(j.scheduled_at)}`;
}

function SkeletonRows() {
  return (
    <div className="p-4 space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[64px] w-full rounded-md" />
      ))}
    </div>
  );
}

function Jobs() {
  const [jobs, setJobs] = useState<JobComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [everCount, setEverCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Bucket>("today");

  async function loadJobs() {
    setLoading(true);
    setListError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: apptRows, error: apptErr } = await supabase
      .from("appointments")
      .select(
        "id, customer_name, customer_phone, service_type, scheduled_at, status, estimated_value, source",
      )
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: false })
      .limit(500);
    if (apptErr) {
      console.error("[jobs] failed to load appointments", apptErr);
      setListError("Couldn't load your jobs. Please refresh the page.");
      setLoading(false);
      return;
    }
    const rows = (apptRows as AppointmentRow[]) ?? [];
    setEverCount(rows.length);
    if (rows.length === 0) {
      setJobs([]);
      setLoading(false);
      return;
    }

    const since = new Date(Date.now() - REVIEW_WINDOW_MS).toISOString();
    const [{ data: reviewRows }, { data: leadRows }] = await Promise.all([
      supabase
        .from("review_requests")
        .select("customer_phone")
        .eq("user_id", user.id)
        .gte("sent_at", since),
      supabase.from("lead_profiles").select("id, business_name, phone").eq("user_id", user.id),
    ]);

    const requestedPhones = new Set(
      ((reviewRows as ReviewRequestRow[]) ?? [])
        .map((r) => normalizePhone(r.customer_phone))
        .filter((p): p is string => !!p),
    );
    const leadByPhone = new Map<string, LeadRow>();
    for (const l of (leadRows as LeadRow[]) ?? []) {
      const norm = normalizePhone(l.phone);
      if (norm) leadByPhone.set(norm, l);
    }

    const computed: JobComputed[] = rows.map((a) => {
      const bucket = bucketFor(a.status, a.scheduled_at);
      const normPhone = normalizePhone(a.customer_phone);
      const withinReviewWindow =
        new Date(a.scheduled_at).getTime() >= Date.now() - REVIEW_WINDOW_MS;
      const needsReview =
        bucket === "completed" &&
        !!normPhone &&
        withinReviewWindow &&
        !requestedPhones.has(normPhone);
      return {
        ...a,
        bucket,
        needsReview,
        matchedLeadName: normPhone ? (leadByPhone.get(normPhone)?.business_name ?? null) : null,
      };
    });

    setJobs(computed);
    setLoading(false);
  }

  useEffect(() => {
    loadJobs();
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<Bucket, number> = { today: 0, upcoming: 0, completed: 0, cancelled: 0 };
    for (const j of jobs) counts[j.bucket]++;
    return counts;
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    const filtered = jobs.filter((j) => j.bucket === activeTab);
    return filtered.sort((a, b) => {
      if (activeTab === "today" || activeTab === "upcoming") {
        return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      }
      return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime();
    });
  }, [jobs, activeTab]);

  const isFirstRun = !loading && !listError && (everCount ?? 0) === 0;
  const isFilteredEmpty = !loading && !listError && !isFirstRun && visibleJobs.length === 0;

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="lv-page-title text-foreground">Jobs</h1>
            <p className="lv-body text-muted-foreground mt-1">
              Every booked job, across every day - schedule changes still happen in{" "}
              <Link to="/app/calendar" className="text-primary underline underline-offset-2">
                Calendar
              </Link>
              .
            </p>
          </div>
        </div>

        {listError && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="lv-label text-destructive">Couldn't load your jobs</p>
            <p className="lv-body text-foreground mt-0.5">{listError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={loadJobs}>
              Try again
            </Button>
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : isFirstRun ? (
          <div className="rounded-md border border-border py-16 px-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="lv-body text-foreground font-medium">No jobs yet</p>
            <p className="lv-meta text-muted-foreground mt-1 max-w-sm mx-auto">
              Booked jobs show up here automatically once a missed-call text-back confirms one, or
              add one directly in Calendar.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/app/calendar">Go to Calendar</Link>
              </Button>
            </div>
          </div>
        ) : (
          !listError && (
            <>
              <div
                className="flex items-center gap-1.5 overflow-x-auto mb-4 -mx-1 px-1"
                role="tablist"
                aria-label="Job status"
                onKeyDown={(e) => {
                  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                  e.preventDefault();
                  const buttons = Array.from(
                    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
                  );
                  const currentIndex = buttons.findIndex((b) => b === document.activeElement);
                  const delta = e.key === "ArrowRight" ? 1 : -1;
                  const next = buttons[(currentIndex + delta + buttons.length) % buttons.length];
                  next?.focus();
                  const key = TABS[(currentIndex + delta + buttons.length) % buttons.length]?.key;
                  if (key) setActiveTab(key);
                }}
              >
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t.key}
                    tabIndex={activeTab === t.key ? 0 : -1}
                    onClick={() => setActiveTab(t.key)}
                    className={cn(
                      "shrink-0 min-h-[36px] rounded-sm border px-3 py-1.5 lv-label transition-colors duration-150 ease-out whitespace-nowrap",
                      activeTab === t.key
                        ? "border-primary bg-accent text-primary font-medium"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {t.label}
                    <span
                      className={cn(
                        "ml-1.5 lv-numbers",
                        activeTab === t.key ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {tabCounts[t.key]}
                    </span>
                  </button>
                ))}
              </div>

              {isFilteredEmpty ? (
                <div className="rounded-md border border-border py-12 px-6 text-center">
                  <p className="lv-body text-foreground font-medium">
                    No {BUCKET_LABEL[activeTab].toLowerCase()} jobs
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block rounded-md border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Customer</TableHead>
                          <TableHead className="min-w-[140px]">Service</TableHead>
                          <TableHead className="min-w-[100px] text-right">Value</TableHead>
                          <TableHead className="min-w-[130px]">Status</TableHead>
                          <TableHead className="min-w-[260px]">Next action</TableHead>
                          <TableHead className="min-w-[130px] text-right">
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleJobs.map((j) => (
                          <TableRow key={j.id}>
                            <TableCell className="max-w-[220px]">
                              <div
                                className="truncate lv-body text-foreground font-medium"
                                title={j.customer_name}
                              >
                                {j.customer_name}
                              </div>
                              <div className="lv-meta text-muted-foreground truncate">
                                {sourceLabel(j.source)}
                                {j.matchedLeadName ? ` · Lead: ${j.matchedLeadName}` : ""}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className="lv-body text-foreground truncate block max-w-[180px]"
                                title={j.service_type}
                              >
                                {j.service_type}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="lv-numbers text-foreground whitespace-nowrap">
                                {formatMoney(j.estimated_value)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusDot status={BUCKET_TO_DOT[j.bucket]} />
                            </TableCell>
                            <TableCell>
                              <span className="lv-meta text-muted-foreground">
                                {nextActionFor(j)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1.5">
                                {j.bucket === "completed" && j.needsReview && (
                                  <Button asChild size="sm" variant="outline">
                                    <Link to="/app/reputation">Send review request</Link>
                                  </Button>
                                )}
                                {(j.bucket === "today" || j.bucket === "upcoming") && (
                                  <Button asChild size="sm" variant="outline">
                                    <Link to="/app/calendar">View in Calendar</Link>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile card list */}
                  <ul className="md:hidden space-y-2">
                    {visibleJobs.map((j) => (
                      <li key={j.id} className="rounded-md border border-border overflow-hidden">
                        <div className="px-3 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="lv-body text-foreground font-medium truncate">
                              {j.customer_name}
                            </span>
                            <span className="lv-numbers text-foreground shrink-0">
                              {formatMoney(j.estimated_value)}
                            </span>
                          </div>
                          <div className="lv-meta text-muted-foreground truncate mt-0.5">
                            {j.service_type} · {sourceLabel(j.source)}
                            {j.matchedLeadName ? ` · Lead: ${j.matchedLeadName}` : ""}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <StatusDot status={BUCKET_TO_DOT[j.bucket]} />
                          </div>
                          <p className="lv-meta text-muted-foreground mt-1.5">{nextActionFor(j)}</p>
                        </div>
                        {((j.bucket === "completed" && j.needsReview) ||
                          j.bucket === "today" ||
                          j.bucket === "upcoming") && (
                          <div className="border-t border-border p-2.5 flex flex-wrap gap-1.5">
                            {j.bucket === "completed" && j.needsReview && (
                              <Button asChild size="sm" variant="outline" className="min-h-[44px]">
                                <Link to="/app/reputation">Send review request</Link>
                              </Button>
                            )}
                            {(j.bucket === "today" || j.bucket === "upcoming") && (
                              <Button asChild size="sm" variant="outline" className="min-h-[44px]">
                                <Link to="/app/calendar">View in Calendar</Link>
                              </Button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
