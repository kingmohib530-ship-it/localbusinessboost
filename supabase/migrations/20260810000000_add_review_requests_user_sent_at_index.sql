-- Coach's reviewAskCard() (lib/coach.server.ts) queries review_requests
-- filtered by user_id, and now also by sent_at, on every Coach page load.
-- review_requests previously had no index beyond its primary key -
-- flagged by Supabase's own performance advisor as an unindexed foreign
-- key (review_requests_user_id_fkey). Same (user_id, timestamp) composite
-- shape already used for appointments and conversations.
create index if not exists idx_review_requests_user_sent_at
  on public.review_requests using btree (user_id, sent_at);
