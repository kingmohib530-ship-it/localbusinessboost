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
