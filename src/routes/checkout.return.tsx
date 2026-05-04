import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { absoluteUrl, topLevelNavigate } from "@/lib/url";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const [status, setStatus] = useState<"pending" | "active" | "timeout" | "no-session">(
    session_id ? "pending" : "no-session"
  );

  useEffect(() => {
    if (!session_id) return;
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) {
        if (attempts++ < 20 && !cancelled) setTimeout(poll, 1500);
        return;
      }
      const { data } = await supabase
        .from("subscriptions")
        .select("status,price_id")
        .eq("user_id", userId)
        .eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data && ["active", "trialing"].includes((data as { status: string }).status)) {
        setStatus("active");
        setTimeout(() => {
          topLevelNavigate(absoluteUrl("/"));
        }, 1500);
        return;
      }
      if (attempts++ < 20) setTimeout(poll, 1500);
      else setStatus("timeout");
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [session_id]);

  const titles: Record<typeof status, string> = {
    pending: "🎉 Payment received — activating your subscription…",
    active: "✅ Subscription active! Redirecting…",
    timeout: "Almost there",
    "no-session": "No payment session",
  };
  const subs: Record<typeof status, string> = {
    pending: "Hang tight, this usually takes a few seconds.",
    active: "Sending you back to LocalBoost AI now.",
    timeout: "Activation is taking longer than expected. Click below to return — your plan will sync automatically.",
    "no-session": "We couldn't find a checkout session in the URL.",
  };

  return (
    <div style={{ padding: 32, fontFamily: "system-ui, sans-serif", maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 26, marginBottom: 12 }}>{titles[status]}</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>{subs[status]}</p>
      <Link
        to="/"
        style={{
          display: "inline-block",
          padding: "10px 18px",
          background: "#111",
          color: "#fff",
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        Back to LocalBoost AI
      </Link>
    </div>
  );
}
