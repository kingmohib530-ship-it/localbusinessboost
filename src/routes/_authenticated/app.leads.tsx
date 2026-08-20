import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Download, Plus, Search as SearchIcon, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusDot, type LvStatus } from "@/components/StatusDot";
import { cn } from "@/lib/utils";
import { relativeTime, daysAgo } from "@/lib/timeFormat";

export const Route = createFileRoute("/_authenticated/app/leads")({
  component: Leads,
});

interface LeadRow {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  industry: string | null;
  status: string | null;
  data_source: string | null;
  notes: string | null;
  ai_research_summary: string | null;
  pain_signals: string[] | null;
  google_rating: number | null;
  google_review_count: number | null;
  created_at: string;
}

interface SequenceStep {
  id: string;
  lead_id: string;
  step_number: number;
  channel: string;
  status: string;
  sent_at: string | null;
}

interface QuoteRow {
  conversation_id: string;
  service_type: string | null;
  quoted_price: number | null;
}

interface AppointmentRow {
  customer_phone: string | null;
  service_type: string;
  estimated_value: number | null;
  scheduled_at: string;
}

type Bucket = "open" | "quoted" | "won" | "archived";

interface LeadComputed extends LeadRow {
  bucket: Bucket;
  job: string | null;
  value: number | null;
  steps: SequenceStep[];
  pendingStep: SequenceStep | null;
  lastTouchIso: string | null;
  unanswered: boolean;
}

const TABS: { key: Bucket; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "quoted", label: "Quoted" },
  { key: "won", label: "Won" },
  { key: "archived", label: "Archived" },
];

const STATUS_TO_DOT: Record<string, LvStatus> = {
  new: "new",
  contacted: "no_reply",
  responded: "waiting_on_you",
  qualified: "waiting_on_you",
  scheduled: "booked",
  nurture: "stale",
  dead: "failed",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  responded: "Responded",
  qualified: "Qualified",
  scheduled: "Scheduled",
  nurture: "Nurture",
  dead: "Dead",
};

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "responded",
  "qualified",
  "scheduled",
  "nurture",
  "dead",
];

const SOURCE_LABELS: Record<string, string> = {
  google_maps: "Google Maps",
  manual: "Manual",
};

const DAY_MS = 86400000;
const LEAD_FETCH_LIMIT = 500;

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

function bucketFor(status: string | null, hasActiveQuote: boolean): Bucket {
  if (status === "nurture" || status === "dead") return "archived";
  if (status === "scheduled") return "won";
  if (hasActiveQuote) return "quoted";
  return "open";
}

function formatMoney(dollars: number | null): string {
  if (dollars === null) return "—";
  return `$${dollars.toLocaleString()}`;
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function leadLabel(l: LeadRow): string {
  return l.business_name || l.owner_name || "Unnamed lead";
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function SkeletonRows() {
  return (
    <div className="p-4 space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-[52px] w-full rounded-md" />
      ))}
    </div>
  );
}

function Leads() {
  const [leads, setLeads] = useState<LeadComputed[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [everCount, setEverCount] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<Bucket>("open");
  const [search, setSearch] = useState("");

  const [selectedLead, setSelectedLead] = useState<LeadComputed | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [followingUpId, setFollowingUpId] = useState<string | null>(null);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableScroll, setTableScroll] = useState({ canScrollLeft: false, canScrollRight: false });

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [addForm, setAddForm] = useState({
    business_name: "",
    phone: "",
    email: "",
    city: "",
    industry: "",
  });

  useEffect(() => {
    setNotesDraft(selectedLead?.notes || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead?.id]);

  async function loadLeads() {
    setLoading(true);
    setListError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: leadRows, error: leadErr }, { count }] = await Promise.all([
      supabase
        .from("lead_profiles")
        .select(
          "id, business_name, owner_name, phone, email, city, industry, status, data_source, notes, ai_research_summary, pain_signals, google_rating, google_review_count, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(LEAD_FETCH_LIMIT),
      supabase
        .from("lead_profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    if (leadErr) {
      console.error("[leads] failed to load lead_profiles", leadErr);
      setListError("Couldn't load your leads. Please refresh the page.");
      setLoading(false);
      return;
    }
    setEverCount(count ?? 0);

    const rows = (leadRows as LeadRow[]) ?? [];
    if (rows.length === 0) {
      setLeads([]);
      setLoading(false);
      return;
    }

    const ids = rows.map((r) => r.id);
    const [{ data: seqRows }, { data: convRows }, { data: quoteRows }, { data: apptRows }] =
      await Promise.all([
        supabase
          .from("lead_sequences")
          .select("id, lead_id, step_number, channel, status, sent_at")
          .in("lead_id", ids),
        supabase.from("conversations").select("id, customer_identifier").eq("user_id", user.id),
        supabase
          .from("quote_follow_ups")
          .select("conversation_id, service_type, quoted_price")
          .eq("user_id", user.id)
          .eq("status", "active"),
        supabase
          .from("appointments")
          .select("customer_phone, service_type, estimated_value, scheduled_at")
          .eq("user_id", user.id)
          .order("scheduled_at", { ascending: false }),
      ]);

    const stepsByLead = new Map<string, SequenceStep[]>();
    for (const s of (seqRows as SequenceStep[]) ?? []) {
      if (!s.lead_id) continue;
      const arr = stepsByLead.get(s.lead_id) ?? [];
      arr.push(s);
      stepsByLead.set(s.lead_id, arr);
    }

    const convPhoneToId = new Map<string, string>();
    for (const c of (convRows as { id: string; customer_identifier: string }[]) ?? []) {
      const norm = normalizePhone(c.customer_identifier);
      if (norm) convPhoneToId.set(norm, c.id);
    }
    const quoteByConvId = new Map<string, QuoteRow>();
    for (const q of (quoteRows as QuoteRow[]) ?? []) {
      quoteByConvId.set(q.conversation_id, q);
    }
    const phoneToQuote = new Map<string, QuoteRow>();
    for (const [phone, convId] of convPhoneToId) {
      const q = quoteByConvId.get(convId);
      if (q) phoneToQuote.set(phone, q);
    }

    const phoneToAppt = new Map<string, AppointmentRow>();
    for (const a of (apptRows as AppointmentRow[]) ?? []) {
      const norm = normalizePhone(a.customer_phone);
      if (norm && !phoneToAppt.has(norm)) phoneToAppt.set(norm, a);
    }

    const now = Date.now();
    const computed: LeadComputed[] = rows.map((lead) => {
      const norm = normalizePhone(lead.phone);
      const quote = norm ? phoneToQuote.get(norm) : undefined;
      const appt = norm ? phoneToAppt.get(norm) : undefined;
      const bucket = bucketFor(lead.status, !!quote);
      const job = quote?.service_type || appt?.service_type || lead.industry || null;
      const value =
        bucket === "quoted"
          ? (quote?.quoted_price ?? null)
          : bucket === "won"
            ? (appt?.estimated_value ?? null)
            : null;

      const steps = (stepsByLead.get(lead.id) ?? []).sort((a, b) => a.step_number - b.step_number);
      const pendingStep = steps.find((s) => s.status === "pending") ?? null;
      const sentSteps = steps
        .filter((s) => s.sent_at)
        .sort((a, b) => new Date(b.sent_at!).getTime() - new Date(a.sent_at!).getTime());
      const lastTouchIso = sentSteps[0]?.sent_at ?? null;
      const unanswered =
        lead.status === "contacted" &&
        lastTouchIso !== null &&
        now - new Date(lastTouchIso).getTime() > DAY_MS;

      return { ...lead, bucket, job, value, steps, pendingStep, lastTouchIso, unanswered };
    });

    setLeads(computed);
    setLoading(false);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  const openCount = useMemo(() => leads.filter((l) => l.bucket === "open").length, [leads]);
  const unansweredCount = useMemo(() => leads.filter((l) => l.unanswered).length, [leads]);
  const tabCounts = useMemo(() => {
    const counts: Record<Bucket, number> = { open: 0, quoted: 0, won: 0, archived: 0 };
    for (const l of leads) counts[l.bucket]++;
    return counts;
  }, [leads]);

  const isFirstRun = !loading && !listError && (everCount ?? 0) === 0;

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = leads.filter((l) => {
      if (l.bucket !== activeTab) return false;
      if (!q) return true;
      return (
        l.business_name?.toLowerCase().includes(q) ||
        l.owner_name?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q)
      );
    });
    const unansweredFirst = filtered
      .filter((l) => l.unanswered)
      .sort((a, b) => new Date(a.lastTouchIso!).getTime() - new Date(b.lastTouchIso!).getTime());
    const rest = filtered
      .filter((l) => !l.unanswered)
      .sort(
        (a, b) =>
          new Date(b.lastTouchIso || b.created_at).getTime() -
          new Date(a.lastTouchIso || a.created_at).getTime(),
      );
    return [...unansweredFirst, ...rest];
  }, [leads, activeTab, search]);

  const updateTableScroll = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    const canScrollLeft = el.scrollLeft > 1;
    const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setTableScroll((prev) =>
      prev.canScrollLeft === canScrollLeft && prev.canScrollRight === canScrollRight
        ? prev
        : { canScrollLeft, canScrollRight },
    );
  }, []);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el) return;
    updateTableScroll();
    el.addEventListener("scroll", updateTableScroll, { passive: true });
    const resizeObserver = new ResizeObserver(updateTableScroll);
    resizeObserver.observe(el);
    window.addEventListener("resize", updateTableScroll);
    return () => {
      el.removeEventListener("scroll", updateTableScroll);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateTableScroll);
    };
  }, [updateTableScroll, visibleLeads.length]);

  const isCaughtUp =
    !loading && !listError && !isFirstRun && activeTab === "open" && tabCounts.open === 0;
  const isFilteredEmpty =
    !loading && !listError && !isFirstRun && !isCaughtUp && visibleLeads.length === 0;

  async function handleFollowUp(lead: LeadComputed) {
    if (!lead.pendingStep) return;
    setFollowingUpId(lead.id);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/lead-generator/execute-step", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, step_id: lead.pendingStep.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Couldn't send the follow-up. Please try again.");
        return;
      }
      toast.success(`Follow-up sent to ${leadLabel(lead)}.`);
      await loadLeads();
    } catch (e) {
      console.error("[leads] follow-up failed", e);
      toast.error("Network error sending follow-up.");
    } finally {
      setFollowingUpId(null);
    }
  }

  async function updateStatus(leadId: string, status: string) {
    const { error } = await supabase.from("lead_profiles").update({ status }).eq("id", leadId);
    if (error) {
      toast.error("Couldn't update status. Please try again.");
      return;
    }
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, status, bucket: bucketFor(status, !!(l.value && l.bucket === "quoted")) }
          : l,
      ),
    );
    setSelectedLead((d) => (d && d.id === leadId ? { ...d, status } : d));
  }

  async function saveNotes(leadId: string) {
    const { error } = await supabase
      .from("lead_profiles")
      .update({ notes: notesDraft })
      .eq("id", leadId);
    if (error) {
      toast.error("Couldn't save notes.");
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notes: notesDraft } : l)));
  }

  async function handleAddLead(e: FormEvent) {
    e.preventDefault();
    const businessName = addForm.business_name.trim();
    if (!businessName) {
      setAddError("Business name is required.");
      return;
    }
    setAddSaving(true);
    setAddError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAddError("Please sign in again and retry.");
      setAddSaving(false);
      return;
    }
    const { error } = await supabase.from("lead_profiles").insert({
      user_id: user.id,
      business_name: businessName,
      phone: addForm.phone.trim() || null,
      email: addForm.email.trim() || null,
      city: addForm.city.trim() || null,
      industry: addForm.industry.trim() || null,
      status: "new",
      data_source: "manual",
    });
    setAddSaving(false);
    if (error) {
      console.error("[leads] add lead failed", error);
      setAddError("Couldn't add this lead. Please try again.");
      return;
    }
    setAddOpen(false);
    setAddForm({ business_name: "", phone: "", email: "", city: "", industry: "" });
    toast.success(`${businessName} added.`);
    await loadLeads();
    setActiveTab("open");
  }

  function handleExport() {
    const header = ["Customer", "Job", "Source", "Status", "Value", "Last touch"];
    const lines = [header.join(",")];
    for (const l of visibleLeads) {
      lines.push(
        [
          csvEscape(leadLabel(l)),
          csvEscape(l.job || ""),
          csvEscape(l.data_source ? (SOURCE_LABELS[l.data_source] ?? l.data_source) : ""),
          csvEscape(l.status ? (STATUS_LABELS[l.status] ?? l.status) : ""),
          l.value !== null ? String(l.value) : "",
          l.lastTouchIso ? new Date(l.lastTouchIso).toISOString() : "",
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="lv-page-title text-foreground">Leads</h1>
            {!loading && !listError && !isFirstRun && (
              <p className="lv-body text-muted-foreground mt-1">
                <span className="lv-numbers">{openCount}</span> open
                {" · "}
                <span className="lv-numbers">{unansweredCount}</span> unanswered for more than a day
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={loading || visibleLeads.length === 0}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add lead
            </Button>
          </div>
        </div>

        {listError && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="lv-label text-destructive">Couldn't load your leads</p>
            <p className="lv-body text-foreground mt-0.5">{listError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={loadLeads}>
              Try again
            </Button>
          </div>
        )}

        {loading ? (
          <SkeletonRows />
        ) : isFirstRun ? (
          <div className="rounded-md border border-border py-16 px-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="lv-body text-foreground font-medium">No leads yet</p>
            <p className="lv-meta text-muted-foreground mt-1 max-w-sm mx-auto">
              Add a lead manually, or generate real prospects from Outreach.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add lead
              </Button>
            </div>
          </div>
        ) : (
          !listError && (
            <>
              {/* Filter tabs. Roving tabindex + arrow-key navigation per the
                  ARIA tabs pattern, so Tab moves in/out of the group as one
                  stop and Left/Right move between tabs, matching what
                  role="tab" promises assistive tech instead of only
                  announcing it. */}
              <div
                className="flex items-center gap-1.5 overflow-x-auto mb-4 -mx-1 px-1"
                role="tablist"
                aria-label="Lead status"
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

              {/* Search */}
              <div className="relative mb-4 max-w-sm">
                <SearchIcon
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search leads..."
                  className="pl-8 h-9"
                  aria-label="Search leads"
                />
              </div>

              {isCaughtUp ? (
                <div className="rounded-md border border-border bg-card px-4 py-3 mb-2">
                  <p className="lv-label text-foreground">You're caught up</p>
                  <p className="lv-meta text-muted-foreground">
                    No open leads need your attention right now.
                  </p>
                </div>
              ) : isFilteredEmpty ? (
                <div className="rounded-md border border-border py-12 px-6 text-center">
                  <p className="lv-body text-foreground font-medium">
                    {search ? "No leads match your search" : `No ${activeTab} leads`}
                  </p>
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="lv-meta text-primary underline mt-1"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop table. Source hides below lg to buy back room
                      at 1024px; below that the table scrolls horizontally
                      inside its own bordered panel (shadcn's Table already
                      wraps itself in an overflow-auto div - no second
                      scroll container needed, which is what previously made
                      the scroll affordance ambiguous). A sticky action
                      column was tried and reverted: it visually overlapped
                      the Last touch column whenever the table was still
                      wider than the viewport, which is worse than a plain
                      scroll. In its place: two edge hints (inset shadow, not
                      a gradient) that only render while there's actually
                      more to scroll to on that side, and disappear on their
                      own once the user scrolls that far - so they never sit
                      over the Actions column once it's in view. */}
                  <div className="relative hidden md:block rounded-md border border-border overflow-hidden">
                    <Table
                      containerRef={tableScrollRef}
                      containerProps={{
                        tabIndex:
                          tableScroll.canScrollLeft || tableScroll.canScrollRight ? 0 : undefined,
                        role: "region",
                        "aria-label": "Leads table, scroll horizontally for more columns",
                      }}
                    >
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[220px]">Customer</TableHead>
                          <TableHead className="min-w-[180px]">Job</TableHead>
                          <TableHead className="min-w-[110px] hidden lg:table-cell">
                            Source
                          </TableHead>
                          <TableHead className="min-w-[150px]">Status</TableHead>
                          <TableHead className="min-w-[100px] text-right">Value</TableHead>
                          <TableHead className="min-w-[100px]">Last touch</TableHead>
                          <TableHead className="min-w-[210px] text-right">
                            <span className="sr-only">Actions</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleLeads.map((l) => (
                          <TableRow
                            key={l.id}
                            className={cn(selectedLead?.id === l.id && "bg-accent/40")}
                          >
                            <TableCell className="max-w-[240px]">
                              <div
                                className="truncate lv-body text-foreground font-medium"
                                title={leadLabel(l)}
                              >
                                {leadLabel(l)}
                              </div>
                              {(l.city || l.phone) && (
                                <div className="lv-meta text-muted-foreground truncate">
                                  {[l.city, l.phone].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <div
                                className="truncate lv-body text-foreground"
                                title={l.job || undefined}
                              >
                                {l.job || "—"}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <span className="lv-meta text-muted-foreground whitespace-nowrap">
                                {l.data_source
                                  ? (SOURCE_LABELS[l.data_source] ?? l.data_source)
                                  : "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusDot
                                status={l.status ? (STATUS_TO_DOT[l.status] ?? "new") : "new"}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="lv-numbers text-foreground whitespace-nowrap">
                                {formatMoney(l.value)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="lv-meta text-muted-foreground whitespace-nowrap">
                                {l.lastTouchIso ? relativeTime(l.lastTouchIso) : "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1.5">
                                {l.pendingStep && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleFollowUp(l)}
                                    disabled={followingUpId === l.id}
                                  >
                                    {followingUpId === l.id ? "Sending..." : "Follow up"}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant={l.pendingStep ? "ghost" : "outline"}
                                  onClick={() => setSelectedLead(l)}
                                >
                                  View lead
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-y-0 left-0 w-8 transition-opacity duration-150 ease-out motion-reduce:transition-none",
                        tableScroll.canScrollLeft ? "opacity-100" : "opacity-0",
                      )}
                      style={{ boxShadow: "inset 16px 0 12px -10px rgba(0, 0, 0, 0.22)" }}
                    />
                    <div
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-y-0 right-0 w-8 transition-opacity duration-150 ease-out motion-reduce:transition-none",
                        tableScroll.canScrollRight ? "opacity-100" : "opacity-0",
                      )}
                      style={{ boxShadow: "inset -16px 0 12px -10px rgba(0, 0, 0, 0.22)" }}
                    />
                  </div>

                  {/* Mobile card list */}
                  <ul className="md:hidden space-y-2">
                    {visibleLeads.map((l) => (
                      <li key={l.id} className="rounded-md border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedLead(l)}
                          className="w-full text-left px-3 py-3 min-h-[44px] hover:bg-accent transition-colors duration-150 ease-out"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="lv-body text-foreground font-medium truncate">
                              {leadLabel(l)}
                            </span>
                            <span className="lv-numbers text-foreground shrink-0">
                              {formatMoney(l.value)}
                            </span>
                          </div>
                          <div className="lv-meta text-muted-foreground truncate mt-0.5">
                            {l.job || "—"}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1.5">
                            <StatusDot
                              status={l.status ? (STATUS_TO_DOT[l.status] ?? "new") : "new"}
                            />
                            <span className="lv-meta text-muted-foreground shrink-0">
                              {l.lastTouchIso ? relativeTime(l.lastTouchIso) : "No outreach yet"}
                            </span>
                          </div>
                        </button>
                        {l.pendingStep && (
                          <div className="border-t border-border px-3 py-2">
                            <Button
                              size="sm"
                              className="w-full min-h-[44px]"
                              onClick={() => handleFollowUp(l)}
                              disabled={followingUpId === l.id}
                            >
                              {followingUpId === l.id ? "Sending..." : "Follow up"}
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

      {/* Add lead dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => (v ? setAddOpen(true) : setAddOpen(false))}>
        <DialogContent className="lv-light sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="lv-section">Add lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLead} className="space-y-3">
            <div>
              <label htmlFor="lead-business-name" className="lv-label text-foreground block mb-1">
                Business name
              </label>
              <Input
                id="lead-business-name"
                value={addForm.business_name}
                onChange={(e) => setAddForm((f) => ({ ...f, business_name: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lead-phone" className="lv-label text-foreground block mb-1">
                  Phone
                </label>
                <Input
                  id="lead-phone"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="lead-email" className="lv-label text-foreground block mb-1">
                  Email
                </label>
                <Input
                  id="lead-email"
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lead-city" className="lv-label text-foreground block mb-1">
                  City
                </label>
                <Input
                  id="lead-city"
                  value={addForm.city}
                  onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="lead-industry" className="lv-label text-foreground block mb-1">
                  Industry
                </label>
                <Input
                  id="lead-industry"
                  value={addForm.industry}
                  onChange={(e) => setAddForm((f) => ({ ...f, industry: e.target.value }))}
                />
              </div>
            </div>
            {addError && <p className="lv-meta text-destructive">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving ? "Adding..." : "Add lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead detail sheet */}
      <Sheet
        open={!!selectedLead}
        onOpenChange={(v) => {
          if (!v) setSelectedLead(null);
        }}
      >
        <SheetContent side="right" className="lv-light w-full sm:max-w-xl overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader className="pr-8 text-left">
                <SheetTitle className="lv-section text-foreground truncate">
                  {leadLabel(selectedLead)}
                </SheetTitle>
                {selectedLead.owner_name && (
                  <p className="lv-meta text-muted-foreground mt-0.5">{selectedLead.owner_name}</p>
                )}
              </SheetHeader>

              <div className="mt-4 space-y-5">
                <div>
                  <label htmlFor="lead-status" className="lv-label text-foreground block mb-1.5">
                    Status
                  </label>
                  <Select
                    value={selectedLead.status ?? "new"}
                    onValueChange={(v) => updateStatus(selectedLead.id, v)}
                  >
                    <SelectTrigger id="lead-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 lv-body text-foreground">
                  {selectedLead.phone && (
                    <div>
                      <span className="text-muted-foreground">Phone: </span>
                      {selectedLead.phone}
                    </div>
                  )}
                  {selectedLead.email && (
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      {selectedLead.email}
                    </div>
                  )}
                  {selectedLead.city && (
                    <div>
                      <span className="text-muted-foreground">City: </span>
                      {selectedLead.city}
                    </div>
                  )}
                  {selectedLead.industry && (
                    <div>
                      <span className="text-muted-foreground">Industry: </span>
                      {selectedLead.industry}
                    </div>
                  )}
                  {selectedLead.google_rating !== null && (
                    <div>
                      <span className="text-muted-foreground">Google: </span>
                      {selectedLead.google_rating}★ ({selectedLead.google_review_count ?? 0}{" "}
                      reviews)
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Added: </span>
                    {daysAgo(selectedLead.created_at)} ago
                  </div>
                </div>

                {selectedLead.pain_signals && selectedLead.pain_signals.length > 0 && (
                  <div>
                    <p className="lv-label text-foreground mb-1.5">Pain signals</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLead.pain_signals.map((p) => (
                        <span
                          key={p}
                          className="lv-meta rounded-sm bg-accent text-primary px-2 py-0.5"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLead.ai_research_summary && (
                  <div>
                    <p className="lv-label text-foreground mb-1.5">Research summary</p>
                    <p className="lv-body text-muted-foreground">
                      {selectedLead.ai_research_summary}
                    </p>
                  </div>
                )}

                {selectedLead.steps.length > 0 && (
                  <div>
                    <p className="lv-label text-foreground mb-1.5">Outreach sequence</p>
                    <div className="space-y-1.5">
                      {selectedLead.steps.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-sm border border-border px-2.5 py-2 lv-meta text-muted-foreground"
                        >
                          <span className="text-foreground font-medium">Step {s.step_number}</span>
                          {" · "}
                          {s.channel}
                          {" · "}
                          {s.status}
                          {s.sent_at && ` · ${relativeTime(s.sent_at)} ago`}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="lead-notes" className="lv-label text-foreground block mb-1.5">
                    Notes
                  </label>
                  <Textarea
                    id="lead-notes"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    onBlur={() => saveNotes(selectedLead.id)}
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {selectedLead.pendingStep && (
                    <Button
                      className="flex-1 min-h-[44px]"
                      onClick={() => handleFollowUp(selectedLead)}
                      disabled={followingUpId === selectedLead.id}
                    >
                      {followingUpId === selectedLead.id ? "Sending..." : "Follow up"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className={cn("min-h-[44px]", selectedLead.pendingStep ? "" : "flex-1")}
                    onClick={() => updateStatus(selectedLead.id, "dead")}
                    disabled={selectedLead.status === "dead"}
                  >
                    Mark as dead
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
