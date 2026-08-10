-- Removes the consumer marketplace entirely: both entry points (the SMS
-- flow in consumer-inbound.ts and the web /request flow), a deliberate
-- product decision to focus entirely on contractors. All four tables have
-- zero rows live - no real consumer account or request ever existed - so
-- this is a clean removal, not a data migration.

-- consumer_requests' "View own or matched requests" SELECT policy
-- references consumer_request_matches in an EXISTS clause, and vice
-- versa - CASCADE here only drops that mutual policy dependency between
-- two tables already being removed together, not anything external.
drop table if exists public.consumer_marketplace_messages;
drop table if exists public.consumer_request_matches cascade;
drop table if exists public.consumer_requests cascade;
drop table if exists public.consumer_profiles;

-- lanavix_score and its three component columns existed only to rank
-- businesses for consumer-marketplace matching (consumer-inbound.ts,
-- consumerRequests.server.ts) and were computed only by the now-removed
-- api/admin/update-scores.ts. accept_consumer_leads gated whether a
-- business's profile was eligible to be matched at all. Nothing else in
-- the app reads any of these.
alter table public.profiles
  drop column if exists accept_consumer_leads,
  drop column if exists lanavix_score,
  drop column if exists response_speed_avg_minutes,
  drop column if exists booking_completion_rate,
  drop column if exists consumer_rating_avg;

-- 'consumer_marketplace' was a valid source/channel value for appointments
-- and conversation_intelligence rows created by the SMS marketplace flow.
-- No existing row uses it (both tables are empty), so this only narrows
-- what future rows can claim.
alter table public.appointments drop constraint appointments_source_check;
alter table public.appointments add constraint appointments_source_check
  check (source = any (array['manual', 'inbound_sms', 'lead_blast', 'web_chat']));

alter table public.conversation_intelligence drop constraint conversation_intelligence_source_channel_check;
alter table public.conversation_intelligence add constraint conversation_intelligence_source_channel_check
  check (source_channel = any (array['inbound_sms', 'lead_blast', 'web_chat']));

-- handle_new_user() (the on_auth_user_created trigger on auth.users, live
-- -only per the migrations-drift note in CLAUDE.md) used to branch on
-- raw_user_meta_data->>'account_type' to create a consumer_profiles row
-- instead of a profiles row. There's no consumer signup path left to send
-- that value, so this reverts to the simple, unconditional insert every
-- business signup already relied on before the branch existed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$function$;
