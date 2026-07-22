/**
 * Single source of truth for plan id -> Stripe price lookup_key, shared by
 * the public pricing page and the authenticated checkout-start page.
 *
 * These lookup_keys are placeholders (test price IDs) until real Stripe
 * products/prices are created — see scripts/setup-stripe-products.mjs and
 * DECISIONS.md.
 */

export type PlanId = "starter" | "solo" | "crew" | "empire";

export interface PricingPlanConfig {
  id: PlanId;
  name: string;
  price: number;
  /** null = free plan, no Stripe checkout needed. */
  priceLookupKey: string | null;
}

export const PRICING_PLANS: Record<PlanId, PricingPlanConfig> = {
  starter: { id: "starter", name: "Starter", price: 0, priceLookupKey: null },
  solo: { id: "solo", name: "Solo", price: 299, priceLookupKey: "solo_monthly" },
  crew: { id: "crew", name: "Crew", price: 599, priceLookupKey: "crew_monthly" },
  empire: { id: "empire", name: "Empire", price: 999, priceLookupKey: "empire_monthly" },
};
