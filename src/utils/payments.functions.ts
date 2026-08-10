import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient } from "@/lib/stripe.server";
import { PRICING_PLANS } from "@/lib/pricingPlans";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Same "has a real, live subscription" definition the webhook uses
// (syncProfileSubscription in api/public/payments/webhook.ts) to decide
// whether to sync a plan or fall back to starter.
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

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

    // SECURITY: server-side guard against creating a second, independent
    // Stripe subscription for someone who already has a live one - the
    // pricing page UI steers an already-subscribed contractor toward
    // Settings instead of a fresh checkout, but that's not something this
    // handler can trust; it has to hold regardless of what the client
    // actually sent.
    if (isRecurring) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("subscription_status")
        .eq("id", userId)
        .maybeSingle();
      const status = profile?.subscription_status;
      if (status && ACTIVE_SUBSCRIPTION_STATUSES.has(status)) {
        throw new Error(
          "You already have an active subscription. Manage or change your plan from Settings instead of starting a new one.",
        );
      }
    }

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
