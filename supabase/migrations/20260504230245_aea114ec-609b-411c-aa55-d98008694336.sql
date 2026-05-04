
revoke execute on function public.try_consume_generation(uuid, integer) from public, anon, authenticated;
grant execute on function public.try_consume_generation(uuid, integer) to service_role;
