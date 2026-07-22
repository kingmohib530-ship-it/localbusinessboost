// Auto-loaded by Nitro (via c12) alongside the nitro() options passed from
// vite.config.ts's @lovable.dev/vite-tanstack-config wrapper — that wrapper
// only forwards a narrow preset/output/cloudflare surface, so route-level
// config like these security headers lives here instead.
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
