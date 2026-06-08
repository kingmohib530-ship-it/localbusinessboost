# Local Business Boost — Repositioning Plan

This is a large repositioning. I'll do it in clearly-shippable phases so you can review after each one rather than one giant rewrite.

## Phase 1 — Homepage + Positioning (ship first)

Rewrite `src/routes/index.tsx` end-to-end around the new message.

- **Hero**: "Get More Calls, More Reviews, and More Customers — Automatically." Sub: capture leads, recover missed calls, generate reviews, book more jobs. Primary CTA "Get My Free Business Audit" → `/audit`. Secondary "See How It Works".
- **Who it's for** strip: Cleaning · HVAC · Roofing · Landscaping · Plumbing.
- **4 outcome pillars** (replaces "8 agents"): Missed Call Recovery · Review Growth · Lead Inbox · AI Receptionist.
- **How it works** (3 steps, visual): Connect → We work in the background → You get more booked jobs.
- **Before / After** revenue impact block + 3 testimonials.
- **Pricing** kept (Free Audit → Pro → Enterprise), simplified copy.
- **FAQ + final CTA**.

All language owner-friendly. No "AI agents", "workflows", "Orbis/Atlas/etc." on the public site.

## Phase 2 — Free Business Audit (the new front door)

New public route `/audit` (no login required to start):

- Inputs: Website URL + Google Business Profile URL (+ optional email to save the report).
- Server fn calls Firecrawl (already a connector option) + a Lovable-AI scoring pass to produce 4 scores: Visibility / Reputation / Lead Capture / Conversion, each with 3 plain-English fixes.
- Gated reveal: top-line scores free, full fix list requires email → creates account → drops them into the new dashboard.

This becomes the primary lead magnet you asked for.

## Phase 3 — New Dashboard ("Today")

Replace `_authenticated/app/index` with a 30-second-readable screen:

- **Today's Opportunities**: Missed calls · New leads · Review requests to send · Appointments today.
- **Quick Wins**: 3 one-click cards ("Ask 5 customers for a review", "Reply to 2 reviews", "Follow up on 3 missed calls").
- **This week**: jobs booked, reviews gained, leads captured, revenue (est.).

Hide the agent workflow / templates / control center / logs from the default nav. Keep them accessible under a collapsed "Advanced" item so we don't break existing tasks.

## Phase 4 — Core feature surfaces (UI scaffolds, then wire backend)

Each gets its own route, simple UI, and a DB-backed list. Backend ingestion (Twilio/Google/etc.) is stubbed with a clear "Connect" CTA per integration so the screens work today and light up as connectors are added.

- `/app/leads` — single **Lead Inbox** (New / Contacted / Booked / Closed). Sources: website form, missed call, FB, Google, contact form. Already have a `leads` table.
- `/app/reviews` — **Review Growth**: send request, response rate, recent reviews. SMS sender uses Twilio connector when linked, otherwise shows "Connect Twilio".
- `/app/missed-calls` — **Missed Call Recovery**: list of recovered leads + auto-SMS toggle + message template.
- `/app/receptionist` — **AI Receptionist**: pick an industry template (Cleaning/HVAC/Roofing/Landscaping/Plumbing), toggle on, paste embed snippet. Reuses existing `chatbot_settings` table.
- `/app/competitors` — **Competitor Intelligence**: add up to 5 competitors, show review count / rating / visibility deltas.

## Phase 5 — Remove / hide deprecated surfaces

Remove from primary navigation and landing page (keep code for now so nothing breaks):

- Generic AI chatbot/content/blog/email writers, social schedulers, complex analytics, prompt-based tools.
- "Agents Hub", "Business Assistant", "Control Center", "Workflows", "Execution Logs" — moved behind an "Advanced" toggle, off by default.

## Technical notes (for me, skim freely)

- Stack: TanStack Start + Supabase already in place. New routes are TanStack file routes; data via `createServerFn`.
- Audit: Firecrawl connector (scrape + branding) + Lovable AI Gateway for scoring. No new secrets needed if Firecrawl connector is linked.
- Missed-call SMS + review SMS: Twilio connector. I'll add the gateway calls but won't link Twilio for you — you'll get a one-click "Connect Twilio" CTA.
- Google Business Profile + Google/Facebook lead ads: shown as "Connect" placeholders in Phase 4; wiring them up is its own phase once you confirm priority.
- DB changes I anticipate (will surface as migrations for your approval when we hit them): `audits`, `review_requests`, `missed_calls`, `competitors`. Existing `leads`, `chatbot_settings`, `profiles`, `organizations` reused.

## What I need from you before I start

1. **Confirm Phase 1 first** (homepage rewrite) and I'll ship it now. Then we review and move to Phase 2.
2. **Brand name**: stick with "LUNAVX" or rename to "Local Business Boost" across the product? The current app uses LUNAVX in the sidebar/logo; your brief uses Local Business Boost. I'll match whichever you pick.
3. **Audit lead-magnet gating**: show full results free, or require email to unlock the fix list? (I recommend email-gate — it's the conversion engine.)

Reply "go" (plus any answers above) and I'll start Phase 1.