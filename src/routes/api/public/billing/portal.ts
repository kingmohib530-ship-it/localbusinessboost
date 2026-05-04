import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

let _admin: ReturnType<typeof createClient> | null = null;
function admin() {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _admin;
}

export const Route = createFileRoute("/api/public/billing/portal")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            environment?: string;
            returnUrl?: string;
          };
          const env: StripeEnv =
            body.environment === "live" ? "live" : "sandbox";

          const authHeader = request.headers.get("authorization") || "";
          const token = authHeader.replace(/^Bearer\s+/i, "");
          if (!token) return new Response("Unauthorized", { status: 401 });

          const sb = admin();
          const { data: userData, error: userErr } = await sb.auth.getUser(token);
          if (userErr || !userData?.user) {
            return new Response("Unauthorized", { status: 401 });
          }
          const userId = userData.user.id;

          const { data: sub } = await sb
            .from("subscriptions")
            .select("stripe_customer_id")
            .eq("user_id", userId)
            .eq("environment", env)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const customerId = (sub as { stripe_customer_id?: string } | null)
            ?.stripe_customer_id;
          if (!customerId) {
            return Response.json(
              { error: "No subscription found" },
              { status: 404 }
            );
          }

          const stripe = createStripeClient(env);
          const portal = await stripe.billingPortal.sessions.create({
            customer: customerId,
            ...(body.returnUrl && { return_url: body.returnUrl }),
          });
          return Response.json({ url: portal.url });
        } catch (e) {
          console.error("Portal error:", e);
          return new Response("Server error", { status: 500 });
        }
      },
    },
  },
});
