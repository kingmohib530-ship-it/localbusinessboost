import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Calendar, Search, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LeadGenerator from "@/components/LeadGenerator";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SOLO_LEAD_BLAST_MONTHLY_CAP } from "@/lib/pricingPlans";

export const Route = createFileRoute("/_authenticated/app/agents")({
  component: AgentsHub,
});

// Same "has a real, live subscription" definition used across the app
// (pricing.tsx, app.billing.tsx, the Stripe webhook) - duplicated here
// since this is client code reading a value those server-only files
// can't export into.
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

interface Competitor {
  name: string;
  strength: string;
  weakness: string;
}

interface CompetitorResult {
  competitors: Competitor[];
  opportunities: string[];
  insights: string[];
}

interface ForgeEmailTemplate {
  name: string;
  subject: string;
  body: string;
}

interface ForgeSmsTemplate {
  name: string;
  body: string;
}

interface ForgeNextAction {
  title: string;
  owner?: string;
  eta?: string;
  why?: string;
}

interface BookingPlanResult {
  trigger: string;
  steps: { action: string; details: string }[];
  kpis?: string[];
  estimatedRoi?: string;
  emailTemplates?: ForgeEmailTemplate[];
  smsTemplates?: ForgeSmsTemplate[];
  nextActions?: ForgeNextAction[];
}

type ToolId = "booking-booster" | "competitor-intel";

const SECONDARY_TOOLS: {
  id: ToolId;
  Icon: typeof Search;
  name: string;
  desc: string;
  time: string;
}[] = [
  {
    id: "booking-booster",
    Icon: Calendar,
    name: "Booking Follow-Up Plan",
    desc: "Get a ready-to-use follow-up plan for winning back no-shows and filling your calendar.",
    time: "~30 seconds",
  },
  {
    id: "competitor-intel",
    Icon: Search,
    name: "Competitor Intelligence",
    desc: "See plausible competitor archetypes for your market and where the gaps are.",
    time: "~20 seconds",
  },
];

const STEPS_BY_TOOL: Record<ToolId, string[]> = {
  "competitor-intel": [
    "Scanning your local market...",
    "Profiling competitor archetypes...",
    "Surfacing opportunities...",
  ],
  "booking-booster": [
    "Designing the follow-up flow...",
    "Writing email + SMS templates...",
    "Projecting revenue impact...",
  ],
};

function PlanGateNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-border px-4 py-3">
      <p className="lv-label text-foreground">{title}</p>
      <p className="lv-body text-muted-foreground mt-0.5">{description}</p>
      <Button size="sm" className="mt-3" asChild>
        <Link to="/app/billing">Upgrade now</Link>
      </Button>
    </div>
  );
}

function OutreachStatusPanel({
  isPaidActive,
  tier,
}: {
  isPaidActive: boolean;
  tier: string | null;
}) {
  if (!isPaidActive) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="lv-label text-foreground">Outreach requires an active plan</p>
          <p className="lv-meta text-muted-foreground mt-0.5">
            Subscribe to Solo or higher to find and contact new prospects.
          </p>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link to="/app/billing">Upgrade now</Link>
        </Button>
      </div>
    );
  }

  const capText =
    tier === "solo"
      ? `Solo plan — up to ${SOLO_LEAD_BLAST_MONTHLY_CAP} prospect searches per month`
      : "Unlimited prospect searches on your plan";

  return (
    <div className="rounded-md border border-border bg-card px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="lv-meta text-muted-foreground">{capText}</p>
      {tier === "solo" && (
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link to="/app/billing">Upgrade for unlimited</Link>
        </Button>
      )}
    </div>
  );
}

function AgentsHub() {
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [running, setRunning] = useState(false);
  const [competitorResult, setCompetitorResult] = useState<CompetitorResult | null>(null);
  const [bookingPlan, setBookingPlan] = useState<BookingPlanResult | null>(null);
  const [error, setError] = useState("");

  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [isPaidActive, setIsPaidActive] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("industry, city, subscription_tier, subscription_status")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.industry) setIndustry(data.industry);
          if (data?.city) setCity(data.city);
          setSubscriptionTier(data?.subscription_tier ?? null);
          setIsPaidActive(
            !!data?.subscription_tier &&
              data.subscription_tier !== "starter" &&
              ACTIVE_SUBSCRIPTION_STATUSES.has(data?.subscription_status ?? ""),
          );
        });
    });
  }, []);

  const isCrewPlus = subscriptionTier === "crew" || subscriptionTier === "agency";

  function openDialog(id: ToolId) {
    setOpenTool(id);
    setError("");
    setCompetitorResult(null);
    setBookingPlan(null);
  }

  function closeDialog() {
    setOpenTool(null);
    setRunning(false);
  }

  async function runTool() {
    if (!industry.trim() || !city.trim()) {
      setError("Please enter your trade type and city.");
      return;
    }
    const endpoint =
      openTool === "competitor-intel" ? "/api/competitor-intel" : "/api/booking-plan";

    setError("");
    setRunning(true);
    setCompetitorResult(null);
    setBookingPlan(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Please sign in again and retry.");
        setRunning(false);
        return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ industry: industry.trim(), city: city.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (openTool === "competitor-intel") {
        setCompetitorResult(data);
      } else {
        setBookingPlan(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  async function copyCompetitorIntel() {
    if (!competitorResult) return;
    const lines: string[] = [];
    lines.push("COMPETITORS");
    competitorResult.competitors.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}\n   Strength: ${c.strength}\n   Weakness: ${c.weakness}`);
    });
    lines.push("", "OPPORTUNITIES");
    competitorResult.opportunities.forEach((o, i) => lines.push(`${i + 1}. ${o}`));
    lines.push("", "INSIGHTS");
    competitorResult.insights.forEach((n, i) => lines.push(`${i + 1}. ${n}`));
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Couldn't copy - please select and copy the text manually.");
    }
  }

  async function copyBookingPlan() {
    if (!bookingPlan) return;
    const lines: string[] = [];
    lines.push(`TRIGGER\n${bookingPlan.trigger}`);
    if (bookingPlan.estimatedRoi) lines.push("", `ESTIMATED ROI\n${bookingPlan.estimatedRoi}`);
    lines.push("", "FOLLOW-UP FLOW");
    bookingPlan.steps.forEach((s, i) => lines.push(`${i + 1}. ${s.action} — ${s.details}`));
    if (bookingPlan.emailTemplates?.length) {
      lines.push("", "EMAIL TEMPLATES");
      bookingPlan.emailTemplates.forEach((t) =>
        lines.push(`- ${t.name}\n  Subject: ${t.subject}\n  ${t.body}`),
      );
    }
    if (bookingPlan.smsTemplates?.length) {
      lines.push("", "SMS TEMPLATES");
      bookingPlan.smsTemplates.forEach((t) => lines.push(`- ${t.name}: ${t.body}`));
    }
    if (bookingPlan.kpis?.length) {
      lines.push("", "KPIS");
      bookingPlan.kpis.forEach((k) => lines.push(`- ${k}`));
    }
    if (bookingPlan.nextActions?.length) {
      lines.push("", "NEXT ACTIONS");
      bookingPlan.nextActions.forEach((a, i) =>
        lines.push(`${i + 1}. ${a.title}${a.eta ? ` (${a.eta})` : ""}`),
      );
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Plan copied to clipboard!");
    } catch {
      toast.error("Couldn't copy - please select and copy the text manually.");
    }
  }

  const tool = SECONDARY_TOOLS.find((t) => t.id === openTool);
  const hasResult = !!competitorResult || !!bookingPlan;
  const steps = openTool ? STEPS_BY_TOOL[openTool] : [];

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[1000px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="lv-page-title text-foreground">Outreach</h1>
          <p className="lv-body text-muted-foreground mt-1">
            Find local prospects, start outreach, and follow progress. Real opportunities move into
            Leads as they respond.
          </p>
        </div>

        <OutreachStatusPanel isPaidActive={isPaidActive} tier={subscriptionTier} />

        <LeadGenerator />

        {/* More tools */}
        <div className="mt-10">
          <h2 className="lv-section text-foreground mb-1">More tools</h2>
          <p className="lv-meta text-muted-foreground mb-4">
            Optional utilities for Crew and Agency plans.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECONDARY_TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openDialog(t.id)}
                className="text-left rounded-md border border-border bg-card px-4 py-4 min-h-[44px] hover:bg-accent transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
                    <t.Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="lv-body text-foreground font-medium">{t.name}</span>
                </div>
                <p className="lv-meta text-muted-foreground">{t.desc}</p>
                <p className="lv-meta text-muted-foreground mt-2">{t.time}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary tool dialog */}
      <Dialog open={!!openTool} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="lv-light sm:max-w-lg max-h-[85vh] overflow-y-auto">
          {tool && (
            <>
              <DialogHeader>
                <DialogTitle className="lv-section">{tool.name}</DialogTitle>
              </DialogHeader>

              {!isCrewPlus ? (
                <PlanGateNotice
                  title={`${tool.name} is a Crew feature`}
                  description="Upgrade to Crew or Agency to unlock it."
                />
              ) : running ? (
                <div>
                  <p className="lv-body text-foreground font-medium mb-4">
                    {openTool === "competitor-intel"
                      ? `Analyzing ${industry} competitors in ${city}...`
                      : `Building a follow-up plan for ${industry} in ${city}...`}
                  </p>
                  <div className="flex flex-col gap-2">
                    {steps.map((s) => (
                      <div
                        key={s}
                        className="rounded-sm border border-border bg-accent px-3 py-2 lv-meta text-primary"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              ) : hasResult ? (
                <div>
                  {competitorResult && (
                    <div className="space-y-5">
                      <p className="lv-meta text-muted-foreground">
                        These are plausible competitor archetypes for your market, not named real
                        businesses.
                      </p>
                      <div>
                        <p className="lv-label text-foreground mb-2">Competitor archetypes</p>
                        <div className="space-y-2">
                          {competitorResult.competitors.map((c, i) => (
                            <div key={i} className="rounded-md border border-border px-3 py-2.5">
                              <p className="lv-body text-foreground font-medium mb-1">{c.name}</p>
                              <p className="lv-meta text-muted-foreground">
                                <span className="text-foreground">Strength:</span> {c.strength}
                              </p>
                              <p className="lv-meta text-muted-foreground">
                                <span className="text-foreground">Weakness:</span> {c.weakness}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="lv-label text-foreground mb-2">Opportunities</p>
                        <div className="space-y-1.5">
                          {competitorResult.opportunities.map((o, i) => (
                            <div
                              key={i}
                              className="rounded-sm border border-border bg-accent px-3 py-2 lv-meta text-foreground"
                            >
                              {o}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="lv-label text-foreground mb-2">Sharp insights</p>
                        <div className="space-y-1.5">
                          {competitorResult.insights.map((n, i) => (
                            <div
                              key={i}
                              className="rounded-sm border border-border px-3 py-2 lv-meta text-muted-foreground"
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {bookingPlan && (
                    <div className="space-y-5">
                      {bookingPlan.estimatedRoi && (
                        <p className="lv-body text-primary font-medium">
                          {bookingPlan.estimatedRoi}
                        </p>
                      )}
                      {bookingPlan.trigger && (
                        <div className="rounded-sm border border-border bg-accent px-3 py-2 lv-meta text-foreground">
                          <span className="font-medium">Trigger:</span> {bookingPlan.trigger}
                        </div>
                      )}
                      {bookingPlan.kpis && bookingPlan.kpis.length > 0 && (
                        <div>
                          <p className="lv-label text-foreground mb-2">Target KPIs</p>
                          <div className="flex flex-wrap gap-1.5">
                            {bookingPlan.kpis.map((k, i) => (
                              <span
                                key={i}
                                className="lv-meta rounded-sm bg-accent text-primary px-2 py-0.5"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="lv-label text-foreground mb-2">Follow-up flow</p>
                        <div className="space-y-2">
                          {bookingPlan.steps.map((s, i) => (
                            <div key={i} className="rounded-md border border-border px-3 py-2.5">
                              <p className="lv-body text-foreground font-medium">
                                {i + 1}. {s.action}
                              </p>
                              <p className="lv-meta text-muted-foreground mt-0.5">{s.details}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {bookingPlan.emailTemplates && bookingPlan.emailTemplates.length > 0 && (
                        <div>
                          <p className="lv-label text-foreground mb-2">Email templates</p>
                          <div className="space-y-2">
                            {bookingPlan.emailTemplates.map((t, i) => (
                              <div key={i} className="rounded-md border border-border px-3 py-2.5">
                                <p className="lv-body text-foreground font-medium">{t.name}</p>
                                <p className="lv-meta text-primary mt-0.5">Subject: {t.subject}</p>
                                <p className="lv-meta text-muted-foreground mt-1 whitespace-pre-wrap">
                                  {t.body}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {bookingPlan.smsTemplates && bookingPlan.smsTemplates.length > 0 && (
                        <div>
                          <p className="lv-label text-foreground mb-2">SMS templates</p>
                          <div className="space-y-1.5">
                            {bookingPlan.smsTemplates.map((t, i) => (
                              <div
                                key={i}
                                className="rounded-sm border border-border px-3 py-2 lv-meta"
                              >
                                <span className="text-foreground font-medium">{t.name}:</span>{" "}
                                <span className="text-muted-foreground">{t.body}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {bookingPlan.nextActions && bookingPlan.nextActions.length > 0 && (
                        <div>
                          <p className="lv-label text-foreground mb-2">Week 1 action plan</p>
                          <div className="space-y-1.5">
                            {bookingPlan.nextActions.map((a, i) => (
                              <div key={i} className="rounded-sm border border-border px-3 py-2">
                                <p className="lv-meta text-foreground font-medium">
                                  {a.title}
                                  {a.eta && (
                                    <span className="text-muted-foreground font-normal">
                                      {" "}
                                      · {a.eta}
                                    </span>
                                  )}
                                </p>
                                {a.why && (
                                  <p className="lv-meta text-muted-foreground mt-0.5">{a.why}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="lv-meta text-muted-foreground">
                        This gives you ready-to-use copy and setup steps. Automatically sending
                        texts and emails on a schedule isn't wired up yet — for now, copy these
                        templates and use them manually.
                      </p>
                    </div>
                  )}

                  <DialogFooter className="mt-5">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCompetitorResult(null);
                        setBookingPlan(null);
                      }}
                    >
                      Run again
                    </Button>
                    <Button
                      onClick={
                        openTool === "competitor-intel" ? copyCompetitorIntel : copyBookingPlan
                      }
                      className="gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Copy
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runTool();
                  }}
                  className="space-y-3"
                >
                  <div>
                    <Label htmlFor="tool-industry" className="lv-label text-foreground block mb-1">
                      Your trade / service
                    </Label>
                    <Input
                      id="tool-industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. HVAC, Plumbing, Cleaning, Roofing..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tool-city" className="lv-label text-foreground block mb-1">
                      Your city / area
                    </Label>
                    <Input
                      id="tool-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Atlanta GA, Dallas TX..."
                      required
                    />
                  </div>
                  {error && (
                    <p className="lv-meta text-destructive" role="alert">
                      {error}
                    </p>
                  )}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button type="submit">Run {tool.name}</Button>
                  </DialogFooter>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
