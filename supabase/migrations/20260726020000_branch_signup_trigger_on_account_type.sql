-- handle_new_user() now branches on the new signup's account_type
-- (passed as auth.signUp() metadata) so a consumer signup creates a
-- consumer_profiles row instead of a business profiles row. Default (no
-- account_type, or anything other than 'consumer') keeps the exact prior
-- behavior, since every existing business signup call site never sends
-- this field - verified in an isolated BEGIN/ROLLBACK transaction against
-- this same live schema before applying for real.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data->>'account_type' = 'consumer' then
    insert into public.consumer_profiles (id, full_name)
    values (new.id, new.raw_user_meta_data->>'full_name');
  else
    insert into public.profiles (id, full_name)
    values (new.id, new.raw_user_meta_data->>'full_name');
  end if;
  return new;
end;
$$;
