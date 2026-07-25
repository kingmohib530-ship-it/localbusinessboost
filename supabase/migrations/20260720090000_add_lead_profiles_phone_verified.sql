-- Twilio Lookup verification result for the lead's phone number. Leads
-- that fail verification are discarded before insert, so any row that
-- does exist with phone_verified = false is a rare edge case (e.g. Twilio
-- Lookup was unreachable) rather than a routinely-stored failure.
alter table public.lead_profiles add column phone_verified boolean;
