# Decisions Log

This file tracks assumptions and scope decisions made while working through
the "72-hour sprint" instructions against the real, live app.

## Why the sprint doc wasn't run verbatim

That doc assumed a Next.js App Router project with a from-scratch database
schema. This app is **TanStack Start**, and the schema it described
(`profiles`, `missed_calls`, `review_requests`, `leads`, etc.) already exists
in the live database — built up over many prior, verified phases — with a
different, incompatible structure. Running its SQL "in one shot" would have
failed on the first `create table`, or destroyed real schema/data if I'd
"fixed" the errors by dropping the conflicting tables. Per your direction, I
instead went through the doc for genuine gaps in the real app and translated
those to this codebase's actual conventions.

## What was fixed this pass

- **Password reset flow** — `auth.tsx` had no way to recover a forgotten
  password. Added a "Forgot password?" link using Supabase's built-in
  `resetPasswordForEmail`, plus a new `/auth/reset-password` page that
  handles the recovery-link callback and lets the user set a new password.
- **`.env.example`** — didn't exist. Added one enumerating every env var
  actually referenced across the codebase (grepped, not guessed), with no
  real values.
- **`robots.txt` + `sitemap.xml`** — didn't exist. Added both, listing only
  the real public routes that actually exist today.
- **`/refund` and `/cookies` pages** — `terms.tsx` and `privacy.tsx` already
  existed; these two were the missing pair the sprint doc asked for. Refund
  policy content is the same 30-day guarantee already stated in
  `terms.tsx` section 7 (Mohib Ahmadzai / moh@lanavix.com are real, already
  used elsewhere in this app — not invented for this pass). Cookie policy
  states the actual, verified technical fact that this app uses
  localStorage for the auth session and doesn't set tracking/ad cookies.
  Both linked from the site footer's Legal section alongside the existing two.

## Round 2 — pricing fix, lead verification, marketing placeholders

- **Checkout is now wired to real infrastructure.** `/pricing` no longer
  uses hardcoded Stripe Payment Links. It now checks the visitor's auth
  session and routes to: free Starter → signup/dashboard directly (no
  Stripe involved); paid plans (Solo/Crew/Empire) → signed out visitors go
  to `/auth?mode=signup&redirect=/checkout/start?plan=X` first, signed-in
  visitors go straight to the new `/checkout/start?plan=X` page, which
  renders the already-existing (previously unused) `StripeEmbeddedCheckout`
  component against `createCheckoutSession`. `auth.tsx` now supports a
  `redirect` search param so sign-in/sign-up lands the user back on the
  checkout they started.
  - **Test price lookup_keys used (not yet real Stripe objects):**
    `solo_monthly` ($299), `crew_monthly` ($599), `empire_monthly` ($999).
    Starter has no Stripe price (free). Run
    `STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.mjs`
    against your Stripe test account to create matching products/prices
    (monthly recurring, 14-day trial) under these exact lookup_keys — no
    further code changes needed once they exist. Re-run with a live secret
    key against your live Stripe account when you're ready to go live.
  - **Also fixed:** `checkout.return.tsx` (the post-checkout landing page)
    was polling a `public.subscriptions` table that doesn't exist — the
    same phantom-table bug already fixed elsewhere in this app (Stripe
    webhook, billing portal). It now polls `profiles.subscription_status`
    like the rest of the app. Without this fix, a successful real payment
    would never have been recognized as "active" on return from Stripe.
  - **Webhook plan mapping updated:** `planFromPriceId` now maps
    `solo_monthly`/`crew_monthly`/`empire_monthly` → `solo`/`crew`/`empire`,
    defaulting to `starter` (renamed from the old `free`/`pro`/`agency`
    naming, which matched neither the public pricing page's old tiers nor
    the new confirmed ones).

- **Lead Generator: Twilio Lookup phone verification added.** New
  `phone_verified boolean` column on `lead_profiles` (migration). Every
  researched lead's phone now goes through Twilio's Lookup v2 API (a real
  carrier-level validity check); leads that fail verification are discarded
  before insert. If `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` aren't
  configured, verification is skipped (`phone_verified` stays `null`) and
  leads are kept rather than all being discarded.
  - **On "using the existing OpenAI integration":** there is no OpenAI
    integration anywhere in this codebase — every AI feature (opening
    lines, review responses, the orchestrator, etc.) already uses
    Anthropic/Claude, consistently, across every phase of this app's
    history. The Lead Generator's opening-line/summary generation already
    used Claude before this pass and still does; I didn't introduce a new
    provider/dependency for this.
  - **Reaffirming what was already true:** the Lead Generator has never
    fabricated business names or phone numbers. Real data comes from
    Google Places (name, address, phone, rating, reviews, website) —
    confirmed and unit-tested in the phase that built it. This pass added
    a second, independent real-data check (carrier verification) on top of
    that, it didn't fix a fabrication bug because there wasn't one.

- **Marketing: About page + testimonials added, both explicitly
  placeholder-marked per your instruction.** `/about` has `[Founder name
  and bio to be added]` and `[Photo to be added]` markers — nothing
  presented as a real bio. The homepage now has a testimonials section
  with 3 cards reading "Customer testimonial coming soon." — accurate,
  since Lanavix is in early access with no customer quotes to publish yet
  (see the homepage's existing "Early access" section, which already says
  this). Real location (Prince William County, VA) and contact
  (moh@lanavix.com) reused from what's already established elsewhere in
  this app, not invented.

- **Twilio Missed Call Text-Back and Review SMS were already wired** —
  built in an earlier phase (`missed-call.ts`, `sms-reply.ts`,
  `review-request.ts`), with real signature verification, rate limiting,
  and Twilio sending. Confirmed intact; not rebuilt.

## Still not fixed (unchanged from Round 1)

- **Business verification flow, document upload, admin review** — the
  task you explicitly paused. Not resumed this round.
- **Yelp as a second lead source, About page's FAQ section, live chat
  widget** — not added; no real source/credential for these, and not
  explicitly requested this round.
- **Next.js scaffolding, `middleware.ts`** — not applicable; this app
  already has more thorough security headers/CSP than the sprint doc asks
  for, configured in `vercel.json`.
- **Production deploy, live Stripe charges, live Twilio SMS sends** — not
  performed. Per your explicit instruction this round: build and test
  locally, deploy only when you say so.

## Round 3 — cookie banner, SEO, contact email, deploy readiness

- **Cookie consent banner** — new `CookieConsentBanner.tsx`, mounted
  globally in `__root.tsx`. Shows once, "We use essential cookies only. No
  tracking." + a "Got it" button, persisted in `localStorage`
  (`lanavix:cookie_consent`) — accurate given this app has no
  tracking/ad cookies (confirmed in the earlier `/cookies` policy).

- **SEO meta tags.** Added a shared `pageMeta()` helper
  (`src/lib/seo.ts`) that sets title/description/OG/Twitter tags
  together, since route-level `head()` only overrides the specific keys it
  sets — pages that only redefined `title`/`description` were leaking
  the homepage's Open Graph/Twitter copy to social shares. Applied to
  every marketing page: `/`, `/pricing`, `/about`, `/audit`, `/terms`,
  `/privacy`, `/refund`, `/cookies`, `/chat`. `terms.tsx` and
  `privacy.tsx` had **zero** meta tags at all before this (real gap, not
  cosmetic). Also fixed `/chat`'s title still saying "LUNAVX" (old
  pre-rebrand name) instead of "Lanavix."
  - **New `/faq` page** — didn't exist; added since you listed it as an
    expected page. Reuses the 4 questions already in `pricing.tsx`'s FAQ
    section plus a few more using facts already established elsewhere in
    this app (TCPA/SMS compliance from `terms.tsx`, refund policy,
    5-minute setup claim already used in marketing copy) — nothing
    invented. Linked from the footer alongside About/Audit/Contact.

- **Contact form now actually emails.** There was no email-sending
  integration anywhere in this codebase before this — `/api/public/contact`
  only ever saved to `contact_submissions`, it never emailed
  moh@lanavix.com despite that being the apparent intent. Added
  `src/lib/email.server.ts` — plain `fetch` to Resend's API (no new npm
  dependency, matching how Twilio/Anthropic are already called directly),
  gated behind `RESEND_API_KEY`. **Without a real `RESEND_API_KEY` set,
  it logs what it would have sent and the submission still saves** — it
  does not silently pretend to email when it can't. Set
  `RESEND_API_KEY` (and optionally `RESEND_FROM_EMAIL`,
  `NOTIFICATION_EMAIL` if not moh@lanavix.com) in Vercel to make this real.

- **Data cleanup:** the Solo/Crew/Empire tier rename earlier this session
  changed the code's tier names but left the `profiles.subscription_tier`
  column defaulting to the old `'free'` and existing rows still saying
  `'free'`. Checked live data first — all 11 existing profiles were
  `free`/`inactive` (nobody has a working paid subscription yet, since
  checkout was broken until this session), so this was a safe, no-op-risk
  cleanup: migrated existing rows to `'starter'` and updated the column
  default to match.

### Production deploy readiness

**I can't see which environment variables are actually configured in your
Vercel project** — there's no tool available to me that lists configured
env var names or values (by design; secrets aren't readable). What
follows is what the code requires, cross-referenced against `.env.example`
(kept in sync with what's actually referenced in the codebase, via grep,
not guessed) — please confirm these are set in Vercel yourself.

**Required — app is materially broken without these:**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — nothing works without these (client can't reach Supabase at all).
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — most server API routes use the admin client.
- `VITE_PAYMENTS_CLIENT_TOKEN` — checkout embed can't load.
- `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY`, `LOVABLE_API_KEY` — checkout and webhook processing.
- `PAYMENTS_SANDBOX_WEBHOOK_SECRET` / `PAYMENTS_LIVE_WEBHOOK_SECRET` — Stripe webhook signature verification.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` — the core Missed Call Text-Back receptionist.
- `ANTHROPIC_API_KEY` — every AI feature (receptionist replies, review responses, Lead Generator copy, the orchestrator).
- `GOOGLE_PLACES_API_KEY` — Lead Blast and the Lead Generator's real business data.

**Optional — features degrade gracefully without these, already designed that way:**
- `CONSUMER_TWILIO_PHONE_NUMBER` — only affects one line of SMS footer copy in the consumer marketplace.
- `MONDAY_API_KEY`, `MONDAY_LEAD_BOARD_ID` — CRM sync no-ops and logs.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NOTIFICATION_EMAIL` — contact form still saves; just doesn't email yet.

**Blocking issues for a real launch (not just missing env vars):**
1. **Stripe Solo/Crew/Empire prices don't exist yet.** Checkout will fail
   with "Price not found" until `scripts/setup-stripe-products.mjs` is run
   against a real Stripe key (test first, then live) — see Round 2 notes
   above.
2. **`RESEND_API_KEY` isn't set** (as far as I can tell) — contact form
   submissions save but don't email until this is set.
3. **Business verification (fake-business gating), document upload, admin
   review, and subscription/verification-based feature gating are not
   built** — this is the task you asked me to pause. If launch depends on
   keeping unverified businesses off the consumer marketplace, that gate
   doesn't exist yet (the marketplace still only checks
   `subscription_status`/`accept_consumer_leads`, not any verification
   status, since verification doesn't exist as a concept in the schema yet).
4. Nothing else found this pass blocks a build — `tsc --noEmit` and
   `npm run build` both pass clean locally (150 pre-existing errors,
   unrelated to anything touched this session — see below).

**Build check:** `npm run build` succeeds. `tsc --noEmit` reports 150
errors, all pre-existing (in files untouched this session — mostly stale
`tasks`/`agent_runs`/`execution_logs` table references from the internal
orchestrator pages, flagged as broken in an earlier phase, and a couple of
other already-known nullable-type mismatches). Zero new errors introduced
by anything in this session.

**No deploy performed** — per your instruction, everything above was
built and verified locally only.

## Round 4 — env validation module

New `src/lib/env.server.ts` (not repo-root `lib/env.ts` — this project has
no top-level `lib/`, and the `.server.ts` suffix matches the existing
convention for secret-reading modules like `stripe.server.ts`). Exports
`validateEnv()`, `isIntegrationReady(category)`, `getEnvByCategory(category)`.

Adjustments from the literal spec, since it was written against a generic
Next.js template:
- **No `DATABASE_URL`** — this app never holds a raw Postgres connection
  string; it only talks to Postgres through the Supabase SDK. The real
  "core database" vars are `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
  (server) and `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` (client).
- **No `NEXTAUTH_SECRET`** — this app uses Supabase Auth directly, which
  manages its own session signing; there's no separate app-held auth
  secret to validate.
- **Added a 7th category, `integrations`** — `MONDAY_API_KEY`/
  `MONDAY_LEAD_BOARD_ID` (CRM sync) don't fit core/auth/email/billing/ai/
  monitoring; mislabeling them as "monitoring" would be inaccurate, so
  they got their own category instead of being forced into the wrong one.
  `monitoring` is defined but has zero variables — no error-tracking/
  observability integration exists in this codebase yet.
- **Twilio vars placed under `core`**, not a separate category — the
  missed-call receptionist is the core, always-on product (every plan
  includes it), so this seemed more accurate than inventing an "sms"
  category or omitting it.
- **Stripe vars marked optional with a "billing on hold" note**, per your
  instruction — accurate today since real Stripe products/prices don't
  exist yet regardless of these vars being set (see Round 2/3 notes).

Not wired into app startup — this only creates the module and exports the
three requested functions; nothing currently calls `validateEnv()`
automatically. Verified with a standalone logic test (12/12 passed:
required-missing throws in production vs. warns in development, invalid
formats are caught even when a var is present, category-readiness checks
behave correctly including billing's all-optional special case).

## Round 5 — Business verification, feature gating, marketplace gate

Resumed the "Business Verification + Pricing + Stripe Checkout" task that
was paused earlier (Round 4 note #3 above — that gap is now closed).

1. **Schema** (`20260721010000_create_business_verification.sql`):
   `profiles` gets `verification_status` (unverified/pending/verified/
   pro/elite — no separate "rejected" value; see admin review below),
   license/insurance/EIN/address/team-size/pricing fields, plus a new
   `verification_documents` table (per-user RLS + admin-read/update
   policies) and a private `verification-docs` Storage bucket. Reused the
   existing `accept_consumer_leads` column instead of adding a duplicate
   `accepts_consumer_marketplace` column from the original spec.
2. **`/app/verification`** — 4-step onboarding (business details →
   document upload → pricing/marketplace → review & submit). Submitting
   sets `verification_status = 'pending'`. Shows a status screen instead
   of the form once pending/verified. Overview dashboard now shows a "Get
   verified" banner for unverified accounts.
3. **`/app/admin/verification-review`** — admin-only queue filterable by
   status, with signed-URL document viewing, per-document approve/reject,
   and profile-level approve/reject/request-info with a note the
   applicant sees. Profile-level writes go through a new
   `POST /api/admin/verification-review` (service-role client) because
   `profiles` only has an admin-read RLS policy, not admin-write — reject
   and request-info both reset `verification_status` to `unverified` with
   an explanatory note (no "rejected" value exists in the check
   constraint), letting the applicant resubmit.
4. **Pricing/Stripe** — re-checked rather than rebuilt: checkout and the
   webhook's subscription sync were already fully wired in Round 2.
   Stripe's `customer.subscription.*` events already cover everything a
   subscription-mode checkout produces, so there was no real gap to close
   here.
5. **Feature gating** (`src/lib/planLimits.server.ts`) — enforces the caps
   already advertised in the /pricing comparison table, which weren't
   actually enforced anywhere before now: Starter capped at 50 SMS/month
   (missed-call auto-texts + conversation replies + review requests,
   combined) and no Lead Generator access at all; Solo capped at 3 Lead
   Generator runs/month (counted via the `lead_generator_research`
   activity_log entries each run already wrote); Crew/Empire unlimited.
   Settings page also lost its stale "Free beta access / all agents
   unlocked" copy from before real billing existed, replaced with the
   actual plan, subscription status, and verification status.
6. **Marketplace verified-only filter** — `consumer-inbound.ts`'s matching
   query now requires `verification_status IN (verified, pro, elite)`
   in addition to `accept_consumer_leads` and subscription status
   (broadened from just `"active"` to also include `"trialing"`, matching
   how the rest of the app treats trial subscribers). Closes the exact gap
   Round 4 note #3 flagged — unverified businesses can no longer be
   matched to consumer leads.

**Verification performed at every step:** `tsc --noEmit` held at the
existing 150-error baseline throughout (zero new errors in any file this
round touched), `npm run build` succeeded after each change, and every
schema/data change was exercised against the live Supabase project with
disposable test users/rows that were cleaned up and confirmed back to the
real baseline of 11 profiles — including check-constraint rejection tests,
the approve/reject status-transition paths, the SMS/Lead-Generator quota
counting logic, and the verified-vs-unverified marketplace matching query
(confirmed an unverified business is excluded even with a higher
`lanavix_score` than a verified competitor).

**No deploy performed** — per your standing instruction, built and
verified locally only.

## Round 6 — Final polish before deploy

1. **`/audit`** — the reported typo ("businesscustomers") wasn't actually
   present in the current code (the hero heading already has a proper
   space via `{" "}`), and the form was already real (`AuditForm.tsx` +
   `runBusinessAudit`), so no fix was needed there. What genuinely was
   missing, and is now built: `src/lib/websiteChecks.server.ts` runs real
   checks against the submitted website — an actual fetch measuring load
   time, whether HTTPS succeeds (falling back to plain HTTP to tell "no
   SSL" apart from "site is down"), and regex checks for `<title>`, meta
   description, and a mobile viewport tag. Those real facts are injected
   into the AI prompt as ground truth the model is told never to
   contradict, and a "Real website scan" strip now shows them directly on
   the report. The unlocked report is also emailed to the address entered
   at the gate (new `sendExternalEmail` in `email.server.ts`, built from
   the same Resend REST call `sendNotificationEmail` already used).
2. **SEO meta tags** — already fully wired via `pageMeta()` on all 9
   marketing pages from Round 3; verified, no changes needed.
3. **Cookie banner** — copy updated to the exact requested wording
   ("essential cookies only (login, preferences)... no tracking or ads").
4. **Homepage copy** — `index.tsx` still said "Built for contractors in
   the DMV"; changed to "Built for contractors across America."
5. **Contact form** — already real and already emailing
   `moh@lanavix.com` via Resend (footer → `/chat` → `/api/public/contact`
   → `sendNotificationEmail`, built in Round 3). No changes needed.
6. **Security headers** — new root `nitro.config.ts` sets CSP,
   X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS, and a
   restrictive Permissions-Policy on every route via Nitro's `routeRules`
   (auto-loaded by c12 alongside the narrower nitro options the
   `@lovable.dev/vite-tanstack-config` wrapper forwards). Verified by
   inspecting the generated `.output/public/_headers` build artifact,
   which now contains exactly these headers. The CSP allows `js.stripe.com`
   /`hooks.stripe.com`/`checkout.stripe.com` (embedded checkout) and
   `fonts.googleapis.com`/`fonts.gstatic.com`, and permits inline
   `<style>`/`<script>` since this app relies on both (React inline
   styles, TanStack Start's hydration bootstrap) — a stricter nonce-based
   CSP would need much deeper changes for uncertain benefit.
7. **Rate limiting**:
   - **Auth**: there is no custom auth endpoint to rate-limit — sign-in/up
     and password reset call Supabase Auth (GoTrue) directly from the
     browser, which enforces its own rate limits server-side. Flagging
     this rather than inventing a redundant proxy layer.
   - **SMS-sending**: new `checkSmsHourlyRateLimit` in `planLimits.server.ts`
     adds a flat 50/hour-per-business ceiling (via the existing
     `check_rate_limit` RPC, route key `sms-send-hourly`) on top of — not
     instead of — the Starter plan's monthly quota from Round 5. Applies
     regardless of plan tier, since it's an abuse/cost backstop, not a
     plan feature. Wired into `missed-call.ts`, `sms-reply.ts`, and
     `review-request.ts`.
   - **Lead Blast**: added a 100/day cap (route key `lead-blast-daily`) on
     `/api/lead-blast`, alongside its existing 10/hour cap.
8. **Lead Blast quality** — the "stupid leads" complaint traced to two real
   bugs, present in both the legacy `/api/lead-blast` (no longer wired to
   any UI, but still live) and the active Lead Generator
   (`leadGenerator.server.ts`):
   - `/api/lead-blast` searched Google Places for bare `"businesses in
     {city}"` — no industry term at all, so it could return literally any
     business type. Fixed to `"{industry} in {city}"`, matching what
     `leadGenerator.server.ts` already did correctly.
   - Neither system verified the returned businesses were actually the
     right trade. Added `isPlausibleTradeMatch()` (exported from
     `leadGenerator.server.ts`, reused by `lead-blast.ts`) — a denylist of
     Google Places `types` that are never home-service contractors
     (restaurants, schools, banks, retail, etc.). A denylist rather than
     an allowlist, since Google's category taxonomy is too coarse to
     reliably confirm a match (small contractors often just come back as
     "general_contractor" or "point_of_interest") but reliable enough to
     catch an obvious mismatch.
   - The opening-line prompts in both systems were rewritten: they now
     name the business's real Google category as a grounding fact, and
     explicitly ban generic filler phrases ("I noticed...", "I wanted to
     reach out...", "capture more business...") that read as robotic form
     letters. The static fallback strings (used only if the AI call
     itself fails) were rewritten to match — the old fallback ("Hi! I
     noticed X and wanted to reach out...") was itself an example of the
     exact complaint.
   - Model choice was checked and left alone: `claude-sonnet-4-6` is this
     codebase's established convention (also used by
     `leadGenerator.server.ts`, `auditApi.ts`, `agents.server.ts`), not a
     mistake.

**Verification**: `tsc --noEmit` held at the pre-existing 150-error
baseline (zero new errors in any file this round touched), `npm run
build` succeeded after every change, the new `websiteChecks.server.ts`
branching logic was verified with a mocked-fetch unit test (15/15 passed
— reachable/unreachable/no-SSL/missing-tag cases), and the new rate-limit
route keys (`sms-send-hourly`, `lead-blast-daily`) were exercised against
the live `check_rate_limit` RPC with a disposable test user, confirmed to
allow-then-block at the right counts, cleaned up, and confirmed back to
the real baseline of 11 profiles.

**No deploy performed** — per your standing instruction, built and
verified locally only.

## Round 7 — Final pre-deploy round

1. **`validateEnv()` wired into startup** — new `src/server.ts` overrides
   TanStack Start's default server entry (framework picks up `src/server.ts`
   by convention over its own generated default) and calls `validateEnv()`
   at module scope, so it runs once per real boot/cold-start. Also tightened
   the error message format to `Missing required env var: X [category] — description`
   per your requested style.
2. **Route smoke test** — `/`, `/pricing`, `/about`, `/faq`, `/terms`,
   `/privacy`, `/refund`, `/cookies`, `/audit`, `/app/verification`, and
   `/app/admin/verification-review` all already worked (verified against a
   real `vite dev` server, not just build/tsc). `/contact`, `/login`,
   `/signup`, `/forgot-password`, and `/dashboard` had no matching route at
   all in this app (it uses `/chat`, `/auth`, and `/app` instead) — added
   thin redirect routes for all five rather than leaving those conventional
   URLs 404ing, and extended `/auth`'s `mode` search param with `"forgot"`
   so `/forgot-password` lands directly on the reset view.
3. **Found and fixed a real pre-existing bug while confirming the deploy
   target**: this repo already has a root `vercel.json` with security
   headers (predating this session), and its CSP had **no `frame-src`
   directive at all** — which defaults to blocking all framing, meaning the
   embedded Stripe Checkout iframe would have been silently broken on a
   real deploy. Also didn't allow Stripe's domains in `script-src`/
   `connect-src`. Fixed to match the CSP added in `nitro.config.ts` this
   session, so both are consistent.
4. **Confirmed the real deploy target is Vercel, not Cloudflare** — despite
   local builds producing `wrangler.json`/Cloudflare artifacts. Traced this
   to `@lovable.dev/vite-tanstack-config` hardcoding `defaultPreset:
   "cloudflare-module"` as a *fallback only*; Nitro's own platform
   auto-detection (via the `VERCEL` env var Vercel's build system sets)
   overrides that fallback on a real Vercel build. The pre-existing
   `vercel.json` and this session's earlier Vercel MCP-verified production
   deploys both corroborate Vercel as the actual target.
5. **`DEPLOY.md`** — new file with the full env var reference (required/
   recommended/billing/optional), the Stripe product-setup command, the
   Cloudflare-vs-Vercel reasoning above, the deploy command, and manual
   post-deploy steps (Stripe webhook URL + events, Twilio webhook URLs,
   custom domain, post-deploy smoke test).

**Verification**: `npm run build` and `tsc --noEmit` both held clean at the
150-error baseline. Every route in the requested smoke-test list was hit
against a live `vite dev` server (not just statically analyzed) — the 5
newly-added redirect routes were confirmed to 307 to the correct
destination and resolve to a real 200 page with `-L`.

**No deploy performed** — per your standing instruction, built and
verified locally only. Ready for you to deploy per DEPLOY.md.

## AI Sales Follow-Up (quote_follow_ups) - verification scope

Before merging this feature, tried to run a full end-to-end test against
the real Vercel preview deployment: a live business account, a real
inbound SMS webhook call carrying a specific price quote, and a real
browser session on the dashboard. That deployment exists and is live
(PR #3's Vercel bot comment confirms it), but this sandbox's network
egress policy blocked both the Vercel preview host and Supabase's own API
host outright, confirmed via the proxy's own status endpoint, not
assumed, and confirmed twice more after two rounds of requested network
settings changes with no change in the blocked-host list.

Given that, verification instead ran entirely at the database layer
against the live Supabase project, using a disposable test business
created and fully deleted within the same session (nothing touching real
users): schema correctness (`quoted_price`, `service_type`), the Day
1/5/14 `scheduled_for` math against a real `quoted_at`, the one-active-
follow-up-per-conversation unique constraint (triggered a real `23505` on
a second insert), the RLS policies on both `quote_follow_ups` and
`quote_follow_up_steps` (proved both the allow path for the real owner and
the deny path for a different `auth.uid()`, on both reads and writes, not
just the owner's happy path), and the booking-cancels-pending-steps
cascade.

**Not exercised**: the actual `detectQuote()`/`detectBooking()` Anthropic
calls, the real `sms-reply.ts` HTTP handler, and the React dashboard UI in
a live browser, none of these are reachable from this sandbox regardless
of credentials, since the network path itself is closed, not just missing
a key. The data layer this feature depends on is verified correct; the
deployed route wiring and the AI extraction quality are not. A real text
message sent to a live business number after this merges is the
outstanding check.

## Onboarding Wizard (/onboarding) - dead code, backfill, and scope

`OnboardingWizard.tsx`/`onboarding.functions.ts` were deleted outright
rather than resurrected: zero importers, referenced `profiles` columns
that never existed (`business_type`, `primary_goal`, `service_area`,
`onboarded_at`), filtered by `user_id` when the table's primary key is
`id`, and the copy still said "Welcome to LUNAVX" from before the
product was renamed. Deleting it dropped the `tsc` baseline from 16
errors to 2, since most of the old baseline was this code's own type
errors against those nonexistent columns.

`profiles.onboarding_completed` already existed live (another case of
the migrations-drift this repo already has - no local migration record
for it) but no code read or wrote it, so every account defaulted to
false. Backfilled it to true for accounts already showing real usage (a
confirmed listing, a connection, a synced fact, an actual conversation)
so the new wizard's gating only ever greets accounts that genuinely
haven't done this yet. Of the 15 real accounts in the live project, only
one qualified - the other 14 are inert test/QA accounts with no real
business data, so seeing the wizard once on their next login is correct
behavior, not a regression.

The wizard reuses the exact same connect flows already built for
Business Facts and Receptionist Setup (Google listing search/confirm/
sync, website confirm/sync, Twilio verify-then-save), pulled into three
shared components rather than duplicated, so there is exactly one
working implementation of each, not two that can drift apart.

**Not exercised live**: this sandbox has no way to complete a real
Supabase Auth session or reach the deployed app, so the wizard's actual
click-through (five real steps, a real Google Places search, a real
Twilio verify call) was verified by code trace and `tsc`/`eslint`, not
a live browser session - the same limitation documented for quote
follow-ups and Coach earlier this session. Worth a real run-through
after this deploys, especially the "returning visitor lands on their
first real gap" logic in `onboarding.tsx`'s `load()`, which only static
analysis has checked so far.

## Onboarding wizard: facts step (services/pricing + FAQ)

Added a sixth `business_facts.fact_type`, `'faq'`, for structured
question/answer pairs. Checked first whether this was actually
necessary: `loadBusinessContext()` in `aiReceptionist.server.ts`
already folds every active fact into the AI receptionist's prompt as
plain text regardless of type, so a Q&A pair would have worked fine
even filed under `'general'`. This change is for data quality and the
Business Facts review page, not to unlock AI behavior that didn't
already exist. Deliberately left `'faq'` out of the website-sync
extraction prompt's `validTypes` allowlist in `businessFacts.server.ts`
- a Q&A pair should come from the owner writing one, not the model
inferring a question from scraped page text, which would cut against
this codebase's real-data-only principle for anything AI-touched.

New step placed after Twilio, before Done - the alternative (right
after business identity, before any sync attempt) would have asked for
manual facts before the owner had a chance to see what sync already
caught, working against the step's actual purpose of filling real
gaps.

`AddFactForm` was extracted from Business Facts' existing manual-entry
block (same insert shape: `source: 'setup_form'`, `status: 'active'`,
no conflict-checking - that only applies to the sync path) so the
wizard reuses the exact same code path rather than a second
implementation that could drift from it over time.

Not exercised live, same sandbox limitation as the rest of this
wizard: no way to complete a real Supabase Auth session here, so this
was verified by code trace, `tsc`, and `eslint`, not a live
click-through. Particularly worth confirming after deploy: that a
returning visitor who already has active facts (from any source, not
just this step) correctly resumes past the facts step per the updated
`load()` logic.

## Stripe: dropped the Lovable connector-gateway indirection

A real Stripe key (`STRIPE_SECRET_KEY`, a restricted live key) and
`VITE_STRIPE_PUBLISHABLE_KEY` were added directly to Vercel. Checking
the existing billing code first turned up that it was never wired to
those names at all - `stripe.server.ts` read `STRIPE_SANDBOX_API_KEY` /
`STRIPE_LIVE_API_KEY` plus a `LOVABLE_API_KEY`, and routed every Stripe
call through `https://connector-gateway.lovable.dev/stripe`, a proxy
tied to a Lovable-platform connection, instead of `api.stripe.com`
directly. That's dead architecture for an app that deploys to Vercel
(see the "Deploy target is Vercel, not Cloudflare" note in
`CLAUDE.md`) - the gateway was never going to be reachable in
production the way this app actually ships. Setting the two new vars
alone would have done nothing; checkout would still throw on the
missing `LOVABLE_API_KEY`.

Removed the gateway path entirely: `createStripeClient()` now does a
plain `new Stripe(getEnv('STRIPE_SECRET_KEY'), ...)`, no custom
`httpClient`, no sandbox/live env switch fed by two separate key vars.
`verifyWebhook()` reads a single `STRIPE_WEBHOOK_SECRET` instead of a
sandbox/live pair, and the webhook route dropped its `?env=` query
param requirement. The client (`stripe.ts`) reads
`VITE_STRIPE_PUBLISHABLE_KEY` instead of `VITE_PAYMENTS_CLIENT_TOKEN`.
`env.server.ts` and `DEPLOY.md` were updated to match - the old var
names don't exist anywhere in the code anymore.

Also fixed a real bug found while tracing this: the webhook's
`planFromPriceId()` matched Stripe price IDs against `lovable_external_id`
metadata (a field only the old gateway ever set) or the raw Stripe
price ID, neither of which would ever equal `solo_monthly` /
`crew_monthly` / `agency_monthly`. Every real subscription would have
silently synced as `starter`. Fixed by stamping `plan` directly into
`subscription_data.metadata` (and top-level session metadata) at
checkout-creation time in `payments.functions.ts`, derived from
`PRICING_PLANS` rather than hardcoded twice, and reading it straight
back in the webhook (`planFromMetadata()`) instead of reverse-matching
a price ID.

Scope not touched yet, on purpose: `scripts/setup-stripe-products.mjs`
(creating the real Solo/Crew/Agency products) and registering the live
webhook endpoint in the Stripe dashboard. Both come after this lands,
confirmed with the account owner first since they create real,
billable Stripe objects.

## Performance audit fixes

Investigated first (loading states, query patterns, bundle size, page
load, cross-feature consistency) before fixing anything, then fixed
the four findings with real, confirmed impact.

**Missing index + unbounded query**: `review_requests` had no index
beyond its primary key - confirmed live via the Supabase performance
advisor, which independently flagged `review_requests_user_id_fkey`
as an unindexed foreign key. Coach's `reviewAskCard()` queried it with
no date filter and no limit, on every single page load. Added
`idx_review_requests_user_sent_at (user_id, sent_at)` and bounded the
query to the same 30-day window already used for the completed-jobs
half of that card - safe, since `sent_at` defaults to `now()` at
insert time, so a review request for a job in that window can't itself
fall outside it.

**Render-blocking Google Fonts**: `__root.tsx` loaded Inter via a
synchronous `<link rel="stylesheet">` to `fonts.googleapis.com` on
every page. Fetched the actual CSS Google serves for this weight set
and confirmed it returns the identical file for all five weights
(400-800) - so self-hosting one 48KB woff2, declared as the same five
`@font-face` blocks Google's own CSS uses (deliberately not collapsed
into a single range-based declaration, to avoid depending on
variable-range `@font-face` support in older browsers), is byte-for-
byte what production already downloaded, just same-origin. Preloaded
from `__root.tsx`, and both `vercel.json`'s CSP and its
`nitro.config.ts` mirror had `fonts.googleapis.com`/`fonts.gstatic.com`
dropped since nothing external is fetched anymore.

**Quote follow-up silent pop-in**: `app.receptionist.tsx` fetched
follow-up status after the main conversation list already finished
loading, with no in-flight indicator - the badge area was just absent
until the fetch resolved. First attempt used a single global loading
flag; caught before committing that this would flicker away
already-resolved badges from an earlier page during "Load more"
pagination, since the flag would flip true again for an unrelated
fetch. Fixed with a per-conversation-ID "checked" set instead, so a
row's badge state only ever depends on whether that specific row's own
follow-up status has actually been fetched.

**Onboarding wizard motion inconsistency**: every other dashboard page
(Coach, Web Chat, Business Facts, Receptionist, Settings) uses the
shared `useMountReveal()` hook for a staggered `hd-blur-in` entrance on
page load; the onboarding wizard's top bar (brand mark, step rail,
skip button) had no entrance motion at all. Wired it onto the same
hook. Left the step-to-step transition's own `key`-based remount
animation alone - a different, legitimate mechanism for a different
interaction (mid-flow step changes, not page mount), not a duplicate
to consolidate.

Bundle size and page-load checks (the >500kB build warning, the
founder photo) turned up no real issues - the warning is a shared
vendor chunk loaded on every page regardless of route, not anything
built recently, and Coach/onboarding are already split into their own
small per-route chunks via TanStack Router's file-based routing.

## Consumer marketplace removed entirely

Deliberate product decision, not a bug fix: Lanavix focuses entirely
on contractors now, no consumer-facing surface. Removed both entry
points that existed - the SMS marketplace (`consumer-inbound.ts`,
which auto-matched and auto-booked a single business) and the
web-based `/request` flow (`consumer_requests`/`consumer_request_matches`,
fanned out to several businesses who had to accept) - along with
everything that only existed to support them.

Investigated before deleting anything, since two things needed a real
answer rather than an assumption: whether `accept_consumer_leads` was
used anywhere besides the Network page (it was - a second toggle in
`app.verification.tsx`'s step 2, same purpose, still safe to remove),
and whether `conversation_intelligence` (written to by the SMS
marketplace with `source_channel: 'consumer_marketplace'`) was
consumer-marketplace-only or shared - it's shared (`sms-reply.ts` and
web-chat both write to it too), so the table stays and only the
`'consumer_marketplace'` value was dropped from its check constraint,
along with the same value on `appointments.source`.

Database: dropped `consumer_profiles`, `consumer_requests`,
`consumer_request_matches`, `consumer_marketplace_messages` (all four
had zero rows live - this was a clean removal, not a data migration).
Dropped `profiles.accept_consumer_leads`/`lanavix_score`/
`response_speed_avg_minutes`/`booking_completion_rate`/
`consumer_rating_avg` - confirmed by grep these were read nowhere else
in the app. Reverted `handle_new_user()` to the simple, unconditional
`profiles` insert every business signup already relied on before the
consumer-account branch existed; the one call site that ever sent
`account_type: 'consumer'` (`request.auth.tsx`) is deleted along with
it, and `consumer_profiles` had zero rows, so there was no real
consumer account to preserve.

Also removed as a direct consequence, not left dangling: Coach's
`networkRequestsCard()` (queried `consumer_request_matches` directly),
the viral SMS footer's "Need another service? Text {number}" branch in
`sms-reply.ts`/`review-request.ts` (was about to invite customers to
text a webhook that no longer exists), `verifyPlatformTwilioRequest()`
in `twilio.server.ts` (had exactly one caller), and
`api/admin/update-scores.ts` (existed only to compute `lanavix_score`,
already established as never wired to a scheduler like its sibling
`update-pricing-index.ts`).

`/app/network` had zero content unrelated to the consumer marketplace
- header, stats, the accept-leads toggle, incoming requests, and a
"Network Score coming soon" placeholder were all consumer-marketplace
copy - so the whole page and its sidebar nav item were deleted rather
than left empty. The verification flow's "you're verified" success
screen used to link there and claim verification "unlocks consumer
marketplace matching"; both were fixed to point at the dashboard
instead and drop the now-false claim, since verification itself (the
badge, the trust signal) is unrelated to the marketplace and stays.

Left out of scope on purpose, flagged during investigation rather than
silently expanded into: `api/admin/update-pricing-index.ts` and
`market_pricing_index` are dead (never read/displayed anywhere) but
not part of the consumer marketplace's own surface - a separate
cleanup item for later, not this one.
