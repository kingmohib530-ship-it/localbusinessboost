import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: pageMeta({
      title: "Cookie Policy — Lanavix",
      description: "How Lanavix uses cookies and local storage.",
      path: "/cookies",
    }),
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", color: "#0f172a", background: "#fff", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid #e5e7eb", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg, #6366f1, #818cf8)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: "14px" }}>⚡</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "18px", color: "#0f0f1a" }}>Lanavix</span>
        </Link>
        <Link to="/" style={{ color: "#6366f1", textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>← Back to home</Link>
      </nav>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "64px 32px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 900, marginBottom: "8px" }}>Cookie Policy</h1>
        <p style={{ color: "#6b7280", marginBottom: "48px" }}>Last updated: June 2026</p>

        {[
          {
            title: "1. We Don't Use Tracking or Advertising Cookies",
            body: `Lanavix does not use third-party advertising or analytics cookies to track you across the web. We don't sell your data, and we don't run retargeting ads.`,
          },
          {
            title: "2. What We Actually Use",
            body: `To keep you signed in, Lanavix stores your authentication session in your browser's local storage (not a tracking cookie) via Supabase Auth. This is strictly necessary for the service to function — without it, you'd have to sign in again on every page load.`,
          },
          {
            title: "3. Third-Party Services",
            body: `Payment processing (Stripe) and SMS delivery (Twilio) may set their own cookies or local storage when you interact directly with their embedded checkout or hosted pages. These are governed by Stripe's and Twilio's own privacy policies, not this one.`,
          },
          {
            title: "4. Your Choices",
            body: `Because Lanavix only stores what's strictly necessary to keep you signed in, there's no cookie consent banner to configure — clearing your browser's local storage will simply sign you out.`,
          },
          {
            title: "5. Contact",
            body: `Questions about this policy? Contact us at moh@lanavix.com.`,
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>{section.title}</h2>
            <p style={{ color: "#374151", lineHeight: 1.8, fontSize: "15px" }}>{section.body}</p>
          </div>
        ))}
      </div>

      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "24px 32px", textAlign: "center" }}>
        <p style={{ color: "#9ca3af", fontSize: "13px" }}>© 2026 Lanavix · <Link to="/privacy" style={{ color: "#6366f1", textDecoration: "none" }}>Privacy Policy</Link> · moh@lanavix.com</p>
      </footer>
    </div>
  );
}
