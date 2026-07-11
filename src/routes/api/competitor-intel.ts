import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runAgent, type NexusResult } from "@/lib/agents.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

export const Route = createFileRoute("/api/competitor-intel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // ===== Auth: verify Supabase JWT (same pattern as /api/lead-blast) =====
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          const { data: userData, error: userErr } =
            await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const user = userData.user;

          // ===== Rate limit: 15 requests per hour per user =====
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_rate_limit",
            {
              p_user_id: user.id,
              p_route: "competitor-intel",
              p_max_requests: 15,
              p_window_seconds: 3600,
            }
          );
          if (rlErr) {
            console.error("[api/competitor-intel] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const { industry, city } = await request.json();

          if (!industry || !city) {
            return Response.json(
              { error: "industry and city are required" },
              { status: 400 }
            );
          }

          const instruction = `Analyze the local market for a ${industry} business in ${city}. Identify plausible competitor archetypes, concrete opportunities, and sharp, actionable insights this business owner could use this week.`;

          const result = (await runAgent("Nexus", instruction)) as NexusResult;

          return Response.json(result);
        } catch (err) {
          console.error("[api/competitor-intel] error", err);
          const message = err instanceof Error ? err.message : "Internal server error";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
