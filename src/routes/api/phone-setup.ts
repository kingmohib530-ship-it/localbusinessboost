import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { provisionVonageNumber } from "@/lib/vonageProvisioning.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

// Mirrors the client-side normalization in PhoneForwardingSetup.tsx - never
// trust the client alone. A bare 10-digit US number or one with dashes/
// parens/dots is exactly what a person actually types, not an error.
function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return `+${digitsOnly}`;
  if (digitsOnly.length === 10) return `+1${digitsOnly}`;
  return `+${digitsOnly}`;
}

const RequestSchema = z.object({
  forwardingPhoneNumber: z
    .string()
    .trim()
    .min(1, "Enter your business phone number.")
    .transform(normalizePhoneNumber)
    .refine((v) => /^\+[1-9]\d{7,14}$/.test(v), {
      message: "Enter your business phone number in E.164 format, e.g. +15555550100.",
    }),
});

/**
 * Confirms a contractor's real business line and provisions their
 * dedicated Lanavix-owned Vonage number - no Twilio signup, no separate
 * billing, nothing for the contractor to authenticate. Replaces the old
 * "paste your Twilio Account SID/Auth Token" flow entirely.
 */
export const Route = createFileRoute("/api/phone-setup")({
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
            p_route: "phone-setup-save",
            p_max_requests: 10,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[phone-setup] rate limit check failed", rlErr);
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const body = await request.json().catch(() => ({}));
          const parsed = RequestSchema.safeParse(body);
          if (!parsed.success) {
            const firstIssue =
              parsed.error.issues[0]?.message || "Please check your phone number and try again.";
            return Response.json({ error: firstIssue }, { status: 400 });
          }

          const result = await provisionVonageNumber(user.id, parsed.data.forwardingPhoneNumber);
          if (!result.ok) {
            return Response.json({ error: result.error }, { status: 502 });
          }

          return Response.json({ success: true, vonageNumber: result.vonageNumber });
        } catch (err) {
          console.error("[phone-setup]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
