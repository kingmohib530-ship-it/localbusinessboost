import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", color: "#0f172a", background: "#fff", minHeight: "100vh" }}>
      {/* Nav */}
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
        <h1 style={{ fontSize: "36px", fontWeight: 900, marginBottom: "8px" }}>Privacy Policy</h1>
        <p style={{ color: "#6b7280", marginBottom: "48px" }}>Last updated: June 2026</p>

        {[
          {
            title: "1. Who We Are",
            body: `Lanavix is an AI workforce platform for local service businesses and contractors. We are operated by Mohib Ahmadzai, based in Manassas, Virginia, USA. You can reach us at moh@lanavix.com.`,
          },
          {
            title: "2. Information We Collect",
            body: `We collect information you provide directly when you create an account (name, email address, business name, industry, and phone number), when you use our services (business audit inputs, campaign data, lead information), and automatically through your use of the platform (usage data, IP address, browser type).`,
          },
          {
            title: "3. How We Use Your Information",
            body: `We use your information to provide and improve the Lanavix platform, send automated SMS messages on your behalf (Missed Call Text-Back, Review Requests), generate AI-powered leads and audit reports, communicate with you about your account, and comply with legal obligations.`,
          },
          {
            title: "4. SMS Messaging",
            body: `When you use Lanavix's Missed Call Text-Back or Reputation Autopilot features, our platform sends SMS messages on your behalf to your customers. You are responsible for ensuring you have appropriate consent from your customers to receive these messages. Standard message and data rates may apply.`,
          },
          {
            title: "5. Data Sharing",
            body: `We do not sell your personal data. We share data only with service providers that help us operate the platform (Supabase for database, Twilio for SMS, Anthropic for AI, Stripe for payments). All providers are contractually required to protect your data.`,
          },
          {
            title: "6. Data Retention",
            body: `We retain your account data for as long as your account is active. If you cancel your account, we will delete your personal data within 30 days upon request, except where we are required to retain it by law.`,
          },
          {
            title: "7. Your Rights",
            body: `You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us at moh@lanavix.com. We will respond within 30 days.`,
          },
          {
            title: "8. Security",
            body: `We use industry-standard encryption and security practices to protect your data. Your data is stored in Supabase, which uses bank-grade security infrastructure. However, no system is 100% secure and we cannot guarantee absolute security.`,
          },
          {
            title: "9. Cookies",
            body: `We use essential cookies to keep you logged in and remember your preferences. We do not use advertising or tracking cookies.`,
          },
          {
            title: "10. Changes to This Policy",
            body: `We may update this policy from time to time. We will notify you of significant changes by email or by displaying a notice in the app. Your continued use of Lanavix after changes constitutes your acceptance of the updated policy.`,
          },
          {
            title: "11. Contact",
            body: `For privacy-related questions, contact us at moh@lanavix.com or write to: Lanavix, Manassas, Virginia, USA.`,
          },
        ].map(section => (
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
