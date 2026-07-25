create table public.lead_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  owner_name text,
  phone text,
  email text,
  website text,
  address text,
  city text,
  state text,
  zip text,
  industry text,
  company_size text,
  annual_revenue_estimate text,
  google_rating numeric(2,1),
  google_review_count integer,
  has_website boolean default true,
  website_quality text,
  has_google_business boolean,
  last_google_post date,
  social_media jsonb,
  pain_signals jsonb,
  data_source text,
  lead_score integer default 0,
  status text default 'new' check (status in ('new','contacted','responded','qualified','scheduled','nurture','dead')),
  priority text default 'medium' check (priority in ('hot','warm','cold','medium')),
  ai_research_summary text,
  personalized_opening_line text,
  outreach_history jsonb default '[]'::jsonb,
  -- Tracks the corresponding Monday.com board item so status/field changes
  -- sync as updates to the same item instead of creating duplicates.
  monday_item_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_lead_profiles_user_status on public.lead_profiles(user_id, status);

alter table public.lead_profiles enable row level security;

create policy "Users manage own lead profiles"
  on public.lead_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.lead_sequences (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.lead_profiles(id) on delete cascade,
  step_number integer not null,
  channel text not null check (channel in ('sms','email','voicemail_drop','linkedin')),
  delay_hours integer not null,
  message_template text not null,
  status text default 'pending' check (status in ('pending','sent','responded','failed')),
  sent_at timestamptz
);

alter table public.lead_sequences enable row level security;

create policy "Users manage own lead sequences"
  on public.lead_sequences for all
  using (exists (
    select 1 from public.lead_profiles lp
    where lp.id = lead_sequences.lead_id and lp.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.lead_profiles lp
    where lp.id = lead_sequences.lead_id and lp.user_id = auth.uid()
  ));
