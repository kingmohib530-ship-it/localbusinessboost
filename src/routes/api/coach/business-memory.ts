import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateBusinessMemory } from "@/lib/business-memory.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

export const Route = createFileRoute("/api/coach/business-memory")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const user = userData.user;

          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_rate_limit", {
            p_user_id: user.id,
            p_route: "coach-business-memory",
            p_max_requests: 60,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[coach/business-memory] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const memory = await generateBusinessMemory(user.id);
          return Response.json({ memory });
        } catch (err) {
          console.error("[coach/business-memory]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
