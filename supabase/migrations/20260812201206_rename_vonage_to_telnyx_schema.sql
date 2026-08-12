-- Vonage's own account-level integration never got past a persistent,
-- unresolved 401 (credentials proven correct multiple times, still
-- rejected, ticket open with Vonage support) - no business ever actually
-- provisioned a number through it, confirmed empty above. Renaming rather
-- than drop-and-recreate since the underlying architecture (platform-owned
-- number, contractor confirms their real line) is unchanged - only the
-- provider is swapping.

alter table public.profiles
  rename column vonage_number to telnyx_number;
alter table public.profiles
  rename column vonage_number_provisioned_at to telnyx_number_provisioned_at;

comment on column public.profiles.telnyx_number is 'Lanavix-owned Telnyx number auto-provisioned for this business. System-assigned only, see protect_telnyx_number_columns.';
comment on column public.profiles.telnyx_number_provisioned_at is 'Set only after a live Telnyx number order actually completes.';

alter index if exists profiles_vonage_number_unique rename to profiles_telnyx_number_unique;

drop trigger if exists protect_vonage_number_columns_trigger on public.profiles;
drop function if exists public.protect_vonage_number_columns();

create or replace function public.protect_telnyx_number_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if new.telnyx_number is distinct from old.telnyx_number
       or new.telnyx_number_provisioned_at is distinct from old.telnyx_number_provisioned_at
    then
      raise exception 'Telnyx number assignment can only be changed by the provisioning flow.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_telnyx_number_columns() from public;
revoke execute on function public.protect_telnyx_number_columns() from anon, authenticated;

create trigger protect_telnyx_number_columns_trigger
before update on public.profiles
for each row
execute function public.protect_telnyx_number_columns();

alter table public.unmatched_vonage_webhooks rename to unmatched_telnyx_webhooks;
alter index if exists unmatched_vonage_webhooks_pkey rename to unmatched_telnyx_webhooks_pkey;
