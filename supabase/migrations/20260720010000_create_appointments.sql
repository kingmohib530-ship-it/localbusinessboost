create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  service_type text not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','completed','cancelled','no_show')),
  estimated_value integer check (estimated_value is null or estimated_value >= 0),
  notes text,
  source text not null default 'manual' check (source in ('manual','inbound_sms','lead_blast','consumer_marketplace','web_chat')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_appointments_user_scheduled on public.appointments (user_id, scheduled_at);

alter table public.appointments enable row level security;

create policy "Users can view own appointments"
  on public.appointments for select
  using (auth.uid() = user_id);

create policy "Users can insert own appointments"
  on public.appointments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own appointments"
  on public.appointments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own appointments"
  on public.appointments for delete
  using (auth.uid() = user_id);

alter table public.sms_conversations
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null;
