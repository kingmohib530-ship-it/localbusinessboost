import { useState } from "react";
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
} from "lucide-react";
import type {
  WorkflowResult,
  AgentResult,
  AtlasResult,
  PulseResult,
  NexusResult,
  ForgeResult,
  ShieldResult,
  AtlasLead,
} from "@/lib/agents.server";

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
export function AgentWorkflow() {
  const [input, setInput] = useState("");

  const mutation = useMutation({ mutationFn: runWorkflow });
  const result = mutation.data;
  const isLoading = mutation.isPending;

  const handleRun = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    mutation.mutate(trimmed);
  };

  const atlasResult =
    result?.success && result.results.Atlas
      ? (result.results.Atlas as AtlasResult)
      : undefined;
  const mondayNote =
    atlasResult?.monday && atlasResult.monday.synced > 0
      ? `${atlasResult.monday.synced}/${atlasResult.monday.total} leads synced to Monday.com`
      : null;

  return (
    <div className="space-y-6">
      {/* ── Input card ───────────────────────────────────────────────────── */}
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">LUNAVX AI Workforce</CardTitle>
              <CardDescription>
                Describe what you need. Orbis plans, and your six agents execute end-to-end.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. Generate 15 plumbing leads in Austin, TX and write cold outreach emails"
            className="min-h-32 resize-none text-base"
          />

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                disabled={isLoading}
                onClick={() => setInput(ex.prompt)}
                className="rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/60 hover:text-foreground disabled:opacity-50"
              >
                {ex.label}
              </button>
            ))}
          </div>

          <Button
            size="lg"
            disabled={!input.trim() || isLoading}
            onClick={handleRun}
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
                Run AI Workforce
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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
  if (agent === "Atlas") return <AtlasOutput data={output as AtlasResult} />;
  if (agent === "Pulse") return <PulseOutput data={output as PulseResult} />;
  if (agent === "Nexus") return <NexusOutput data={output as NexusResult} />;
  if (agent === "Forge") return <ForgeOutput data={output as ForgeResult} />;
  if (agent === "Shield") return <ShieldOutput data={output as ShieldResult} />;
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
  return (
    <div className="space-y-5">
      {data?.estimatedRoi && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 text-sm text-orange-100">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-300">
            💰 Estimated ROI
          </p>
          <p className="leading-relaxed">{data.estimatedRoi}</p>
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

function CopyButton({ text }: { text: string }) {
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
      className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
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
