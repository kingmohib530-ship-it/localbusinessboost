import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export async function logActivity(
  userId: string,
  type: string,
  summary: string,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabaseAdmin.from("activity_log").insert({
    user_id: userId,
    type,
    summary,
    metadata: (metadata as Json) ?? null,
  });
  if (error) {
    console.error(`[activity-log] failed to log "${type}" for user ${userId}`);
  }
}
