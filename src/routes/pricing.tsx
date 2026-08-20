import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_PLANS, type PlanId } from "@/lib/pricingPlans";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: pageMeta({
      title: "Pricing — Lanavix",
      description:
        "Simple, transparent pricing for Lanavix. Solo $129, Crew $249, Agency $449/mo. 14-day free trial on every plan.",
      path: "/pricing",
    }),
  }),
  component: PricingPage,
});

const PLAN_ORDER: PlanId[] = ["solo", "crew", "agency"];
const CHECKOUT_CTA = "Start 14-day free trial";

// Same "has a real, live subscription" definition used server-side
// (payments.functions.ts, the webhook) - duplicated here rather than
// imported since this is client code and those live in server-only files.
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

const PRICING_FAQ: [string, string][] = [
  [
    "Is there really a free trial?",
    "Yes — 14 days free on every plan (Solo, Crew, Agency). A payment method is collected at checkout, but you're not charged until the trial ends.",
  ],
  [
    "Can I switch plans?",
    "Self-serve plan switching isn't available yet. Email moh@lanavix.com and we'll take care of it — we want to make sure you're never billed twice for overlapping plans.",
  ],
  [
    "Can I cancel?",
    "Yes — email moh@lanavix.com and we'll cancel it. Access continues through the end of your current billing period, and you won't be billed again after that.",
  ],
  [
    "Is my data safe?",
    "All data is encrypted at rest and in transit. We never sell your data. Your information belongs to you.",
  ],
];

function PricingPage() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status")
        .eq("id", user.id)
        .maybeSingle();
      if (
        profile?.subscription_tier &&
        profile.subscription_status &&
        ACTIVE_SUBSCRIPTION_STATUSES.has(profile.subscription_status) &&
        PLAN_ORDER.includes(profile.subscription_tier as PlanId)
      ) {
        setCurrentPlan(profile.subscription_tier as PlanId);
      }
    });
  }, []);

  async function handleCheckout(planId: PlanId) {
    setLoadingPlan(planId);
    try {
      const { data } = await supabase.auth.getSession();
      const signedIn = !!data.session;
      const plan = PRICING_PLANS[planId];

      if (plan.priceLookupKey === null) {
        navigate(signedIn ? { to: "/app" } : { to: "/auth", search: { mode: "signup" } });
        return;
      }

      if (!signedIn) {
        navigate({
          to: "/auth",
          search: { mode: "signup", redirect: `/checkout/start?plan=${planId}` },
        });
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

      {/* Hero */}
      <section className="py-16 md:py-20 px-4 text-center border-b border-border">
        <p className="lv-label text-primary mb-2">Pricing</p>
        <h1 className="lv-display text-[30px] md:text-[36px] text-foreground mb-3">
          Simple pricing. No surprises.
        </h1>
        <p className="lv-body text-muted-foreground max-w-xl mx-auto">
          Every plan includes the missed-call receptionist, review automation, and a 14-day free
          trial. No setup fees.
        </p>
      </section>

      {/* Plan cards */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {PLAN_ORDER.map((id) => {
            const info = PRICING_PLANS[id];
            return (
              <div key={id} className="relative h-full">
                {info.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 bg-primary text-primary-foreground lv-meta font-semibold px-3 py-1 rounded-full">
                    {info.badge}
                  </div>
                )}
                <div
                  className={`rounded-md p-6 flex flex-col h-full ${
                    info.featured
                      ? "border border-primary bg-accent/40"
                      : "border border-border bg-card"
                  }`}
                >
                  <p className="lv-label text-muted-foreground mb-2">{info.name}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="lv-display text-[34px] text-foreground">${info.price}</span>
                    <span className="lv-meta text-muted-foreground">/mo</span>
                  </div>
                  <p className="lv-body text-muted-foreground mb-5">{info.tagline}</p>
                  <div className="h-px bg-border mb-5" />
                  <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                    {info.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 lv-body">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  {id === currentPlan ? (
                    <Button disabled variant="outline" className="min-h-[44px]">
                      <Check className="mr-1 h-4 w-4" /> Current plan
                    </Button>
                  ) : currentPlan ? (
                    <Button asChild variant="outline" className="min-h-[44px]">
                      <Link to="/app/billing">
                        Manage your plan <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(id)}
                      disabled={loadingPlan === id}
                      variant={info.featured ? "default" : "outline"}
                      className="min-h-[44px]"
                    >
                      {loadingPlan === id ? "Loading…" : CHECKOUT_CTA}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-md border border-border bg-card p-6 max-w-xl mx-auto flex items-start gap-4 text-left">
          <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
          <div>
            <p className="lv-body text-foreground font-medium mb-1">30-day money-back guarantee</p>
            <p className="lv-meta text-muted-foreground leading-relaxed">
              If you don't recover at least one job worth more than your monthly fee within 30 days
              of your first paid month, email moh@lanavix.com for a full refund. Applies to your
              first paid month only, and requires actively using Missed-Call Text-Back, Reputation
              Autopilot, or Lead Generator during that period.{" "}
              <Link to="/refund" className="text-primary underline underline-offset-2">
                Full policy →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Feature table */}
      <section className="py-16 md:py-20 px-4 bg-surface border-y border-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="lv-display text-[24px] md:text-[28px] text-foreground text-center mb-8">
            Everything you get
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full lv-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 lv-meta font-semibold text-muted-foreground uppercase tracking-wide">
                    Feature
                  </th>
                  <th className="text-center py-3 px-4 lv-meta font-semibold text-muted-foreground uppercase tracking-wide">
                    Solo
                  </th>
                  <th className="text-center py-3 px-4 lv-meta font-semibold text-primary uppercase tracking-wide bg-accent rounded-t-md">
                    Crew
                  </th>
                  <th className="text-center py-3 pl-4 lv-meta font-semibold text-muted-foreground uppercase tracking-wide">
                    Agency
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Missed Call Text-Back", "Unlimited", "Unlimited", "Unlimited"],
                  ["Review request texts / month", "100", "Unlimited", "Unlimited"],
                  ["Lead Generator runs / month", "5", "Unlimited", "Unlimited"],
                  ["AI review response writer", "—", "✓", "✓"],
                  ["Competitor ranking tracker", "—", "✓", "✓"],
                  ["Automated follow-up sequences", "—", "✓", "✓"],
                  ["Locations", "1", "1", "Up to 5"],
                  ["Team seats", "—", "—", "✓"],
                  ["Custom AI training on brand voice", "—", "—", "✓"],
                  ["API access + SLA", "—", "—", "✓"],
                  ["Support", "Email", "Priority", "Dedicated manager"],
                ].map(([label, so, c, a], i) => (
                  <tr key={i} className={`border-b border-border ${i % 2 === 0 ? "" : "bg-card"}`}>
                    <td className="py-3 pr-4 text-foreground font-medium">{label}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{so}</td>
                    <td className="py-3 px-4 text-center font-semibold text-primary bg-accent">
                      {c}
                    </td>
                    <td className="py-3 pl-4 text-center text-muted-foreground">{a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="lv-display text-[24px] md:text-[28px] text-foreground text-center mb-8">
            Billing questions
          </h2>
          <div className="flex flex-col">
            {PRICING_FAQ.map(([q, a]) => (
              <div key={q} className="border-b border-border py-5">
                <p className="lv-body text-foreground font-medium mb-1.5">{q}</p>
                <p className="lv-body text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-surface border-t border-border py-16 md:py-20 px-4 text-center">
        <h2 className="lv-display text-[24px] md:text-[28px] text-foreground mb-2">
          Not sure which plan? Start with the audit.
        </h2>
        <p className="lv-body text-muted-foreground max-w-md mx-auto mb-6">
          Get a free Lanavix Business Audit, scored in under a minute.
        </p>
        <Button asChild size="lg" className="h-12 px-7">
          <Link to="/audit">
            Get my free business audit <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      <SiteFooter />
    </div>
  );
}
