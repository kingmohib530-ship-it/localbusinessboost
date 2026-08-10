import { loadStripe, Stripe } from "@stripe/stripe-js";

const clientToken = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (clientToken && !clientToken.startsWith('pk_test_') && !clientToken.startsWith('pk_live_')) {
  throw new Error("VITE_STRIPE_PUBLISHABLE_KEY doesn't look like a valid Stripe publishable key");
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) throw new Error("VITE_STRIPE_PUBLISHABLE_KEY is not set");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}
