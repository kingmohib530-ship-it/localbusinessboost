import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, X, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — LUNAVX AI Workforce OS" },
      { name: "description", content: "Simple, transparent pricing for LUNAVX. Starter $49, Growth $99, Pro $199. Start with a free 14-day trial." },
      { property: "og:title", content: "Pricing — LUNAVX" },
      { property: "og:description", content: "Simple, transparent pricing. Start with a free 14-day trial." },
      { property: "og:url", content: "https://localbusinessboost.lovable.app/pricing" },
    ],
    links: [
      { rel: "canonical", href: "https://localbusinessboost.lovable.app/pricing" },
    ],
  }),
  component: PricingPage,
});

type Tier = {
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  featured?: boolean;
  features: string[];
  cta: string;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    tagline: "Solo operators getting started",
    monthly: 49,
    annual: 39,
    features: [
      "All 8 AI agents",
      "50 campaigns per month",
      "Email outreach generator",
      "Basic revenue projections",
      "Email support",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Growth",
    tagline: "Local businesses & busy freelancers",
    monthly: 99,
    annual: 79,
    featured: true,
    features: [
      "Everything in Starter",
      "Unlimited campaigns",
      "Lead generation + enrichment",
      "Automated follow-up sequences",
      "Monday.com & calendar sync",
      "Priority support",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Pro",
    tagline: "Agencies & multi-location teams",
    monthly: 199,
    annual: 159,
    features: [
      "Everything in Growth",
      "Multi-brand workspaces",
      "Custom AI agent training",
      "Advanced analytics & forecasts",
      "Dedicated success manager",
      "API access",
    ],
    cta: "Start Free Trial",
  },
];

const COMPARISON: { feature: string; starter: boolean | string; growth: boolean | string; pro: boolean | string }[] = [
  { feature: "All 8 AI agents", starter: true, growth: true, pro: true },
  { feature: "Campaigns per month", starter: "50", growth: "Unlimited", pro: "Unlimited" },
  { feature: "Lead generation", starter: false, growth: true, pro: true },
  { feature: "Automated follow-ups", starter: false, growth: true, pro: true },
  { feature: "Revenue projections", starter: "Basic", growth: "Advanced", pro: "Advanced + forecasts" },
  { feature: "Monday.com integration", starter: false, growth: true, pro: true },
  { feature: "Multi-brand workspaces", starter: false, growth: false, pro: true },
  { feature: "Custom agent training", starter: false, growth: false, pro: true },
  { feature: "API access", starter: false, growth: false, pro: true },
  { feature: "Support", starter: "Email", growth: "Priority", pro: "Dedicated CSM" },
];

const FAQS = [
  { q: "Is there really a free trial?", a: "Yes — 14 days free on any plan. No credit card required. Cancel anytime." },
  { q: "Can I switch plans later?", a: "Absolutely. Upgrade or downgrade in one click from your dashboard. Changes pro-rate automatically." },
  { q: "What counts as a campaign?", a: "A campaign is one run of an AI workflow — like generating 25 leads, drafting a 5-email sequence, or building a proposal. Most users run 10–40 per month." },
  { q: "Do I need any technical skills?", a: "Not at all. LUNAVX is built for non-tech business owners. Pick a campaign, hit Run, and your AI team delivers." },
  { q: "Will it work for my industry?", a: "LUNAVX is optimized for local service businesses (HVAC, plumbing, salons, dentists, contractors) and freelancers (designers, coaches, consultants, writers). If you sell something, it works." },
  { q: "What if I cancel?", a: "Cancel any time from your dashboard. You keep access until the end of your billing period — no questions asked." },
];

function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SiteNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-12 text-center">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="h-3 w-3 mr-1.5" /> Simple, transparent pricing
          </Badge>
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight text-balance max-w-3xl mx-auto">
            Pricing that pays for itself in <span className="gradient-text">one new client</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Every plan includes all 8 AI agents and a free 14-day trial. No setup fees. Cancel anytime.
          </p>

          <div className="mt-10 inline-flex items-center gap-3 p-1 rounded-full border border-border/60 bg-card/60 backdrop-blur">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 text-sm rounded-full transition ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 text-sm rounded-full transition flex items-center gap-2 ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Annual
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-success/20 text-success px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((t) => {
            const price = annual ? t.annual : t.monthly;
            return (
              <Card
                key={t.name}
                className={`relative p-8 flex flex-col ${t.featured ? "border-primary/50 glow-primary" : ""}`}
              >
                {t.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <div className="text-sm font-semibold text-foreground">{t.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{t.tagline}</div>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-display font-bold tabular-nums">${price}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {annual ? `Billed annually · $${price * 12}/year` : "Billed monthly"}
                </div>
                <ul className="mt-6 space-y-3 text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block mt-8">
                  <Button className="w-full" variant={t.featured ? "default" : "outline"} size="lg">
                    {t.cta} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="py-20 bg-card/20 border-y border-border/60">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="secondary" className="mb-4">Compare plans</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
              Everything you get
            </h2>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-card/60 border-b border-border/60">
                  <tr>
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-center p-4 font-semibold">Starter</th>
                    <th className="text-center p-4 font-semibold text-primary">Growth</th>
                    <th className="text-center p-4 font-semibold">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-background/40" : ""}>
                      <td className="p-4 text-foreground/90">{row.feature}</td>
                      <Cell value={row.starter} />
                      <Cell value={row.growth} highlight />
                      <Cell value={row.pro} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
              Frequently asked questions
            </h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <Card key={f.q} className="p-6">
                <h3 className="font-display font-semibold text-base">{f.q}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-24">
        <Card className="max-w-4xl mx-auto p-10 text-center glow-primary border-primary/40">
          <h2 className="text-2xl md:text-4xl font-display font-bold tracking-tight">
            Ready to put your AI team to work?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start your free 14-day trial — no credit card required.
          </p>
          <Link to="/auth" className="inline-block mt-6">
            <Button size="lg" className="glow-primary">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}

function Cell({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  return (
    <td className={`p-4 text-center ${highlight ? "bg-primary/5" : ""}`}>
      {typeof value === "boolean" ? (
        value ? (
          <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
        )
      ) : (
        <span className="text-sm text-foreground/90">{value}</span>
      )}
    </td>
  );
}
