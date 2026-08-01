import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { extractFactsFromWebsite, upsertSyncedFact } from "@/lib/businessFacts.server";
import { logActivity } from "@/lib/activityLog.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

/**
 * Fetches the contractor's confirmed website and asks Claude to pull out
 * services, prices, service area, and hours actually printed on the page,
 * then writes them into business_facts. Manually triggered by the "Sync
 * now" button - there's no scheduler running this automatically yet.
 */
export const Route = createFileRoute("/api/business-facts/sync-website")({
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
            p_route: "business-facts-sync-website",
            p_max_requests: 5,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[business-facts/sync-website] rate limit check failed", rlErr);
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const anthropicKey = process.env.ANTHROPIC_API_KEY;
          if (!anthropicKey) {
            return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("website")
            .eq("id", user.id)
            .maybeSingle();
          if (!profile?.website) {
            return Response.json({ error: "Confirm your website URL first." }, { status: 400 });
          }

          const extracted = await extractFactsFromWebsite(anthropicKey, profile.website);

          if (extracted.length === 0) {
            return Response.json({ synced: 0, pendingReview: 0, skipped: 0, message: "No concrete facts found on your website." });
          }

          const results = await Promise.all(
            extracted.map((f) => upsertSyncedFact(user.id, f.factType, f.factText, "website_synced")),
          );
          const synced = results.filter((r) => r === "active").length;
          const pendingReview = results.filter((r) => r === "pending_review").length;
          const skipped = results.filter((r) => r === "skipped").length;

          await logActivity(user.id, "business_facts_sync", `Synced ${synced + pendingReview} fact(s) from your website`, {
            source: "website_synced",
            synced,
            pendingReview,
          });

          return Response.json({ synced, pendingReview, skipped });
        } catch (err) {
          console.error("[business-facts/sync-website]", err);
          const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
