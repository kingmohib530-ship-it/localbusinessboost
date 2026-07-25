alter table public.profiles
  add column accept_consumer_leads boolean not null default true;
