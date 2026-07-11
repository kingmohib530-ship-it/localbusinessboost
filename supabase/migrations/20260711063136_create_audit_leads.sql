create table if not exists public.audit_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  business_name text,
  industry text,
  city text,
  website_url text,
  overall_score integer,
  revenue_opportunity text,
  created_at timestamptz not null default now()
);

alter table public.audit_leads enable row level security;
