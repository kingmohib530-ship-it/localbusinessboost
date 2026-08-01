import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchGooglePlaceDetails, upsertSyncedFact } from "@/lib/businessFacts.server";
import { logActivity } from "@/lib/activityLog.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

/**
 * Pulls hours, phone, address, and categories from the contractor's
 * confirmed Google Business listing and writes them into business_facts.
 * Manually triggered by the "Sync now" button - there's no scheduler
 * running this automatically yet.
 */
export const Route = createFileRoute("/api/business-facts/sync-google")({
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
            p_route: "business-facts-sync-google",
            p_max_requests: 5,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[business-facts/sync-google] rate limit check failed", rlErr);
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const googleKey = process.env.GOOGLE_PLACES_API_KEY;
          if (!googleKey) {
            return Response.json({ error: "GOOGLE_PLACES_API_KEY not configured" }, { status: 500 });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("google_place_id")
            .eq("id", user.id)
            .maybeSingle();
          if (!profile?.google_place_id) {
            return Response.json(
              { error: "Confirm your Google Business listing first." },
              { status: 400 },
            );
          }

          const details = await fetchGooglePlaceDetails(googleKey, profile.google_place_id);

          const writes: Promise<"active" | "pending_review" | "skipped">[] = [];
          if (details.hours) {
            writes.push(upsertSyncedFact(user.id, "hours", details.hours, "google_synced"));
          }
          if (details.phone) {
            writes.push(upsertSyncedFact(user.id, "general", `Google-listed phone: ${details.phone}`, "google_synced"));
          }
          if (details.address) {
            writes.push(upsertSyncedFact(user.id, "general", `Business address: ${details.address}`, "google_synced"));
          }
          if (details.categories.length > 0) {
            writes.push(
              upsertSyncedFact(
                user.id,
                "service",
                `Listed on Google as: ${details.categories.join(", ")}`,
                "google_synced",
              ),
            );
          }

          if (writes.length === 0) {
            return Response.json({ synced: 0, pendingReview: 0, skipped: 0, message: "Nothing new found on your Google listing." });
          }

          const results = await Promise.all(writes);
          const synced = results.filter((r) => r === "active").length;
          const pendingReview = results.filter((r) => r === "pending_review").length;
          const skipped = results.filter((r) => r === "skipped").length;

          await logActivity(user.id, "business_facts_sync", `Synced ${synced + pendingReview} fact(s) from Google Business`, {
            source: "google_synced",
            synced,
            pendingReview,
          });

          return Response.json({ synced, pendingReview, skipped });
        } catch (err) {
          console.error("[business-facts/sync-google]", err);
          return Response.json({ error: "Something went wrong. Please try again." }, { status: 502 });
        }
      },
    },
  },
});
