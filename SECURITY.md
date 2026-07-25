# Lanavix Security Hardening Report

Scope note up front: the request this was generated from was a generic
25-point enterprise checklist (Kubernetes hardening, SSH configs, WAF rules,
CI/CD SAST/DAST pipelines, Cloudflare Bot Management, etc.). Lanavix is a
TanStack Start app on Vercel with Supabase as its only backend — there is no
Kubernetes, no servers to SSH into, no containers, and no CI/CD pipeline of
its own to harden. Sections below are grounded in what's actually here, not
a checklist-shaped fiction. Where a checklist item is handled by the
platform (Supabase/Vercel) rather than application code, that's stated
explicitly rather than claimed as "implemented."

## 1. Vulnerabilities found

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `verification-docs` Storage bucket had `file_size_limit` and `allowed_mime_types` both `null` — any file type/size was accepted server-side. The client's `accept=` hint is cosmetic only. | **High** | Fixed |
| 2 | Three legacy API routes (`generate-content.ts`, `generate-weekly-plan.ts`, `public/leads.ts`) were live, unauthenticated-adjacent attack surface, unreferenced by any UI, and broken against the current schema (referenced `profiles.plan`, `profiles.user_id`, `businesses.organization_id` — none exist). | Medium | Fixed (removed) |
| 3 | `public/billing/portal.ts` + `createPortalSession` were an orphaned, unused duplicate of the real checkout flow, re-implementing auth manually instead of the vetted `requireSupabaseAuth` middleware, with an unvalidated `returnUrl` and no rate limiting. | Medium | Fixed (removed) |
| 4 | `public/chatbot/$business_id.ts` (embeddable widget config endpoint) had zero rate limiting. | Medium | Fixed |
| 5 | `public/contact.ts` used wildcard CORS (`*`) despite only ever being called same-origin. | Low | Fixed |
| 6 | Stripe webhook signature check used `Array.includes()` (short-circuiting `===`) instead of constant-time comparison — theoretical timing side-channel; the Twilio signature check next to it already did this correctly. | Low | Fixed |
| 7 | Supabase's own security advisor: leaked-password protection (HaveIBeenPwned check) is disabled on the project. | Medium | **Not fixed — dashboard-only setting, see remediation plan** |
| 8 | No MFA available to any user, including admins. | Medium | **Not fixed — no UI exists; scoping below** |

## 2. Security improvements implemented this session

- 10MB file-size cap + MIME allowlist (JPEG/PNG/WEBP/HEIC/PDF) enforced
  server-side on the verification-docs bucket, with a matching client-side
  check for a friendly error message.
- Removed ~1,070 lines of dead/broken/duplicate code across 4 files,
  closing that attack surface entirely and dropping the pre-existing
  `tsc` error baseline from 150 → 144.
- IP-based rate limiting added to the last unprotected public endpoint.
- CORS tightened to same-origin on the one endpoint that didn't need to
  be cross-origin-embeddable.
- Constant-time signature comparison aligned across both webhook
  verifiers (Stripe and Twilio).

## 3. What was already in place (verified, not newly built)

This app has had substantial security work done across prior rounds this
session, re-verified now rather than re-built:

- **Auth**: every mutating API route checks a Bearer Supabase JWT via
  `supabaseAdmin.auth.getUser(token)` before doing anything. Admin-only
  routes additionally check `profiles.is_admin` server-side
  (`authenticateAdmin`) — never trust a frontend-hidden button.
- **IDOR**: every user-data route scopes its query with
  `.eq("user_id", user.id)` (or the equivalent `id` check) — verified this
  pattern on appointments, review requests/responses, account
  export/delete, lead profiles. `profiles.is_admin` cannot be
  self-escalated (a dedicated trigger blocks non-admins from setting it
  on their own row — done in an earlier round, re-verified still active).
- **RLS**: enabled on **every** table in the public schema, confirmed via
  direct query, not just spot-checked. Supabase's automated advisor flags
  5 tables as "RLS enabled, no policies" — verified each individually:
  they're only ever touched via `SECURITY DEFINER` RPCs or the
  service-role client, so zero client-facing policies is the *correct*
  deny-by-default configuration, not a gap.
- **Injection**: no raw SQL string construction anywhere in application
  code — everything goes through the Supabase query builder (parameterized
  by construction) or fixed-name RPC calls with typed arguments.
- **Webhook/signature verification**: Stripe webhook validates HMAC-SHA256
  over `timestamp.body` and rejects anything older than 300 seconds
  (replay protection) — now constant-time. Twilio webhooks
  (`missed-call`, `sms-reply`, `consumer-inbound`) all verify
  `X-Twilio-Signature` before processing.
- **Rate limiting**: present on every remaining public and authenticated
  endpoint that does anything costly (AI calls, SMS sends, Google Places
  lookups) — IP-keyed for anonymous traffic, user-keyed for authenticated
  traffic, with both hourly and (for the two most abuse-prone endpoints)
  daily ceilings.
- **Secrets**: zero `process.env` references in any client (`.tsx`)
  file — confirmed by grep, not assumption. Only `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_PAYMENTS_CLIENT_TOKEN` reach
  the client bundle, all three explicitly designed by their providers to
  be public (anon key works only through RLS; Stripe publishable key can
  only start a client-side checkout session). No hardcoded API keys,
  passwords, or tokens anywhere in `src/` (checked for `sk_test_`,
  `sk_live_`, `whsec_`, Twilio SID patterns).
- **XSS**: React auto-escapes all interpolated content by default. Only
  two `dangerouslySetInnerHTML` uses exist in the whole codebase — both
  render fixed, non-user-controlled strings (a static `<style>` block, a
  chart-theming CSS block built from a fixed config object) — no
  user-supplied data reaches either.
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, and Permissions-Policy on every route (added last
  round, `vercel.json` + `nitro.config.ts` in sync).
- **Env validation**: the app refuses to boot in production if a required
  secret is missing or malformed (`validateEnv()`, wired into
  `src/server.ts` last round).

## 4. Remaining risks, with severity and why they're unresolved

| Risk | Severity | Why it's not fixed here |
|---|---|---|
| **Leaked-password protection disabled** | Medium | This is a Supabase Auth *project setting* (Dashboard → Authentication → Policies), not something reachable via SQL or the Supabase MCP tools available in this session. **Action for you**: toggle it on — it's a single checkbox, zero code risk. |
| **No MFA** | Medium | Supabase Auth supports TOTP MFA at the API level, but there's no enrollment/challenge UI anywhere in this app. Building that (QR enrollment, backup codes, a challenge step in the sign-in flow) is a real feature project, not a hardening tweak — rushing it in under deploy pressure risks breaking the working sign-in flow for every user. Scoped separately below. |
| **No account lockout / CAPTCHA on login** | Medium | Auth goes directly from the browser to Supabase's hosted GoTrue service (no custom auth endpoint of ours to add this to — see the prior round's note on this exact point). GoTrue has its own internal abuse protection. A CAPTCHA (e.g. hCaptcha/Turnstile) is supportable via a Supabase Auth hook, but again a real integration project (sign up for a CAPTCHA provider, wire the widget into the client, configure the hook), not a code-only fix. |
| **Session storage is `localStorage`, not an httpOnly cookie** | Low–Medium | This is Supabase Auth's default client-side session model. An httpOnly-cookie-based session would require moving auth to a server-rendered cookie flow — a meaningful architecture change to the whole app, not a patch. Given no XSS vector was found (see §3), the practical exposure is limited today, but this is worth a deliberate future decision, not a silent change. |
| **`'unsafe-inline'` in the CSP's `script-src`** | Low | Needed because this app relies on inline script for its SSR hydration bootstrap; a nonce-based CSP would need real testing against a live deploy (this sandbox's network policy blocks reaching the real site to verify it wouldn't break hydration — see below). Flagged, not silently tightened. |
| **No virus/malware scanning on uploaded verification documents** | Low | Requires a third-party scanning service (e.g., ClamAV via a queue, or a vendor API) — a new integration decision and cost, not a code fix. MIME/size restriction (fixed this round) closes the most common abuse path (arbitrary executable/script upload); scanning for embedded malware in an otherwise-valid PDF/image is a separate, larger investment. |
| **Live third-party integrations not penetration-tested** | N/A | This sandbox's network policy blocks reaching your live Supabase project, Stripe, Twilio, and Google directly (confirmed via the proxy's own diagnostic log during the prior round's journey test) — so nothing here was tested against a live, running deployment. Everything above was verified by direct code/schema audit and Supabase's own security advisor tool, not a live attack simulation. |

## 5. Prioritized remediation plan

1. **Now, zero code risk**: enable leaked-password protection in the
   Supabase dashboard (Authentication → Policies).
2. **Before or shortly after launch**: decide on CAPTCHA for
   signup/login if bot signups become a real problem — don't pre-build it
   speculatively.
3. **Post-launch feature project**: MFA (TOTP) for all users, admin
   accounts first. Real scope: enrollment UI, backup codes, a challenge
   step in `auth.tsx`'s sign-in flow, and a way to require it specifically
   for `is_admin` accounts.
4. **When traffic/budget justifies it**: malware scanning on verification
   document uploads.
5. **Ongoing**: re-run `mcp__Supabase__get_advisors` after any schema
   change — it catches RLS/policy regressions automatically and is the
   single highest-leverage recurring check available.

## 6. Security architecture overview

```
Browser (React/TanStack Start)
  │  Bearer JWT (Supabase session, localStorage) — no cookies used for API auth,
  │  so CSRF is structurally low-risk for the API layer (no ambient credential
  │  a third-party page could make the browser attach automatically)
  ▼
Vercel Edge/Functions (SSR + API routes)
  │  • Every route re-verifies the JWT server-side via supabaseAdmin.auth.getUser()
  │  • Admin routes additionally check profiles.is_admin (server-side only)
  │  • Rate limiting (IP or user-keyed) before any costly downstream call
  │  • Zod validation on all structured input
  │  • Security headers (CSP/HSTS/etc.) via vercel.json + nitro.config.ts
  ▼
Supabase (Postgres + Auth + Storage)
  │  • RLS enabled on every table; deny-by-default for anything not
  │    explicitly granted a policy
  │  • Service-role key used only inside .server.ts files / server route
  │    handlers, never reachable from the client
  │  • Storage buckets: MIME + size restricted server-side
  ▼
Third parties (Stripe, Twilio, Anthropic, Google Places, Resend)
  • Inbound webhooks (Stripe, Twilio) verify HMAC signatures + timestamp
    freshness before trusting any payload
  • Outbound calls use env-configured secrets only, never client-supplied
```

## 7–10. Verifications

- **Secrets protected**: confirmed — no secrets in client bundle, none
  hardcoded in source, `.server.ts` convention consistently followed.
- **APIs secured**: confirmed — auth, rate limiting, and input validation
  present on every live endpoint (dead/duplicate endpoints removed rather
  than hardened, since they served no purpose).
- **AuthN/AuthZ enforced**: confirmed server-side on every route; no
  authorization decision relies on a hidden frontend element.
- **Database protected**: confirmed — RLS everywhere, encryption at rest
  and in transit are Supabase-managed platform guarantees (not application
  code to verify here), backups/PITR are a Supabase project-plan setting
  you should confirm is enabled at your current plan tier.
- **Infrastructure**: DDoS protection, edge network, and TLS termination
  are Vercel platform guarantees, not something this codebase configures.
  There is no origin server of your own to expose or firewall.

---

*Generated as part of a security hardening pass. `tsc --noEmit` holds at
144 errors (down from 150 — all pre-existing, unrelated to this change),
`npm run build` succeeds, and the Supabase live baseline (11 profiles) was
confirmed unchanged after every DB-level test performed during this audit.*
