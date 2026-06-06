import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle2, AlertCircle, Sparkles, ExternalLink } from "lucide-react";
import type {
  WorkflowResult,
  AgentResult,
  AtlasResult,
  PulseResult,
  NexusResult,
  ForgeResult,
  ShieldResult,
} from "@/lib/agents.server";

const EXAMPLES = [
  "Generate 15 plumbing leads in Austin, TX and write cold outreach emails.",
  "Find 10 dental clinics in Miami, analyze competitors, and design a follow-up automation.",
  "Generate 20 HVAC business leads in Phoenix and write SMS follow-ups.",
];

async function runWorkflow(userRequest: string): Promise<WorkflowResult> {
  const res = await fetch("/api/workflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userRequest }),
  });
  const data = (await res.json()) as WorkflowResult;
  return data;
}

export function AgentWorkflow() {
  const [input, setInput] = useState("");

  const mutation = useMutation({
    mutationFn: runWorkflow,
  });

  const result = mutation.data;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">AI Workforce</CardTitle>
            <CardDescription>
              Describe what you need. Orbis will plan and orchestrate the agents.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Generate 15 plumbing leads in Austin, TX and write outreach emails"
          rows={4}
          className="resize-none"
          disabled={mutation.isPending}
        />

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setInput(ex)}
              disabled={mutation.isPending}
              className="text-xs px-2 py-1 rounded-md border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Atlas leads are auto-synced to your Monday.com board.
          </p>
          <Button
            onClick={() => mutation.mutate(input.trim())}
            disabled={!input.trim() || mutation.isPending}
            size="lg"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running workforce…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run AI Workforce
              </>
            )}
          </Button>
        </div>

        {mutation.isError && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <div className="font-medium text-destructive">Workflow failed</div>
              <div className="text-muted-foreground">
                {mutation.error instanceof Error ? mutation.error.message : "Unknown error"}
              </div>
            </div>
          </div>
        )}

        {result && !result.success && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <div className="font-medium text-destructive">Workflow failed</div>
              <div className="text-muted-foreground">{result.error}</div>
            </div>
          </div>
        )}

        {result && result.success && <WorkflowOutput result={result} />}
      </CardContent>
    </Card>
  );
}

function WorkflowOutput({
  result,
}: {
  result: Extract<WorkflowResult, { success: true }>;
}) {
  return (
    <div className="space-y-4 pt-2">
      {/* Orbis Plan */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Orbis Plan
            </CardTitle>
            <Badge variant="secondary">{result.plan.length} steps</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ol className="space-y-2">
            {result.plan.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-medium">{step.agent}</div>
                  <div className="text-muted-foreground text-xs">{step.instruction}</div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Per-agent results */}
      <div className="grid grid-cols-1 gap-3">
        {Object.entries(result.results).map(([agent, output]) => (
          <AgentOutputCard key={agent} agent={agent} output={output} />
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        {result.summary}
      </div>
    </div>
  );
}

function AgentOutputCard({ agent, output }: { agent: string; output: AgentResult }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{agent}</span>
          {agent === "Atlas" && (output as AtlasResult).monday && (
            <Badge variant="default" className="gap-1">
              <ExternalLink className="h-3 w-3" />
              Monday: {(output as AtlasResult).monday!.synced}/
              {(output as AtlasResult).monday!.total} synced
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{renderAgentBody(agent, output)}</CardContent>
    </Card>
  );
}

function renderAgentBody(agent: string, output: AgentResult) {
  if (agent === "Atlas") {
    const o = output as AtlasResult;
    return (
      <div className="space-y-2">
        {(o.leads ?? []).map((lead, i) => {
          const synced = o.monday?.items.find((m) => m.name === lead.name);
          return (
            <div
              key={i}
              className="flex items-start justify-between gap-3 p-2 rounded-md border border-border/60 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{lead.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[lead.industry, lead.location].filter(Boolean).join(" · ")}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[lead.email, lead.phone, lead.website].filter(Boolean).join(" · ")}
                </div>
              </div>
              {synced?.itemId ? (
                <Badge variant="secondary" className="shrink-0">#{synced.itemId}</Badge>
              ) : synced?.error ? (
                <Badge variant="destructive" className="shrink-0">sync failed</Badge>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  if (agent === "Pulse") {
    const o = output as PulseResult;
    return (
      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Subject</div>
          <div className="font-medium">{o.subject}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Body</div>
          <p className="whitespace-pre-wrap">{o.body}</p>
        </div>
        {o.variants?.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Variants</div>
            {o.variants.map((v, i) => (
              <div key={i} className="p-2 rounded-md border border-border/60">
                <div className="font-medium text-xs">{v.subject}</div>
                <p className="text-xs whitespace-pre-wrap text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (agent === "Nexus") {
    const o = output as NexusResult;
    return (
      <div className="space-y-3 text-sm">
        {o.competitors?.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Competitors</div>
            <div className="space-y-1">
              {o.competitors.map((c, i) => (
                <div key={i} className="p-2 rounded-md border border-border/60">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-success">+ {c.strength}</div>
                  <div className="text-xs text-destructive">- {c.weakness}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {o.opportunities?.length > 0 && (
          <BulletList label="Opportunities" items={o.opportunities} />
        )}
        {o.insights?.length > 0 && <BulletList label="Insights" items={o.insights} />}
      </div>
    );
  }

  if (agent === "Forge") {
    const o = output as ForgeResult;
    return (
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">Trigger: </span>
          <span className="font-medium">{o.trigger}</span>
        </div>
        <ol className="space-y-1 list-decimal list-inside">
          {(o.steps ?? []).map((s, i) => (
            <li key={i}>
              <span className="font-medium">{s.action}</span>{" "}
              <span className="text-muted-foreground">— {s.details}</span>
            </li>
          ))}
        </ol>
        {o.integrations?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {o.integrations.map((it, i) => (
              <Badge key={i} variant="outline">{it}</Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (agent === "Shield") {
    const o = output as ShieldResult;
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          {o.ok ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Passed
            </Badge>
          ) : (
            <Badge variant="destructive">Issues found</Badge>
          )}
        </div>
        <p className="text-muted-foreground">{o.summary}</p>
        {o.issues?.length > 0 && <BulletList label="Issues" items={o.issues} />}
      </div>
    );
  }

  return (
    <pre className="text-xs bg-muted/40 p-2 rounded-md overflow-auto max-h-64">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

function BulletList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <ul className="list-disc list-inside space-y-0.5 text-sm">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
