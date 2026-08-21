import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
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
import { relativeTime } from "@/lib/timeFormat";
import { SERVICE_TYPE_LABELS, type ServiceTypeKey } from "@/lib/serviceTypes";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const Route = createFileRoute("/_authenticated/app/quotes")({
  component: Quotes,
});

// A "quote" in this product is not a standalone estimate object with line
// items - it's the tracking row Missed-Call Text-Back and Web Chat create
// automatically (quoteFollowUps.server.ts) the moment the AI receptionist
// detects, with high confidence, that it gave a real customer a real price
// in a real conversation. There is no manual "create a quote" flow today
// (see the Slice 2 report for why this page doesn't add one), so every row
// here traces back to a real conversation - no invented totals, no fake
// line items.
interface QuoteFollowUpRow {
  id: string;
  conversation_id: string;
  service_type: ServiceTypeKey | null;
  quoted_price: number | null;
  quoted_at: string;
  status: string;
}

interface StepRow {
  id: string;
  follow_up_id: string;
  day_offset: number;
  scheduled_for: string;
  status: string;
  sent_at: string | null;
}

interface ConversationRow {
  id: string;
  customer_name: string | null;
  customer_identifier: string;
  channel: string;
}

interface LeadRow {
  id: string;
  business_name: string;
  phone: string | null;
}

interface AppointmentRow {
  customer_phone: string | null;
  scheduled_at: string;
}

type Bucket = "open" | "needs_followup" | "won" | "lost";

interface QuoteComputed extends QuoteFollowUpRow {
  bucket: Bucket;
  customerLabel: string;
  channel: string;
  steps: StepRow[];
  nextStep: StepRow | null;
  matchedLeadName: string | null;
  bookedAt: string | null;
}

const TABS: { key: Bucket; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "needs_followup", label: "Needs follow-up" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

const BUCKET_TO_DOT: Record<Bucket, LvStatus> = {
  open: "automated",
  needs_followup: "waiting_on_you",
  won: "booked",
  lost: "failed",
};

const BUCKET_LABEL: Record<Bucket, string> = {
  open: "Open",
  needs_followup: "Needs follow-up",
  won: "Won",
  lost: "Lost",
};

// Open vs. needs-follow-up is decided entirely by whether the real Day
// 1/5/14 sequence still has a pending step - never by the quote's age on
// its own. The sequence runs on fixed offsets, so a 3-day-old quote can
// still have a real day-5 or day-14 step waiting to fire; calling that
// "needs follow-up" would tell the owner to step in while Lanavix is
// still actively about to. Only once nothing is left pending (every step
// sent, skipped, or failed, with nothing later still scheduled) is a
// human actually the only thing left that can move it forward.
function bucketFor(status: string, hasPendingStep: boolean): Bucket {
  if (status === "booked") return "won";
  if (status === "cancelled" || status === "completed") return "lost";
  return hasPendingStep ? "open" : "needs_followup";
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

function formatMoney(dollars: number | null): string {
  if (dollars === null) return "No amount on file";
  return `$${dollars.toLocaleString()}`;
}

function serviceLabel(service: ServiceTypeKey | null): string {
  if (!service) return "Service";
  return SERVICE_TYPE_LABELS[service] ?? service;
}

function channelLabel(channel: string): string {
  return channel === "web_chat" ? "Web chat" : "Text";
}

function nextActionFor(q: QuoteComputed): string {
  if (q.bucket === "won") return q.bookedAt ? `Booked for ${formatDate(q.bookedAt)}` : "Booked";
  if (q.bucket === "lost") return "Marked lost";
  if (q.bucket === "needs_followup") {
    return q.nextStep
      ? "Automated follow-ups are still pending - reach out directly or mark it lost"
      : "Automated follow-ups are done - reach out directly or mark it lost";
  }
  // open
  return q.nextStep
    ? `Next automated follow-up ${relativeTime(q.nextStep.scheduled_for)}`
    : "Follow-up in progress";
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

function Quotes() {
  const [quotes, setQuotes] = useState<QuoteComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [everCount, setEverCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Bucket>("open");
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  async function loadQuotes() {
    setLoading(true);
    setListError("");
    setActionError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: quoteRows, error: quoteErr } = await supabase
      .from("quote_follow_ups")
      .select("id, conversation_id, service_type, quoted_price, quoted_at, status")
      .eq("user_id", user.id)
      .order("quoted_at", { ascending: false })
      .limit(500);
    if (quoteErr) {
      console.error("[quotes] failed to load quote_follow_ups", quoteErr);
      setListError("Couldn't load your quotes. Please refresh the page.");
      setLoading(false);
      return;
    }
    const rows = (quoteRows as QuoteFollowUpRow[]) ?? [];
    setEverCount(rows.length);
    if (rows.length === 0) {
      setQuotes([]);
      setLoading(false);
      return;
    }

    const followUpIds = rows.map((r) => r.id);
    const conversationIds = [...new Set(rows.map((r) => r.conversation_id))];

    const [{ data: stepRows }, { data: convRows }, { data: leadRows }, { data: apptRows }] =
      await Promise.all([
        supabase
          .from("quote_follow_up_steps")
          .select("id, follow_up_id, day_offset, scheduled_for, status, sent_at")
          .in("follow_up_id", followUpIds),
        supabase
          .from("conversations")
          .select("id, customer_name, customer_identifier, channel")
          .in("id", conversationIds),
        supabase.from("lead_profiles").select("id, business_name, phone").eq("user_id", user.id),
        supabase
          .from("appointments")
          .select("customer_phone, scheduled_at")
          .eq("user_id", user.id)
          .order("scheduled_at", { ascending: false }),
      ]);

    const stepsByFollowUp = new Map<string, StepRow[]>();
    for (const s of (stepRows as StepRow[]) ?? []) {
      const arr = stepsByFollowUp.get(s.follow_up_id) ?? [];
      arr.push(s);
      stepsByFollowUp.set(s.follow_up_id, arr);
    }

    const convById = new Map<string, ConversationRow>();
    for (const c of (convRows as ConversationRow[]) ?? []) convById.set(c.id, c);

    const leadByPhone = new Map<string, LeadRow>();
    for (const l of (leadRows as LeadRow[]) ?? []) {
      const norm = normalizePhone(l.phone);
      if (norm) leadByPhone.set(norm, l);
    }

    const apptByPhone = new Map<string, AppointmentRow>();
    for (const a of (apptRows as AppointmentRow[]) ?? []) {
      const norm = normalizePhone(a.customer_phone);
      if (norm && !apptByPhone.has(norm)) apptByPhone.set(norm, a);
    }

    const computed: QuoteComputed[] = rows.map((q) => {
      const conv = convById.get(q.conversation_id);
      const steps = (stepsByFollowUp.get(q.id) ?? []).sort((a, b) => a.day_offset - b.day_offset);
      const nextStep = steps.find((s) => s.status === "pending") ?? null;
      const hasPendingStep = !!nextStep;
      const bucket = bucketFor(q.status, hasPendingStep);

      const normPhone = conv ? normalizePhone(conv.customer_identifier) : null;
      const matchedLead = normPhone ? (leadByPhone.get(normPhone) ?? null) : null;
      const matchedAppt = normPhone ? (apptByPhone.get(normPhone) ?? null) : null;

      return {
        ...q,
        bucket,
        customerLabel: conv?.customer_name || conv?.customer_identifier || "Unknown customer",
        channel: conv?.channel ?? "sms",
        steps,
        nextStep,
        matchedLeadName: matchedLead?.business_name ?? null,
        bookedAt: bucket === "won" ? (matchedAppt?.scheduled_at ?? null) : null,
      };
    });

    setQuotes(computed);
    setLoading(false);
  }

  useEffect(() => {
    loadQuotes();
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<Bucket, number> = { open: 0, needs_followup: 0, won: 0, lost: 0 };
    for (const q of quotes) counts[q.bucket]++;
    return counts;
  }, [quotes]);

  const visibleQuotes = useMemo(
    () =>
      quotes
        .filter((q) => q.bucket === activeTab)
        .sort((a, b) => new Date(b.quoted_at).getTime() - new Date(a.quoted_at).getTime()),
    [quotes, activeTab],
  );

  const isFirstRun = !loading && !listError && (everCount ?? 0) === 0;
  const isFilteredEmpty = !loading && !listError && !isFirstRun && visibleQuotes.length === 0;

  async function updateStatus(quote: QuoteComputed, status: "booked" | "cancelled" | "active") {
    setActionPendingId(quote.id);
    setActionError("");
    const { error } = await supabase
      .from("quote_follow_ups")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", quote.id);
    if (error) {
      console.error("[quotes] failed to update status", error);
      setActionError("Couldn't update this quote. Please try again.");
      setActionPendingId(null);
      return;
    }
    // Same cleanup cancelActiveQuoteFollowUp does when a booking lands -
    // once a quote is won or lost, the automated nudges waiting on it are
    // no longer relevant.
    if (status !== "active" && quote.nextStep) {
      await supabase
        .from("quote_follow_up_steps")
        .update({ status: "cancelled" })
        .eq("follow_up_id", quote.id)
        .eq("status", "pending");
    }
    toast.success(
      status === "booked"
        ? "Marked as won."
        : status === "cancelled"
          ? "Marked as lost."
          : "Reopened.",
    );
    setActionPendingId(null);
    await loadQuotes();
  }

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="mb-5">
          <h1 className="lv-page-title text-foreground">Quotes</h1>
          <p className="lv-body text-muted-foreground mt-1">
            Every quote your AI receptionist has given, and how each one is being followed up.
          </p>
        </div>

        {listError && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="lv-label text-destructive">Couldn't load your quotes</p>
            <p className="lv-body text-foreground mt-0.5">{listError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={loadQuotes}>
              Try again
            </Button>
          </div>
        )}

        {actionError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="lv-body text-destructive">{actionError}</p>
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : isFirstRun ? (
          <div className="rounded-md border border-border py-16 px-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="lv-body text-foreground font-medium">No quotes yet</p>
            <p className="lv-meta text-muted-foreground mt-1 max-w-sm mx-auto">
              When your AI receptionist gives a customer a real price over text or web chat, it'll
              show up here automatically.
            </p>
          </div>
        ) : (
          !listError && (
            <>
              <div
                className="flex items-center gap-1.5 overflow-x-auto mb-4 -mx-1 px-1"
                role="tablist"
                aria-label="Quote status"
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
                    No {BUCKET_LABEL[activeTab].toLowerCase()} quotes
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
                          <TableHead className="min-w-[140px]">Job</TableHead>
                          <TableHead className="min-w-[100px] text-right">Amount</TableHead>
                          <TableHead className="min-w-[100px]">Sent</TableHead>
                          <TableHead className="min-w-[130px]">Status</TableHead>
                          <TableHead className="min-w-[260px]">Next action</TableHead>
                          <TableHead className="min-w-[160px] text-right">
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleQuotes.map((q) => (
                          <TableRow key={q.id}>
                            <TableCell className="max-w-[220px]">
                              <div
                                className="truncate lv-body text-foreground font-medium"
                                title={q.customerLabel}
                              >
                                {q.customerLabel}
                              </div>
                              <div className="lv-meta text-muted-foreground truncate">
                                {channelLabel(q.channel)}
                                {q.matchedLeadName ? ` · Lead: ${q.matchedLeadName}` : ""}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="lv-body text-foreground">
                                {serviceLabel(q.service_type)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="lv-numbers text-foreground whitespace-nowrap">
                                {formatMoney(q.quoted_price)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="lv-meta text-muted-foreground whitespace-nowrap">
                                {relativeTime(q.quoted_at)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusDot status={BUCKET_TO_DOT[q.bucket]} />
                            </TableCell>
                            <TableCell>
                              <span className="lv-meta text-muted-foreground">
                                {nextActionFor(q)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {(q.bucket === "open" || q.bucket === "needs_followup") && (
                                  <>
                                    <Button asChild size="sm" variant="outline">
                                      <Link to="/app/inbox">Reply in Inbox</Link>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={actionPendingId === q.id}
                                      onClick={() => updateStatus(q, "booked")}
                                    >
                                      Mark won
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive"
                                      disabled={actionPendingId === q.id}
                                      onClick={() => updateStatus(q, "cancelled")}
                                    >
                                      Mark lost
                                    </Button>
                                  </>
                                )}
                                {q.bucket === "lost" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={actionPendingId === q.id}
                                    onClick={() => updateStatus(q, "active")}
                                  >
                                    Reopen
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
                    {visibleQuotes.map((q) => (
                      <li key={q.id} className="rounded-md border border-border overflow-hidden">
                        <div className="px-3 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="lv-body text-foreground font-medium truncate">
                              {q.customerLabel}
                            </span>
                            <span className="lv-numbers text-foreground shrink-0">
                              {formatMoney(q.quoted_price)}
                            </span>
                          </div>
                          <div className="lv-meta text-muted-foreground truncate mt-0.5">
                            {serviceLabel(q.service_type)} · {channelLabel(q.channel)}
                            {q.matchedLeadName ? ` · Lead: ${q.matchedLeadName}` : ""}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <StatusDot status={BUCKET_TO_DOT[q.bucket]} />
                            <span className="lv-meta text-muted-foreground shrink-0">
                              {relativeTime(q.quoted_at)}
                            </span>
                          </div>
                          <p className="lv-meta text-muted-foreground mt-1.5">{nextActionFor(q)}</p>
                        </div>
                        {(q.bucket === "open" || q.bucket === "needs_followup") && (
                          <div className="border-t border-border p-2.5 flex flex-wrap gap-1.5">
                            <Button asChild size="sm" variant="outline" className="min-h-[44px]">
                              <Link to="/app/inbox">Reply in Inbox</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px]"
                              disabled={actionPendingId === q.id}
                              onClick={() => updateStatus(q, "booked")}
                            >
                              Mark won
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px] text-destructive"
                              disabled={actionPendingId === q.id}
                              onClick={() => updateStatus(q, "cancelled")}
                            >
                              Mark lost
                            </Button>
                          </div>
                        )}
                        {q.bucket === "lost" && (
                          <div className="border-t border-border p-2.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px] w-full"
                              disabled={actionPendingId === q.id}
                              onClick={() => updateStatus(q, "active")}
                            >
                              Reopen
                            </Button>
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
