import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Wand2, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusDot, type LvStatus } from "@/components/StatusDot";
import { relativeTime } from "@/lib/timeFormat";

const INDUSTRIES = [
  "HVAC",
  "Plumbing",
  "Roofing",
  "Electrical",
  "Cleaning",
  "Landscaping",
  "Dental",
  "Legal",
  "Pest Control",
  "Auto Repair",
];

// Same status vocabulary Leads uses for lead_profiles.status, so a
// prospect looks identical whether it's viewed here or in Leads.
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

interface LeadProfile {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  status: string;
  priority: string;
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

// Bounds how many prospects render in the summary table regardless of how
// many a business has generated over time - full management (and the
// ability to page/search through everything) lives in Leads.
const RECENT_LIMIT = 10;

// Derived from lead_sequences.sent_at (the same source app.leads.tsx uses
// for its own "last touch" column) rather than lead_profiles.outreach_history
// - one source of truth instead of two that could drift apart.
function lastTouchIso(steps: SequenceStep[]): string | null {
  const sent = steps.filter((s) => s.sent_at).map((s) => s.sent_at as string);
  if (sent.length === 0) return null;
  return sent.reduce((latest, iso) => (iso > latest ? iso : latest), sent[0]);
}

function nextActionLabel(steps: SequenceStep[]): string {
  const pending = steps.find((s) => s.status === "pending");
  if (pending) return `Step ${pending.step_number} pending`;
  if (steps.length > 0) return "Sequence complete";
  return "No sequence";
}

function sequenceProgressLabel(steps: SequenceStep[]): string {
  if (steps.length === 0) return "—";
  const sent = steps.filter((s) => s.sent_at).length;
  return `${sent}/${steps.length} sent`;
}

function SummarySkeleton() {
  return (
    <div className="rounded-md border border-border bg-card p-5 md:p-6 space-y-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[52px] w-full rounded-md" />
      ))}
    </div>
  );
}

export default function LeadGenerator() {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [city, setCity] = useState("");
  const [count, setCount] = useState(30);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState("");

  const [leads, setLeads] = useState<LeadProfile[]>([]);
  const [sequences, setSequences] = useState<Record<string, SequenceStep[]>>({});
  const [loading, setLoading] = useState(true);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: leadRows } = await supabase
      .from("lead_profiles")
      .select("id, business_name, owner_name, phone, status, priority, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    const typedLeads = (leadRows || []) as unknown as LeadProfile[];
    setLeads(typedLeads);

    // Sequence steps are only ever shown for the bounded "recent" slice
    // rendered below, so only fetch those rather than every lead's history.
    const recentIds = typedLeads.slice(0, RECENT_LIMIT).map((l) => l.id);
    if (recentIds.length > 0) {
      const { data: seqRows } = await supabase
        .from("lead_sequences")
        .select("id, lead_id, step_number, channel, status, sent_at")
        .in("lead_id", recentIds)
        .order("step_number", { ascending: true });
      const grouped: Record<string, SequenceStep[]> = {};
      for (const s of (seqRows || []) as unknown as SequenceStep[]) {
        if (!s.lead_id) continue;
        (grouped[s.lead_id] ||= []).push(s);
      }
      setSequences(grouped);
    } else {
      setSequences({});
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("city, industry")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.city) setCity(data.city);
          // profiles.industry is free text from onboarding (e.g. "Cleaning
          // Services"), while this list is a fixed set of prospecting
          // categories - only pre-fill on a real match, so a business with
          // an industry outside this list keeps the current default instead
          // of silently landing on an unrelated category.
          const match = data?.industry
            ? INDUSTRIES.find((i) => i.toLowerCase() === data.industry!.toLowerCase())
            : null;
          if (match) setIndustry(match);
        });
    });
  }, [loadLeads]);

  async function generateLeads() {
    if (!city.trim()) {
      setError("Please enter a city.");
      return;
    }
    setError("");
    setResearching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Please sign in again and retry.");
        setResearching(false);
        return;
      }
      const res = await fetch("/api/lead-generator/research", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ industry, city: city.trim(), count }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong. Please try again.");
        setResearching(false);
        return;
      }
      await loadLeads();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResearching(false);
    }
  }

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const hotThisWeek = leads.filter(
    (l) => l.priority === "hot" && now - new Date(l.created_at).getTime() < weekMs,
  ).length;
  const outreachStarted = leads.filter((l) => l.status !== "new").length;
  const replies = leads.filter((l) =>
    ["responded", "qualified", "scheduled"].includes(l.status),
  ).length;
  const scheduled = leads.filter((l) => l.status === "scheduled").length;

  const recentLeads = leads.slice(0, RECENT_LIMIT);

  return (
    <div className="space-y-6">
      {/* Find opportunities */}
      <div className="rounded-md border border-border bg-card p-5 md:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
            <Wand2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="lv-section text-foreground">Find opportunities</h2>
            <p className="lv-meta text-muted-foreground">
              Search real local businesses and get a personalized opening line for each one.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <Label htmlFor="og-industry" className="lv-label text-foreground block mb-1.5">
              Industry
            </Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger id="og-industry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="og-city" className="lv-label text-foreground block mb-1.5">
              City
            </Label>
            <Input
              id="og-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Fairfax VA"
            />
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="og-count" className="lv-label text-foreground block mb-2">
            Number of prospects: <span className="lv-numbers text-foreground">{count}</span>
          </Label>
          <Slider
            id="og-count"
            min={10}
            max={50}
            step={1}
            value={[count]}
            onValueChange={([v]) => setCount(v)}
            aria-label="Number of prospects to research"
          />
        </div>

        <p className="lv-meta text-muted-foreground mb-4">
          Outreach sequences send by text message.
        </p>

        {error && (
          <p className="lv-meta text-destructive mb-3" role="alert">
            {error}
          </p>
        )}

        <Button
          onClick={generateLeads}
          disabled={researching}
          className="w-full sm:w-auto min-h-[44px]"
        >
          {researching
            ? `Researching ${count} businesses in ${city || "your area"}...`
            : "Find opportunities"}
        </Button>
      </div>

      {/* Active outreach / recent prospects */}
      {loading ? (
        <SummarySkeleton />
      ) : leads.length > 0 ? (
        <div className="rounded-md border border-border bg-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="lv-section text-foreground">Active outreach</h2>
              <p className="lv-meta text-muted-foreground mt-0.5">
                What's currently happening with prospects you've found.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
              <Link to="/app/leads">
                Manage leads <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Prospects found", value: leads.length },
              { label: "Outreach started", value: outreachStarted },
              { label: "Replies", value: replies },
              { label: "Scheduled", value: scheduled },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-border px-3 py-2.5">
                <div className="lv-numbers text-foreground text-xl">{s.value}</div>
                <div className="lv-meta text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {hotThisWeek > 0 && (
            <p className="lv-meta text-muted-foreground mb-4">
              {hotThisWeek} hot {hotThisWeek === 1 ? "prospect" : "prospects"} found this week.
            </p>
          )}

          {/* Desktop table */}
          <div className="hidden md:block rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Company</TableHead>
                  <TableHead className="min-w-[140px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Sequence</TableHead>
                  <TableHead className="min-w-[100px]">Last touch</TableHead>
                  <TableHead className="min-w-[140px]">Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeads.map((lead) => {
                  const steps = sequences[lead.id] || [];
                  const touch = lastTouchIso(steps);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="max-w-[220px]">
                        <div
                          className="truncate lv-body text-foreground font-medium"
                          title={lead.business_name}
                        >
                          {lead.business_name}
                        </div>
                        {lead.owner_name && (
                          <div className="lv-meta text-muted-foreground truncate">
                            {lead.owner_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusDot status={STATUS_TO_DOT[lead.status] ?? "new"} />
                      </TableCell>
                      <TableCell>
                        <span className="lv-meta text-muted-foreground whitespace-nowrap">
                          {sequenceProgressLabel(steps)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="lv-meta text-muted-foreground whitespace-nowrap">
                          {touch ? `${relativeTime(touch)} ago` : "No outreach yet"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="lv-meta text-muted-foreground whitespace-nowrap">
                          {nextActionLabel(steps)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <ul className="md:hidden space-y-2">
            {recentLeads.map((lead) => {
              const steps = sequences[lead.id] || [];
              const touch = lastTouchIso(steps);
              return (
                <li key={lead.id} className="rounded-md border border-border px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="lv-body text-foreground font-medium truncate">
                      {lead.business_name}
                    </span>
                    <StatusDot status={STATUS_TO_DOT[lead.status] ?? "new"} className="shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <span className="lv-meta text-muted-foreground">
                      {touch ? `${relativeTime(touch)} ago` : "No outreach yet"}
                    </span>
                    <span className="lv-meta text-muted-foreground shrink-0">
                      {nextActionLabel(steps)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {leads.length > RECENT_LIMIT && (
            <p className="lv-meta text-muted-foreground mt-3">
              Showing the {RECENT_LIMIT} most recent of {leads.length} prospects.{" "}
              <Link to="/app/leads" className="text-primary underline underline-offset-2">
                View all in Leads
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-border py-12 px-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="lv-body text-foreground font-medium">No prospects yet</p>
          <p className="lv-meta text-muted-foreground mt-1 max-w-sm mx-auto">
            Run Find opportunities above to research your first batch of real local prospects.
          </p>
        </div>
      )}
    </div>
  );
}
