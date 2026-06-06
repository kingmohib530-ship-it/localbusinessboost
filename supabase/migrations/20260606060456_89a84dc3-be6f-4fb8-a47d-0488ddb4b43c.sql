
-- =====================================================================
-- 1) Prevent privilege escalation on organization_members
-- =====================================================================

drop policy if exists "Admins update members" on public.organization_members;
drop policy if exists "Admins remove or self leave" on public.organization_members;

-- Admins may update members, but cannot touch owner rows and cannot set role='owner'.
-- Owners can do both.
create policy "Admins update members (no escalation)" on public.organization_members
  for update to authenticated
  using (
    public.has_org_role(organization_id, auth.uid(), 'admin')
    and (role <> 'owner' or public.has_org_role(organization_id, auth.uid(), 'owner'))
  )
  with check (
    public.has_org_role(organization_id, auth.uid(), 'admin')
    and (role <> 'owner' or public.has_org_role(organization_id, auth.uid(), 'owner'))
  );

-- Admins can remove non-owner members. Owners can remove anyone except themselves
-- (must transfer ownership first). Members can self-leave, but owners cannot self-leave.
create policy "Remove members with safeguards" on public.organization_members
  for delete to authenticated
  using (
    (
      public.has_org_role(organization_id, auth.uid(), 'admin')
      and role <> 'owner'
    )
    or (
      public.has_org_role(organization_id, auth.uid(), 'owner')
      and user_id <> auth.uid()
    )
    or (
      user_id = auth.uid() and role <> 'owner'
    )
  );

-- =====================================================================
-- 2) Lock down leads.organization_id (no orphan rows)
-- =====================================================================

delete from public.leads where organization_id is null;
alter table public.leads alter column organization_id set not null;
