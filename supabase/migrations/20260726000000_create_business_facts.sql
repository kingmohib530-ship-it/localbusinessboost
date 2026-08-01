-- Foundation for a per-business "AI memory": a plain table of facts about
-- each business (services, pricing, hours, service area), seeded by the
-- contractor and kept current by periodic Google/website syncs. Missed-Call
-- Text-Back reads the active facts as real context instead of guessing.

alter table public.profiles
  add column google_place_id text;

create table public.business_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact_type text not null check (fact_type in ('service','pricing','hours','service_area','general')),
  fact_text text not null,
  source text not null check (source in ('setup_form','google_synced','website_synced','auto_learned')),
  status text not null default 'active' check (status in ('active','pending_review','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every read path (the fact list, the pending-review queue, and the
-- Missed-Call Text-Back prompt builder) filters by user_id, and often by
-- fact_type too — both need to stay index-backed as this table grows
-- across every business, not just the one being tested.
create index idx_business_facts_user on public.business_facts(user_id);
create index idx_business_facts_user_type on public.business_facts(user_id, fact_type);

alter table public.business_facts enable row level security;

-- (select auth.uid()) instead of a bare auth.uid() lets Postgres evaluate
-- it once per query (an InitPlan) instead of once per row - otherwise this
-- policy re-evaluates the function on every row scanned, which gets
-- noticeably slower as the table grows across every business, not just one.
create policy "Users manage own business facts"
  on public.business_facts for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No shared "touch updated_at" trigger function exists in this database
-- (checked live — the one referenced in older migration files isn't
-- actually present), so updated_at is set explicitly by application code
-- on every update rather than depending on one.
