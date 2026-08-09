import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyWebhook } from "@/lib/stripe.server";

// The plan is stamped into subscription_data.metadata at checkout-session
// creation time (see payments.functions.ts) — read it back directly here
// rather than reverse-matching a Stripe price ID to a plan name, since a
// price's own ID (e.g. price_1Abc...) never equals our lookup keys.
function planFromMetadata(metadata?: Record<string, string>): "starter" | "solo" | "crew" | "agency" {
  const plan = metadata?.plan;
  if (plan === "agency" || plan === "crew" || plan === "solo") return plan;
  return "starter";
}

// profiles already has purpose-built subscription columns
// (subscription_tier/status, stripe_customer_id/subscription_id,
// subscription_period_end) — no separate subscriptions table exists live,
// so this writes directly to the row it's meant for.
async function syncProfileSubscription(
  userId: string,
  subscriptionId: string | undefined,
  metadata: Record<string, string> | undefined,
  status: string,
  customerId: string,
  periodEnd: number | undefined,
) {
  const isActive = status === "active" || status === "trialing" || status === "past_due";
  const plan = isActive ? planFromMetadata(metadata) : "starter";
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: plan,
      subscription_status: status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId ?? null,
      subscription_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) console.error("[webhook] failed to sync profile subscription", error);
}

async function handleSubscriptionEvent(subscription: any, status: string) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  await syncProfileSubscription(userId, subscription.id, subscription.metadata, status, subscription.customer, periodEnd);
}

async function handleWebhook(req: Request) {
  const event = await verifyWebhook(req);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionEvent(event.data.object, (event.data.object as any).status);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionEvent(event.data.object, "canceled");
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await handleWebhook(request);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
