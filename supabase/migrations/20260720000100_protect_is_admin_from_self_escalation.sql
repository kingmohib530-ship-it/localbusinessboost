-- The "Users can update own profile" RLS policy has no column-level
-- restriction, so any authenticated user could previously flip their own
-- is_admin to true via a direct client update. A trigger is the standard,
-- non-racy way to freeze a single column regardless of which policy let
-- the UPDATE through — it silently reverts is_admin unless the request
-- comes in as service_role (i.e. a trusted server-side path).
create or replace function private.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if auth.role() <> 'service_role' then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_admin_trigger on public.profiles;
create trigger protect_is_admin_trigger
  before update on public.profiles
  for each row execute function private.protect_is_admin();
