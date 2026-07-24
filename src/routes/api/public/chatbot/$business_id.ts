import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/chatbot/$business_id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        try {
          const businessId = params.business_id;
          if (!businessId || !UUID_RE.test(businessId)) {
            return Response.json(
              { error: "Invalid business_id" },
              { status: 400, headers: CORS },
            );
          }

          // Public, unauthenticated, embeddable anywhere — IP-based rate
          // limiting is the only abuse backstop available here.
          const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_anon_rate_limit",
            {
              p_ip_address: ip,
              p_route: "public-chatbot-config",
              p_max_requests: 60,
              p_window_seconds: 3600,
            },
          );
          if (rlErr) {
            console.error("[chatbot GET] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503, headers: CORS });
          }
          if (!allowed) {
            return Response.json({ error: "Too many requests." }, { status: 429, headers: CORS });
          }

          const { data: business, error: bizErr } = await supabaseAdmin
            .from("businesses")
            .select("id, name")
            .eq("id", businessId)
            .maybeSingle();

          if (bizErr) throw bizErr;
          if (!business) {
            return Response.json(
              { error: "Business not found" },
              { status: 404, headers: CORS },
            );
          }

          const { data: settings, error: setErr } = await supabaseAdmin
            .from("chatbot_settings")
            .select(
              "welcome_message, services, pricing, faq, offers, booking_link",
            )
            .eq("business_id", businessId)
            .maybeSingle();

          if (setErr) throw setErr;

          return Response.json(
            {
              business_name: business.name ?? "",
              welcome_message:
                settings?.welcome_message ||
                `Hi! Welcome to ${business.name}. How can we help?`,
              services: settings?.services ?? "",
              pricing: settings?.pricing ?? "",
              faq: settings?.faq ?? "",
              offers: settings?.offers ?? "",
              booking_link: settings?.booking_link ?? "",
            },
            { headers: CORS },
          );
        } catch (err) {
          console.error("[chatbot GET]", err);
          return Response.json(
            { error: "Internal server error" },
            { status: 500, headers: CORS },
          );
        }
      },
    },
  },
});
