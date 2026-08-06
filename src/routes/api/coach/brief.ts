import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateDailyBriefCards } from "@/lib/coach.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

export const Route = createFileRoute("/api/coach/brief")({
  server: {
    handlers: {
      // Recomputed on every call, not read from daily_briefs - the Coach
      // page should always show what's true right now (a call the
      // contractor already returned should stop showing as missed),
      // unlike daily_briefs, which is a frozen record of what was true
      // when the morning push went out.
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
            p_route: "coach-brief",
            p_max_requests: 60,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[coach/brief] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("timezone")
            .eq("id", user.id)
            .maybeSingle();

          const cards = await generateDailyBriefCards(user.id, profile?.timezone || "America/New_York");

          return Response.json({ cards, generatedAt: new Date().toISOString() });
        } catch (err) {
          console.error("[coach/brief]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
