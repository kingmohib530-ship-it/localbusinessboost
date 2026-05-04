
create table if not exists public.generation_usage (
  user_id uuid not null,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.generation_usage enable row level security;

create policy "Users can view own usage"
  on public.generation_usage for select
  using (auth.uid() = user_id);

create policy "Service role manages usage"
  on public.generation_usage for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.try_consume_generation(user_uuid uuid, daily_cap integer)
returns table(allowed boolean, used integer, cap integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'utc')::date;
  current_count integer;
begin
  -- Unlimited plans
  if daily_cap is null or daily_cap < 0 then
    insert into public.generation_usage (user_id, day, count)
    values (user_uuid, today, 1)
    on conflict (user_id, day)
    do update set count = public.generation_usage.count + 1, updated_at = now()
    returning count into current_count;
    return query select true, current_count, daily_cap;
    return;
  end if;

  insert into public.generation_usage (user_id, day, count)
  values (user_uuid, today, 0)
  on conflict (user_id, day) do nothing;

  select count into current_count
  from public.generation_usage
  where user_id = user_uuid and day = today
  for update;

  if current_count >= daily_cap then
    return query select false, current_count, daily_cap;
    return;
  end if;

  update public.generation_usage
  set count = count + 1, updated_at = now()
  where user_id = user_uuid and day = today
  returning count into current_count;

  return query select true, current_count, daily_cap;
end;
$$;

grant execute on function public.try_consume_generation(uuid, integer) to authenticated, service_role;
