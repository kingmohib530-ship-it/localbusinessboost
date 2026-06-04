
-- TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  input text NOT NULL,
  status text NOT NULL DEFAULT 'queued', -- queued | running | completed | failed
  stage text NOT NULL DEFAULT 'incoming', -- incoming | assigned | processing | completed | reviewed
  assigned_agents text[] NOT NULL DEFAULT '{}',
  plan jsonb,
  final_output jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages tasks" ON public.tasks FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX tasks_user_created_idx ON public.tasks(user_id, created_at DESC);

-- AGENT RUNS
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  agent_name text NOT NULL,
  input jsonb,
  output jsonb,
  status text NOT NULL DEFAULT 'running', -- running | completed | failed
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own agent runs" ON public.agent_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages agent runs" ON public.agent_runs FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX agent_runs_task_idx ON public.agent_runs(task_id, started_at);
CREATE INDEX agent_runs_user_idx ON public.agent_runs(user_id, started_at DESC);

-- EXECUTION LOGS
CREATE TABLE public.execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  agent_name text,
  level text NOT NULL DEFAULT 'info', -- info | warn | error | success
  message text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_logs TO authenticated;
GRANT ALL ON public.execution_logs TO service_role;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own logs" ON public.execution_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manages logs" ON public.execution_logs FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX execution_logs_user_idx ON public.execution_logs(user_id, created_at DESC);
CREATE INDEX execution_logs_task_idx ON public.execution_logs(task_id, created_at);

-- WORKFLOWS
CREATE TABLE public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows TO authenticated;
GRANT ALL ON public.workflows TO service_role;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workflows" ON public.workflows FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages workflows" ON public.workflows FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- update triggers
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER workflows_updated_at BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
