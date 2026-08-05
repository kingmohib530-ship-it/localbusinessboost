-- AI Sales Follow-Up: tracks a quote/estimate given through the AI
-- receptionist (missed-call text-back today, web chat once phone capture
-- exists) that didn't turn into a booking, and the scheduled Day 1/5/14
-- nudges that follow up on it. Mirrors the lead_profiles/lead_sequences
-- one-to-many shape from the Lead Generator, scoped to a conversation
-- instead of a standalone lead.

create table if not exists public.quote_follow_ups (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_type text,
  -- The actual number stated in the conversation, never an estimate we
  -- invent - null when a quote was clearly given but no specific figure
  -- was stated (e.g. "depends on the job, but usually $200-400").
  quoted_price integer,
  quoted_at timestamptz not null default now(),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_follow_ups_status_check
    check (status = any (array['active', 'booked', 'cancelled', 'completed'])),
  constraint quote_follow_ups_quoted_price_check
    check (quoted_price is null or quoted_price >= 0)
);

-- Only one active follow-up per conversation at a time - if detectQuote
-- fires again on a later message in the same still-unbooked
-- conversation, this constraint (not a hand-rolled check-then-insert)
-- is what actually prevents a duplicate sequence from being created.
create unique index if not exists quote_follow_ups_one_active_per_conversation
  on public.quote_follow_ups (conversation_id)
  where status = 'active';

create index if not exists quote_follow_ups_user_id_idx on public.quote_follow_ups (user_id);

alter table public.quote_follow_ups enable row level security;

create policy "Users manage own quote follow-ups"
  on public.quote_follow_ups
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.quote_follow_up_steps (
  id uuid primary key default gen_random_uuid(),
  follow_up_id uuid not null references public.quote_follow_ups(id) on delete cascade,
  day_offset integer not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  -- The exact text actually sent, filled in once the step sends - kept
  -- here (not just derived from a template at read time) so the
  -- dashboard shows what really went out, matching how
  -- conversation_messages stores real sent text rather than a template.
  sent_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint quote_follow_up_steps_day_offset_check check (day_offset = any (array[1, 5, 14])),
  constraint quote_follow_up_steps_status_check
    check (status = any (array['pending', 'sent', 'skipped', 'cancelled', 'failed'])),
  constraint quote_follow_up_steps_one_per_day unique (follow_up_id, day_offset)
);

create index if not exists quote_follow_up_steps_due_idx
  on public.quote_follow_up_steps (scheduled_for)
  where status = 'pending';

alter table public.quote_follow_up_steps enable row level security;

-- No direct user_id column on this table - same shape as the existing
-- lead_sequences/lead_profiles relationship, an EXISTS check against the
-- parent row rather than a denormalized owner column.
create policy "Users manage own quote follow-up steps"
  on public.quote_follow_up_steps
  for all
  to authenticated
  using (
    exists (
      select 1 from public.quote_follow_ups qfu
      where qfu.id = quote_follow_up_steps.follow_up_id
        and qfu.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.quote_follow_ups qfu
      where qfu.id = quote_follow_up_steps.follow_up_id
        and qfu.user_id = (select auth.uid())
    )
  );
