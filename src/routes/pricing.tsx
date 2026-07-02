import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Lunavx AI Workforce OS" },
      { name: "description", content: "Simple, transparent pricing for Lunavx. Starter $49, Pro $99, Enterprise $199. Start with a free 14-day trial." },
      { property: "og:title", content: "Pricing — Lunavx" },
      { property: "og:description", content: "Simple, transparent pricing. Start with a free 14-day trial." },
    ],
  }),
  component: PricingPage,
});

// ═══════════════════════════════════════════════════════════════════
//  PASTE YOUR 6 STRIPE PAYMENT LINK URLs HERE
//  Each one looks like: https://buy.stripe.com/test_xxxxxxxx
//  I will tell you exactly where to find these in Stripe Dashboard.
// ═══════════════════════════════════════════════════════════════════
const PAYMENT_LINKS = {
  starter_monthly:    "https://buy.stripe.com/test_3cIbJ291c0Gr3ezaWVa7C00",
  starter_annual:     "https://buy.stripe.com/test_aFa6oIa5g3SD3ez8ONa7C01",
  pro_monthly:        "https://buy.stripe.com/test_fZu6oI6T488T2av2qpa7C02",
  pro_annual:         "https://buy.stripe.com/test_8x24gAdhs2OzdTdfdba7C03",
  enterprise_monthly: "https://buy.stripe.com/test_3cI7sMb9k0Gr8yTd53a7C04",
  enterprise_annual:  "https://buy.stripe.com/test_3cIbJ2fpAcp902n7KJa7C05",
};
// ═══════════════════════════════════════════════════════════════════

interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyKey: keyof typeof PAYMENT_LINKS;
  annualKey: keyof typeof PAYMENT_LINKS;
  features: string[];
  featured: boolean;
  badge?: string;
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo operators getting started",
    monthlyPrice: 49,
    annualPrice: 39,
    monthlyKey: "starter_monthly",
    annualKey: "starter_annual",
    cta: "Start free trial",
    featured: false,
    features: [
      "Full 8-agent AI workforce",
      "50 campaigns per month",
      "500 lead lookups / month",
      "Email outreach generator",
      "Basic revenue projections",
      "Free Business Audit",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Local businesses ready to grow on autopilot",
    monthlyPrice: 99,
    annualPrice: 79,
    monthlyKey: "pro_monthly",
    annualKey: "pro_annual",
    cta: "Start free trial",
    featured: true,
    badge: "Most popular",
    features: [
      "Everything in Starter",
      "Unlimited campaigns",
      "1,000 lead lookups / month",
      "All one-click playbooks",
      "Automated follow-up sequences",
      "Competitor intelligence",
      "Advanced revenue forecasts",
      "Review request SMS templates",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-location operators and agencies",
    monthlyPrice: 199,
    annualPrice: 159,
    monthlyKey: "enterprise_monthly",
    annualKey: "enterprise_annual",
    cta: "Start free trial",
    featured: false,
    features: [
      "Everything in Pro",
      "Unlimited everything",
      "Multi-location + team seats",
      "Custom AI agent training",
      "Dedicated success manager",
      "SLA + SSO",
      "API access",
    ],
  },
];

function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  function handleCheckout(plan: Plan) {
    const key = isAnnual ? plan.annualKey : plan.monthlyKey;
    const url = PAYMENT_LINKS[key];
    if (!url || url === "PASTE_STRIPE_LINK_HERE") {
      alert("Payment link not set up yet. Check back soon!");
      return;
    }
    window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      {/* ── Hero ── */}
      <section className="py-16 px-4 text-center border-b bg-muted/30">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
          Pricing
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Simple pricing. Pays for itself in week one.
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          All plans include every AI agent and a 14-day free trial.
          No setup fees. Cancel any time.
        </p>

        {/* ── Billing toggle ── */}
        <div className="inline-flex items-center bg-background border rounded-xl p-1 gap-1">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              !isAnnual
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              isAnnual
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isAnnual ? "bg-white/20 text-white" : "bg-green-100 text-green-700"
            }`}>
              Save 20%
            </span>
          </button>
        </div>
      </section>

      {/* ── Plan cards ── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 flex flex-col border bg-background transition-shadow hover:shadow-lg ${
                plan.featured
                  ? "border-primary ring-2 ring-primary/20 shadow-md"
                  : "border-border"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-bold rounded-full shadow">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold">$</span>
                  <span className="text-5xl font-extrabold tracking-tight">
                    {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                {isAnnual && (
                  <p className="text-xs text-green-600 font-semibold">
                    Save ${(plan.monthlyPrice - plan.annualPrice) * 12}/yr
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2 leading-snug">
                  {plan.tagline}
                </p>
              </div>

              <div className="h-px bg-border mb-6" />

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-0.5 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5 text-green-600" />
                    </div>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleCheckout(plan)}
                className={`w-full font-semibold rounded-xl h-11 ${
                  plan.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-background border border-border text-foreground hover:bg-muted"
                }`}
                variant={plan.featured ? "default" : "outline"}
              >
                {plan.cta}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          All plans include the full 8-agent workforce. No hidden charges. No setup fees.
        </p>
      </section>

      {/* ── Feature table ── */}
      <section className="py-12 px-4 bg-muted/30 border-t border-b">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Everything you get</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Starter</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary uppercase text-xs tracking-wider bg-primary/5 rounded-t-lg">Pro</th>
                  <th className="text-center py-3 pl-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["All 8 AI agents",        "✓",     "✓",          "✓"],
                  ["Campaigns / month",       "50",    "Unlimited",  "Unlimited"],
                  ["Lead lookups / month",    "500",   "1,000",      "Unlimited"],
                  ["Automated follow-ups",    "—",     "✓",          "✓"],
                  ["Competitor intelligence", "—",     "✓",          "✓"],
                  ["Revenue projections",     "Basic", "Advanced",   "Advanced"],
                  ["Review SMS templates",    "—",     "✓",          "✓"],
                  ["Multi-location seats",    "—",     "—",          "✓"],
                  ["API access",              "—",     "—",          "✓"],
                  ["Support",                 "Email", "Priority",   "Dedicated"],
                ].map(([label, s, p, e], i) => (
                  <tr key={i} className={`border-b ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="py-3 pr-4 font-medium">{label}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{s}</td>
                    <td className="py-3 px-4 text-center font-semibold text-primary bg-primary/5">{p}</td>
                    <td className="py-3 pl-4 text-center text-muted-foreground">{e}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Common questions</h2>
          <div className="flex flex-col gap-1">
            {[
              ["Is there really a free trial?", "Yes — 14 days free on every paid plan. No credit card required to start. Cancel before day 15 and you pay nothing."],
              ["Can I switch plans?", "Yes, any time. Upgrades are immediate and prorated. Downgrades take effect at the end of your billing period."],
              ["What counts as a campaign?", "One AI workflow run — like Local Lead Blast, Review Recovery, or Cold Email Sprint. Browsing doesn't count."],
              ["Can I pause instead of cancel?", "Yes. Pause your subscription for 30 days from billing settings. Your data stays safe."],
              ["Is my data safe?", "All data is encrypted at rest and in transit. We never sell your data. Your information belongs to you."],
            ].map(([q, a], i) => (
              <details key={i} className="border rounded-xl overflow-hidden group">
                <summary className="flex justify-between items-center px-5 py-4 cursor-pointer font-semibold text-sm hover:bg-muted/40 list-none">
                  {q}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="py-16 px-4 bg-primary text-primary-foreground text-center">
        <h2 className="text-3xl font-extrabold tracking-tight mb-3">
          Not sure which plan? Start with the audit.
        </h2>
        <p className="text-primary-foreground/70 max-w-md mx-auto mb-8">
          Get your free Lunavx Business Audit — scored across 4 categories in 60 seconds.
        </p>
        <a
          href="/audit"
          className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-3.5 rounded-xl text-base hover:bg-white/90 transition-colors shadow-lg"
        >
          Get My Free Business Audit
          <ArrowRight className="w-4 h-4" />
        </a>
        <p className="mt-4 text-sm text-primary-foreground/50">
          Free forever · No credit card · 60 seconds
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}