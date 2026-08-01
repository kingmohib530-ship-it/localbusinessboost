import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many export requests. Please wait a bit and try again.";

export const Route = createFileRoute("/api/account/export")({
  server: {
    handlers: {
      // GET so the browser can trigger a plain file download link if desired.
      GET: async ({ request }) => {
        try {
          // ===== Auth =====
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          const { data: userData, error: userErr } =
            await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const user = userData.user;

          // ===== Rate limit: 5 exports per hour (this is a heavy, rarely-needed operation) =====
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_rate_limit",
            {
              p_user_id: user.id,
              p_route: "account-export",
              p_max_requests: 5,
              p_window_seconds: 3600,
            }
          );
          if (rlErr) {
            console.error("[account/export] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          // ===== Gather everything tied to this user =====
          const [
            profileRes,
            conversationsRes,
            reviewRequestsRes,
            reviewResponsesRes,
            conversationMessagesRes,
          ] = await Promise.all([
            supabaseAdmin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
            supabaseAdmin.from("conversations").select("*").eq("user_id", user.id),
            supabaseAdmin.from("review_requests").select("*").eq("user_id", user.id),
            supabaseAdmin.from("review_responses").select("*").eq("user_id", user.id),
            supabaseAdmin.from("conversation_messages").select("*").eq("user_id", user.id),
          ]);

          const exportBundle = {
            exported_at: new Date().toISOString(),
            account: {
              user_id: user.id,
              email: user.email,
              created_at: user.created_at,
            },
            profile: profileRes.data || null,
            conversations: conversationsRes.data || [],
            review_requests: reviewRequestsRes.data || [],
            review_responses: reviewResponsesRes.data || [],
            conversation_messages: conversationMessagesRes.data || [],
          };

          return new Response(JSON.stringify(exportBundle, null, 2), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="lanavix-data-export-${user.id}.json"`,
            },
          });
        } catch (err) {
          console.error("[account/export] error");
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
