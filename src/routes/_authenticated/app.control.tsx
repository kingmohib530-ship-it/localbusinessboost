import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTask, listTasks } from "@/lib/orchestrator.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal } from "lucide-react";
import { useRequireAdmin } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/app/control")({
  component: ControlCenter,
});

function ControlCenter() {
  const allowed = useRequireAdmin();
  const tasksFn = useServerFn(listTasks);
  const getFn = useServerFn(getTask);
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => tasksFn(), refetchInterval: 4000 });
  const [sel, setSel] = useState<string | null>(null);
  const detail = useQuery({
    queryKey: ["task-detail", sel],
    queryFn: () => getFn({ data: { id: sel! } }),
    enabled: !!sel,
    refetchInterval: 2000,
  });

  if (!allowed) return null;

  return (
    <div className="flex h-screen">
      <div className="w-80 border-r border-border overflow-y-auto bg-card/30">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold">Control Center</h2>
        </div>
        <div className="p-2 space-y-1">
          {(tasks.data ?? []).map((t) => (
            <button key={t.id} onClick={() => setSel(t.id)} className={`w-full text-left p-3 rounded-lg text-sm ${sel === t.id ? "bg-primary/10 border border-primary/20" : "hover:bg-accent/40"}`}>
              <div className="truncate font-mono text-xs text-muted-foreground">{t.id.slice(0, 8)}</div>
              <div className="truncate text-sm mt-1">{t.input}</div>
              <Badge variant="secondary" className="mt-1 text-[10px]">{t.status}</Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {!sel && <p className="text-muted-foreground text-sm">Select a task to inspect agent execution, prompts and outputs.</p>}
        {detail.data?.task && (
          <>
            <Card className="p-5">
              <div className="text-xs text-muted-foreground">Task ID</div>
              <div className="font-mono text-sm">{detail.data.task.id}</div>
              <div className="mt-3 text-sm">{detail.data.task.input}</div>
              <div className="mt-3 flex gap-2">
                <Badge>{detail.data.task.status}</Badge>
                <Badge variant="secondary">{detail.data.task.stage}</Badge>
              </div>
              {detail.data.task.plan && (
                <pre className="text-xs mt-4 bg-muted/40 p-3 rounded font-mono whitespace-pre-wrap">
                  {JSON.stringify(detail.data.task.plan, null, 2)}
                </pre>
              )}
            </Card>

            <div className="space-y-3">
              {detail.data.runs.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.agent_name}</Badge>
                      <Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.duration_ms ?? "—"} ms</span>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Input</summary>
                    <pre className="bg-muted/40 p-2 rounded mt-1 font-mono whitespace-pre-wrap">{JSON.stringify(r.input, null, 2)}</pre>
                  </details>
                  <details className="text-xs mt-2" open>
                    <summary className="cursor-pointer text-muted-foreground">Output</summary>
                    <pre className="bg-muted/40 p-2 rounded mt-1 font-mono whitespace-pre-wrap max-h-72 overflow-auto">{JSON.stringify(r.output, null, 2)}</pre>
                  </details>
                </Card>
              ))}
            </div>

            <Card className="p-4">
              <h3 className="font-semibold mb-2 text-sm">Logs</h3>
              <div className="space-y-1 font-mono text-xs max-h-80 overflow-auto">
                {detail.data.logs.map((l) => (
                  <div key={l.id} className="flex gap-2">
                    <span className="text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
                    <span className={l.level === "error" ? "text-destructive" : l.level === "success" ? "text-success" : "text-foreground"}>[{l.level}]</span>
                    {l.agent_name && <span className="text-primary">{l.agent_name}</span>}
                    <span>{l.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
