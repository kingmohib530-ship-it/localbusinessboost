create table if not exists public.weekly_plan_usage (
  user_id uuid not null,
  week_start date not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_plan_usage enable row level security;

create policy "Users can view own weekly plan usage"
on public.weekly_plan_usage
for select
using (auth.uid() = user_id);

create policy "Service role manages weekly plan usage"
on public.weekly_plan_usage
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.try_consume_weekly_plan(user_uuid uuid, weekly_cap integer)
returns table(allowed boolean, used integer, cap integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  -- ISO week start (Monday) in UTC
  wk_start date := (date_trunc('week', (now() at time zone 'utc')))::date;
  current_count integer;
begin
  if weekly_cap is null or weekly_cap < 0 then
    insert into public.weekly_plan_usage (user_id, week_start, count)
    values (user_uuid, wk_start, 1)
    on conflict (user_id, week_start)
    do update set count = public.weekly_plan_usage.count + 1, updated_at = now()
    returning count into current_count;
    return query select true, current_count, weekly_cap;
    return;
  end if;

  insert into public.weekly_plan_usage (user_id, week_start, count)
  values (user_uuid, wk_start, 0)
  on conflict (user_id, week_start) do nothing;

  select count into current_count
  from public.weekly_plan_usage
  where user_id = user_uuid and week_start = wk_start
  for update;

  if current_count >= weekly_cap then
    return query select false, current_count, weekly_cap;
    return;
  end if;

  update public.weekly_plan_usage
  set count = count + 1, updated_at = now()
  where user_id = user_uuid and week_start = wk_start
  returning count into current_count;

  return query select true, current_count, weekly_cap;
end;
$function$;