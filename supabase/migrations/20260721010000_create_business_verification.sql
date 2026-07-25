-- Business verification schema. `accepts_consumer_marketplace` from the
-- spec is intentionally NOT added as a new column — profiles already has
-- `accept_consumer_leads` (added in the Phase 3 consumer marketplace work)
-- serving the exact same purpose; a second overlapping column would be
-- confusing tech debt. The onboarding flow's "Accept consumer marketplace
-- leads" toggle binds to the existing column instead.

alter table public.profiles
  add column verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','verified','pro','elite')),
  add column verification_submitted_at timestamptz,
  add column verification_reviewed_at timestamptz,
  add column verification_notes text,
  add column license_number text,
  add column license_state text,
  add column insurance_carrier text,
  add column insurance_policy_number text,
  add column ein_number text,
  add column business_address text,
  add column business_zip text,
  add column years_in_business integer,
  add column team_size text check (team_size in ('solo','2-5','6-10','11-20','20+')),
  add column emergency_hours boolean not null default false,
  add column price_range_low integer,
  add column price_range_high integer,
  add column price_unit text not null default 'per_job'
    check (price_unit in ('per_job','per_hour','per_sqft')),
  add column quote_required boolean not null default true;

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in (
    'business_license','insurance_certificate','photo_id',
    'business_card','website_screenshot','utility_bill','other'
  )),
  storage_path text not null,
  file_name text,
  file_size integer,
  mime_type text,
  uploaded_at timestamptz default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes text
);

alter table public.verification_documents enable row level security;

create policy "Users manage own verification documents"
  on public.verification_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all verification documents"
  on public.verification_documents for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create policy "Admins update all verification documents"
  on public.verification_documents for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- Storage: private bucket for verification documents. Users upload to a
-- folder keyed by their own user id (storage_path convention:
-- "<user_id>/<filename>"); admins can read everything for review.
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

create policy "Users upload own verification docs"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own verification docs"
  on storage.objects for select
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own verification docs"
  on storage.objects for delete
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admins read all verification docs"
  on storage.objects for select
  using (
    bucket_id = 'verification-docs'
    and exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );
