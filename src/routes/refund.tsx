import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Lanavix" },
      { name: "description", content: "Lanavix's 30-day money-back guarantee and refund policy." },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
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
        <h1 style={{ fontSize: "36px", fontWeight: 900, marginBottom: "8px" }}>Refund Policy</h1>
        <p style={{ color: "#6b7280", marginBottom: "48px" }}>Last updated: June 2026</p>

        {[
          {
            title: "1. 30-Day Money-Back Guarantee",
            body: `If you do not recover at least one job worth more than your monthly fee within 30 days of your first paid month, contact us at moh@lanavix.com for a full refund. This guarantee applies to your first month only and requires that you actively use the platform's core features (Missed Call Text-Back, Reputation Autopilot, or Local Lead Blast) during that period.`,
          },
          {
            title: "2. How to Request a Refund",
            body: `Email moh@lanavix.com with your account email and the reason for your request. We aim to respond within 1 business day. Approved refunds are issued to your original payment method via Stripe and typically appear within 5-10 business days.`,
          },
          {
            title: "3. After the First Month",
            body: `Once you're past your first paid month, we don't provide prorated refunds for unused portions of a billing period. You can cancel anytime from your account settings — cancellation takes effect at the end of your current billing period, and you won't be billed again.`,
          },
          {
            title: "4. Free Trial",
            body: `If your plan includes a free trial period, you will not be charged until the trial ends. Cancel before the trial ends to avoid any charge.`,
          },
          {
            title: "5. Contact",
            body: `Questions about a charge or a refund? Contact us at moh@lanavix.com.`,
          },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>{section.title}</h2>
            <p style={{ color: "#374151", lineHeight: 1.8, fontSize: "15px" }}>{section.body}</p>
          </div>
        ))}
      </div>

      <footer style={{ borderTop: "1px solid #e5e7eb", padding: "24px 32px", textAlign: "center" }}>
        <p style={{ color: "#9ca3af", fontSize: "13px" }}>© 2026 Lanavix · <Link to="/terms" style={{ color: "#6366f1", textDecoration: "none" }}>Terms of Service</Link> · moh@lanavix.com</p>
      </footer>
    </div>
  );
}
