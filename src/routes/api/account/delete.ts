import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const CONFIRM_ERROR =
  'To delete your account, send { "confirm": "DELETE" } in the request body. This action is permanent.';

export const Route = createFileRoute("/api/account/delete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

          // ===== Rate limit: 3 requests per hour per user =====
          const { data: rlAllowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_rate_limit",
            {
              p_user_id: user.id,
              p_route: "account-delete",
              p_max_requests: 3,
              p_window_seconds: 3600,
            },
          );
          if (rlErr) {
            console.error("[account/delete] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!rlAllowed) {
            return Response.json({ error: "Too many requests. Please wait a bit and try again." }, { status: 429 });
          }

          // ===== Explicit confirmation required =====
          // Prevents accidental deletion from a stray/misfired request.
          let body: any = {};
          try {
            body = await request.json();
          } catch {
            // no body provided
          }
          if (body?.confirm !== "DELETE") {
            return Response.json({ error: CONFIRM_ERROR }, { status: 400 });
          }

          // ===== Delete the auth user. =====
          // All related rows (profile, businesses, leads, chatbot_settings,
          // missed_calls, review_requests, review_responses, sms_conversations,
          // rate_limits) cascade automatically via ON DELETE CASCADE foreign keys.
          const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(
            user.id
          );

          if (deleteErr) {
            console.error("[account/delete] deletion failed");
            return Response.json(
              { error: "Failed to delete account. Please try again or contact support." },
              { status: 500 }
            );
          }

          return Response.json({
            success: true,
            message: "Your account and all associated data have been permanently deleted.",
          });
        } catch (err) {
          console.error("[account/delete] error");
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
