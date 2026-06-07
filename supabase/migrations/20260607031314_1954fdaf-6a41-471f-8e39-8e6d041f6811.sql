
-- Clean up any orphan rows then enforce NOT NULL on organization_id
DELETE FROM public.execution_logs WHERE organization_id IS NULL;
ALTER TABLE public.execution_logs ALTER COLUMN organization_id SET NOT NULL;

DELETE FROM public.audit_logs WHERE organization_id IS NULL;
ALTER TABLE public.audit_logs ALTER COLUMN organization_id SET NOT NULL;

-- Tighten RLS now that NULL is impossible
DROP POLICY IF EXISTS "Org members view logs" ON public.execution_logs;
CREATE POLICY "Org members view logs" ON public.execution_logs
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));

DROP POLICY IF EXISTS "Members view audit" ON public.audit_logs;
CREATE POLICY "Members view audit" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));
