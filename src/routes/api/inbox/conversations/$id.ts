import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authenticate(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { error: Response.json({ error: AUTH_ERROR }, { status: 401 }) };
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return { error: Response.json({ error: AUTH_ERROR }, { status: 401 }) };
  }
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { error: Response.json({ error: AUTH_ERROR }, { status: 401 }) };
  }
  return { user: userData.user };
}

// The one source-of-truth field for human takeover: false (the default on
// every existing and new conversation) means the AI receptionist keeps
// replying automatically; true means an owner has explicitly taken over
// and every automated-reply path (Telnyx SMS inbound, the web chat widget)
// must suppress its own reply for this conversation until it's set back to
// false. Nothing else - no separate "manual_mode" or "agent_paused" flag -
// since one boolean is enough to express two states.
const TakeoverSchema = z.object({
  ai_paused: z.boolean(),
});

export const Route = createFileRoute("/api/inbox/conversations/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const auth = await authenticate(request);
          if (auth.error) return auth.error;
          const user = auth.user!;

          const id = params.id;
          if (!id || !UUID_RE.test(id)) {
            return Response.json({ error: "Invalid conversation id" }, { status: 400 });
          }

          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_rate_limit", {
            p_user_id: user.id,
            p_route: "inbox-takeover",
            p_max_requests: 60,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[inbox/conversations/$id] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return Response.json({ error: "Invalid JSON body" }, { status: 400 });
          }
          const parsed = TakeoverSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json({ error: "ai_paused must be true or false" }, { status: 400 });
          }

          const { data, error } = await supabaseAdmin
            .from("conversations")
            .update({ ai_paused: parsed.data.ai_paused })
            .eq("id", id)
            .eq("user_id", user.id)
            .select("id, ai_paused")
            .maybeSingle();

          if (error) {
            console.error("[inbox/conversations/$id] update failed", error);
            return Response.json({ error: "Couldn't update this conversation." }, { status: 500 });
          }
          if (!data) {
            return Response.json({ error: "Conversation not found." }, { status: 404 });
          }

          return Response.json({ conversation: data });
        } catch (err) {
          console.error("[inbox/conversations/$id] error", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
