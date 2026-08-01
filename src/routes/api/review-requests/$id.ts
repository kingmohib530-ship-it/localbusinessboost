import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marks a review request as reviewed. There's no Google Business Profile
 * review-fetching integration in this codebase to detect this
 * automatically (the existing Google Places sync only pulls business
 * facts, not individual reviews), so this is a manual confirmation the
 * contractor makes themselves after a customer actually leaves a review.
 */
export const Route = createFileRoute("/api/review-requests/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
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

          const id = params.id;
          if (!id || !UUID_RE.test(id)) {
            return Response.json({ error: "Invalid review request id" }, { status: 400 });
          }

          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_rate_limit", {
            p_user_id: user.id,
            p_route: "review-requests-mark-reviewed",
            p_max_requests: 60,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[review-requests/$id] rate limit check failed", rlErr);
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const body = await request.json().catch(() => null);
          if (body?.status !== "reviewed") {
            return Response.json({ error: 'status must be "reviewed".' }, { status: 400 });
          }

          const { data, error } = await supabaseAdmin
            .from("review_requests")
            .update({ status: "reviewed" })
            .eq("id", id)
            .eq("user_id", user.id)
            .select("id, status")
            .maybeSingle();

          if (error) {
            console.error("[review-requests/$id] update failed", error);
            return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
          }
          if (!data) {
            return Response.json({ error: "Review request not found" }, { status: 404 });
          }

          return Response.json({ reviewRequest: data });
        } catch (err) {
          console.error("[review-requests/$id]", err);
          return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
