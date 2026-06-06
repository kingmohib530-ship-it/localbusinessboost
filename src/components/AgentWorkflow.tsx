import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Rocket,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Mail,
  Phone,
  Globe,
  MapPin,
  Target,
  Lightbulb,
  Workflow,
  ShieldCheck,
  Users,
  PenLine,
  Crown,
  Award,
  Copy,
  TrendingUp,
} from "lucide-react";
import type {
  WorkflowResult,
  AgentResult,
  AtlasResult,
  PulseResult,
  NexusResult,
  ForgeResult,
  ShieldResult,
  AetherResult,
  VanguardResult,
  AtlasLead,
} from "@/lib/agents.server";
import {
  AutomationTemplates,
  ResultsTracker,
  type CampaignTemplate,
  type ResultsMetrics,
} from "./AutomationTemplates";

// ─────────────────────────────────────────────────────────────────────────────
// Example prompts to spark ideas for local-service business owners.
// ─────────────────────────────────────────────────────────────────────────────
const EXAMPLES: { label: string; prompt: string }[] = [
  {
    label: "🔧 Plumbing leads — Austin",
    prompt: "Generate 10 plumbing business leads in Austin, TX with emails and phone numbers.",
  },
  {
    label: "❄️ HVAC outreach — Miami",
    prompt:
      "Create a full outreach campaign for an HVAC company targeting property managers in Miami, FL. Include 15 leads, cold email copy, and a follow-up automation.",
  },
  {
    label: "🦷 Dental competitors — Chicago",
    prompt:
      "Research competitors for a new family dental clinic in Chicago, IL and recommend positioning opportunities.",
  },
  {
    label: "🏠 Roofing campaign — Dallas",
    prompt:
      "Generate 20 residential roofing leads in Dallas, TX and write SMS + email follow-up sequences.",
  },
  {
    label: "💇 Salon launch — Brooklyn",
    prompt:
      "Plan a new salon launch in Brooklyn, NY: research the local market, design a referral automation, and write Instagram + Google Business posts.",
  },
  {
    label: "🧹 Cleaning service — Phoenix",
    prompt:
      "Find 15 property managers in Phoenix, AZ that need recurring cleaning services and draft a B2B cold email sequence.",
  },
  {
    label: "⚙️ Roofing automation — Dallas",
    prompt:
      "Build a complete follow-up automation system for a roofing company in Dallas, TX. Include lead capture form, instant SMS, 7-day email + SMS nurture, Calendly booking, and an automated Google review request after the job.",
  },
  {
    label: "🦷 Dental booking machine — Chicago",
    prompt:
      "Design a full patient acquisition automation for a family dental clinic in Chicago, IL: web form → CRM → instant text → booking → 24h reminder → post-visit review request.",
  },
  {
    label: "❄️ HVAC reactivation — Tampa",
    prompt:
      "Create an automation that reactivates past HVAC customers in Tampa, FL with seasonal tune-up offers via email + SMS, and books them straight into Calendly.",
  },
  {
    label: "💰 Roofing revenue engine",
    prompt:
      "Build and configure a complete automated follow-up system for a roofing company that sends emails + SMS and books appointments. Include lead-capture form, Twilio + Resend integrations, Calendly booking, reminder sequence, post-job Google review automation, and the dollar-impact ROI.",
  },
  {
    label: "🔁 HVAC win-back campaign",
    prompt:
      "Create a reactivation campaign for past customers of an HVAC business including phone call script, 5-email sequence, SMS touches, Calendly booking link, and an automated Google review request after the tune-up.",
  },
  {
    label: "🚀 End-to-end roofing sales system",
    prompt:
      "Build a complete end-to-end automated sales system for a roofing company that captures leads, nurtures them with email + SMS, books appointments, and asks for reviews. Include exact Resend, Twilio, Cal.com, and Monday.com setup steps plus realistic ROI projections.",
  },
  {
    label: "💵 HVAC lead-to-booking machine",
    prompt:
      "Design and implement a complete automated lead-to-booking system for a local HVAC company that maximizes revenue through email + SMS nurturing and easy online booking. Include exact Resend, Twilio, and Cal.com setup steps, ready-to-paste templates, a Week 1 action plan for the owner, and realistic dollar-impact ROI projections.",
  },

];

// Per-agent visual identity.
const AGENT_STYLE: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; tint: string; label: string }
> = {
  Orbis: { icon: Sparkles, tint: "text-violet-400", label: "Strategy" },
  Atlas: { icon: Users, tint: "text-emerald-400", label: "Leads" },
  Nexus: { icon: Target, tint: "text-amber-400", label: "Market" },
  Pulse: { icon: PenLine, tint: "text-sky-400", label: "Copy" },
  Forge: { icon: Workflow, tint: "text-orange-400", label: "Automation" },
  Shield: { icon: ShieldCheck, tint: "text-rose-400", label: "QC" },
  Aether: { icon: Crown, tint: "text-yellow-400", label: "Boss" },
  Vanguard: { icon: Award, tint: "text-cyan-400", label: "Final QC" },
};

// ─────────────────────────────────────────────────────────────────────────────
// API call
// ─────────────────────────────────────────────────────────────────────────────
async function runWorkflow(userRequest: string): Promise<WorkflowResult> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error("Authentication required. Please sign in.");
  }
  const res = await fetch("/api/workflow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userRequest }),
  });
  if (!res.ok) {
    let msg = `Workflow failed with status ${res.status}`;
    try {
      const j = await res.json();
      msg = j?.error || msg;
    } catch {
      const t = await res.text().catch(() => "");
      if (t) msg = t;
    }
    throw new Error(msg);
  }
  return (await res.json()) as WorkflowResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export type AgentWorkflowHandle = {
  runPrompt: (prompt: string) => void;
};

export function AgentWorkflow({
  initialPrompt,
  autoRun,
  onConsumed,
}: {
  initialPrompt?: string;
  autoRun?: boolean;
  onConsumed?: () => void;
} = {}) {
  const [input, setInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<CampaignTemplate | null>(null);

  const mutation = useMutation({ mutationFn: runWorkflow });
  const result = mutation.data;
  const isLoading = mutation.isPending;

  const handleRun = (prompt?: string, template?: CampaignTemplate) => {
    const text = (prompt ?? input).trim();
    if (!text || isLoading) return;
    if (template) setActiveTemplate(template);
    else setActiveTemplate(null);
    mutation.mutate(text);
  };

  const handleLaunchTemplate = (t: CampaignTemplate) => {
    setInput(t.prompt);
    handleRun(t.prompt, t);
  };

  // Auto-launch a prompt handed in from the onboarding wizard.
  const consumedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialPrompt || !autoRun) return;
    if (consumedRef.current === initialPrompt) return;
    consumedRef.current = initialPrompt;
    setInput(initialPrompt);
    setShowCustom(true);
    handleRun(initialPrompt);
    onConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, autoRun]);

  const atlasResult =
    result?.success && result.results.Atlas
      ? (result.results.Atlas as AtlasResult)
      : undefined;
  const forgeResult =
    result?.success && result.results.Forge
      ? (result.results.Forge as ForgeResult)
      : undefined;
  const pulseResult =
    result?.success && result.results.Pulse
      ? (result.results.Pulse as PulseResult)
      : undefined;
  const mondayNote =
    atlasResult?.monday && atlasResult.monday.synced > 0
      ? `${atlasResult.monday.synced}/${atlasResult.monday.total} leads synced to Monday.com`
      : null;

  const metrics: ResultsMetrics = (() => {
    const leadsGenerated = atlasResult?.leads?.length ?? 0;
    const emailsReady =
      (pulseResult ? 1 + (pulseResult.variants?.length ?? 0) : 0) +
      (forgeResult?.emailTemplates?.length ?? 0) +
      (forgeResult?.smsTemplates?.length ?? 0);
    // Conservative model: ~18% lead→booked when Forge automation exists, else ~8%.
    const bookRate = forgeResult ? 0.18 : 0.08;
    const estimatedBookings = Math.round(leadsGenerated * bookRate);
    // Default avg ticket $1,200 for local service work — Forge ROI overrides when present.
    const projectedRevenueUsd = estimatedBookings * 1200;
    return { leadsGenerated, emailsReady, estimatedBookings, projectedRevenueUsd };
  })();

  const showTracker = result?.success || isLoading;
  const trackerStatus: "active" | "idle" =
    result?.success && (atlasResult || forgeResult || pulseResult) ? "active" : "idle";

  return (
    <div className="space-y-6">
      {/* ── Hero / value framing ──────────────────────────────────────────── */}
      <Card className="border-border/60 bg-gradient-to-br from-violet-500/5 via-card/60 to-cyan-500/5 backdrop-blur shadow-xl shadow-violet-500/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 shadow-lg shadow-violet-500/30 ring-1 ring-white/10">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl tracking-tight">Your AI Workforce, ready to work</CardTitle>
              <CardDescription className="text-[13px]">
                Pick a one-click campaign and your AI team will do the heavy lifting — more clients, more bookings, more revenue.
              </CardDescription>
            </div>
          </div>
        </CardHeader>


        <CardContent className="space-y-6">
          <AutomationTemplates
            onLaunch={handleLaunchTemplate}
            disabled={isLoading}
            activeId={activeTemplate?.id}
          />

          <div className="rounded-xl border border-dashed border-border/60 bg-background/30 p-4">
            <button
              type="button"
              onClick={() => setShowCustom((s) => !s)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-muted-foreground">
                Or describe a custom request →
              </span>
              <span className="text-xs text-muted-foreground">
                {showCustom ? "Hide" : "Show"}
              </span>
            </button>

            {showCustom && (
              <div className="mt-4 space-y-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder="e.g. Generate 15 plumbing leads in Austin, TX and write cold outreach emails"
                  className="min-h-28 resize-none text-base"
                />
                <Button
                  size="lg"
                  disabled={!input.trim() || isLoading}
                  onClick={() => handleRun()}
                  className="w-full bg-gradient-to-r from-violet-600 to-sky-600 text-base font-semibold shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-sky-500"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Agents working…
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-5 w-5" />
                      Run Custom Workflow
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Results Tracker ──────────────────────────────────────────────── */}
      {showTracker && <ResultsTracker metrics={metrics} status={trackerStatus} />}

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {isLoading && <LoadingPanel />}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Workflow failed</AlertTitle>
          <AlertDescription>
            {mutation.error instanceof Error ? mutation.error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {result && !result.success && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Workflow failed</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}

      {/* ── Success — Monday.com sync banner ──────────────────────────────── */}
      {result?.success && mondayNote && (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <AlertTitle className="text-emerald-300">Monday.com sync complete</AlertTitle>
          <AlertDescription className="text-emerald-200/80">{mondayNote}</AlertDescription>
        </Alert>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {result?.success && (
        <>
          <FinalSummaryCard
            aether={result.results.Aether as AetherResult | undefined}
            vanguard={result.results.Vanguard as VanguardResult | undefined}
            results={result.results}
          />
          <PlanCard steps={result.plan} />
          <AgentResultsCard results={result.results} />
        </>
      )}
    </div>
  );
}

export default AgentWorkflow;

// ─────────────────────────────────────────────────────────────────────────────
// Loading panel
// ─────────────────────────────────────────────────────────────────────────────
function LoadingPanel() {
  return (
    <Card className="border-border/60 bg-card/60">
      <CardContent className="flex items-center gap-4 py-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Orbis is planning your workforce…</p>
          <p className="text-xs text-muted-foreground">
            Atlas, Nexus, Pulse, Forge, and Shield will execute in sequence. This can take 20–60 seconds.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Orbis plan
// ─────────────────────────────────────────────────────────────────────────────
function PlanCard({
  steps,
}: {
  steps: { agent: string; instruction: string }[];
}) {
  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <CardTitle className="text-base">Orbis Plan</CardTitle>
        </div>
        <CardDescription>Ordered sequence Orbis chose for this request.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step, i) => {
            const style = AGENT_STYLE[step.agent];
            const Icon = style?.icon ?? Sparkles;
            return (
              <li
                key={`${step.agent}-${i}`}
                className="flex gap-3 rounded-lg border border-border/40 bg-background/40 p-3"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${style?.tint ?? ""}`} />
                    <span className="text-sm font-semibold">{step.agent}</span>
                    {style?.label && (
                      <Badge variant="outline" className="text-[10px]">
                        {style.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.instruction}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent results accordion
// ─────────────────────────────────────────────────────────────────────────────
function AgentResultsCard({ results }: { results: Record<string, AgentResult> }) {
  const entries = Object.entries(results);
  if (!entries.length) return null;

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader>
        <CardTitle className="text-base">Agent Results</CardTitle>
        <CardDescription>Click any agent to expand its output.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={entries.map(([k]) => k)} className="w-full">
          {entries.map(([agent, output]) => {
            const style = AGENT_STYLE[agent];
            const Icon = style?.icon ?? Sparkles;
            return (
              <AccordionItem key={agent} value={agent} className="border-border/40">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${style?.tint ?? ""}`} />
                    <span className="font-semibold">{agent}</span>
                    {style?.label && (
                      <Badge variant="outline" className="text-[10px]">
                        {style.label}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <AgentOutput agent={agent} output={output} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-agent rich rendering
// ─────────────────────────────────────────────────────────────────────────────
function AgentOutput({ agent, output }: { agent: string; output: AgentResult }) {
  if ((output as { error?: string })?.error && Object.keys(output).length <= 2) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{agent} skipped</AlertTitle>
        <AlertDescription>{(output as { error: string }).error}</AlertDescription>
      </Alert>
    );
  }
  if (agent === "Atlas") return <AtlasOutput data={output as AtlasResult} />;
  if (agent === "Pulse") return <PulseOutput data={output as PulseResult} />;
  if (agent === "Nexus") return <NexusOutput data={output as NexusResult} />;
  if (agent === "Forge") return <ForgeOutput data={output as ForgeResult} />;
  if (agent === "Shield") return <ShieldOutput data={output as ShieldResult} />;
  if (agent === "Aether") return <AetherOutput data={output as AetherResult} />;
  if (agent === "Vanguard") return <VanguardOutput data={output as VanguardResult} />;
  return <JsonFallback data={output} />;
}

function AtlasOutput({ data }: { data: AtlasResult }) {
  const leads = data?.leads ?? [];
  const monday = data?.monday;
  const idByName = new Map<string, MondayItemId>();
  monday?.items.forEach((i) => idByName.set(i.name, { itemId: i.itemId, error: i.error }));

  return (
    <div className="space-y-4">
      {monday && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {monday.synced}/{monday.total} synced to Monday.com
          </Badge>
          {monday.synced < monday.total && (
            <Badge variant="destructive" className="text-[10px]">
              {monday.total - monday.synced} failed
            </Badge>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {leads.map((lead: AtlasLead, i) => {
          const sync = idByName.get(lead.name);
          return (
            <div
              key={`${lead.name}-${i}`}
              className="rounded-lg border border-border/40 bg-background/40 p-3 text-sm"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-semibold leading-tight">{lead.name}</p>
                {sync?.itemId ? (
                  <Badge variant="outline" className="shrink-0 text-[10px] text-emerald-300">
                    #{sync.itemId}
                  </Badge>
                ) : sync?.error ? (
                  <Badge variant="destructive" className="shrink-0 text-[10px]">
                    sync failed
                  </Badge>
                ) : null}
              </div>
              {lead.industry && (
                <p className="mb-2 text-xs text-muted-foreground">{lead.industry}</p>
              )}
              <div className="space-y-1 text-xs text-muted-foreground">
                {lead.email && (
                  <Row icon={Mail}>
                    <span className="truncate">{lead.email}</span>
                  </Row>
                )}
                {lead.phone && <Row icon={Phone}>{lead.phone}</Row>}
                {lead.website && (
                  <Row icon={Globe}>
                    <span className="truncate">{lead.website}</span>
                  </Row>
                )}
                {lead.location && <Row icon={MapPin}>{lead.location}</Row>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
type MondayItemId = { itemId?: number; error?: string };

function PulseOutput({ data }: { data: PulseResult }) {
  return (
    <div className="space-y-4">
      <MessageBlock label="Primary" subject={data?.subject} body={data?.body} />
      {data?.variants?.length ? (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              A/B variants
            </p>
            {data.variants.map((v, i) => (
              <MessageBlock
                key={i}
                label={`Variant ${String.fromCharCode(65 + i)}`}
                subject={v.subject}
                body={v.body}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MessageBlock({
  label,
  subject,
  body,
}: {
  label: string;
  subject?: string;
  body?: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/40 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <Mail className="h-3.5 w-3.5 text-sky-400" />
        <Badge variant="outline" className="text-[10px]">
          {label}
        </Badge>
      </div>
      {subject && (
        <p className="mb-2 text-sm font-semibold">
          <span className="text-muted-foreground">Subject:</span> {subject}
        </p>
      )}
      {body && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{body}</p>
      )}
    </div>
  );
}

function NexusOutput({ data }: { data: NexusResult }) {
  return (
    <div className="space-y-4">
      {data?.competitors?.length ? (
        <Section title="Competitors" icon={Target} tint="text-amber-400">
          <div className="grid gap-2 sm:grid-cols-2">
            {data.competitors.map((c, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-background/40 p-3 text-sm"
              >
                <p className="mb-1 font-semibold">{c.name}</p>
                <p className="text-xs text-emerald-300/90">
                  <span className="font-semibold">Strength:</span> {c.strength}
                </p>
                <p className="text-xs text-rose-300/90">
                  <span className="font-semibold">Weakness:</span> {c.weakness}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {data?.opportunities?.length ? (
        <Section title="Opportunities" icon={Lightbulb} tint="text-amber-400">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {data.opportunities.map((o, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-400">→</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data?.insights?.length ? (
        <Section title="Insights" icon={Sparkles} tint="text-violet-400">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {data.insights.map((o, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-violet-400">✦</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function ForgeOutput({ data }: { data: ForgeResult }) {
  const title = data?.trigger
    ? `Forge — ${data.trigger.slice(0, 60)}`
    : "Forge Automation Blueprint";
  const fullGuide = buildClientGuide(data, title);

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <SaveToMondayButton forge={data} title={title} />
        <CopyButton text={fullGuide} label="Copy Full Implementation Guide" />
        <DownloadGuideButton text={fullGuide} title={title} />
      </div>


      {/* Headline ROI */}
      {(data?.estimatedRoi || data?.roiProjection) && (
        <div className="rounded-xl border border-orange-500/40 bg-gradient-to-br from-orange-500/15 via-amber-500/5 to-transparent p-4 shadow-lg shadow-orange-500/10">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">💰</span>
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">
              Estimated Revenue Impact
            </p>
          </div>
          {data.estimatedRoi && (
            <p className="mb-3 text-sm leading-relaxed text-orange-50">
              {data.estimatedRoi}
            </p>
          )}
          {data.roiProjection && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <RoiStat label="Booked jobs" value={data.roiProjection.bookedJobsLiftPct} />
              <RoiStat label="Fewer no-shows" value={data.roiProjection.noShowReductionPct} />
              <RoiStat label="Review velocity" value={data.roiProjection.reviewVelocityMultiplier} />
              <RoiStat label="Monthly lift" value={data.roiProjection.monthlyRevenueLiftUsd} />
              <RoiStat label="Payback" value={data.roiProjection.paybackPeriod} />
            </div>
          )}
        </div>
      )}



      {data?.trigger && (
        <div className="rounded-lg border border-border/40 bg-background/40 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trigger
          </p>
          <p className="mt-1">{data.trigger}</p>
        </div>
      )}

      {data?.steps?.length ? (
        <Section title="Automation Flow" icon={Workflow} tint="text-orange-400">
          <ol className="space-y-2">
            {data.steps.map((s, i) => (
              <li
                key={i}
                className="relative flex gap-3 rounded-lg border border-border/40 bg-background/40 p-3 text-sm"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-semibold text-orange-300">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.action}</p>
                  <p className="text-xs text-muted-foreground">{s.details}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {data?.integrations?.length ? (
        <div className="flex flex-wrap gap-2">
          {data.integrations.map((tool, i) => (
            <Badge key={i} variant="secondary" className="text-[11px]">
              {tool}
            </Badge>
          ))}
        </div>
      ) : null}

      {data?.integrationGuide?.length ? (
        <Section title="Integration Setup" icon={Workflow} tint="text-violet-400">
          <div className="space-y-3">
            {data.integrationGuide.map((g, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-background/40 p-3 text-sm"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge className="bg-violet-500/15 text-violet-200 hover:bg-violet-500/15">
                    {g.provider}
                  </Badge>
                  {g.purpose && (
                    <span className="text-xs text-muted-foreground">{g.purpose}</span>
                  )}
                </div>
                {g.setupSteps?.length ? (
                  <ol className="ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
                    {g.setupSteps.map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ol>
                ) : null}
                {g.envVars?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.envVars.map((v) => (
                      <code
                        key={v}
                        className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300"
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {data?.nextActions?.length ? (
        <Section title="Next Actions This Week" icon={CheckCircle2} tint="text-emerald-400">
          <ol className="space-y-2">
            {data.nextActions.map((a, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-200">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-emerald-50">{a.title}</p>
                    {a.owner && (
                      <Badge variant="outline" className="text-[10px] text-emerald-200">
                        {a.owner}
                      </Badge>
                    )}
                    {a.eta && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {a.eta}
                      </span>
                    )}
                  </div>
                  {a.why && (
                    <p className="text-xs text-muted-foreground">{a.why}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}


      {data?.emailTemplates?.length ? (
        <Section title="Email Templates" icon={Mail} tint="text-sky-400">
          <div className="space-y-3">
            {data.emailTemplates.map((t, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-background/40 p-3 text-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t.name}
                  </Badge>
                  <CopyButton text={`Subject: ${t.subject}\n\n${t.body}`} />
                </div>
                <p className="mb-2 text-sm font-semibold">
                  <span className="text-muted-foreground">Subject:</span> {t.subject}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {t.body}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {data?.smsTemplates?.length ? (
        <Section title="SMS Templates" icon={Phone} tint="text-emerald-400">
          <div className="grid gap-2 sm:grid-cols-3">
            {data.smsTemplates.map((t, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-background/40 p-3 text-xs"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {t.name}
                  </Badge>
                  <CopyButton text={t.body} />
                </div>
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {t.body}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {data?.bookingSetup && (data.bookingSetup.platform || data.bookingSetup.eventName) ? (
        <Section title="Booking Setup" icon={CheckCircle2} tint="text-violet-400">
          <div className="rounded-lg border border-border/40 bg-background/40 p-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
              {data.bookingSetup.platform && (
                <Kv k="Platform" v={data.bookingSetup.platform} />
              )}
              {data.bookingSetup.eventName && (
                <Kv k="Event" v={data.bookingSetup.eventName} />
              )}
              {data.bookingSetup.duration && (
                <Kv k="Duration" v={data.bookingSetup.duration} />
              )}
              {data.bookingSetup.buffer && <Kv k="Buffer" v={data.bookingSetup.buffer} />}
            </div>
            {data.bookingSetup.intakeQuestions?.length ? (
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Intake questions
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {data.bookingSetup.intakeQuestions.map((q, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-violet-400">?</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data.bookingSetup.confirmation && (
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold">Confirmation:</span>{" "}
                {data.bookingSetup.confirmation}
              </p>
            )}
            {data.bookingSetup.reminders?.length ? (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-semibold">Reminders:</span>{" "}
                {data.bookingSetup.reminders.join(" • ")}
              </p>
            ) : null}
          </div>
        </Section>
      ) : null}

      {data?.reviewRequest &&
      (data.reviewRequest.platform || data.reviewRequest.message) ? (
        <Section title="Review Request" icon={Sparkles} tint="text-amber-400">
          <div className="rounded-lg border border-border/40 bg-background/40 p-3 text-sm">
            {data.reviewRequest.platform && (
              <Kv k="Platform" v={data.reviewRequest.platform} />
            )}
            {data.reviewRequest.timing && (
              <Kv k="Timing" v={data.reviewRequest.timing} />
            )}
            {data.reviewRequest.linkFormat && (
              <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                {data.reviewRequest.linkFormat}
              </p>
            )}
            {data.reviewRequest.message && (
              <div className="mt-2">
                <div className="mb-1 flex justify-end">
                  <CopyButton text={data.reviewRequest.message} />
                </div>
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {data.reviewRequest.message}
                </p>
              </div>
            )}
          </div>
        </Section>
      ) : null}

      {data?.kpis?.length ? (
        <Section title="KPIs to Track" icon={Target} tint="text-emerald-400">
          <div className="flex flex-wrap gap-2">
            {data.kpis.map((k, i) => (
              <Badge
                key={i}
                variant="outline"
                className="border-emerald-500/30 text-[11px] text-emerald-200"
              >
                {k}
              </Badge>
            ))}
          </div>
        </Section>
      ) : null}

      {data?.snippets?.length ? (
        <Section title="Copy-Paste Snippets" icon={PenLine} tint="text-sky-400">
          <div className="space-y-3">
            <div className="flex justify-end">
              <CopyButton
                text={data.snippets
                  .map(
                    (s) =>
                      `// ── ${s.title} (${s.language || "text"}) ──\n${s.code}`,
                  )
                  .join("\n\n")}
                label="Copy All Snippets"
              />
            </div>
            {data.snippets.map((s, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-lg border border-border/40 bg-background/60"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{s.title}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {s.language || "text"}
                    </Badge>
                  </div>
                  <CopyButton text={s.code} />
                </div>
                <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {s.code}
                </pre>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{k}</p>
      <p className="text-foreground">{v}</p>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function DownloadGuideButton({ text, title }: { text: string; title: string }) {
  const onClick = () => {
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "lunavx-automation";
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-implementation-guide.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={onClick}
      className="border-orange-500/40 text-orange-200 hover:bg-orange-500/10"
    >
      <Workflow className="mr-2 h-3.5 w-3.5" />
      Download Implementation Guide
    </Button>
  );
}


function ShieldOutput({ data }: { data: ShieldResult }) {
  return (
    <div className="space-y-3">
      <div
        className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
          data?.ok
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
            : "border-rose-500/30 bg-rose-500/5 text-rose-200"
        }`}
      >
        {data?.ok ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
        )}
        <p>{data?.summary}</p>
      </div>
      {data?.issues?.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Issues
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {data.issues.map((iss, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400">!</span>
                <span>{iss}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function JsonFallback({ data }: { data: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border/40 bg-background/60 p-3 text-xs text-muted-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────
function Row({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 shrink-0" />
      {children}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  tint,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tint ?? ""}`} />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forge: Save-to-Monday button + ROI stat + client-side guide builder
// ─────────────────────────────────────────────────────────────────────────────

function RoiStat({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-orange-500/20 bg-background/40 p-2 text-center">
      <p className="text-sm font-bold text-orange-100">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-orange-300/80">{label}</p>
    </div>
  );
}

function SaveToMondayButton({
  forge,
  title,
}: {
  forge: ForgeResult;
  title: string;
}) {
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "ok"; itemId: number }
    | { kind: "err"; msg: string }
  >({ kind: "idle" });

  const save = async () => {
    setStatus({ kind: "saving" });
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in required.");
      const res = await fetch("/api/save-automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, forge }),
      });
      const j = (await res.json()) as {
        success?: boolean;
        itemId?: number;
        error?: string;
      };
      if (!res.ok || !j.success || !j.itemId) {
        throw new Error(j.error || `Save failed (${res.status})`);
      }
      setStatus({ kind: "ok", itemId: j.itemId });
    } catch (e) {
      setStatus({
        kind: "err",
        msg: e instanceof Error ? e.message : "Unknown error",
      });
    }
  };

  if (status.kind === "ok") {
    return (
      <Badge className="bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/15">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Saved to Monday.com #{status.itemId}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={save}
        disabled={status.kind === "saving"}
        className="bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:from-orange-500 hover:to-amber-400"
      >
        {status.kind === "saving" ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Workflow className="mr-2 h-3.5 w-3.5" />
            Save Automation to Monday.com
          </>
        )}
      </Button>
      {status.kind === "err" && (
        <span className="text-xs text-rose-300">{status.msg}</span>
      )}
    </div>
  );
}

function buildClientGuide(forge: ForgeResult, title: string): string {
  const out: string[] = [];
  const h = (s: string) => out.push("", `## ${s}`, "");

  out.push(`# ${title}`, "", "_Generated by LUNAVX Forge._");

  if (forge.trigger) {
    h("Trigger");
    out.push(forge.trigger);
  }
  if (forge.estimatedRoi) {
    h("Estimated Revenue Impact");
    out.push(forge.estimatedRoi);
  }
  if (forge.roiProjection) {
    const r = forge.roiProjection;
    [
      r.bookedJobsLiftPct && `- Booked jobs lift: ${r.bookedJobsLiftPct}`,
      r.noShowReductionPct && `- No-show reduction: ${r.noShowReductionPct}`,
      r.reviewVelocityMultiplier &&
        `- Review velocity: ${r.reviewVelocityMultiplier}`,
      r.monthlyRevenueLiftUsd &&
        `- Monthly revenue lift: ${r.monthlyRevenueLiftUsd}`,
      r.paybackPeriod && `- Payback: ${r.paybackPeriod}`,
    ]
      .filter(Boolean)
      .forEach((line) => out.push(line as string));
  }
  if (forge.steps?.length) {
    h("Automation Flow");
    forge.steps.forEach((s, i) =>
      out.push(`${i + 1}. **${s.action}** — ${s.details}`),
    );
  }
  if (forge.integrations?.length) {
    h("Integrations");
    out.push(forge.integrations.join(", "));
  }
  if (forge.integrationGuide?.length) {
    h("Integration Setup");
    forge.integrationGuide.forEach((g) => {
      out.push(`### ${g.provider}${g.purpose ? ` — ${g.purpose}` : ""}`);
      g.setupSteps?.forEach((s, i) => out.push(`${i + 1}. ${s}`));
      if (g.envVars?.length) out.push(`Env vars: ${g.envVars.join(", ")}`);
      out.push("");
    });
  }
  if (forge.emailTemplates?.length) {
    h("Email Templates");
    forge.emailTemplates.forEach((t) => {
      out.push(`### ${t.name}`, `Subject: ${t.subject}`, "", t.body, "");
    });
  }
  if (forge.smsTemplates?.length) {
    h("SMS Templates");
    forge.smsTemplates.forEach((t) => out.push(`- **${t.name}** — ${t.body}`));
  }
  if (forge.bookingSetup) {
    h("Booking Setup");
    const b = forge.bookingSetup;
    if (b.platform) out.push(`- Platform: ${b.platform}`);
    if (b.eventName) out.push(`- Event: ${b.eventName}`);
    if (b.duration) out.push(`- Duration: ${b.duration}`);
    if (b.buffer) out.push(`- Buffer: ${b.buffer}`);
    if (b.intakeQuestions?.length) {
      out.push("- Intake questions:");
      b.intakeQuestions.forEach((q) => out.push(`  - ${q}`));
    }
    if (b.confirmation) out.push(`- Confirmation: ${b.confirmation}`);
    if (b.reminders?.length) out.push(`- Reminders: ${b.reminders.join(" • ")}`);
  }
  if (forge.reviewRequest) {
    h("Review Request");
    const r = forge.reviewRequest;
    if (r.platform) out.push(`- Platform: ${r.platform}`);
    if (r.timing) out.push(`- Timing: ${r.timing}`);
    if (r.linkFormat) out.push(`- Link: ${r.linkFormat}`);
    if (r.message) out.push(`- Message: ${r.message}`);
  }
  if (forge.kpis?.length) {
    h("KPIs");
    forge.kpis.forEach((k) => out.push(`- ${k}`));
  }
  if (forge.nextActions?.length) {
    h("Next Actions");
    forge.nextActions.forEach((a, i) => {
      const meta = [a.owner, a.eta].filter(Boolean).join(" • ");
      out.push(`${i + 1}. **${a.title}**${meta ? ` _(${meta})_` : ""}`);
      if (a.why) out.push(`   ${a.why}`);
    });
  }
  if (forge.snippets?.length) {
    h("Snippets");
    forge.snippets.forEach((s) => {
      out.push(`### ${s.title}`, "```" + (s.language || "text"), s.code, "```", "");
    });
  }
  return out.join("\n").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Aether (Boss) — final polished executive summary
// ─────────────────────────────────────────────────────────────────────────────
function AetherOutput({ data }: { data: AetherResult }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      {data.headline && (
        <p className="text-lg font-bold text-yellow-100">{data.headline}</p>
      )}
      {data.executiveSummary && (
        <p className="text-sm text-muted-foreground">{data.executiveSummary}</p>
      )}
      {data.revenueImpact && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-100">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
          <span>{data.revenueImpact}</span>
        </div>
      )}
      {data.keyOutcomes?.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key Outcomes
          </p>
          <ul className="space-y-1 text-sm">
            {data.keyOutcomes.map((k, i) => (
              <li key={i} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.nextSteps?.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Do This Next
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {data.nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vanguard (Final QC) — executive validation report
// ─────────────────────────────────────────────────────────────────────────────
function VanguardOutput({ data }: { data: VanguardResult }) {
  if (!data) return null;
  const statusColor = (s: string) =>
    s === "pass"
      ? "text-emerald-300"
      : s === "warn"
      ? "text-amber-300"
      : "text-rose-300";
  return (
    <div className="space-y-3">
      <div
        className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
          data.approved
            ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-100"
            : "border-rose-500/30 bg-rose-500/5 text-rose-100"
        }`}
      >
        <div className="flex items-center gap-2">
          {data.approved ? (
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          )}
          <span className="font-semibold">
            {data.approved ? "Approved for launch" : "Needs revision"}
          </span>
        </div>
        {typeof data.score === "number" && (
          <Badge variant="outline" className="text-xs">
            Score {data.score}/10
          </Badge>
        )}
      </div>
      {data.finalVerdict && (
        <p className="text-sm text-muted-foreground">{data.finalVerdict}</p>
      )}
      {data.checks?.length ? (
        <ul className="space-y-1 text-sm">
          {data.checks.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className={`font-mono text-xs ${statusColor(c.status)}`}>
                [{c.status.toUpperCase()}]
              </span>
              <span>
                <span className="font-medium">{c.name}</span>
                {c.note ? ` — ${c.note}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {data.blockers?.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-400">
            Blockers
          </p>
          <ul className="space-y-1 text-sm text-rose-200">
            {data.blockers.map((b, i) => (
              <li key={i}>• {b}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.recommendations?.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommendations
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {data.recommendations.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FinalSummaryCard — the polished, user-first hero result panel
// (Aether headline + Vanguard approval + Copy All)
// ─────────────────────────────────────────────────────────────────────────────
function FinalSummaryCard({
  aether,
  vanguard,
  results,
}: {
  aether?: AetherResult;
  vanguard?: VanguardResult;
  results: Record<string, AgentResult>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyAll = async () => {
    const md = buildFullMarkdown(aether, vanguard, results);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  if (!aether && !vanguard) return null;

  return (
    <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-card/60 to-cyan-500/10 shadow-xl shadow-yellow-500/5 animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-400" />
            <div>
              <CardTitle className="text-base tracking-tight">
                {aether?.headline || "Your AI Team just delivered — here's what they built for you"}
              </CardTitle>
              <CardDescription>
                Validated, ready to act on, and tuned for real revenue.
              </CardDescription>

            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyAll}
            className="border-yellow-500/40 text-yellow-100 hover:bg-yellow-500/10"
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {aether?.executiveSummary && (
          <p className="text-sm text-muted-foreground">{aether.executiveSummary}</p>
        )}
        {aether?.revenueImpact && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-100">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <span>{aether.revenueImpact}</span>
          </div>
        )}
        {aether?.projections && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 animate-fade-in">
            {[
              { label: "New Leads", value: aether.projections.leads, accent: "from-emerald-500/20 to-teal-500/10", text: "text-emerald-200", ring: "ring-emerald-400/20" },
              { label: "Bookings", value: aether.projections.bookings, accent: "from-cyan-500/20 to-sky-500/10", text: "text-cyan-200", ring: "ring-cyan-400/20" },
              { label: "Monthly Revenue", value: aether.projections.monthlyRevenue, accent: "from-yellow-500/20 to-amber-500/10", text: "text-yellow-100", ring: "ring-yellow-400/20" },
              { label: "Time Saved / wk", value: aether.projections.timeSavedPerWeek, accent: "from-violet-500/20 to-fuchsia-500/10", text: "text-violet-200", ring: "ring-violet-400/20" },
            ]
              .filter((s) => s.value)
              .map((s) => (
                <div
                  key={s.label}
                  className={`rounded-xl bg-gradient-to-br ${s.accent} ring-1 ${s.ring} p-3 text-center transition-transform hover:scale-[1.03]`}
                >
                  <div className={`text-xl sm:text-2xl font-extrabold tracking-tight ${s.text}`}>
                    {s.value}
                  </div>
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
          </div>
        )}

        {vanguard && (
          <div
            className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs ${
              vanguard.approved
                ? "border-cyan-500/30 bg-cyan-500/5 text-cyan-200"
                : "border-rose-500/30 bg-rose-500/5 text-rose-200"
            }`}
          >
            {vanguard.approved ? (
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400" />
            )}
            <span>
              Vanguard:{" "}
              {vanguard.approved ? "Approved for launch" : "Needs revision"}
              {typeof vanguard.score === "number" ? ` · ${vanguard.score}/10` : ""}
            </span>
          </div>
        )}
        {aether?.nextSteps?.length ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Do This Next
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {aether.nextSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildFullMarkdown(
  aether: AetherResult | undefined,
  vanguard: VanguardResult | undefined,
  results: Record<string, AgentResult>,
): string {
  const out: string[] = [];
  out.push(`# ${aether?.headline || "LUNAVX Workforce Output"}`, "");
  if (aether?.executiveSummary) out.push(aether.executiveSummary, "");
  if (aether?.revenueImpact) out.push(`**Revenue impact:** ${aether.revenueImpact}`, "");
  if (aether?.keyOutcomes?.length) {
    out.push("## Key Outcomes");
    aether.keyOutcomes.forEach((k) => out.push(`- ${k}`));
    out.push("");
  }
  if (aether?.nextSteps?.length) {
    out.push("## Do This Next");
    aether.nextSteps.forEach((s, i) => out.push(`${i + 1}. ${s}`));
    out.push("");
  }
  if (vanguard) {
    out.push(
      `## Vanguard Verdict — ${vanguard.approved ? "Approved" : "Needs revision"}${
        typeof vanguard.score === "number" ? ` (${vanguard.score}/10)` : ""
      }`,
    );
    if (vanguard.finalVerdict) out.push(vanguard.finalVerdict);
    out.push("");
  }
  out.push("---", "", "## Full Agent Output (JSON)", "```json");
  out.push(JSON.stringify(results, null, 2));
  out.push("```");
  return out.join("\n");
}
