DROP POLICY IF EXISTS "Public can read chatbot settings" ON public.chatbot_settings;

REVOKE EXECUTE ON FUNCTION public.try_consume_generation(uuid, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.try_consume_weekly_plan(uuid, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

GRANT EXECUTE ON FUNCTION public.try_consume_generation(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.try_consume_weekly_plan(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO service_role;