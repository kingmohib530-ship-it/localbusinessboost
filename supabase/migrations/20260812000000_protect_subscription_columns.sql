-- profiles.is_admin and the Twilio credential columns already have a
-- BEFORE UPDATE trigger blocking any non-service_role write to them
-- (protect_is_admin_trigger, protect_twilio_credential_columns_trigger).
-- The "Users can update own profile" RLS policy is row-level only
-- (auth.uid() = id) - it does not restrict which columns a permitted
-- update can touch, so nothing was stopping a contractor from writing
-- subscription_tier/subscription_status directly via a client-side
-- update() call and granting themselves a paid plan for free, bypassing
-- Stripe and the webhook entirely. Same pattern as the two existing
-- triggers, extended to the five subscription-related columns.
create or replace function public.protect_subscription_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.role() <> 'service_role' then
    if new.subscription_tier is distinct from old.subscription_tier
       or new.subscription_status is distinct from old.subscription_status
       or new.stripe_customer_id is distinct from old.stripe_customer_id
       or new.stripe_subscription_id is distinct from old.stripe_subscription_id
       or new.subscription_period_end is distinct from old.subscription_period_end
    then
      raise exception 'Subscription fields can only be changed by the Stripe webhook.';
    end if;
  end if;
  return new;
end;
$function$;

create trigger protect_subscription_columns_trigger
  before update on public.profiles
  for each row
  execute function public.protect_subscription_columns();

-- Matches protect_twilio_credential_columns's existing grants: a trigger
-- function has no legitimate reason to be callable directly over PostgREST
-- RPC (it only makes sense invoked automatically during a row update), so
-- close that off the same way rather than leaving it open like
-- protect_is_admin's default grants (that one is safe anyway since it
-- lives in the private schema, which PostgREST never exposes).
--
-- Has to revoke from PUBLIC specifically, not just anon/authenticated -
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, and anon/
-- authenticated inherit through PUBLIC membership regardless of any
-- revoke aimed only at them directly (confirmed live: revoking from
-- anon/authenticated alone left proacl still holding the PUBLIC entry
-- and has_function_privilege() still returning true for both).
revoke execute on function public.protect_subscription_columns() from public;
