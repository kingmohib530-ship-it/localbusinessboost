import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  return (
    <div style={{ padding: 32, fontFamily: "system-ui, sans-serif", maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>{session_id ? "🎉 Payment complete" : "No payment session"}</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        {session_id
          ? "Your subscription is being activated. You can return to the app now."
          : "We couldn't find a checkout session in the URL."}
      </p>
      <Link to="/" style={{ display: "inline-block", padding: "10px 18px", background: "#111", color: "#fff", borderRadius: 8, textDecoration: "none" }}>
        Back to LocalBoost AI
      </Link>
    </div>
  );
}
