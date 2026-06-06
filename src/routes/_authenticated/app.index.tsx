import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dashboardStats, listTasks } from "@/lib/orchestrator.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, Cpu, AlertTriangle } from "lucide-react";
import { AgentWorkflow } from "@/components/AgentWorkflow";

export const Route = createFileRoute("/_authenticated/app/")({
  component: Overview,
});

function Overview() {
  const statsFn = useServerFn(dashboardStats);
  const tasksFn = useServerFn(listTasks);
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => statsFn(), refetchInterval: 4000 });
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => tasksFn(), refetchInterval: 3000 });

  const s = stats.data;
  const cards = [
    { label: "Total tasks", value: s?.tasksTotal ?? 0, icon: Cpu, color: "text-primary" },
    { label: "Completed", value: s?.tasksCompleted ?? 0, icon: CheckCircle2, color: "text-success" },
    { label: "Running", value: s?.tasksRunning ?? 0, icon: Activity, color: "text-accent-2" },
    { label: "Failed", value: s?.tasksFailed ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Your AI workforce at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <div className="text-3xl font-bold mt-2">{c.value}</div>
          </Card>
        ))}
      </div>

      <AgentWorkflow />


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
    </div>
  );
}
