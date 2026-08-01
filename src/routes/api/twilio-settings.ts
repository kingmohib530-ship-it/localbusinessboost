import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { saveBusinessTwilioCredentials, verifyTwilioAccount } from "@/lib/twilioCredentials.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

const RequestSchema = z.object({
  accountSid: z
    .string()
    .trim()
    .regex(/^AC[a-f0-9]{32}$/i, "That doesn't look like a Twilio Account SID."),
  authToken: z.string().trim().min(32, "That doesn't look like a Twilio Auth Token."),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Enter your number in E.164 format, e.g. +15555550100."),
});

/**
 * Lets a contractor connect their own Twilio account in-app: pastes their
 * Account SID, Auth Token, and phone number, we confirm it actually
 * authenticates against Twilio's own API, then store it (Auth Token
 * encrypted via Supabase Vault, never in a plaintext column). Replaces the
 * old "paste into Vercel environment variables" instructions entirely.
 */
export const Route = createFileRoute("/api/twilio-settings")({
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
            p_route: "twilio-settings-save",
            p_max_requests: 10,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[twilio-settings] rate limit check failed", rlErr);
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const body = await request.json().catch(() => ({}));
          const parsed = RequestSchema.safeParse(body);
          if (!parsed.success) {
            const firstIssue =
              parsed.error.issues[0]?.message || "Please check your Twilio details and try again.";
            return Response.json({ error: firstIssue }, { status: 400 });
          }
          const { accountSid, authToken, phoneNumber } = parsed.data;

          const verified = await verifyTwilioAccount(accountSid, authToken);
          if (!verified.ok) {
            return Response.json({ error: verified.reason }, { status: 400 });
          }

          const saved = await saveBusinessTwilioCredentials(user.id, {
            accountSid,
            authToken,
            phoneNumber,
          });
          if (!saved.ok) {
            // Postgres unique_violation on the phone-number index surfaces
            // here as a generic save failure from the RPC - give the
            // contractor the specific, actionable reason instead.
            return Response.json(
              {
                error:
                  "That phone number is already connected to another account. Double-check it and try again.",
              },
              { status: 409 },
            );
          }

          return Response.json({ success: true });
        } catch (err) {
          console.error("[twilio-settings]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
