import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const FORBIDDEN_ERROR = "Forbidden: admin access required.";

/**
 * Bearer auth + profiles.is_admin check for the /api/admin/* route
 * handlers. Mirrors requireAdmin (used by the orchestrator's
 * createServerFn functions) for plain createFileRoute handlers, which
 * don't go through TanStack Start middleware.
 */
export async function authenticateAdmin(
  request: Request,
): Promise<{ userId: string } | { error: Response }> {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { error: Response.json({ error: AUTH_ERROR }, { status: 401 }) };
  }
  const token = authHeader.slice(7).trim();
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { error: Response.json({ error: AUTH_ERROR }, { status: 401 }) };
  }

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileErr || !profile?.is_admin) {
    return { error: Response.json({ error: FORBIDDEN_ERROR }, { status: 403 }) };
  }

  return { userId: userData.user.id };
}
