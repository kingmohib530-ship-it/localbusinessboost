import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadBusinessContext, buildReceptionistSystemPrompt, generateReceptionistReply } from "@/lib/aiReceptionist.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";
const SAMPLE_CUSTOMER_MESSAGE = "Hi, I called but nobody picked up. Do you have anyone available today?";

/**
 * Runs one real Anthropic call through the exact same system prompt and
 * function sms-reply.ts uses, so a contractor can see what their AI
 * receptionist would actually say given their current settings and known
 * facts. This is a preview, not a real call or text: nothing is written
 * to conversations/conversation_messages, so it never inflates the real
 * call stats those tables are counted from.
 */
export const Route = createFileRoute("/api/receptionist-preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const user = userData.user;

          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_rate_limit", {
            p_user_id: user.id,
            p_route: "receptionist-preview",
            p_max_requests: 20,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[receptionist-preview] rate limit check failed", rlErr);
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "AI receptionist isn't configured yet. Contact support." }, { status: 503 });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("business_name, industry, business_hours, escalation_rules")
            .eq("id", user.id)
            .maybeSingle();

          const context = await loadBusinessContext(user.id, profile);
          const systemPrompt = buildReceptionistSystemPrompt(context, "sms");
          const reply = await generateReceptionistReply(apiKey, systemPrompt, [
            { role: "user", content: SAMPLE_CUSTOMER_MESSAGE },
          ]);

          if (!reply) {
            return Response.json({ error: "Couldn't generate a preview right now. Please try again." }, { status: 502 });
          }

          return Response.json({ sampleMessage: SAMPLE_CUSTOMER_MESSAGE, reply });
        } catch (err) {
          console.error("[receptionist-preview]", err);
          return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
