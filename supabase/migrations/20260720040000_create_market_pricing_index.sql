create table public.market_pricing_index (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  zip_code text not null,
  avg_price integer,
  price_range_low integer,
  price_range_high integer,
  demand_score integer default 0,
  supply_score integer default 0,
  seasonal_multiplier numeric(3,2) default 1.00,
  last_updated timestamptz default now(),
  unique (service_type, zip_code)
);

-- Aggregate market data across all businesses — service-role-only by
-- design, same pattern as rate_limits/anon_rate_limits: RLS enabled,
-- no policies, so only the service-role admin endpoint can read/write it.
alter table public.market_pricing_index enable row level security;
