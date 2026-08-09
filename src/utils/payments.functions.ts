import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient } from "@/lib/stripe.server";
import { PRICING_PLANS } from "@/lib/pricingPlans";

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: string;
    quantity?: number;
    customerEmail?: string;
    returnUrl: string;
  }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error("Invalid priceId");
    try {
      const u = new URL(data.returnUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
    } catch {
      throw new Error("returnUrl must be an absolute http(s) URL");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    // SECURITY: userId is derived from the verified auth session, never from client input,
    // to prevent attackers attributing paid subscriptions to arbitrary user accounts.
    const userId = context.userId;
    const stripe = createStripeClient();

    const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    // Stamped into subscription metadata so the webhook can read the plan
    // directly, instead of reverse-matching a Stripe price ID back to a
    // plan name (see planFromMetadata in the webhook route).
    const plan = Object.values(PRICING_PLANS).find((p) => p.priceLookupKey === data.priceId)?.id;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: data.quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: data.returnUrl,
      ...(data.customerEmail && { customer_email: data.customerEmail }),
      metadata: { userId, ...(plan && { plan }) },
      ...(isRecurring && { subscription_data: { metadata: { userId, ...(plan && { plan }) } } }),
    });

    return session.client_secret;
  });
