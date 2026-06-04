import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createTask, getTask, listTasks } from "@/lib/orchestrator.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/chat")({
  component: ChatPage,
});

function ChatPage() {
  const qc = useQueryClient();
  const tasksFn = useServerFn(listTasks);
  const getFn = useServerFn(getTask);
  const createFn = useServerFn(createTask);
  const [input, setInput] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => tasksFn(), refetchInterval: 3000 });
  const active = useQuery({
    queryKey: ["task", activeId],
    queryFn: () => getFn({ data: { id: activeId! } }),
    enabled: !!activeId,
    refetchInterval: (q) => (q.state.data?.task?.status === "running" ? 1500 : false),
  });

  const send = useMutation({
    mutationFn: (text: string) => createFn({ data: { input: text } }),
    onSuccess: (r) => {
      setActiveId(r.taskId);
      setInput("");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const t = active.data?.task;
  const runs = active.data?.runs ?? [];

  return (
    <div className="flex h-screen">
      <div className="w-72 border-r border-border bg-card/30 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="font-display font-bold">Conversations</h2>
        </div>
        <div className="p-2 space-y-1">
          {(tasks.data ?? []).map((tt) => (
            <button
              key={tt.id}
              onClick={() => setActiveId(tt.id)}
              className={`w-full text-left p-3 rounded-lg text-sm transition ${
                activeId === tt.id ? "bg-primary/10 border border-primary/20" : "hover:bg-accent/50"
              }`}
            >
              <div className="truncate font-medium">{tt.input}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{tt.status}</Badge>
                {new Date(tt.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-border px-6 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold">LUNAVX Business Assistant</h1>
            <p className="text-xs text-muted-foreground">All requests are routed through the Orchestrator.</p>
          </div>
          {t && (
            <Badge variant={t.status === "completed" ? "default" : t.status === "failed" ? "destructive" : "secondary"}>
              {t.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {t.stage}
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!t && (
            <div className="h-full flex items-center justify-center text-center">
              <div className="max-w-md">
                <div className="h-14 w-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-4">
                  <Bot className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-display font-bold">How can your AI workforce help today?</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Ask things like "Find 20 dental clinics in Miami and write cold outreach emails" or "Design an automation that follows up new leads after 48 hours."
                </p>
              </div>
            </div>
          )}
          {t && (
            <>
              <Message role="user" content={t.input} />
              {runs.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px]">{r.agent_name}</Badge>
                    <Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                      {r.status === "running" && <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />}
                      {r.status}
                    </Badge>
                    {r.duration_ms && <span className="text-[10px] text-muted-foreground">{r.duration_ms}ms</span>}
                  </div>
                  {r.output ? (
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 p-3 rounded-md max-h-72 overflow-auto">
                      {JSON.stringify(r.output, null, 2)}
                    </pre>
                  ) : r.error ? (
                    <p className="text-xs text-destructive">{r.error}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Working…</p>
                  )}
                </Card>
              ))}
            </>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you need…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim()) send.mutate(input); }
              }}
            />
            <Button disabled={!input.trim() || send.isPending} onClick={() => send.mutate(input)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Message({ role, content }: { role: "user" | "assistant"; content: string }) {
  return (
    <div className="flex gap-3">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${role === "user" ? "bg-accent-2/20 text-accent-2" : "gradient-primary"}`}>
        {role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary-foreground" />}
      </div>
      <div className="flex-1 pt-1">
        <div className="text-xs text-muted-foreground mb-1">{role === "user" ? "You" : "LUNAVX"}</div>
        <div className="text-sm">{content}</div>
      </div>
    </div>
  );
}
