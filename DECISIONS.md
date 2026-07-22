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
