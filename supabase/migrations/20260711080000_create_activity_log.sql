create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  summary text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_user_id_created_at_idx
  on public.activity_log (user_id, created_at desc);

alter table public.activity_log enable row level security;

create policy "Users can view own activity"
  on public.activity_log for select
  using (auth.uid() = user_id);

create policy "Service role can manage activity"
  on public.activity_log for all
  using (auth.role() = 'service_role');
