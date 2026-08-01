import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { searchGooglePlaceCandidates } from "@/lib/businessFacts.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

/**
 * Lets a contractor find their real Google Business listing by name + city
 * so they can confirm which one is theirs, instead of being asked to paste
 * a raw Place ID they'd have no way to find.
 */
export const Route = createFileRoute("/api/business-facts/search-google-places")({
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
            p_route: "business-facts-search-google",
            p_max_requests: 10,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[business-facts/search-google-places] rate limit check failed", rlErr);
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const googleKey = process.env.GOOGLE_PLACES_API_KEY;
          if (!googleKey) {
            return Response.json({ error: "GOOGLE_PLACES_API_KEY not configured" }, { status: 500 });
          }

          const body = await request.json().catch(() => ({}));
          let query = typeof body.query === "string" ? body.query.trim() : "";

          if (!query) {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("business_name, city")
              .eq("id", user.id)
              .maybeSingle();
            if (!profile?.business_name) {
              return Response.json(
                { error: "Add your business name in Settings first, or search by name below." },
                { status: 400 },
              );
            }
            query = profile.city ? `${profile.business_name} ${profile.city}` : profile.business_name;
          }

          const candidates = await searchGooglePlaceCandidates(googleKey, query);
          return Response.json({ candidates });
        } catch (err) {
          console.error("[business-facts/search-google-places]", err);
          return Response.json(
            { error: "Couldn't reach Google Places right now. Please try again." },
            { status: 502 },
          );
        }
      },
    },
  },
});
