import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_PLANS, type PlanId } from "@/lib/pricingPlans";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: pageMeta({
      title: "Pricing — Lanavix AI Workforce OS",
      description: "Simple, transparent pricing for Lanavix. Solo $129, Crew $249, Agency $449/mo. 14-day free trial on every plan.",
      path: "/pricing",
    }),
  }),
  component: PricingPage,
});

const PLAN_ORDER: PlanId[] = ["solo", "crew", "agency"];
const CHECKOUT_CTA = "Start 14-day free trial";

function PricingPage() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  async function handleCheckout(planId: PlanId) {
    setLoadingPlan(planId);
    try {
      const { data } = await supabase.auth.getSession();
      const signedIn = !!data.session;
      const plan = PRICING_PLANS[planId];

      if (plan.priceLookupKey === null) {
        // Starter is free — no Stripe checkout needed.
        navigate(signedIn ? { to: "/app" } : { to: "/auth", search: { mode: "signup" } });
        return;
      }

      if (!signedIn) {
        navigate({ to: "/auth", search: { mode: "signup", redirect: `/checkout/start?plan=${planId}` } });
        return;
      }

      navigate({ to: "/checkout/start", search: { plan: planId as "solo" | "crew" | "agency" } });
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      {/* ── Hero ── */}
      <section className="py-24 px-4 text-center border-b border-border bg-secondary/50">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
          Pricing
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Simple pricing. Pays for itself in week one.
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Every plan includes the missed-call receptionist, review automation, and a 14-day free trial.
          No setup fees. Cancel any time.
        </p>
      </section>

      {/* ── Plan cards ── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLAN_ORDER.map((id) => {
            const info = PRICING_PLANS[id];
            return (
              <div
                key={id}
                className={`relative rounded-2xl p-8 flex flex-col border bg-background transition-shadow hover:shadow-lg ${
                  info.featured
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border"
                }`}
              >
                {info.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-bold rounded-full shadow">
                      {info.badge}
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    {info.name}
                  </p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-bold">$</span>
                    <span className="text-5xl font-extrabold tracking-tight">{info.price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 leading-snug">
                    {info.tagline}
                  </p>
                </div>

                <div className="h-px bg-border mb-6" />

                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {info.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleCheckout(id)}
                  disabled={loadingPlan === id}
                  className={`w-full font-semibold rounded-xl h-11 ${
                    info.featured
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-background border border-border text-foreground hover:bg-muted"
                  }`}
                  variant={info.featured ? "default" : "outline"}
                >
                  {loadingPlan === id ? "Loading…" : CHECKOUT_CTA}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          No hidden charges. No setup fees. Cancel any time from your account settings.
        </p>
      </section>

      {/* ── Feature table ── */}
      <section className="py-24 px-4 bg-secondary/50 border-t border-b border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-center mb-10">Everything you get</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Solo</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary uppercase text-xs tracking-wider bg-primary/5 rounded-t-lg">Crew</th>
                  <th className="text-center py-3 pl-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Agency</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Missed Call Text-Back", "Unlimited", "Unlimited", "Unlimited"],
                  ["Review request texts / month", "100", "Unlimited", "Unlimited"],
                  ["Local Lead Blast runs / month", "5", "Unlimited", "Unlimited"],
                  ["AI review response writer", "—", "✓", "✓"],
                  ["Competitor ranking tracker", "—", "✓", "✓"],
                  ["Automated follow-up sequences", "—", "✓", "✓"],
                  ["Locations", "1", "1", "Up to 5"],
                  ["Team seats", "—", "—", "✓"],
                  ["Custom AI training on brand voice", "—", "—", "✓"],
                  ["API access + SLA", "—", "—", "✓"],
                  ["Support", "Email", "Priority", "Dedicated manager"],
                ].map(([label, so, c, a], i) => (
                  <tr key={i} className={`border-b ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                    <td className="py-3 pr-4 font-medium">{label}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{so}</td>
                    <td className="py-3 px-4 text-center font-semibold text-primary bg-primary/5">{c}</td>
                    <td className="py-3 pl-4 text-center text-muted-foreground">{a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-center mb-10">Common questions</h2>
          <div className="flex flex-col">
            {[
              ["Is there really a free trial?", "Yes — 14 days free on every plan (Solo, Crew, Agency). No credit card required to start."],
              ["Can I switch plans?", "Yes, any time from your account settings. Upgrades take effect immediately; downgrades take effect at the end of your billing period."],
              ["Can I cancel?", "Yes, any time from your account settings. Cancellation takes effect at the end of your current billing period."],
              ["Is my data safe?", "All data is encrypted at rest and in transit. We never sell your data. Your information belongs to you."],
            ].map(([q, a], i) => (
              <details key={i} className="border-b border-border group">
                <summary className="flex justify-between items-center gap-4 py-5 cursor-pointer font-medium text-sm list-none">
                  {q}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="section-ink py-24 px-4 text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight mb-3">
          Not sure which plan? Start with the audit.
        </h2>
        <p className="text-ink-muted max-w-md mx-auto mb-8">
          Get your free Lanavix Business Audit — scored across 4 categories in 60 seconds.
        </p>
        <Link to="/audit">
          <Button size="lg" className="h-12 px-8 text-[15px] font-semibold">
            Get my free business audit <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <p className="mt-4 text-sm text-ink-muted">
          Free forever · No credit card · 60 seconds
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
