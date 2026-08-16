import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadBusinessTwilioCredentials } from "@/lib/twilioCredentials.server";

/**
 * The Inbox composer's send path - the only place in the app where a
 * business owner replies to a customer directly, instead of the AI
 * receptionist. Two things happen together: the message goes out (SMS via
 * the business's own Twilio account; web chat has no live delivery path
 * yet, see the route comment below), and conversations.ai_paused flips to
 * true so sms-reply.ts and the public web-chat route stop generating AI
 * replies for this conversation from here on - a one-way handoff, not a
 * toggle, matching "the receptionist stands down when the owner takes
 * over."
 *
 * For SMS, the Twilio send happens BEFORE the message is saved, not after -
 * a message that never left Twilio should never show up as a real row in
 * conversation_messages. The client renders an optimistic "sending" bubble
 * and reconciles it with the real saved row on success, or marks it failed
 * (with a retry) on a non-200 response. There's no delivery-status column
 * on conversation_messages for this reason - send-then-persist means a
 * failed send just never becomes a row, so there's nothing to track.
 *
 * Web chat has no live push to the visitor (the widget only ever gets a
 * reply in the same HTTP response to the message it just sent - see
 * src/routes/api/public/web-chat/$business_id.ts and public/lanavix-widget.js,
 * neither has a poll loop or realtime subscription). A web chat reply from
 * here is still saved for the owner's own record and still pauses the AI,
 * but the UI must not claim it reaches the visitor live - see the Inbox
 * composer's copy for that channel.
 */

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";
const MAX_MESSAGE_LENGTH = 1000;

export const Route = createFileRoute("/api/inbox/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          if (!token) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          const user = userData?.user;
          if (userErr || !user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }

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

          let body: { conversationId?: unknown; message?: unknown };
          try {
            body = await request.json();
          } catch {
            return Response.json({ error: "Invalid request body." }, { status: 400 });
          }
          const conversationId =
            typeof body.conversationId === "string" ? body.conversationId.trim() : "";
          const message = typeof body.message === "string" ? body.message.trim() : "";
          if (!conversationId) {
            return Response.json({ error: "conversationId is required." }, { status: 400 });
          }
          if (!message || message.length > MAX_MESSAGE_LENGTH) {
            return Response.json(
              { error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` },
              { status: 400 },
            );
          }

          const { data: conversation, error: convErr } = await supabaseAdmin
            .from("conversations")
            .select("id, channel, customer_identifier")
            .eq("id", conversationId)
            .eq("user_id", user.id)
            .maybeSingle();
          if (convErr || !conversation) {
            return Response.json({ error: "Conversation not found." }, { status: 404 });
          }

          if (conversation.channel === "sms") {
            const credentials = await loadBusinessTwilioCredentials(user.id);
            if (!credentials) {
              return Response.json(
                { error: "Texting isn't set up for this business yet." },
                { status: 400 },
              );
            }
            const twilioRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`,
                },
                body: new URLSearchParams({
                  From: credentials.phoneNumber,
                  To: conversation.customer_identifier,
                  Body: message,
                }).toString(),
              },
            );
            if (!twilioRes.ok) {
              console.error("[inbox/send] Twilio send failed", await twilioRes.text());
              return Response.json(
                { error: "Message couldn't be delivered. Please try again." },
                { status: 502 },
              );
            }
          }

          const now = new Date().toISOString();
          const { data: saved, error: insertErr } = await supabaseAdmin
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
          if (insertErr || !saved) {
            console.error("[inbox/send] failed to save sent message", insertErr);
            return Response.json(
              { error: "Message sent, but couldn't be saved to this conversation." },
              { status: 500 },
            );
          }

          await supabaseAdmin
            .from("conversations")
            .update({ ai_paused: true, status: "replied", last_message_at: now })
            .eq("id", conversation.id);

          return Response.json({ message: saved });
        } catch (err) {
          console.error("[inbox/send]", err);
          return Response.json({ error: "Something went wrong sending this." }, { status: 500 });
        }
      },
    },
  },
});
