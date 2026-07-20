import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type StripeEnv, createStripeClient } from "@/lib/stripe.server";

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

          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return new Response("Unauthorized", { status: 401 });
          }
          const userId = userData.user.id;

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("stripe_customer_id")
            .eq("id", userId)
            .maybeSingle();

          const customerId = profile?.stripe_customer_id;
          if (!customerId) {
            return Response.json(
              { error: "No active subscription found." },
              { status: 400 }
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
