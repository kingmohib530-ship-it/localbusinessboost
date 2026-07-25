create table public.conversation_intelligence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references auth.users(id) on delete cascade,
  consumer_phone text,
  service_type text,
  location_zip text,
  price_mentioned integer,
  urgency_level text check (urgency_level in ('emergency','same_day','this_week','scheduled')),
  outcome text check (outcome in ('booked','declined','no_response','rescheduled','quoted')),
  time_to_book_minutes integer,
  source_channel text check (source_channel in ('inbound_sms','lead_blast','consumer_marketplace','web_chat')),
  ai_confidence_score numeric(3,2),
  created_at timestamptz default now()
);

alter table public.conversation_intelligence enable row level security;

create policy "Users can view own conversation intelligence"
  on public.conversation_intelligence for select
  using (auth.uid() = business_id);

create policy "Users can insert own conversation intelligence"
  on public.conversation_intelligence for insert
  with check (auth.uid() = business_id);

create policy "Users can update own conversation intelligence"
  on public.conversation_intelligence for update
  using (auth.uid() = business_id)
  with check (auth.uid() = business_id);

create policy "Users can delete own conversation intelligence"
  on public.conversation_intelligence for delete
  using (auth.uid() = business_id);
