import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

/**
 * Server-side admin gate for the internal orchestrator (/app/chat,
 * /app/control, /app/logs, /app/workflows). The client-side
 * useRequireAdmin() redirect is UI-only — this is what actually stops a
 * non-admin from reaching the data via a direct server function call.
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile?.is_admin) {
      throw new Response("Forbidden: admin access required", { status: 403 });
    }

    return next();
  });
