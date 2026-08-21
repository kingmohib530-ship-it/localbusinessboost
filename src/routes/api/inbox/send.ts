import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadBusinessTelnyxNumber, sendTelnyxSms } from "@/lib/telnyxProvisioning.server";
import { checkSmsQuota } from "@/lib/planLimits.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many messages sent. Please wait a bit and try again.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_LIKE = /^\+?[\d\s().-]{7,}$/;

// A manual reply through Telnyx has no hard character ceiling the way the
// public web-chat widget does (that cap bounds an LLM prompt) - this one
// just keeps a single manual send from being pasted-in essay-length text.
// 1600 chars is roughly 10 concatenated SMS segments, already a generous
// real-world ceiling for a typed reply.
const MAX_MESSAGE_LENGTH = 1600;

const SendSchema = z.object({
  conversation_id: z.string().regex(UUID_RE, "Invalid conversation id"),
  message: z.string().trim().min(1, "Message is required").max(MAX_MESSAGE_LENGTH),
});

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

/**
 * Manual send from the Inbox composer - a signed-in owner (or someone on
 * their team, once that exists) replying by hand through the business's
 * real Telnyx number, distinct from every other write to
 * conversation_messages in this codebase, which are all automated webhook
 * paths (Telnyx SMS/voice, web chat, the quote follow-up cron). Only ever
 * applies to SMS conversations - see app.inbox.tsx and the Slice 1 report
 * for why web chat has no manual send transport yet.
 */
export const Route = createFileRoute("/api/inbox/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = await authenticate(request);
          if (auth.error) return auth.error;
          const user = auth.user!;

          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_rate_limit", {
            p_user_id: user.id,
            p_route: "inbox-send",
            p_max_requests: 60,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[inbox/send] rate limit check failed");
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
          const parsed = SendSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              { error: parsed.error.issues[0]?.message || "Invalid input" },
              { status: 400 },
            );
          }
          const { conversation_id, message } = parsed.data;

          // Manual reply is the same "conversation reply" capability the AI
          // receptionist already gates on an active paid plan - not a new
          // restriction, the same one.
          const quota = await checkSmsQuota(user.id);
          if (!quota.allowed) {
            return Response.json({ error: quota.reason }, { status: 402 });
          }

          const { data: conversation, error: convErr } = await supabaseAdmin
            .from("conversations")
            .select("id, channel, customer_identifier, user_id, ai_paused")
            .eq("id", conversation_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (convErr) {
            console.error("[inbox/send] failed to load conversation", convErr);
            return Response.json({ error: "Couldn't load this conversation." }, { status: 500 });
          }
          if (!conversation) {
            return Response.json({ error: "Conversation not found." }, { status: 404 });
          }

          // The Inbox UI already only shows an enabled composer once the
          // owner has taken over, but that's a client-side convenience, not
          // a security boundary - a direct call to this endpoint has to be
          // rejected the same way, or a human and the AI receptionist could
          // both reply to the same customer message.
          if (!conversation.ai_paused) {
            return Response.json(
              { error: "Take over this conversation before replying manually." },
              { status: 409 },
            );
          }

          if (conversation.channel !== "sms") {
            return Response.json(
              {
                error:
                  "Manual reply isn't available for web chat conversations yet - only text conversations.",
              },
              { status: 400 },
            );
          }
          if (!PHONE_LIKE.test(conversation.customer_identifier)) {
            return Response.json(
              { error: "This conversation has no valid phone number to send to." },
              { status: 400 },
            );
          }

          const telnyxNumber = await loadBusinessTelnyxNumber(user.id);
          if (!telnyxNumber) {
            return Response.json(
              { error: "Connect your phone number in Receptionist Setup before sending texts." },
              { status: 400 },
            );
          }

          const sendResult = await sendTelnyxSms(
            telnyxNumber,
            conversation.customer_identifier,
            message,
          );
          if (!sendResult.ok) {
            console.error("[inbox/send] Telnyx send failed", sendResult.error);
            return Response.json(
              { error: "Couldn't send your message. Please try again." },
              { status: 502 },
            );
          }

          const now = new Date().toISOString();
          const { data: savedMessage, error: insertErr } = await supabaseAdmin
            .from("conversation_messages")
            .insert({
              conversation_id: conversation.id,
              user_id: user.id,
              direction: "outbound",
              message,
              sent_at: now,
            })
            .select()
            .single();

          await supabaseAdmin
            .from("conversations")
            .update({ status: "replied", last_message_at: now })
            .eq("id", conversation.id);

          if (insertErr || !savedMessage) {
            // The text really did go out to the customer at this point - the
            // only thing that failed is recording it, so telling the owner
            // "failed to send" here would be false and risks a duplicate
            // send on retry. Same graceful-degradation call as
            // telnyxProvisioning's "provisioned but failed to save" case.
            console.error("[inbox/send] sent but failed to persist message", insertErr);
            return Response.json({
              success: true,
              message: null,
              warning:
                "Message was sent, but Lanavix couldn't save it to the conversation history. Don't resend unless needed.",
            });
          }

          return Response.json({ success: true, message: savedMessage });
        } catch (err) {
          console.error("[inbox/send] error", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
