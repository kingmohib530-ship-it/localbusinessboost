import { createFileRoute } from "@tanstack/react-router";
import { runLunavxWorkflow } from "@/lib/agents.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/workflow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // ===== Auth: verify JWT signature server-side via Supabase Auth =====
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.startsWith("Bearer ")) {
            return Response.json(
              { success: false, error: "Sign in required" },
              { status: 401 },
            );
          }
          const token = authHeader.slice("Bearer ".length).trim();
          if (!token) {
            return Response.json(
              { success: false, error: "Sign in required" },
              { status: 401 },
            );
          }
          const { data: userData, error: userErr } =
            await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json(
              { success: false, error: "Invalid session" },
              { status: 401 },
            );
          }

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

          const result = await runLunavxWorkflow(userRequest);
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
