
-- =========================================================================
-- MULTI-TENANT FOUNDATION (retry)
-- =========================================================================

do $$ begin
  create type public.org_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null; end $$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan public.app_plan not null default 'free',
  stripe_customer_id text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role public.org_role not null default 'member',
  invited_by uuid,
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_org_members_user on public.organization_members(user_id);
create index idx_org_members_org on public.organization_members(organization_id);
grant select, insert, update, delete on public.organization_members to authenticated;
grant all on public.organization_members to service_role;
alter table public.organization_members enable row level security;

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);
create index idx_org_invites_email on public.organization_invitations(lower(email));
create index idx_org_invites_token on public.organization_invitations(token);
grant select, insert, update, delete on public.organization_invitations to authenticated;
grant all on public.organization_invitations to service_role;
alter table public.organization_invitations enable row level security;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_org_time on public.audit_logs(organization_id, created_at desc);
create index idx_audit_user_time on public.audit_logs(user_id, created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

-- Helpers
create or replace function public.is_org_member(_org_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members where organization_id = _org_id and user_id = _user_id);
$$;

create or replace function public.has_org_role(_org_id uuid, _user_id uuid, _min_role public.org_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = _org_id and user_id = _user_id
      and case _min_role
        when 'member' then role in ('member','admin','owner')
        when 'admin'  then role in ('admin','owner')
        when 'owner'  then role = 'owner'
      end
  );
$$;

create or replace function public.get_user_org_ids(_user_id uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_members where user_id = _user_id;
$$;

-- Policies: organizations
create policy "Members view orgs" on public.organizations for select to authenticated using (public.is_org_member(id, auth.uid()));
create policy "Users create orgs" on public.organizations for insert to authenticated with check (created_by = auth.uid());
create policy "Admins update orgs" on public.organizations for update to authenticated using (public.has_org_role(id, auth.uid(), 'admin'));
create policy "Owners delete orgs" on public.organizations for delete to authenticated using (public.has_org_role(id, auth.uid(), 'owner'));
create policy "Service role orgs" on public.organizations for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Policies: members
create policy "Members view team" on public.organization_members for select to authenticated using (public.is_org_member(organization_id, auth.uid()));
create policy "Admins add members" on public.organization_members for insert to authenticated with check (public.has_org_role(organization_id, auth.uid(), 'admin'));
create policy "Admins update members" on public.organization_members for update to authenticated using (public.has_org_role(organization_id, auth.uid(), 'admin'));
create policy "Admins remove or self leave" on public.organization_members for delete to authenticated using (public.has_org_role(organization_id, auth.uid(), 'admin') or user_id = auth.uid());
create policy "Service role members" on public.organization_members for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Policies: invitations
create policy "Admins view invites" on public.organization_invitations for select to authenticated using (public.has_org_role(organization_id, auth.uid(), 'admin'));
create policy "Admins create invites" on public.organization_invitations for insert to authenticated with check (public.has_org_role(organization_id, auth.uid(), 'admin'));
create policy "Admins delete invites" on public.organization_invitations for delete to authenticated using (public.has_org_role(organization_id, auth.uid(), 'admin'));
create policy "Service role invites" on public.organization_invitations for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Policies: audit
create policy "Members view audit" on public.audit_logs for select to authenticated using (organization_id is not null and public.is_org_member(organization_id, auth.uid()));
create policy "Service role audit" on public.audit_logs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Add organization_id to existing tables
alter table public.profiles                add column current_organization_id uuid;
alter table public.businesses              add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.tasks                   add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.agent_runs              add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.execution_logs          add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.workflows               add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.chatbot_settings        add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.leads                   add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.generation_usage        add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.weekly_plan_usage       add column organization_id uuid references public.organizations(id) on delete cascade;
alter table public.subscriptions           add column organization_id uuid references public.organizations(id) on delete cascade;

-- Backfill: iterate every distinct user_id across auth.users + every tenant table
do $$
declare
  u record;
  new_org_id uuid;
begin
  for u in
    select distinct user_id from (
      select id as user_id from auth.users
      union select user_id from public.profiles where user_id is not null
      union select owner_id as user_id from public.businesses where owner_id is not null
      union select user_id from public.tasks where user_id is not null
      union select user_id from public.agent_runs where user_id is not null
      union select user_id from public.execution_logs where user_id is not null
      union select user_id from public.workflows where user_id is not null
      union select user_id from public.generation_usage where user_id is not null
      union select user_id from public.weekly_plan_usage where user_id is not null
      union select user_id from public.subscriptions where user_id is not null
    ) s
    where user_id is not null
  loop
    insert into public.organizations (name, plan, created_by)
    values ('Personal Workspace', coalesce((select plan from public.profiles where user_id = u.user_id limit 1), 'free'), u.user_id)
    returning id into new_org_id;

    insert into public.organization_members (organization_id, user_id, role)
    values (new_org_id, u.user_id, 'owner');

    update public.profiles            set current_organization_id = new_org_id where user_id = u.user_id;
    update public.businesses          set organization_id = new_org_id where owner_id = u.user_id and organization_id is null;
    update public.tasks               set organization_id = new_org_id where user_id = u.user_id and organization_id is null;
    update public.agent_runs          set organization_id = new_org_id where user_id = u.user_id and organization_id is null;
    update public.execution_logs      set organization_id = new_org_id where user_id = u.user_id and organization_id is null;
    update public.workflows           set organization_id = new_org_id where user_id = u.user_id and organization_id is null;
    update public.generation_usage    set organization_id = new_org_id where user_id = u.user_id and organization_id is null;
    update public.weekly_plan_usage   set organization_id = new_org_id where user_id = u.user_id and organization_id is null;
    update public.subscriptions       set organization_id = new_org_id where user_id = u.user_id and organization_id is null;
  end loop;

  update public.chatbot_settings cs set organization_id = b.organization_id
    from public.businesses b where cs.business_id = b.id and cs.organization_id is null;
  update public.leads l set organization_id = b.organization_id
    from public.businesses b where l.business_id = b.id and l.organization_id is null;

  -- Safety: delete any truly orphan rows that still have null tenant (no owner found anywhere)
  delete from public.businesses        where organization_id is null;
  delete from public.tasks             where organization_id is null;
  delete from public.agent_runs        where organization_id is null;
  delete from public.workflows         where organization_id is null;
  delete from public.chatbot_settings  where organization_id is null;
end $$;

-- Enforce NOT NULL on core tenant tables
alter table public.businesses        alter column organization_id set not null;
alter table public.tasks             alter column organization_id set not null;
alter table public.agent_runs        alter column organization_id set not null;
alter table public.workflows         alter column organization_id set not null;
alter table public.chatbot_settings  alter column organization_id set not null;

-- Replace old user-scoped policies
drop policy if exists "Owners can delete own business"  on public.businesses;
drop policy if exists "Owners can insert own business"  on public.businesses;
drop policy if exists "Owners can update own business"  on public.businesses;
drop policy if exists "Owners can view own business"    on public.businesses;
drop policy if exists "Service role manages businesses" on public.businesses;

create policy "Org members view businesses" on public.businesses for select to authenticated using (public.is_org_member(organization_id, auth.uid()));
create policy "Org members create businesses" on public.businesses for insert to authenticated with check (public.is_org_member(organization_id, auth.uid()) and owner_id = auth.uid());
create policy "Org admins update businesses" on public.businesses for update to authenticated using (public.has_org_role(organization_id, auth.uid(), 'admin'));
create policy "Org admins delete businesses" on public.businesses for delete to authenticated using (public.has_org_role(organization_id, auth.uid(), 'admin'));
create policy "Service role businesses" on public.businesses for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages tasks" on public.tasks;
drop policy if exists "Users manage own tasks"      on public.tasks;
create policy "Org members view tasks" on public.tasks for select to authenticated using (public.is_org_member(organization_id, auth.uid()));
create policy "Org members create tasks" on public.tasks for insert to authenticated with check (public.is_org_member(organization_id, auth.uid()) and user_id = auth.uid());
create policy "Org members update tasks" on public.tasks for update to authenticated using (public.is_org_member(organization_id, auth.uid()));
create policy "Org admins delete tasks" on public.tasks for delete to authenticated using (public.has_org_role(organization_id, auth.uid(), 'admin'));
create policy "Service role tasks" on public.tasks for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages agent runs" on public.agent_runs;
drop policy if exists "Users view own agent runs"        on public.agent_runs;
create policy "Org members view agent runs" on public.agent_runs for select to authenticated using (public.is_org_member(organization_id, auth.uid()));
create policy "Service role agent runs" on public.agent_runs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages logs" on public.execution_logs;
drop policy if exists "Users view own logs"        on public.execution_logs;
create policy "Org members view logs" on public.execution_logs for select to authenticated using (organization_id is not null and public.is_org_member(organization_id, auth.uid()));
create policy "Service role logs" on public.execution_logs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages workflows" on public.workflows;
drop policy if exists "Users manage own workflows"      on public.workflows;
create policy "Org members view workflows" on public.workflows for select to authenticated using (public.is_org_member(organization_id, auth.uid()));
create policy "Org members create workflows" on public.workflows for insert to authenticated with check (public.is_org_member(organization_id, auth.uid()) and user_id = auth.uid());
create policy "Org members update workflows" on public.workflows for update to authenticated using (public.is_org_member(organization_id, auth.uid()));
create policy "Org admins delete workflows" on public.workflows for delete to authenticated using (public.has_org_role(organization_id, auth.uid(), 'admin'));
create policy "Service role workflows" on public.workflows for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Owners can manage own chatbot settings" on public.chatbot_settings;
drop policy if exists "Service role manages chatbot settings"  on public.chatbot_settings;
create policy "Org view chatbot settings" on public.chatbot_settings for select to authenticated using (public.is_org_member(organization_id, auth.uid()));
create policy "Org manage chatbot settings" on public.chatbot_settings for all to authenticated using (public.is_org_member(organization_id, auth.uid())) with check (public.is_org_member(organization_id, auth.uid()));
create policy "Service role chatbot settings" on public.chatbot_settings for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Owners can view own leads"  on public.leads;
drop policy if exists "Service role manages leads" on public.leads;
create policy "Org members view leads" on public.leads for select to authenticated using (organization_id is not null and public.is_org_member(organization_id, auth.uid()));
create policy "Service role leads" on public.leads for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages usage" on public.generation_usage;
drop policy if exists "Users can view own usage"    on public.generation_usage;
create policy "Org view usage" on public.generation_usage for select to authenticated using ((organization_id is not null and public.is_org_member(organization_id, auth.uid())) or user_id = auth.uid());
create policy "Service role usage" on public.generation_usage for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role manages weekly plan usage" on public.weekly_plan_usage;
drop policy if exists "Users can view own weekly plan usage"    on public.weekly_plan_usage;
create policy "Org view weekly usage" on public.weekly_plan_usage for select to authenticated using ((organization_id is not null and public.is_org_member(organization_id, auth.uid())) or user_id = auth.uid());
create policy "Service role weekly usage" on public.weekly_plan_usage for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
drop policy if exists "Users can view own subscription"        on public.subscriptions;
create policy "Org admins view subscription" on public.subscriptions for select to authenticated using ((organization_id is not null and public.has_org_role(organization_id, auth.uid(), 'admin')) or user_id = auth.uid());
create policy "Service role subscriptions" on public.subscriptions for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Update new-user handler to auto-create a personal org
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_org_id uuid;
begin
  insert into public.organizations (name, plan, created_by)
  values ('Personal Workspace', 'free', new.id)
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  insert into public.profiles (user_id, plan, current_organization_id)
  values (new.id, 'free', new_org_id)
  on conflict (user_id) do update set current_organization_id = excluded.current_organization_id;

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop trigger if exists update_organizations_updated_at on public.organizations;
create trigger update_organizations_updated_at before update on public.organizations for each row execute function public.update_updated_at_column();
