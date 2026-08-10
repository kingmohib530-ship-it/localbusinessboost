import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GlowPanel } from "@/components/GlowPanel";
import { supabase } from "@/integrations/supabase/client";
import { PRICING_PLANS, type PlanId } from "@/lib/pricingPlans";
import { pageMeta } from "@/lib/seo";
import { useMountReveal } from "@/hooks/use-mount-reveal";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: pageMeta({
      title: "Pricing — Lanavix AI Workforce OS",
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

function PricingPage() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanId | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { step, delay } = useMountReveal();

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
        // Starter is free — no Stripe checkout needed.
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
    <div className="page-dark min-h-screen flex flex-col">
      <SiteNav variant="dark" />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 px-4 text-center border-b border-[var(--hd-border)] bg-[var(--hd-surface)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="hd-mesh-blob hd-mesh-blob-a"
            style={{
              top: "-20%",
              left: "10%",
              width: 420,
              height: 420,
              background: "var(--hd-primary)",
              opacity: 0.22,
            }}
          />
          <div
            className="hd-mesh-blob hd-mesh-blob-b"
            style={{
              top: "-10%",
              right: "5%",
              width: 380,
              height: 380,
              background: "var(--hd-primary-2)",
              opacity: 0.18,
            }}
          />
        </div>
        <div className={`relative z-10 ${step}`} style={delay(0)}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--hd-primary-2)] mb-3">
            Pricing
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[var(--hd-fg)]">
            Simple pricing. Pays for itself in week one.
          </h1>
          <p className="text-lg text-[var(--hd-muted)] max-w-xl mx-auto mb-8">
            Every plan includes the missed-call receptionist, review automation, and a 14-day free
            trial. No setup fees. Cancel any time.
          </p>
        </div>
      </section>

      {/* ── Plan cards ── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLAN_ORDER.map((id, i) => {
            const info = PRICING_PLANS[id];
            return (
              <div key={id} className="relative h-full">
                {/* Sibling of GlowPanel, not inside it: GlowPanel sets
                    overflow-hidden to clip its cursor-glow to the rounded
                    corners, which would also clip this badge's intentional
                    overhang above the top edge. */}
                {info.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-[var(--hd-primary)] to-[var(--hd-primary-2)] text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-[var(--hd-primary)]/40">
                    {info.badge}
                  </div>
                )}
                <GlowPanel
                  reducedMotion={reducedMotion}
                  className={`${step} hover-lift-dark rounded-2xl p-8 flex flex-col backdrop-blur-md h-full ${
                    info.featured
                      ? "border border-[var(--hd-primary)]/50 bg-gradient-to-b from-[var(--hd-primary)]/[0.14] to-[var(--hd-glass)] shadow-2xl shadow-[var(--hd-primary)]/20 ring-1 ring-[var(--hd-primary)]/30"
                      : "border border-[var(--hd-border)] bg-[var(--hd-glass)]"
                  }`}
                  style={delay(i + 1)}
                >
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--hd-muted)] mb-2">
                      {info.name}
                    </p>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-2xl font-bold text-[var(--hd-fg)]">$</span>
                      <span className="text-5xl font-extrabold tracking-tight text-[var(--hd-fg)]">
                        {info.price}
                      </span>
                      <span className="text-[var(--hd-muted)] text-sm">/mo</span>
                    </div>
                    <p className="text-sm text-[var(--hd-muted)] mt-2 leading-snug">
                      {info.tagline}
                    </p>
                  </div>

                  <div className="h-px bg-[var(--hd-border)] mb-6" />

                  <ul className="flex flex-col gap-3 mb-8 flex-1">
                    {info.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-[var(--hd-primary-2)] shrink-0 mt-0.5" />
                        <span className="text-[var(--hd-muted)]">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {id === currentPlan ? (
                    <Button
                      disabled
                      className="w-full font-semibold rounded-xl h-11 bg-[var(--hd-glass)] border border-[var(--hd-primary-2)]/40 text-[var(--hd-primary-2)] opacity-100 disabled:opacity-100"
                    >
                      <Check className="mr-2 w-4 h-4" /> Current plan
                    </Button>
                  ) : currentPlan ? (
                    <Button
                      onClick={() => navigate({ to: "/app/settings" })}
                      className="w-full font-semibold rounded-xl h-11 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md bg-[var(--hd-glass)] hover:bg-[var(--hd-glass-strong)] border border-[var(--hd-border)] text-[var(--hd-fg)]"
                    >
                      Manage your plan
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(id)}
                      disabled={loadingPlan === id}
                      className={`w-full font-semibold rounded-xl h-11 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        info.featured
                          ? "bg-[var(--hd-primary)] hover:bg-[var(--hd-primary)]/90 text-white"
                          : "bg-[var(--hd-glass)] hover:bg-[var(--hd-glass-strong)] border border-[var(--hd-border)] text-[var(--hd-fg)]"
                      }`}
                    >
                      {loadingPlan === id ? "Loading…" : CHECKOUT_CTA}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  )}
                </GlowPanel>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-[var(--hd-muted)] mt-6">
          No hidden charges. No setup fees. Cancel any time from your account settings.
        </p>
      </section>

      {/* ── Feature table ── */}
      <section className="py-24 px-4 bg-[var(--hd-surface)] border-t border-b border-[var(--hd-border)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-center mb-10 text-[var(--hd-fg)]">
            Everything you get
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--hd-border)]">
                  <th className="text-left py-3 pr-4 font-semibold text-[var(--hd-muted)] uppercase text-xs tracking-wider">
                    Feature
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-[var(--hd-muted)] uppercase text-xs tracking-wider">
                    Solo
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-[var(--hd-primary-2)] uppercase text-xs tracking-wider bg-[var(--hd-primary)]/10 rounded-t-lg">
                    Crew
                  </th>
                  <th className="text-center py-3 pl-4 font-semibold text-[var(--hd-muted)] uppercase text-xs tracking-wider">
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
                  <tr
                    key={i}
                    className={`border-b border-[var(--hd-border)] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
                  >
                    <td className="py-3 pr-4 font-medium text-[var(--hd-fg)]">{label}</td>
                    <td className="py-3 px-4 text-center text-[var(--hd-muted)]">{so}</td>
                    <td className="py-3 px-4 text-center font-semibold text-[var(--hd-primary-2)] bg-[var(--hd-primary)]/10">
                      {c}
                    </td>
                    <td className="py-3 pl-4 text-center text-[var(--hd-muted)]">{a}</td>
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
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-center mb-10 text-[var(--hd-fg)]">
            Common questions
          </h2>
          <div className="flex flex-col">
            {[
              [
                "Is there really a free trial?",
                "Yes — 14 days free on every plan (Solo, Crew, Agency). No credit card required to start.",
              ],
              [
                "Can I switch plans?",
                "Yes, any time from your account settings. Upgrades take effect immediately; downgrades take effect at the end of your billing period.",
              ],
              [
                "Can I cancel?",
                "Yes, any time from your account settings. Cancellation takes effect at the end of your current billing period.",
              ],
              [
                "Is my data safe?",
                "All data is encrypted at rest and in transit. We never sell your data. Your information belongs to you.",
              ],
            ].map(([q, a], i) => (
              <details key={i} className="border-b border-[var(--hd-border)] group">
                <summary className="flex justify-between items-center gap-4 py-5 cursor-pointer font-medium text-sm list-none text-[var(--hd-fg)]">
                  {q}
                  <ChevronDown className="h-4 w-4 text-[var(--hd-muted)] shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="pb-5 text-sm text-[var(--hd-muted)] leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-[var(--hd-surface)] border-t border-[var(--hd-border)] py-24 px-4 text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight mb-3 text-[var(--hd-fg)]">
          Not sure which plan? Start with the audit.
        </h2>
        <p className="text-[var(--hd-muted)] max-w-md mx-auto mb-8">
          Get your free Lanavix Business Audit — scored across 4 categories in 60 seconds.
        </p>
        <Link to="/audit">
          <Button
            size="lg"
            className="h-12 px-8 text-[15px] font-semibold bg-[var(--hd-primary)] hover:bg-[var(--hd-primary)]/90 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--hd-primary)]/30"
          >
            Get my free business audit <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <p className="mt-4 text-sm text-[var(--hd-muted)]">
          Free forever · No credit card · 60 seconds
        </p>
      </section>

      <SiteFooter variant="dark" />
    </div>
  );
}
