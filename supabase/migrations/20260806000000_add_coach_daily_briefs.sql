-- Coach / Daily Brief: per-business timezone + notification preferences,
-- plus the daily_briefs history table itself.

alter table public.profiles
  add column if not exists timezone text not null default 'America/New_York',
  add column if not exists daily_brief_enabled boolean not null default true,
  add column if not exists daily_brief_channel text not null default 'email'
    check (daily_brief_channel = any (array['email', 'sms', 'both', 'none']));

comment on column public.profiles.timezone is 'IANA timezone used to decide when this business''s local morning is, for the Coach Daily Brief cron. Defaults to America/New_York (Lanavix''s current DMV focus) since there is no per-business timezone picker yet.';
comment on column public.profiles.daily_brief_enabled is 'Opt-out switch for the Coach Daily Brief push (email/SMS). The Coach page itself is always available regardless of this setting.';
comment on column public.profiles.daily_brief_channel is 'Delivery channel for the Daily Brief push: full brief by email, a short teaser by SMS, both, or none (in-app only).';

create table public.daily_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief_date date not null,
  generated_at timestamptz not null default now(),
  timezone text not null,
  delivery_method text not null check (delivery_method = any (array['email', 'sms', 'both', 'none'])),
  delivery_status text not null default 'pending'
    check (delivery_status = any (array['pending', 'sent', 'failed', 'skipped'])),
  brief_payload jsonb not null,
  opened_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, brief_date)
);

comment on table public.daily_briefs is 'One row per business per local calendar day. brief_payload is the generated card list, persisted at generation time and never regenerated on view - this table is Coach''s history, not a cache.';
comment on column public.daily_briefs.brief_date is 'The local calendar date (in this business''s timezone) this brief is for. Unique with user_id so the cron can never create a duplicate for the same business on the same local day.';
comment on column public.daily_briefs.timezone is 'Snapshot of the business''s timezone at generation time, independent of profiles.timezone which may change later.';
comment on column public.daily_briefs.delivery_method is 'The channel actually used for this specific brief (may differ from the current profiles.daily_brief_channel if that setting changed after this brief was sent).';

create index daily_briefs_user_id_idx on public.daily_briefs (user_id);

alter table public.daily_briefs enable row level security;

-- Same single-policy shape as every other per-business table (quote_follow_ups,
-- business_facts, appointments, etc). Only the cron (service-role client)
-- ever inserts; contractors can read their own history and update
-- opened_at/dismissed_at directly from the Coach page.
create policy "Users manage own daily briefs"
  on public.daily_briefs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
