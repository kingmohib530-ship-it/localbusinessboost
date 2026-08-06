-- profiles.onboarding_completed already exists live (no local migration
-- record for it - same drift this repo's other tables have had, see
-- CLAUDE.md) but no application code has ever read or written it, so every
-- account defaults to false regardless of how set up it actually is. The
-- new onboarding wizard is about to start redirecting on this flag, so
-- backfill it for accounts that already show real usage - a confirmed
-- Google listing or Twilio connection, a synced business fact, or an
-- actual conversation - so the wizard only ever greets accounts that
-- genuinely haven't done this yet, not ones already working.
update public.profiles p
set onboarding_completed = true
where onboarding_completed = false
  and (
    (p.business_name is not null and p.business_name <> '')
    or p.google_place_id is not null
    or p.twilio_account_sid is not null
    or exists (select 1 from public.business_facts f where f.user_id = p.id)
    or exists (select 1 from public.conversations c where c.user_id = p.id)
  );
