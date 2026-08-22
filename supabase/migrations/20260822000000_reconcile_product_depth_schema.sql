-- Reconciliation migration: the Product Depth work on the
-- integration/2026-redesign-current-main branch was applied directly to
-- the live database via the Supabase MCP server (see CLAUDE.md's note on
-- migration-folder drift) and never got a corresponding migration file.
-- This file records that already-live schema for the repo's history - it
-- does not change production, since every statement is a no-op there
-- (if not exists / if not exists). All nullable/FK/index shapes below are
-- copied exactly from the live database, confirmed via the Supabase MCP
-- server before writing this file.

alter table public.appointments
  add column if not exists conversation_id uuid
  references public.conversations(id) on delete set null;

create index if not exists appointments_conversation_id_idx
  on public.appointments (conversation_id)
  where conversation_id is not null;

alter table public.review_requests
  add column if not exists appointment_id uuid
    references public.appointments(id) on delete set null,
  add column if not exists claimed_at timestamptz,
  add column if not exists send_attempted_at timestamptz;

create unique index if not exists review_requests_appointment_id_key
  on public.review_requests (appointment_id)
  where appointment_id is not null;
