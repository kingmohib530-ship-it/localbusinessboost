import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PRICING_PLANS } from "@/lib/pricingPlans";

export const Route = createFileRoute("/checkout/start")({
  ssr: false,
  validateSearch: z.object({
    plan: z.enum(["solo", "crew", "agency"]),
  }),
  head: () => ({ meta: [{ title: "Checkout — Lanavix" }] }),
  component: CheckoutStartPage,
});

function CheckoutStartPage() {
  const { plan } = Route.useSearch();
  const planInfo = PRICING_PLANS[plan];
  const [status, setStatus] = useState<"checking" | "ready" | "signed-out">("checking");
  const [email, setEmail] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = `/auth?mode=signup&redirect=${encodeURIComponent(`/checkout/start?plan=${plan}`)}`;
        return;
      }
      setEmail(data.session.user.email ?? undefined);
      setStatus("ready");
    });
  }, [plan]);

  if (status !== "ready") {
    return (
      <div style={{ padding: 60, textAlign: "center", fontFamily: "system-ui, -apple-system, sans-serif", color: "#666" }}>
        Loading checkout…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "48px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
            Start your {planInfo.name} plan — ${planInfo.price}/mo
          </h1>
          <p style={{ color: "#666", fontSize: 14 }}>14-day free trial. Cancel any time.</p>
        </div>
        {planInfo.priceLookupKey ? (
          <StripeEmbeddedCheckout priceId={planInfo.priceLookupKey} customerEmail={email} />
        ) : (
          <p style={{ textAlign: "center", color: "#666" }}>
            This plan doesn't require payment. <Link to="/app">Go to your dashboard →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
