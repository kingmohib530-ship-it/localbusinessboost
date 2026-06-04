import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLogs } from "@/lib/orchestrator.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/logs")({
  component: Logs,
});

function Logs() {
  const logsFn = useServerFn(listLogs);
  const logs = useQuery({ queryKey: ["logs"], queryFn: () => logsFn(), refetchInterval: 2500 });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Execution Logs</h1>
        <p className="text-muted-foreground mt-1">Real-time stream of every agent action.</p>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="font-mono text-xs divide-y divide-border/60">
          {(logs.data ?? []).map((l) => (
            <div key={l.id} className="px-4 py-2 flex gap-3 items-center hover:bg-accent/30">
              <span className="text-muted-foreground w-24 shrink-0">{new Date(l.created_at).toLocaleTimeString()}</span>
              <Badge
                variant={l.level === "error" ? "destructive" : l.level === "success" ? "default" : "secondary"}
                className="text-[10px] w-16 justify-center"
              >
                {l.level}
              </Badge>
              <span className="text-primary w-16 shrink-0">{l.agent_name ?? "system"}</span>
              <span className="truncate">{l.message}</span>
            </div>
          ))}
          {(logs.data ?? []).length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">No logs yet. Run an agent to see live execution.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
