import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { dashboardStats, listTasks } from "@/lib/orchestrator.functions";
import {
  getOnboardingProfile,
  resetOnboarding,
} from "@/lib/onboarding.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  CheckCircle2,
  Cpu,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { AgentWorkflow } from "@/components/AgentWorkflow";
import { OnboardingWizard } from "@/components/OnboardingWizard";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Overview,
});

function Overview() {
  const statsFn = useServerFn(dashboardStats);
  const tasksFn = useServerFn(listTasks);
  const onboardingFn = useServerFn(getOnboardingProfile);
  const resetFn = useServerFn(resetOnboarding);
  const qc = useQueryClient();

  const stats = useQuery({ queryKey: ["stats"], queryFn: () => statsFn(), refetchInterval: 4000 });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => tasksFn(), refetchInterval: 3000 });
  const onboarding = useQuery({
    queryKey: ["onboarding-profile"],
    queryFn: () => onboardingFn(),
    staleTime: 60_000,
  });
  const resetMut = useMutation({
    mutationFn: () => resetFn(),
    onSuccess: () => {
      try {
        localStorage.removeItem("lunavx:onboarded");
      } catch {
        // ignore
      }
      qc.invalidateQueries({ queryKey: ["onboarding-profile"] });
      setWizardOpen(true);
    },
  });

  const [wizardOpen, setWizardOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);
  const [autoRun, setAutoRun] = useState(false);

  // Auto-open the wizard on first visit when the profile has never been onboarded.
  useEffect(() => {
    if (onboarding.isLoading || !onboarding.data) return;
    const localFlag =
      typeof window !== "undefined" && localStorage.getItem("lunavx:onboarded") === "1";
    if (!onboarding.data.onboarded_at && !localFlag) {
      setWizardOpen(true);
    }
  }, [onboarding.isLoading, onboarding.data]);

  const s = stats.data;
  const cards = [
    { label: "Total tasks", value: s?.tasksTotal ?? 0, icon: Cpu, color: "text-primary" },
    { label: "Completed", value: s?.tasksCompleted ?? 0, icon: CheckCircle2, color: "text-success" },
    { label: "Running", value: s?.tasksRunning ?? 0, icon: Activity, color: "text-accent-2" },
    { label: "Failed", value: s?.tasksFailed ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI workforce online
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            {onboarding.data?.business_name
              ? `Welcome back, ${onboarding.data.business_name} 👋`
              : "Welcome back"}
          </h1>
          <p className="text-muted-foreground">
            Your AI team is ready to bring in more clients, bookings, and revenue.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => resetMut.mutate()}
          disabled={resetMut.isPending}
          className="border-border/60 hover:border-violet-500/40 hover:bg-violet-500/5"
        >
          <Sparkles className="h-4 w-4 mr-1.5 text-violet-300" />
          Restart onboarding
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c) => (
          <Card
            key={c.label}
            className="relative p-5 overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/40 hover:border-border transition-colors group"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-background/60 ring-1 ring-border/60">
                <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              </div>
            </div>
            <div className="text-3xl md:text-4xl font-bold mt-3 tracking-tight tabular-nums">
              {c.value}
            </div>
          </Card>
        ))}
      </div>


      <AgentWorkflow
        initialPrompt={pendingPrompt}
        autoRun={autoRun}
        onConsumed={() => {
          setAutoRun(false);
          setPendingPrompt(undefined);
        }}
      />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Agent run distribution</h2>
          <span className="text-xs text-muted-foreground">{s?.runsTotal ?? 0} total runs</span>
        </div>
        <div className="space-y-2">
          {Object.entries(s?.runsByAgent ?? {}).map(([agent, count]) => {
            const max = Math.max(...Object.values(s?.runsByAgent ?? { x: 1 }));
            const pct = (count / max) * 100;
            return (
              <div key={agent} className="flex items-center gap-3">
                <div className="w-20 text-sm">{agent}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full gradient-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="w-10 text-right text-sm text-muted-foreground">{count}</div>
              </div>
            );
          })}
          {Object.keys(s?.runsByAgent ?? {}).length === 0 && (
            <p className="text-sm text-muted-foreground">No agent runs yet. Start a task from Agents Hub or the Business Assistant.</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent tasks</h2>
        <div className="space-y-2">
          {(tasks.data ?? []).slice(0, 10).map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-accent/40">
              <div className="min-w-0 flex-1 pr-4">
                <div className="text-sm font-medium truncate">{t.input}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(t.created_at).toLocaleString()} · {t.assigned_agents.join(" → ") || "—"}
                </div>
              </div>
              <Badge variant={t.status === "completed" ? "default" : t.status === "failed" ? "destructive" : "secondary"}>
                {t.status}
              </Badge>
            </div>
          ))}
          {(tasks.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          )}
        </div>
      </Card>

      <OnboardingWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          qc.invalidateQueries({ queryKey: ["onboarding-profile"] });
        }}
        onComplete={(prompt) => {
          setWizardOpen(false);
          qc.invalidateQueries({ queryKey: ["onboarding-profile"] });
          setPendingPrompt(prompt);
          setAutoRun(true);
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />
    </div>
  );
}
