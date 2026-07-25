import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasks } from "@/lib/orchestrator.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRequireAdmin } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/app/workflows")({
  component: Workflows,
});

const COLS = [
  { key: "incoming", label: "Incoming", color: "border-l-muted-foreground" },
  { key: "assigned", label: "Assigned", color: "border-l-accent-2" },
  { key: "processing", label: "Processing", color: "border-l-primary" },
  { key: "completed", label: "Completed", color: "border-l-success" },
  { key: "reviewed", label: "Reviewed", color: "border-l-fuchsia-500" },
] as const;

function Workflows() {
  const allowed = useRequireAdmin();
  const tasksFn = useServerFn(listTasks);
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => tasksFn(), refetchInterval: 3000 });

  if (!allowed) return null;

  const byStage = (stage: string) =>
    (tasks.data ?? []).filter((t) => {
      if (stage === "reviewed") return t.status === "completed" && t.assigned_agents.includes("Shield");
      return t.stage === stage;
    });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Workflow Pipeline</h1>
        <p className="text-muted-foreground mt-1">Live view of every task as it moves through the LUNAVX system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {COLS.map((c) => (
          <div key={c.key} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{c.label}</h3>
              <Badge variant="secondary" className="text-[10px]">{byStage(c.key).length}</Badge>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {byStage(c.key).map((t) => (
                <Card key={t.id} className={`p-3 border-l-4 ${c.color}`}>
                  <div className="text-sm font-medium line-clamp-2">{t.input}</div>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    {t.assigned_agents.join(" → ") || "Planning…"}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
