-- Guarantees at most one accepted match per request, at the database
-- level, regardless of how many concurrent accept attempts race each
-- other. The accept endpoint's UPDATE ... WHERE status = 'pending' guards
-- the single row's own transition; this index is what actually prevents
-- two different businesses' matches for the *same* request both landing
-- on 'accepted' - a concurrent UPDATE that would violate it fails and
-- rolls back atomically as part of that same statement, so the app code
-- never has to coordinate this itself.
create unique index idx_consumer_request_matches_one_accepted_per_request
  on public.consumer_request_matches(request_id)
  where status = 'accepted';
