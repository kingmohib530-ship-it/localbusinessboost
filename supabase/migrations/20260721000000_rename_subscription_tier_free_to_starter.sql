-- The Starter/Solo/Crew/Empire tier rename (this session) replaced the old
-- free/pro/agency naming in code (webhook.ts, pricing.tsx) but left
-- existing rows and the column default on the old "free" name.
update public.profiles set subscription_tier = 'starter' where subscription_tier = 'free';
alter table public.profiles alter column subscription_tier set default 'starter';
