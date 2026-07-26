import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { matchBusinessesForRequest, notifyMatchedBusinesses } from "@/lib/consumerRequests.server";
import { SERVICE_TYPE_KEYS, type ServiceTypeKey } from "@/lib/serviceTypes";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";
const MAX_DESCRIPTION_LENGTH = 1000;

function isServiceTypeKey(value: unknown): value is ServiceTypeKey {
  return typeof value === "string" && (SERVICE_TYPE_KEYS as readonly string[]).includes(value);
}

/**
 * A consumer submits a request and it's matched to eligible businesses in
 * one step - matching needs a cross-business view of `profiles` that RLS
 * wouldn't grant a consumer directly, so this can't be a plain client
 * insert the way business_facts writes are.
 */
export const Route = createFileRoute("/api/consumer-requests")({
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
            p_route: "consumer-requests-create",
            p_max_requests: 5,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[consumer-requests] rate limit check failed", rlErr);
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const body = await request.json().catch(() => null);
          const serviceType = body?.serviceType;
          const city = typeof body?.city === "string" ? body.city.trim() : "";
          const description =
            typeof body?.description === "string"
              ? body.description.trim().slice(0, MAX_DESCRIPTION_LENGTH)
              : null;

          if (!isServiceTypeKey(serviceType)) {
            return Response.json({ error: "Pick a valid service type." }, { status: 400 });
          }
          if (!city) {
            return Response.json({ error: "Enter your city." }, { status: 400 });
          }

          const { data: newRequest, error: insertErr } = await supabaseAdmin
            .from("consumer_requests")
            .insert({ user_id: user.id, service_type: serviceType, city, description })
            .select("id")
            .single();
          if (insertErr || !newRequest) {
            console.error("[consumer-requests] failed to create request", insertErr);
            return Response.json(
              { error: "Couldn't submit your request. Please try again." },
              { status: 500 },
            );
          }

          const matches = await matchBusinessesForRequest(serviceType, city);
          let matchCount = 0;

          if (matches.length > 0) {
            const { error: matchErr } = await supabaseAdmin
              .from("consumer_request_matches")
              .insert(matches.map((m) => ({ request_id: newRequest.id, user_id: m.id })));
            if (matchErr) {
              // The request itself was saved successfully - a failed
              // match-fan-out shouldn't be reported as a hard error to the
              // consumer, just an accurate (zero) matchCount below.
              console.error("[consumer-requests] failed to create matches", matchErr);
            } else {
              matchCount = matches.length;
              await notifyMatchedBusinesses(matches, { serviceType, city, description });
            }
          }

          return Response.json({ requestId: newRequest.id, matchCount });
        } catch (err) {
          console.error("[consumer-requests]", err);
          return Response.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
