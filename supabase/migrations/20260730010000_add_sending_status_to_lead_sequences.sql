-- Adds "sending" as a valid lead_sequences.status value so the
-- execute-step endpoint can atomically claim a step (pending -> sending)
-- before firing the Twilio send, closing a race where two concurrent
-- calls could both pass the "is this still pending" check and both send.
alter table public.lead_sequences drop constraint lead_sequences_status_check;
alter table public.lead_sequences add constraint lead_sequences_status_check
  check (status in ('pending', 'sending', 'sent', 'responded', 'failed'));
