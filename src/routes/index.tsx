import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { absoluteUrl } from "@/lib/url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LocalBoost AI – Grow Your Business Instantly" },
      { name: "description", content: "Generate reviews, captions, promos & SMS messages tailored to your business in seconds." },
    ],
  }),
  component: Index,
});

interface CheckoutReq {
  priceId: string;
  userId?: string;
  email?: string;
}

function Index() {
  const [checkout, setCheckout] = useState<CheckoutReq | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "lb-checkout" && typeof d.priceId === "string") {
        setCheckout({ priceId: d.priceId, userId: d.userId, email: d.email });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column" }}>
      <PaymentTestModeBanner />
      <iframe
        src="/localboost.html"
        title="LocalBoost AI"
        style={{ flex: 1, width: "100%", border: "none" }}
      />
      {checkout && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setCheckout(null); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", position: "relative" }}>
            <button
              onClick={() => setCheckout(null)}
              style={{ position: "absolute", top: 8, right: 12, background: "transparent", border: "none", fontSize: 22, cursor: "pointer", zIndex: 2 }}
              aria-label="Close"
            >×</button>
            <div style={{ padding: 8 }}>
              <StripeEmbeddedCheckout
                priceId={checkout.priceId}
                userId={checkout.userId}
                customerEmail={checkout.email}
                returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
