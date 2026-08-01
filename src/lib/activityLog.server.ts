import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

/** Returns whether the insert succeeded, so callers whose quota logic counts a specific activity type can tell when that count wasn't actually recorded. */
export async function logActivity(
  userId: string,
  type: string,
  summary: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  const { error } = await supabaseAdmin.from("activity_log").insert({
    user_id: userId,
    type,
    summary,
    metadata: (metadata as Json) ?? null,
  });
  if (error) {
    console.error(`[activity-log] failed to log "${type}" for user ${userId}`, error);
    return false;
  }
  return true;
}
