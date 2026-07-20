-- Lets each business claim the Twilio number that routes to them, so
-- inbound missed-call webhooks can match the right profile instead of
-- grabbing an arbitrary one.
alter table public.profiles add column twilio_phone_number text;

create unique index profiles_twilio_phone_number_idx
  on public.profiles (twilio_phone_number)
  where twilio_phone_number is not null;
