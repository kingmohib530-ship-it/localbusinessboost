create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  email text,
  phone text,
  message text,
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;
