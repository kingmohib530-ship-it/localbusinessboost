-- The existing "Users can update own profile" RLS policy has no column
-- granularity - a contractor's own authenticated client can PATCH ANY
-- column on their row, including these four. Left unguarded, that would
-- let someone bypass the live-verify-then-save flow entirely, or worse,
-- write an arbitrary UUID into twilio_auth_token_secret_id (pointing their
-- own profile at a DIFFERENT business's vault secret, and having every
-- send/verify use that stolen Auth Token). This trigger blocks changes to
-- the four Twilio credential columns from anything except the service-role
-- client (i.e. only via the set_business_twilio_credentials RPC) - every
-- other profile column an existing page updates directly from the browser
-- is completely unaffected.
create or replace function public.protect_twilio_credential_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if new.twilio_account_sid is distinct from old.twilio_account_sid
       or new.twilio_auth_token_secret_id is distinct from old.twilio_auth_token_secret_id
       or new.twilio_phone_number is distinct from old.twilio_phone_number
       or new.twilio_verified_at is distinct from old.twilio_verified_at
    then
      raise exception 'Twilio credentials can only be changed through the verified connect flow.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_twilio_credential_columns() from public;
revoke execute on function public.protect_twilio_credential_columns() from anon, authenticated;

drop trigger if exists protect_twilio_credential_columns_trigger on public.profiles;
create trigger protect_twilio_credential_columns_trigger
before update on public.profiles
for each row
execute function public.protect_twilio_credential_columns();

-- Two businesses claiming the same Twilio number would make routing
-- ambiguous (get_business_twilio_by_number just picks one). Enforce
-- uniqueness at the database level rather than relying on application
-- code alone.
create unique index if not exists profiles_twilio_phone_number_unique
  on public.profiles (twilio_phone_number)
  where twilio_phone_number is not null;
