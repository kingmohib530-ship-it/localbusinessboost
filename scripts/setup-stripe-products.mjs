#!/usr/bin/env node
/**
 * One-time setup: creates the Solo/Crew/Empire Stripe products + recurring
 * monthly prices (with a 14-day trial) and assigns them the lookup_keys
 * this app's checkout flow already expects (see src/lib/pricingPlans.ts).
 *
 * Run once per Stripe environment (test and, separately, live) with a real
 * secret key:
 *
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.mjs
 *
 * Starter is free and has no Stripe product — nothing to create for it.
 *
 * This app's own Stripe calls route through the Lovable connector gateway
 * (see src/lib/stripe.server.ts) rather than calling api.stripe.com
 * directly, because the runtime environment enforces that. This script
 * uses the Stripe SDK directly against a real secret key instead, since
 * one-time product/price setup happens outside that runtime and needs a
 * key with product-write access the gateway doesn't expose.
 */

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("Set STRIPE_SECRET_KEY (sk_test_... or sk_live_...) before running this script.");
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });

const PLANS = [
  { name: "Lanavix Solo", lookupKey: "solo_monthly", amountCents: 29900 },
  { name: "Lanavix Crew", lookupKey: "crew_monthly", amountCents: 59900 },
  { name: "Lanavix Empire", lookupKey: "empire_monthly", amountCents: 99900 },
];

async function upsertPlan(plan) {
  const existing = await stripe.prices.list({ lookup_keys: [plan.lookupKey], limit: 1 });
  if (existing.data.length > 0) {
    console.log(`✓ ${plan.name}: price already exists (lookup_key=${plan.lookupKey}, id=${existing.data[0].id})`);
    return;
  }

  const product = await stripe.products.create({ name: plan.name });
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: plan.amountCents,
    recurring: {
      interval: "month",
      trial_period_days: 14,
    },
    lookup_key: plan.lookupKey,
  });

  console.log(`✓ Created ${plan.name}: product=${product.id} price=${price.id} lookup_key=${plan.lookupKey}`);
}

for (const plan of PLANS) {
  await upsertPlan(plan);
}

console.log("\nDone. Set these as your live/sandbox price lookup_keys are already wired into the app — no further code changes needed once real prices exist under these lookup_keys.");
