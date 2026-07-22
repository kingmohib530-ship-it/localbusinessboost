// Auto-loaded by Nitro (via c12) alongside the nitro() options passed from
// vite.config.ts's @lovable.dev/vite-tanstack-config wrapper — that wrapper
// only forwards a narrow preset/output/cloudflare surface, so route-level
// config like these security headers lives here instead.
//
// This project's real deploy target is Vercel (see root vercel.json, which
// already carries the same headers and is the mechanism Vercel actually
// honors) — the Cloudflare/wrangler build artifacts this sandbox produces
// locally are just this wrapper's hardcoded fallback `defaultPreset` when
// no platform env var (e.g. `VERCEL`) is present to auto-detect; Nitro's
// own platform auto-detection wins over that fallback on a real Vercel
// build. Kept here too (in sync with vercel.json's CSP) as a harmless
// belt-and-suspenders in case that ever changes.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://checkout.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

export default {
  routeRules: {
    "/**": {
      headers: {
        "Content-Security-Policy": CSP,
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      },
    },
  },
};
