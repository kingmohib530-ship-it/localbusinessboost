alter table public.profiles
  add column lanavix_score integer not null default 50,
  add column response_speed_avg_minutes integer,
  add column booking_completion_rate integer,
  add column consumer_rating_avg numeric(2,1);
