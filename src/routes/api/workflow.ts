import { createFileRoute } from "@tanstack/react-router";
import { runLunavxWorkflow } from "@/lib/agents.server";

export const Route = createFileRoute("/api/workflow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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
