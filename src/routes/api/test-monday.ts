import { createFileRoute } from "@tanstack/react-router";
import { createMondayItem } from "@/lib/monday.server";

export const Route = createFileRoute("/api/test-monday")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const itemId = await createMondayItem(
            "Test lead from LocalBusinessBoost",
            {
              status: { label: "New" },
            }
          );
          return Response.json({
            success: true,
            message: "Monday.com connection verified",
            itemId,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          return Response.json(
            {
              success: false,
              message,
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
