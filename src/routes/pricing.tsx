import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Lunavx AI Workforce OS" },
      { name: "description", content: "Simple, transparent pricing for Lunavx. Start with a 14-day free trial." },
      { property: "og:title", content: "Pricing — Lunavx" },
    ],
  }),
  component: PricingPage,
});

const PAYMENT_LINKS = {
  starter_monthly:    "https://buy.stripe.com/test_3cIbJ291c0Gr3ezaWVa7C00",
  starter_annual:     "https://buy.stripe.com/test_aFa6oIa5g3SD3ez8ONa7C01",
  pro_monthly:        "https://buy.stripe.com/test_fZu6oI6T488T2av2qpa7C02",
  pro_annual:         "https://buy.stripe.com/test_8x24gAdhs2OzdTdfdba7C03",
  enterprise_monthly: "https://buy.stripe.com/test_3cI7sMb9k0Gr8yTd53a7C04",
  enterprise_annual:  "https://buy.stripe.com/test_3cIbJ2fpAcp902n7KJa7C05",
};

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo operators getting started",
    monthly: 49, annual: 39,
    monthlyKey: "starter_monthly" as const,
    annualKey: "starter_annual" as const,
    featured: false,
    features: ["Full 8-agent AI workforce","50 campaigns per month","500 lead lookups / month","Email outreach generator","Basic revenue projections","Free Business Audit","Email support"],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Local businesses ready to grow on autopilot",
    monthly: 99, annual: 79,
    monthlyKey: "pro_monthly" as const,
    annualKey: "pro_annual" as const,
    featured: true,
    features: ["Everything in Starter","Unlimited campaigns","1,000 lead lookups / month","All one-click playbooks","Automated follow-up sequences","Competitor intelligence","Advanced revenue forecasts","Review request SMS templates","Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-location operators and agencies",
    monthly: 199, annual: 159,
    monthlyKey: "enterprise_monthly" as const,
    annualKey: "enterprise_annual" as const,
    featured: false,
    features: ["Everything in Pro","Unlimited everything","Multi-location + team seats","Custom AI agent training","Dedicated success manager","SLA + SSO","API access"],
  },
];

function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* Nav */}
      <nav style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 8 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 18, color: "#0f172a", textDecoration: "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L15.5 5.5V12.5L9 16L2.5 12.5V5.5L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="9" cy="9" r="2.5" fill="white"/>
              </svg>
            </div>
            Lunavx
          </a>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <a href="/auth" style={{ fontSize: 14, fontWeight: 500, color: "#475569", padding: "7px 14px", textDecoration: "none" }}>Sign in</a>
            <a href="/audit" style={{ fontSize: 14, fontWeight: 600, padding: "8px 18px", background: "#6366f1", color: "white", borderRadius: 10, textDecoration: "none" }}>Get Free Audit</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "60px 24px 40px", background: "linear-gradient(180deg, #fafbff 0%, #f8fafc 100%)", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "inline-block", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6366f1", background: "#eef2ff", padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(99,102,241,0.2)", marginBottom: 16 }}>
          Pricing
        </div>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 42px)", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 12px", color: "#0f172a" }}>
          Simple pricing. Pays for itself in week one.
        </h1>
        <p style={{ fontSize: 17, color: "#475569", maxWidth: 480, margin: "0 auto 24px" }}>
          All plans include every AI agent and a 14-day free trial. No setup fees. Cancel any time.
        </p>
        <div style={{ display: "inline-flex", background: "white", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: 3 }}>
          <button onClick={() => setIsAnnual(false)} style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 500, fontSize: 14, background: isAnnual ? "none" : "#6366f1", color: isAnnual ? "#475569" : "white", transition: "all .15s" }}>Monthly</button>
          <button onClick={() => setIsAnnual(true)} style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 500, fontSize: 14, background: isAnnual ? "#6366f1" : "none", color: isAnnual ? "white" : "#475569", display: "flex", alignItems: "center", gap: 8 }}>
            Annual
            <span style={{ fontSize: 11, fontWeight: 700, background: isAnnual ? "rgba(255,255,255,0.2)" : "#ecfdf5", color: isAnnual ? "white" : "#065f46", padding: "2px 7px", borderRadius: 4 }}>Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 24px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 16 }}>
          {PLANS.map((plan) => {
            const price = isAnnual ? plan.annual : plan.monthly;
            const key = isAnnual ? plan.annualKey : plan.monthlyKey;
            const saving = (plan.monthly - plan.annual) * 12;
            return (
              <div key={plan.id} style={{ background: "white", border: plan.featured ? "2px solid #6366f1" : "1.5px solid #e2e8f0", borderRadius: 24, padding: 28, position: "relative", display: "flex", flexDirection: "column", boxShadow: plan.featured ? "0 0 0 4px rgba(99,102,241,0.08)" : "none" }}>
                {plan.featured && (
                  <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#6366f1", color: "white", fontSize: 12, fontWeight: 700, padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap" }}>
                    Most popular
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 700 }}>$</span>
                  <span style={{ fontSize: 50, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>{price}</span>
                  <span style={{ fontSize: 15, color: "#475569", marginLeft: 2 }}>/mo</span>
                </div>
                {isAnnual && <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600, marginBottom: 4 }}>Save ${saving}/yr</div>}
                <div style={{ fontSize: 14, color: "#475569", marginBottom: 20, lineHeight: 1.5 }}>{plan.tagline}</div>
                <div style={{ height: 1, background: "#e2e8f0", marginBottom: 20 }} />
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#475569" }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</div>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => { window.location.href = PAYMENT_LINKS[key]; }}
                  style={{ width: "100%", padding: 13, borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", border: plan.featured ? "none" : "1.5px solid #e2e8f0", background: plan.featured ? "#6366f1" : "white", color: plan.featured ? "white" : "#0f172a", boxShadow: plan.featured ? "0 4px 14px rgba(99,102,241,0.3)" : "none" }}
                >
                  Start 14-day free trial →
                </button>
              </div>
            );
          })}
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8" }}>All plans include the full 8-agent workforce. No hidden charges.</p>
      </div>

      {/* Bottom CTA */}
      <div style={{ background: "#0f172a", textAlign: "center", padding: "72px 24px" }}>
        <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, color: "white", marginBottom: 12 }}>Not sure which plan? Start with the audit.</h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", maxWidth: 460, margin: "0 auto 24px" }}>Get your free Lunavx Business Audit in 60 seconds.</p>
        <a href="/audit" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", background: "#6366f1", color: "white", borderRadius: 12, fontSize: 16, fontWeight: 600, textDecoration: "none" }}>
          Get My Free Business Audit →
        </a>
        <p style={{ marginTop: 14, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Free forever · No credit card · 60 seconds</p>
      </div>

      {/* Footer */}
      <div style={{ background: "#0f172a", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.3)", flexWrap: "wrap", gap: 8 }}>
          <span>© 2026 Lunavx. All rights reserved.</span>
          <span style={{ display: "flex", gap: 16 }}>
            <a href="/privacy" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Privacy</a>
            <a href="/terms" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>Terms</a>
          </span>
        </div>
      </div>
    </div>
  );
}
