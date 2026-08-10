-- The AI receptionist's prompt-building (loadBusinessContext in
-- aiReceptionist.server.ts) already reads every active business_facts row
-- as plain text regardless of fact_type, so a Q&A pair would already get
-- used correctly even filed under 'general'. This isn't about unlocking
-- new AI behavior - it's a real category, not a synonym for 'general',
-- and giving it its own type keeps the Business Facts review page (and
-- anything built on top of it later) honest about what's actually on
-- file instead of lumping structured Q&A pairs into a vague catch-all.
alter table public.business_facts drop constraint business_facts_fact_type_check;
alter table public.business_facts add constraint business_facts_fact_type_check
  check (fact_type = any (array['service','pricing','hours','service_area','general','faq']));
