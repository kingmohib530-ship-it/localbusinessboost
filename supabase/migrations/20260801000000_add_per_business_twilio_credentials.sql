-- Per-business Twilio credentials, encrypted at rest via Supabase Vault.
-- The Auth Token is the actual secret (grants send/receive/billing access on
-- that Twilio account); the Account SID and phone number are identifiers,
-- not secrets, so they stay plaintext like the existing twilio_phone_number
-- column.
alter table public.profiles
  add column if not exists twilio_account_sid text,
  add column if not exists twilio_auth_token_secret_id uuid references vault.secrets(id) on delete set null,
  add column if not exists twilio_verified_at timestamptz;

comment on column public.profiles.twilio_account_sid is 'Business''s own Twilio Account SID (identifier, not secret).';
comment on column public.profiles.twilio_auth_token_secret_id is 'Pointer to the Vault-encrypted Twilio Auth Token; the token text itself is never stored in this table.';
comment on column public.profiles.twilio_verified_at is 'Set only after a live Twilio API call confirms the saved credentials actually authenticate.';

-- A text lands on a "To" number that doesn't match any connected business
-- (stale number, ported away, misconfigured forwarding, or an unmatched
-- signature). Logged here instead of silently discarded so it's visible
-- somewhere real. Every insert here is from server-side webhook handlers
-- using the service-role client, which bypasses RLS on writes; RLS below
-- only governs who can ever *read* this diagnostic table.
create table public.unmatched_twilio_webhooks (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  to_number text not null,
  from_number text not null,
  received_at timestamptz not null default now()
);

alter table public.unmatched_twilio_webhooks enable row level security;

create policy "Admins can view unmatched webhooks"
  on public.unmatched_twilio_webhooks
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
      and profiles.is_admin = true
    )
  );

-- ── SECURITY DEFINER RPC wrappers around Vault ─────────────────────────
-- Same posture as the existing check_rate_limit/check_anon_rate_limit
-- functions: search_path pinned, EXECUTE revoked from PUBLIC and granted
-- only to service_role, so only server-side code using the admin client
-- can ever reach these — never the anon/authenticated client the browser
-- uses. (Supabase also auto-grants EXECUTE on new public-schema functions
-- to anon/authenticated separately from PUBLIC — see the follow-up
-- migration that explicitly revokes those too.)

create or replace function public.set_business_twilio_credentials(
  p_user_id uuid,
  p_account_sid text,
  p_auth_token text,
  p_phone_number text
) returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_id uuid;
begin
  select twilio_auth_token_secret_id into v_secret_id
  from public.profiles
  where id = p_user_id;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_auth_token,
      'twilio_auth_token:' || p_user_id::text,
      'Twilio Auth Token for business ' || p_user_id::text
    );
  else
    perform vault.update_secret(v_secret_id, p_auth_token);
  end if;

  update public.profiles
  set twilio_account_sid = p_account_sid,
      twilio_auth_token_secret_id = v_secret_id,
      twilio_phone_number = p_phone_number,
      twilio_verified_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.set_business_twilio_credentials(uuid, text, text, text) from public;
grant execute on function public.set_business_twilio_credentials(uuid, text, text, text) to service_role;

create or replace function public.get_business_twilio_credentials(p_user_id uuid)
returns table(account_sid text, auth_token text, phone_number text)
language sql
security definer
set search_path = public, vault
as $$
  select p.twilio_account_sid, s.decrypted_secret, p.twilio_phone_number
  from public.profiles p
  left join vault.decrypted_secrets s on s.id = p.twilio_auth_token_secret_id
  where p.id = p_user_id;
$$;

revoke all on function public.get_business_twilio_credentials(uuid) from public;
grant execute on function public.get_business_twilio_credentials(uuid) to service_role;

create or replace function public.get_business_twilio_by_number(p_phone_number text)
returns table(user_id uuid, account_sid text, auth_token text)
language sql
security definer
set search_path = public, vault
as $$
  select p.id, p.twilio_account_sid, s.decrypted_secret
  from public.profiles p
  left join vault.decrypted_secrets s on s.id = p.twilio_auth_token_secret_id
  where p.twilio_phone_number = p_phone_number
  limit 1;
$$;

revoke all on function public.get_business_twilio_by_number(text) from public;
grant execute on function public.get_business_twilio_by_number(text) to service_role;
