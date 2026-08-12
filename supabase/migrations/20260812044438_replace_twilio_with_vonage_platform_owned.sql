-- Replaces the per-business Twilio Vault credential architecture with a
-- platform-owned Vonage model: Lanavix holds one Vonage account and
-- auto-provisions a dedicated number per business, rather than each
-- business bringing their own Twilio account. There is nothing left for a
-- business to authenticate with, so there is nothing left to encrypt.

-- Purge the actual encrypted secrets before dropping the pointer column -
-- dropping profiles.twilio_auth_token_secret_id alone would silently
-- orphan the encrypted row in vault.secrets rather than remove it. This
-- Vault install has no vault.delete_secret() helper (only create_secret/
-- update_secret), so delete the row directly. No-op today (confirmed via
-- direct query: no profile has ever had Twilio credentials set), but this
-- is the correct sequencing regardless of whether there happens to be
-- data right now.
delete from vault.secrets
where id in (
  select twilio_auth_token_secret_id
  from public.profiles
  where twilio_auth_token_secret_id is not null
);

drop trigger if exists protect_twilio_credential_columns_trigger on public.profiles;
drop function if exists public.protect_twilio_credential_columns();

drop function if exists public.set_business_twilio_credentials(uuid, text, text, text);
drop function if exists public.get_business_twilio_credentials(uuid);
drop function if exists public.get_business_twilio_by_number(text);

drop index if exists public.profiles_twilio_phone_number_unique;

alter table public.profiles
  drop column if exists twilio_account_sid,
  drop column if exists twilio_auth_token_secret_id,
  drop column if exists twilio_phone_number,
  drop column if exists twilio_verified_at;

-- ── New platform-owned schema ──────────────────────────────────────────
-- Nothing here is a secret: forwarding_phone_number is the contractor's
-- own real business line (same posture as the existing owner_phone
-- column), and vonage_number is a Lanavix-owned number, not a credential.
-- Plain columns, no Vault.

alter table public.profiles
  add column if not exists forwarding_phone_number text,
  add column if not exists vonage_number text,
  add column if not exists vonage_number_provisioned_at timestamptz;

comment on column public.profiles.forwarding_phone_number is 'Contractor''s real business line, forwarded (on no-answer/busy) to their assigned vonage_number. Not a secret - directly user-editable.';
comment on column public.profiles.vonage_number is 'Lanavix-owned Vonage number auto-provisioned for this business. System-assigned only, see protect_vonage_number_columns.';
comment on column public.profiles.vonage_number_provisioned_at is 'Set only after a live Vonage Numbers API call actually provisions the number.';

create unique index if not exists profiles_vonage_number_unique
  on public.profiles (vonage_number)
  where vonage_number is not null;

-- Same posture as the old protect_twilio_credential_columns trigger, minus
-- the Vault interaction: vonage_number/vonage_number_provisioned_at are
-- system-assigned by the provisioning flow, not user-editable directly -
-- the existing "Users can update own profile" RLS policy has no column
-- granularity, so without this a contractor's own authenticated client
-- could PATCH these to claim/fake a number assignment.
create or replace function public.protect_vonage_number_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if new.vonage_number is distinct from old.vonage_number
       or new.vonage_number_provisioned_at is distinct from old.vonage_number_provisioned_at
    then
      raise exception 'Vonage number assignment can only be changed by the provisioning flow.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_vonage_number_columns() from public;
revoke execute on function public.protect_vonage_number_columns() from anon, authenticated;

drop trigger if exists protect_vonage_number_columns_trigger on public.profiles;
create trigger protect_vonage_number_columns_trigger
before update on public.profiles
for each row
execute function public.protect_vonage_number_columns();

-- Same diagnostic purpose as unmatched_twilio_webhooks: an inbound webhook
-- whose "to" number doesn't match any profiles.vonage_number (stale
-- config, a released number, or an unmatched signature).
alter table public.unmatched_twilio_webhooks rename to unmatched_vonage_webhooks;
alter index if exists unmatched_twilio_webhooks_pkey rename to unmatched_vonage_webhooks_pkey;
