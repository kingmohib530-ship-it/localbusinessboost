import { createFileRoute } from "@tanstack/react-router";
import { runLunavxWorkflow } from "@/lib/agents.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_ERROR = "Authentication required. Please sign in.";

export const Route = createFileRoute("/api/workflow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // ===== Auth: verify Supabase JWT (consistent with other protected routes) =====
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            console.warn("[/api/workflow] missing bearer token");
            return Response.json(
              { success: false, error: AUTH_ERROR },
              { status: 401 },
            );
          }
          const token = authHeader.slice(7).trim();
          if (!token) {
            return Response.json(
              { success: false, error: AUTH_ERROR },
              { status: 401 },
            );
          }

          const { data: userData, error: userErr } =
            await supabaseAdmin.auth.getUser(token);
          const user = userData?.user;
          if (userErr || !user) {
            console.warn("[/api/workflow] invalid session:", userErr?.message);
            return Response.json(
              { success: false, error: AUTH_ERROR },
              { status: 401 },
            );
          }

          // ===== Rate limit: 5 requests per hour per user =====
          // (low cap — each call runs the full multi-agent pipeline, several
          // sequential Anthropic calls per request)
          const { data: rlAllowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_rate_limit",
            {
              p_user_id: user.id,
              p_route: "workflow",
              p_max_requests: 5,
              p_window_seconds: 3600,
            },
          );
          if (rlErr) {
            console.error("[/api/workflow] rate limit check failed");
            return Response.json({ success: false, error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!rlAllowed) {
            return Response.json({ success: false, error: "Too many requests. Please wait a bit and try again." }, { status: 429 });
          }

          // ===== Input validation =====
          const body = (await request.json().catch(() => ({}))) as {
            userRequest?: unknown;
          };
          const userRequest =
            typeof body.userRequest === "string" ? body.userRequest.trim() : "";

          if (!userRequest) {
            return Response.json(
              { success: false, error: "Missing 'userRequest' (string) in request body." },
              { status: 400 },
            );
          }
          if (userRequest.length > 4000) {
            return Response.json(
              { success: false, error: "userRequest is too long (max 4000 chars)." },
              { status: 400 },
            );
          }

          console.log(
            `[/api/workflow] user=${user.id} request="${userRequest.slice(0, 80)}${userRequest.length > 80 ? "…" : ""}"`,
          );

          // Pass userId for future per-user Monday.com boards / personalization.
          const result = await runLunavxWorkflow(userRequest, user.id);
          return Response.json(result, { status: result.success ? 200 : 500 });
        } catch (err) {
          console.error("/api/workflow error:", err);
          return Response.json(
            {
              success: false,
              error: err instanceof Error ? err.message : "Unknown server error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
