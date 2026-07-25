---
name: lanavix-growth-engine
description: Use whenever working on Lanavix marketing, growth strategy, lead generation, or any Lanavix AI agent (Competitor Intelligence, Review Recovery, Booking Booster, missed-call text-back). Enforces real-data-only rules for all agent outputs and defines what counts as a qualified lead. Trigger on "Lanavix leads", "Lanavix growth", "Lanavix marketing", "lead gen", "Competitor Intelligence", "Review Recovery", "Booking Booster", or requests to acquire/find contractor leads.
---

# Lanavix Growth Engine

## Who Lanavix is for

Local service contractors - HVAC, plumbing, roofing, cleaning - currently concentrated in
Northern Virginia / Maryland / DC. Core wedge features: missed-call text-back, reputation
management, AI-driven lead generation, and text-to-booking.

## Rule 1 - Real data only, no exceptions

Every AI agent inside Lanavix (Competitor Intelligence, Review Recovery, Booking Booster,
missed-call text-back, and any future agent) must operate on real, verifiable data:

- Pull actual data from Google Places API and Yelp Fusion API - never invent example
  businesses, example reviews, or placeholder phone numbers/emails, even for demos,
  screenshots, or pitch materials.
- If live API data is not available in the current context (no key loaded, rate
  limited, no results), say so explicitly. Do not fill the gap with a plausible-looking
  synthetic example. A visible "no data returned" is always better than invented data
  that looks real.
- When showing example output to illustrate a feature (docs, landing page, Product Hunt
  assets), pull one real result via the API and clearly cite it, rather than writing a
  hypothetical example.
- Any dashboard, report, or lead list Claude builds must show its data source and
  timestamp inline, so it is obvious the numbers are live, not decorative.

## Rule 2 - What counts as a qualified lead

A business is a qualified Lanavix lead only when signals stack, not on any single
signal alone. Score across all three:

1. No online booking system - confirmed by checking their website/GBP for a booking
   link or third-party scheduler; absence must be verified, not assumed.
2. Unaddressed negative reviews - 1+ negative review (3 stars or below) within the
   last 90 days with no business response. Pull actual review text via Yelp Fusion API
   or Google Places API, not a review count alone.
3. Evidence of missed-call / slow-response pattern - inferred from review text
   mentioning "never called back," "no response," "had to call twice," etc., or from a
   business phone number with no listed hours / after-hours availability signal.

When presenting a lead list, show all three signals per business with the actual
evidence (the real review quote, the real absence of a booking link, etc.), not just a
composite score.

Do not present a business as a lead if it only has one weak signal - that is noise,
not a qualified lead.

## Rule 3 - Differentiation, not imitation

Before proposing a growth/marketing tactic, check whether it is something any local-SaaS
competitor could copy-paste. If so, treat it as baseline, not strategy, and push toward
what is actually differentiated for Lanavix specifically:

- Lanavix's edge is closing the loop - not just flagging a missed call or bad review,
  but auto-booking the recovered lead. Growth ideas should lean on that full-loop story
  (detect, recover, book), not just top-of-funnel awareness tactics generic to any SaaS.
- Mohlight Spotless is real, live supply Lanavix can point to as proof - use it as a case
  study/reference customer in outreach and landing copy rather than hypothetical framing.
- Favor tactics with a verification step over tactics that just sound good - a cold
  outreach message referencing a contractor's actual unanswered review (real data,
  Rule 1) will outperform templated blasts, and should be the default approach.

## Workflow for lead-gen requests

1. Query Google Places API and Yelp Fusion API for the target trade + area.
2. Score each result against Rule 2's three signals using real pulled data.
3. Drop anything with fewer than 2 stacked signals.
4. Present remaining leads with the real evidence per signal, source, and timestamp.
5. Flag explicitly if API results were incomplete or rate-limited rather than padding
   the list.
