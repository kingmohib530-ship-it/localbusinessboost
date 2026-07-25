# Lanavix — Pre-Deploy Checklist

## 1. Environment variables

Set these in your Vercel project's **Settings → Environment Variables** (Production
environment). `src/lib/env.server.ts` validates all of these on server boot
(`src/server.ts` calls `validateEnv()`) — in production, a missing/invalid
**required** var throws immediately with a message like
`Missing required env var: TWILIO_ACCOUNT_SID [core] — ...`, so the app will
refuse to start rather than fail silently later.

### Required — the app will not boot in production without these

| Variable | What it does |
|---|---|
| `SUPABASE_URL` | Server-side Supabase project URL (admin client, auth middleware). |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side Supabase publishable key (SSR auth middleware fallback). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key for the admin Supabase client. Bypasses RLS — never expose to the client. |
| `VITE_SUPABASE_URL` | Client-side Supabase project URL. The app can't load at all without this. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client-side Supabase publishable (anon) key. |
| `TWILIO_ACCOUNT_SID` | Twilio account SID for the business receptionist number. |
| `TWILIO_AUTH_TOKEN` | Twilio auth token — sends SMS and verifies inbound webhook signatures. |
| `TWILIO_PHONE_NUMBER` | The business-side Twilio number missed calls/SMS are sent from (E.164, e.g. `+15555550100`). |
| `ANTHROPIC_API_KEY` | Claude API key — powers the receptionist's AI replies, review responses, Lead Generator copy, and the audit tool. |
| `GOOGLE_PLACES_API_KEY` | Google Places API key — the only real-business-data source for Lead Blast and the Lead Generator. |

### Strongly recommended — features silently degrade without them

| Variable | What it does |
|---|---|
| `RESEND_API_KEY` | Resend API key. Without it, the contact form and audit-report emails just log instead of sending. |
| `RESEND_FROM_EMAIL` | Sender address for outbound email. Defaults to a Lanavix address if unset. |
| `NOTIFICATION_EMAIL` | Where contact-form notifications go. Defaults to `moh@lanavix.com` if unset. |
| `CONSUMER_TWILIO_PHONE_NUMBER` | Consumer-marketplace Twilio number, shown in one line of SMS footer copy. Cosmetic if unset. |

### Billing — required before checkout will actually work

| Variable | What it does |
|---|---|
| `STRIPE_SANDBOX_API_KEY` | Stripe **test-mode** secret key (`sk_test_...`). |
| `STRIPE_LIVE_API_KEY` | Stripe **live-mode** secret key (`sk_live_...`). |
| `LOVABLE_API_KEY` | This app's Stripe calls route through the Lovable connector gateway (`connector-gateway.lovable.dev`), not `api.stripe.com` directly — this key authenticates to that gateway. Checkout will not work without it, even with a valid Stripe key. |
| `PAYMENTS_SANDBOX_WEBHOOK_SECRET` | Stripe test-mode webhook signing secret (`whsec_...`). |
| `PAYMENTS_LIVE_WEBHOOK_SECRET` | Stripe live-mode webhook signing secret (`whsec_...`). |
| `VITE_PAYMENTS_CLIENT_TOKEN` | Stripe publishable key (`pk_test_...` / `pk_live_...`) for the embedded checkout UI. |

All six are marked optional in `env.server.ts` (so a deploy isn't blocked on
billing), but **checkout/subscriptions do not function without them** — see
the Stripe setup step below.

### Optional — nice to have

| Variable | What it does |
|---|---|
| `MONDAY_API_KEY` | Monday.com API key for lead CRM sync. Sync calls fail silently and log if unset. |
| `MONDAY_LEAD_BOARD_ID` | Target Monday.com board ID for lead CRM sync. |

---

## 2. Create the real Stripe products

Real Solo/Crew/Empire Stripe products and prices don't exist yet. Run this
**once per Stripe environment** (test, and separately, live) with a real
secret key that has product-write access:

```bash
STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.mjs
```

Repeat with `STRIPE_SECRET_KEY=sk_live_...` when you're ready to go live.
This creates the `solo_monthly` / `crew_monthly` / `empire_monthly`
lookup-keyed prices (14-day trial, monthly recurring) that
`src/lib/pricingPlans.ts` and the checkout flow already expect. Starter is
free and has no Stripe product — nothing to create for it.

---

## 3. Deploy target: **Vercel**, not Cloudflare

Deploy to **Vercel**. Two things confirm this:

- The root `vercel.json` (security headers) was already hand-configured for
  this project before this session started — it's the real, established
  mechanism, not something added speculatively.
- `vite.config.ts` sets `nitro: true`, which the `@lovable.dev/vite-tanstack-config`
  wrapper resolves with `defaultPreset: "cloudflare-module"` — but that's
  only a **fallback**. Nitro's own platform auto-detection (checking for
  the `VERCEL` env var Vercel's build system sets automatically) takes
  priority over that fallback. The `wrangler.json`/Cloudflare artifacts you
  may see from a local `npm run build` are a sandbox-only side effect of
  building somewhere Nitro can't detect a real target — they don't reflect
  what happens when Vercel's own build servers run the same command.

A new `nitro.config.ts` (added this round for security headers) is kept in
sync with `vercel.json`'s CSP as a harmless belt-and-suspenders, but
`vercel.json` is the one that actually governs on Vercel.

**Deploy command:**

```bash
# One-time setup, if this repo isn't already linked to a Vercel project:
vercel link

# Deploy to production:
vercel --prod
```

If this repo is already connected to a Vercel project via Git integration
(likely, since earlier sessions verified production deploys through Vercel),
you don't need the CLI at all — pushing to the connected branch triggers an
automatic production deploy. Check **Vercel dashboard → Project → Settings →
Git** to confirm which branch is set to auto-deploy.

---

## 4. Manual steps after the first deploy

1. **Stripe webhook** — in the Stripe Dashboard (test mode first, then live
   mode), add an endpoint:
   - Test: `https://<your-domain>/api/public/payments/webhook?env=sandbox`
   - Live: `https://<your-domain>/api/public/payments/webhook?env=live`
   - Subscribe to: `customer.subscription.created`, `customer.subscription.updated`,
     `customer.subscription.deleted`.
   - Copy the signing secret into `PAYMENTS_SANDBOX_WEBHOOK_SECRET` /
     `PAYMENTS_LIVE_WEBHOOK_SECRET`.

2. **Twilio webhooks** — on your Twilio phone number's configuration page:
   - Voice, "A call comes in": `https://<your-domain>/api/twilio/missed-call`
   - Messaging, "A message comes in": `https://<your-domain>/api/twilio/sms-reply`
   - If you're running the consumer marketplace on a second Twilio number
     (`CONSUMER_TWILIO_PHONE_NUMBER`), point its messaging webhook at:
     `https://<your-domain>/api/twilio/consumer-inbound`

3. **Custom domain** — attach your production domain in Vercel project
   settings, and update `SITE_URL` in `src/lib/seo.ts` (currently
   `https://www.lanavix.com`) if it differs.

4. **Supabase** — no action needed; all migrations in this repo are already
   applied to the live project.

5. **Smoke test after deploy** — once live, manually re-check the routes
   this session verified locally: `/`, `/pricing`, `/audit` (submit a real
   test audit and confirm the email arrives), `/app/verification` (as a
   signed-in test user), and a real Stripe test-mode checkout end to end.
