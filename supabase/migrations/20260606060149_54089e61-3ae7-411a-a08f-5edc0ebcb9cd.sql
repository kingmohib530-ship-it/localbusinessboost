
revoke execute on function public.is_org_member(uuid, uuid) from public, anon;
revoke execute on function public.has_org_role(uuid, uuid, public.org_role) from public, anon;
revoke execute on function public.get_user_org_ids(uuid) from public, anon;

grant execute on function public.is_org_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.has_org_role(uuid, uuid, public.org_role) to authenticated, service_role;
grant execute on function public.get_user_org_ids(uuid) to authenticated, service_role;
