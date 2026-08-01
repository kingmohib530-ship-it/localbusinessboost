-- Foundation for consumer-facing service requests: a real person can
-- request a service (e.g. "I need a plumber") and get matched to Lanavix
-- business customers who review and accept before any contact happens.
-- This is a different shape from the existing SMS marketplace
-- (consumer-inbound.ts), which auto-books the single best match instantly
-- with no review step - here a request fans out to a handful of matched
-- businesses and the first to accept gets it.

-- Consumers share the same auth.users table as business owners (one
-- Supabase Auth, not a parallel system), but get their own profile table
-- instead of a row in the business-shaped `profiles` table. See the
-- companion migration that branches handle_new_user() on signup metadata.
create table public.consumer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.consumer_profiles enable row level security;

create policy "Consumers manage own profile"
  on public.consumer_profiles for all
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- A consumer's request. Creation and matching both happen server-side
-- (POST /api/consumer-requests) in one step, since matching needs a
-- cross-business view of profiles that RLS wouldn't grant a consumer
-- directly - so there's no direct-client-insert policy here, only
-- select/update for the consumer's own rows.
create table public.consumer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_type text not null,
  city text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined_all', 'cancelled')),
  accepted_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_consumer_requests_user on public.consumer_requests(user_id);
create index idx_consumer_requests_accepted_user on public.consumer_requests(accepted_user_id);

alter table public.consumer_requests enable row level security;

create policy "Consumers cancel own pending requests"
  on public.consumer_requests for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status = 'cancelled');

-- One row per business a request was fanned out to (top few by
-- lanavix_score, same eligibility filter the SMS marketplace already
-- uses: verified/pro/elite + accept_consumer_leads). First accept wins;
-- siblings flip to 'superseded'. All writes to this table go through the
-- atomic accept/decline server endpoint (service role), never a direct
-- client write - two businesses accepting at once is a real race, and a
-- naive read-then-write from the client can't prevent that.
create table public.consumer_request_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.consumer_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create index idx_consumer_request_matches_user_status on public.consumer_request_matches(user_id, status);
create index idx_consumer_request_matches_request on public.consumer_request_matches(request_id);

alter table public.consumer_request_matches enable row level security;

-- Both requests and matches need "owner OR matched/matching counterpart"
-- read access, so each gets one combined policy (rather than two separate
-- permissive policies, which the Supabase performance advisor flags as
-- needless per-row overhead) referencing the other table now that both
-- exist.
create policy "View own or matched requests"
  on public.consumer_requests for select
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.consumer_request_matches m
      where m.request_id = consumer_requests.id
        and m.user_id = (select auth.uid())
    )
  );

create policy "View own matches or matches on own requests"
  on public.consumer_request_matches for select
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.consumer_requests r
      where r.id = consumer_request_matches.request_id
        and r.user_id = (select auth.uid())
    )
  );
