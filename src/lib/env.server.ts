/**
 * Runtime environment validation for Lanavix.
 *
 * Notes on scope, since this was written against a generic template
 * (Next.js + NextAuth + a direct Postgres connection) that doesn't match
 * this app:
 * - There is no `DATABASE_URL` here — this app talks to Postgres only
 *   through the Supabase client SDK, never a raw connection string. The
 *   real "core database" vars are `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
 *   (server) and `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (client).
 * - There is no `NEXTAUTH_SECRET` — this app uses Supabase Auth directly,
 *   which manages its own session signing; the app never holds a separate
 *   auth secret to validate.
 * - Requested categories were core/auth/email/billing/ai/monitoring. Two
 *   real vars (`MONDAY_API_KEY`, `MONDAY_LEAD_BOARD_ID`) don't fit any of
 *   those — they're a CRM sync integration, not monitoring/observability —
 *   so an extra `integrations` category was added rather than mislabeling
 *   them. `monitoring` is defined (so the type/category system supports it)
 *   but has no variables in it: no error-tracking/observability integration
 *   (Sentry, Datadog, etc.) exists anywhere in this codebase today.
 * - Lives at `src/lib/env.server.ts` (not repo-root `lib/env.ts`) to match
 *   this project's actual layout and its `@/lib/...` import alias, and
 *   carries the `.server.ts` suffix — same convention as
 *   `stripe.server.ts` / `monday.server.ts` / `email.server.ts` — since it
 *   reads secrets that must never end up in a client bundle.
 */

export type EnvCategory = "core" | "auth" | "email" | "billing" | "ai" | "monitoring" | "integrations";

export interface EnvVarDef {
  name: string;
  category: EnvCategory;
  required: boolean;
  description: string;
  /** Returns an error message if invalid, or null if the value is fine. */
  validate?: (value: string) => string | null;
}

export interface EnvVarStatus extends EnvVarDef {
  present: boolean;
  valid: boolean;
  error: string | null;
}

// ── Validators ──────────────────────────────────────────────────────────

function isHttpsUrl(value: string): string | null {
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? null : "must be an https:// URL";
  } catch {
    return "must be a valid URL";
  }
}

function isSupabaseUrl(value: string): string | null {
  const urlError = isHttpsUrl(value);
  if (urlError) return urlError;
  return value.includes(".supabase.co") ? null : "must be a *.supabase.co URL";
}

function minLength(n: number) {
  return (value: string): string | null =>
    value.length >= n ? null : `must be at least ${n} characters`;
}

function startsWith(prefix: string) {
  return (value: string): string | null =>
    value.startsWith(prefix) ? null : `must start with "${prefix}"`;
}

function startsWithAny(prefixes: string[]) {
  return (value: string): string | null =>
    prefixes.some((p) => value.startsWith(p))
      ? null
      : `must start with one of: ${prefixes.join(", ")}`;
}

function isE164Phone(value: string): string | null {
  return /^\+[1-9]\d{7,14}$/.test(value) ? null : "must be an E.164 phone number, e.g. +15555550100";
}

function isEmail(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? null : "must be a valid email address";
}

// ── Definitions ─────────────────────────────────────────────────────────

export const ENV_VARS: EnvVarDef[] = [
  // core — Supabase (the only database this app talks to) + Twilio (the
  // receptionist / missed-call text-back is the core, always-on product;
  // every plan, including free Starter, depends on it).
  {
    name: "SUPABASE_URL",
    category: "core",
    required: true,
    description: "Server-side Supabase project URL (admin client, auth middleware).",
    validate: isSupabaseUrl,
  },
  {
    name: "SUPABASE_PUBLISHABLE_KEY",
    category: "core",
    required: false,
    description: "Server-side Supabase publishable key. Only used as a fallback in client.ts and directly by auth-middleware.ts's requireSupabaseAuth (protected server functions e.g. checkout) — VITE_SUPABASE_PUBLISHABLE_KEY covers page rendering, so this isn't load-bearing for most routes.",
    validate: minLength(20),
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    category: "core",
    required: true,
    description: "Service-role key for the admin Supabase client. Bypasses RLS — server-only, never expose to the client.",
    validate: minLength(20),
  },
  {
    name: "TWILIO_ACCOUNT_SID",
    category: "core",
    required: true,
    description: "Twilio account SID for the business receptionist number (missed-call text-back, SMS conversations).",
    validate: startsWith("AC"),
  },
  {
    name: "TWILIO_AUTH_TOKEN",
    category: "core",
    required: true,
    description: "Twilio auth token — used to send SMS and to verify inbound webhook signatures.",
    validate: minLength(32),
  },
  {
    name: "TWILIO_PHONE_NUMBER",
    category: "core",
    required: true,
    description: "The business-side Twilio number missed calls/SMS are sent from.",
    validate: isE164Phone,
  },
  {
    name: "CONSUMER_TWILIO_PHONE_NUMBER",
    category: "core",
    required: false,
    description: "Consumer-marketplace Twilio number, shown in one line of SMS footer copy only. Cosmetic if unset.",
    validate: isE164Phone,
  },

  // auth — the client-side keys that actually drive sign-in/session in the
  // browser. This app uses Supabase Auth directly; there is no separate
  // NextAuth-style secret to validate.
  {
    name: "VITE_SUPABASE_URL",
    category: "auth",
    required: true,
    description: "Client-side Supabase project URL. Required for the app to load at all.",
    validate: isSupabaseUrl,
  },
  {
    name: "VITE_SUPABASE_PUBLISHABLE_KEY",
    category: "auth",
    required: true,
    description: "Client-side Supabase publishable (anon) key.",
    validate: minLength(20),
  },

  // email — contact-form notifications. No email integration existed in
  // this codebase before it was added for the contact form; all optional,
  // since a missing key just logs instead of sending (submissions still save).
  {
    name: "RESEND_API_KEY",
    category: "email",
    required: false,
    description: "Resend API key. Without it, contact-form notifications log instead of sending.",
    validate: startsWith("re_"),
  },
  {
    name: "RESEND_FROM_EMAIL",
    category: "email",
    required: false,
    description: "Sender address for outbound notification email. Defaults to a Lanavix address if unset.",
  },
  {
    name: "NOTIFICATION_EMAIL",
    category: "email",
    required: false,
    description: "Where contact-form notifications are sent. Defaults to moh@lanavix.com if unset.",
    validate: isEmail,
  },

  // billing — Stripe checkout/webhook code is live, but the real
  // Solo/Crew/Agency Stripe products/prices haven't been created yet (see
  // scripts/setup-stripe-products.mjs) — so billing is functionally on
  // hold regardless of whether these are set. Marked optional so a
  // deploy isn't blocked on Stripe config while that's pending.
  {
    name: "STRIPE_SANDBOX_API_KEY",
    category: "billing",
    required: false,
    description: "Stripe test-mode secret key, routed through the Lovable connector gateway. Billing on hold — see scripts/setup-stripe-products.mjs.",
    validate: startsWith("sk_test_"),
  },
  {
    name: "STRIPE_LIVE_API_KEY",
    category: "billing",
    required: false,
    description: "Stripe live-mode secret key. Billing on hold — see scripts/setup-stripe-products.mjs.",
    validate: startsWith("sk_live_"),
  },
  {
    name: "LOVABLE_API_KEY",
    category: "billing",
    required: false,
    description: "Auth key for the Lovable connector gateway that this app's Stripe calls route through. Billing on hold.",
  },
  {
    name: "PAYMENTS_SANDBOX_WEBHOOK_SECRET",
    category: "billing",
    required: false,
    description: "Stripe test-mode webhook signing secret. Billing on hold.",
    validate: startsWith("whsec_"),
  },
  {
    name: "PAYMENTS_LIVE_WEBHOOK_SECRET",
    category: "billing",
    required: false,
    description: "Stripe live-mode webhook signing secret. Billing on hold.",
    validate: startsWith("whsec_"),
  },
  {
    name: "VITE_PAYMENTS_CLIENT_TOKEN",
    category: "billing",
    required: false,
    description: "Stripe publishable key for the embedded checkout UI. Billing on hold.",
    validate: startsWithAny(["pk_test_", "pk_live_"]),
  },

  // ai
  {
    name: "ANTHROPIC_API_KEY",
    category: "ai",
    required: true,
    description: "Claude API key — powers the receptionist's AI replies, review responses, Lead Generator copy, and the orchestrator.",
    validate: startsWith("sk-ant-"),
  },
  {
    name: "GOOGLE_PLACES_API_KEY",
    category: "ai",
    required: true,
    description: "Google Places API key — the only real-business-data source for Lead Blast and the Lead Generator.",
  },

  // monitoring — no observability/error-tracking integration (Sentry,
  // Datadog, etc.) exists anywhere in this codebase yet. Left empty
  // rather than inventing one.

  // integrations — doesn't fit core/auth/email/billing/ai/monitoring; a
  // CRM sync, not an observability tool.
  {
    name: "MONDAY_API_KEY",
    category: "integrations",
    required: false,
    description: "Monday.com API key for lead CRM sync. Sync calls fail silently and log if unset.",
  },
  {
    name: "MONDAY_LEAD_BOARD_ID",
    category: "integrations",
    required: false,
    description: "Target Monday.com board ID for lead CRM sync.",
  },
];

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Validates every defined env var against `process.env`. In production
 * (`NODE_ENV === "production"`), throws a single descriptive error listing
 * every problem if any required variable is missing or any set variable
 * fails its validation rule. Outside production, the same problems are
 * logged as warnings instead of thrown, so local/dev work isn't blocked.
 */
export function validateEnv(): void {
  const problems: string[] = [];

  for (const def of ENV_VARS) {
    const value = process.env[def.name];
    if (!value) {
      if (def.required) problems.push(`Missing required env var: ${def.name} [${def.category}] — ${def.description}`);
      continue;
    }
    const error = def.validate?.(value);
    if (error) problems.push(`Invalid env var: ${def.name} [${def.category}] ${error}`);
  }

  if (problems.length === 0) return;

  const message = `Environment validation failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  } else {
    console.warn(message);
  }
}

/**
 * Whether every *required* variable in a category is present and valid.
 * Optional variables never block readiness — so `isIntegrationReady("billing")`
 * returns `true` today even with no Stripe keys set, since none of the
 * billing vars are marked required (billing is on hold pending real Stripe
 * products; see the note on the billing vars above). Use
 * `getEnvByCategory("billing")` if you need to check specific keys are
 * actually present rather than just "nothing required is missing."
 */
export function isIntegrationReady(category: EnvCategory): boolean {
  return ENV_VARS.filter((v) => v.category === category).every((def) => {
    const value = process.env[def.name];
    if (!value) return !def.required;
    return !def.validate?.(value);
  });
}

/** Returns the validation status of every env var in a category. */
export function getEnvByCategory(category: EnvCategory): EnvVarStatus[] {
  return ENV_VARS.filter((v) => v.category === category).map((def) => {
    const value = process.env[def.name];
    const present = !!value;
    const error = present ? (def.validate?.(value) ?? null) : null;
    return {
      ...def,
      present,
      valid: present ? error === null : !def.required,
      error,
    };
  });
}
