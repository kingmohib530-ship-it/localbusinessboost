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
            businessesRes,
            missedCallsRes,
            reviewRequestsRes,
            reviewResponsesRes,
            smsConversationsRes,
          ] = await Promise.all([
            supabaseAdmin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
            supabaseAdmin.from("businesses").select("*").eq("owner_id", user.id),
            supabaseAdmin.from("missed_calls").select("*").eq("user_id", user.id),
            supabaseAdmin.from("review_requests").select("*").eq("user_id", user.id),
            supabaseAdmin.from("review_responses").select("*").eq("user_id", user.id),
            supabaseAdmin.from("sms_conversations").select("*").eq("user_id", user.id),
          ]);

          const businessIds = (businessesRes.data || []).map((b: any) => b.id);

          let leads: any[] = [];
          let chatbotSettings: any[] = [];
          if (businessIds.length > 0) {
            const [leadsRes, chatbotRes] = await Promise.all([
              supabaseAdmin.from("leads").select("*").in("business_id", businessIds),
              supabaseAdmin.from("chatbot_settings").select("*").in("business_id", businessIds),
            ]);
            leads = leadsRes.data || [];
            chatbotSettings = chatbotRes.data || [];
          }

          const exportBundle = {
            exported_at: new Date().toISOString(),
            account: {
              user_id: user.id,
              email: user.email,
              created_at: user.created_at,
            },
            profile: profileRes.data || null,
            businesses: businessesRes.data || [],
            leads,
            chatbot_settings: chatbotSettings,
            missed_calls: missedCallsRes.data || [],
            review_requests: reviewRequestsRes.data || [],
            review_responses: reviewResponsesRes.data || [],
            sms_conversations: smsConversationsRes.data || [],
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
