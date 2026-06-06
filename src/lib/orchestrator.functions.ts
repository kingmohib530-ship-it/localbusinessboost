import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const createSchema = z.object({
  input: z.string().min(2).max(4000),
  singleAgent: z
    .enum(["Orbis", "Atlas", "Nexus", "Pulse", "Forge", "Shield"])
    .optional(),
});

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Resolve current organization (tenant boundary)
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("user_id", userId)
      .maybeSingle();
    const orgId = profile?.current_organization_id;
    if (!orgId) throw new Error("No active organization for this user.");

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        organization_id: orgId,
        user_id: userId,
        input: data.input,
        status: "queued",
        stage: "incoming",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    runTaskInBackground(task.id, orgId, userId, data.input, data.singleAgent).catch((e) => {
      console.error("[orchestrator] background error", e);
    });

    return { taskId: task.id };
  });

async function runTaskInBackground(
  taskId: string,
  userId: string,
  input: string,
  singleAgent?: string
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { runOrbisPlanner, runAgent, AGENT_META } = await import("./agents.server");
  type AgentName = keyof typeof AGENT_META;

  const log = async (
    level: string,
    message: string,
    agent_name?: string,
    metadata?: unknown
  ) => {
    await supabaseAdmin
      .from("execution_logs")
      .insert({
        task_id: taskId,
        user_id: userId,
        agent_name: agent_name ?? null,
        level,
        message,
        metadata: metadata as never,
      });
  };

  const runOne = async (agent: AgentName, instruction: string, ctx: Record<string, unknown>) => {
    const started = Date.now();
    const { data: run } = await supabaseAdmin
      .from("agent_runs")
      .insert({
        task_id: taskId,
        user_id: userId,
        agent_name: agent,
        input: { instruction, ctx } as never,
        status: "running",
      })
      .select()
      .single();
    await log("info", `${agent} started`, agent);
    try {
      const out = await runAgent(agent, instruction, ctx);
      const duration = Date.now() - started;
      await supabaseAdmin
        .from("agent_runs")
        .update({
          status: "completed",
          output: out as never,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq("id", run!.id);
      await log("success", `${agent} completed in ${duration}ms`, agent);
      return out;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
        .from("agent_runs")
        .update({ status: "failed", error: msg, completed_at: new Date().toISOString() })
        .eq("id", run!.id);
      await log("error", `${agent} failed: ${msg}`, agent);
      throw e;
    }
  };

  try {
    await supabaseAdmin
      .from("tasks")
      .update({ status: "running", stage: "assigned" })
      .eq("id", taskId);
    await log("info", "Orchestrator engaged");

    let plan: { agent: AgentName; instruction: string }[];
    if (singleAgent) {
      plan = [{ agent: singleAgent as AgentName, instruction: input }];
      if (singleAgent !== "Shield") plan.push({ agent: "Shield", instruction: "Validate the prior output." });
    } else {
      await log("info", "Orbis planning", "Orbis");
      const orbis = await runOrbisPlanner(input);
      plan = (orbis.steps || []).filter((s) => s.agent && s.instruction);
      if (!plan.length) plan = [{ agent: "Pulse", instruction: input }, { agent: "Shield", instruction: "Validate" }];
    }

    await supabaseAdmin
      .from("tasks")
      .update({
        plan: { steps: plan } as never,
        assigned_agents: plan.map((p) => p.agent),
        stage: "processing",
      })
      .eq("id", taskId);

    const outputs: Record<string, unknown> = {};
    for (const step of plan) {
      const result = await runOne(step.agent, step.instruction, outputs);
      outputs[step.agent] = result;
    }

    await supabaseAdmin
      .from("tasks")
      .update({
        status: "completed",
        stage: "completed",
        final_output: outputs as never,
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);
    await log("success", "Task completed");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("tasks")
      .update({ status: "failed", error: msg, completed_at: new Date().toISOString() })
      .eq("id", taskId);
    await log("error", `Orchestrator failed: ${msg}`);
  }
}

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data;
  });

export const getTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: task }, { data: runs }, { data: logs }] = await Promise.all([
      context.supabase.from("tasks").select("*").eq("id", data.id).maybeSingle(),
      context.supabase
        .from("agent_runs")
        .select("*")
        .eq("task_id", data.id)
        .order("started_at", { ascending: true }),
      context.supabase
        .from("execution_logs")
        .select("*")
        .eq("task_id", data.id)
        .order("created_at", { ascending: true }),
    ]);
    return { task, runs: runs ?? [], logs: logs ?? [] };
  });

export const listLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("execution_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: tasks }, { data: runs }] = await Promise.all([
      context.supabase.from("tasks").select("id,status,created_at"),
      context.supabase.from("agent_runs").select("agent_name,status,duration_ms,started_at"),
    ]);
    const t = tasks ?? [];
    const r = runs ?? [];
    return {
      tasksTotal: t.length,
      tasksCompleted: t.filter((x) => x.status === "completed").length,
      tasksRunning: t.filter((x) => x.status === "running").length,
      tasksFailed: t.filter((x) => x.status === "failed").length,
      runsTotal: r.length,
      runsByAgent: r.reduce<Record<string, number>>((acc, x) => {
        acc[x.agent_name] = (acc[x.agent_name] || 0) + 1;
        return acc;
      }, {}),
    };
  });
