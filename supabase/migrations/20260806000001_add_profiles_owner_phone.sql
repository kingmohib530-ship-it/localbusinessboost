-- The Coach Daily Brief's SMS teaser needs a real phone number to send to,
-- and none existed anywhere: signup never collects one, and
-- profiles.twilio_phone_number is the business's own outbound number for
-- texting customers, not a destination for notifying the owner.

alter table public.profiles
  add column if not exists owner_phone text;

comment on column public.profiles.owner_phone is 'The business owner''s own phone number, used only to send the Coach Daily Brief SMS teaser when daily_brief_channel is sms or both. Not collected at signup - starts null, so SMS delivery is skipped until a contractor sets it.';
