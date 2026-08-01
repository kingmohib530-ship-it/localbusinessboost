import { loadStripe, Stripe } from "@stripe/stripe-js";

type StripeEnv = 'sandbox' | 'live';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

function resolveEnvironment(token: string | undefined): StripeEnv {
  if (!token) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  if (token.startsWith('pk_test_')) return 'sandbox';
  if (token.startsWith('pk_live_')) return 'live';
  throw new Error("VITE_PAYMENTS_CLIENT_TOKEN doesn't look like a valid Stripe publishable key");
}

const environment: StripeEnv = resolveEnvironment(clientToken);

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return environment;
}
