/**
 * Single source of truth for plan display data (name, price, features) AND
 * the Stripe price lookup_key used by the app's own checkout flow
 * (checkout.start.tsx -> createCheckoutSession). Imported by both the
 * homepage pricing section and the /pricing page so they can't drift apart.
 *
 * "starter" is not a marketed/purchasable plan — it's the internal
 * subscription_tier value for an account with no active subscription
 * (see profiles.subscription_tier default). It's kept here only so pages
 * that read a signed-in user's current plan (Settings, dashboard) can look
 * up a name/price without a special case.
 *
 * priceLookupKey values are placeholders (test price IDs) until real Stripe
 * products/prices are created — see scripts/setup-stripe-products.mjs and
 * DECISIONS.md.
 */

export type PlanId = "starter" | "solo" | "crew" | "agency";

export interface PricingPlanConfig {
  id: PlanId;
  name: string;
  tagline: string;
  /** Monthly price in USD. */
  price: number;
  /** Per-month price in USD when billed annually. */
  annualPrice: number;
  features: string[];
  featured: boolean;
  badge?: string;
  /** null = no Stripe checkout needed (starter has no active subscription). */
  priceLookupKey: string | null;
}

export const PRICING_PLANS: Record<PlanId, PricingPlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "No active plan yet",
    price: 0,
    annualPrice: 0,
    features: [],
    featured: false,
    priceLookupKey: null,
  },
  solo: {
    id: "solo",
    name: "Solo",
    tagline: "One-person operation getting started with automation",
    price: 129,
    annualPrice: 103,
    features: [
      "Missed Call Text-Back (unlimited)",
      "Review request texts (100/mo)",
      "Local Lead Blast (5 runs/mo)",
      "Email support",
    ],
    featured: false,
    priceLookupKey: "solo_monthly",
  },
  crew: {
    id: "crew",
    name: "Crew",
    tagline: "Growing business that needs consistent leads and reviews",
    price: 249,
    annualPrice: 199,
    features: [
      "Everything in Solo",
      "Unlimited review request texts",
      "Unlimited Local Lead Blast",
      "AI review response writer",
      "Competitor ranking tracker",
      "Automated follow-up sequences",
      "Priority support",
    ],
    featured: true,
    badge: "Most popular",
    priceLookupKey: "crew_monthly",
  },
  agency: {
    id: "agency",
    name: "Agency",
    tagline: "Multi-location operators or contractors managing crews",
    price: 449,
    annualPrice: 359,
    features: [
      "Everything in Crew",
      "Up to 5 locations",
      "Team seat access",
      "Custom AI training on your brand voice",
      "Dedicated success manager",
      "API access + SLA",
    ],
    featured: false,
    priceLookupKey: "agency_monthly",
  },
};

/** Marketed/purchasable plans in display order — excludes "starter". */
export const PAID_PLAN_IDS: PlanId[] = ["solo", "crew", "agency"];
