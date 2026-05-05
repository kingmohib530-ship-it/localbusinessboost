revoke execute on function public.try_consume_weekly_plan(uuid, integer) from public, anon, authenticated;
grant execute on function public.try_consume_weekly_plan(uuid, integer) to service_role;