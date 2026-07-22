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

## What was found but deliberately NOT fixed this pass

- **Public `/pricing` page checkout is non-functional in production.** It
  uses hardcoded Stripe **test-mode** Payment Links
  (`buy.stripe.com/test_...`), completely bypassing the app's own
  `createCheckoutSession` server function and the `/api/public/payments/webhook`
  endpoint. Even in live mode, Payment Links configured this way never
  attach `metadata.userId`, so the webhook could never attribute a real
  payment to an account. There's also an unused, already-correctly-wired
  `StripeEmbeddedCheckout.tsx` component sitting disconnected from any page.
  Fixing this properly requires real Stripe price/lookup-key IDs I don't
  have, and overlaps with the Business Verification + Pricing task you
  already asked me to pause — so I flagged it here rather than guessing at
  IDs that could break checkout further.
- **Business verification flow, document upload, admin review, and the
  new Solo/Crew/Empire pricing tiers** — this is the task you explicitly
  paused two turns ago. Confirmed pricing for when that resumes: Starter
  $0 / Solo $299 / Crew $599 / Empire $999.
- **About page, FAQ page, testimonials, live chat widget, placeholder phone
  number** — the sprint doc's marketing-page instructions call for
  content I have no real source for (a founder photo, testimonials, a
  phone number, a Crisp chat ID). Shipping placeholder content presented as
  real isn't something I'll do without you providing the actual facts.
  The public `/chat` page (already fixed in an earlier phase) already
  serves as the real "contact us" form.
- **Yelp as a second lead source** — no `YELP_API_KEY` convention exists in
  this codebase, and lead-blast/lead-generator already source real data
  from Google Places only. Not added since it wasn't a broken existing
  feature, just a net-new one not otherwise requested.
- **Next.js scaffolding, `middleware.ts`, security headers, CSP** — this
  app already has HSTS, X-Frame-Options: DENY, a real CSP with
  `frame-ancestors 'none'`, and more configured in `vercel.json` — more
  thorough than the sprint doc's own checklist. No changes needed.
- **Production deploy, live Stripe charges, live Twilio SMS sends** — not
  performed autonomously. These are real-money, real-message actions that
  need your explicit go-ahead, not something a sprint doc's framing should
  cause me to do unattended.
