import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createTask, listTasks } from "@/lib/orchestrator.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Globe, Search, PenTool, Workflow, Shield, Compass, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/agents")({
  component: AgentsHub,
});

const AGENTS = [
  { name: "Orbis", role: "Strategy Engine", desc: "Decomposes requests into multi-agent workflows.", icon: Compass, color: "from-violet-500 to-fuchsia-500" },
  { name: "Atlas", role: "Lead Intelligence", desc: "Generates structured local business leads.", icon: Globe, color: "from-cyan-400 to-teal-500" },
  { name: "Nexus", role: "Market Intelligence", desc: "Competitor research and market insights.", icon: Search, color: "from-sky-400 to-blue-600" },
  { name: "Pulse", role: "Copywriting Engine", desc: "Cold emails, ads, and outreach scripts.", icon: PenTool, color: "from-pink-500 to-rose-500" },
  { name: "Forge", role: "Automation Builder", desc: "Designs workflow automation logic.", icon: Workflow, color: "from-amber-400 to-orange-500" },
  { name: "Shield", role: "Quality Control", desc: "Validates and improves agent outputs.", icon: Shield, color: "from-emerald-400 to-green-600" },
] as const;

function AgentsHub() {
  const qc = useQueryClient();
  const tasksFn = useServerFn(listTasks);
  const createFn = useServerFn(createTask);
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => tasksFn(), refetchInterval: 3000 });
  const [open, setOpen] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const run = useMutation({
    mutationFn: (vars: { input: string; singleAgent?: string }) => createFn({ data: vars }),
    onSuccess: () => {
      toast.success("Task dispatched to orchestrator");
      setOpen(null); setPrompt("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const lastRun = (agent: string) => {
    return (tasks.data ?? []).find((t) => t.assigned_agents.includes(agent));
  };
  const isActive = (agent: string) => {
    return (tasks.data ?? []).some((t) => t.status === "running" && t.assigned_agents.includes(agent));
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Agents Hub</h1>
        <p className="text-muted-foreground mt-1">Your 6 specialized AI workers. All routed through the LUNAVX Orchestrator.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {AGENTS.map((a) => {
          const last = lastRun(a.name);
          const active = isActive(a.name);
          return (
            <Card key={a.name} className="p-6 relative overflow-hidden group">
              <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${a.color} opacity-20 blur-2xl group-hover:opacity-30 transition`} />
              <div className="flex items-start justify-between mb-4">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-lg`}>
                  <a.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${active ? "bg-success animate-pulse-glow" : "bg-muted-foreground/40"}`} />
                  <Badge variant="secondary" className="text-[10px]">{active ? "Running" : last?.status === "completed" ? "Idle" : "Standby"}</Badge>
                </div>
              </div>
              <h3 className="font-display font-bold text-lg">{a.name}</h3>
              <div className="text-xs text-primary mb-2">{a.role}</div>
              <p className="text-sm text-muted-foreground mb-4">{a.desc}</p>
              <div className="text-xs text-muted-foreground border-t border-border/60 pt-3 mb-4 min-h-[36px]">
                <span className="opacity-60">Last task: </span>
                {last ? <span className="text-foreground/80">{last.input.slice(0, 60)}{last.input.length > 60 ? "…" : ""}</span> : "—"}
              </div>
              <Button className="w-full" size="sm" onClick={() => setOpen(a.name)}>
                <Play className="h-3.5 w-3.5" /> Run Agent
              </Button>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run {open}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Describe the task. The Orchestrator will route through {open} and Shield for QC.</p>
          <Textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={`e.g. ${open === "Atlas" ? "Find 10 plumbing companies in Austin TX" : "Describe what you need"}`} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
            <Button disabled={!prompt.trim() || run.isPending} onClick={() => run.mutate({ input: prompt, singleAgent: open! })}>
              {run.isPending ? "Dispatching…" : "Dispatch"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
