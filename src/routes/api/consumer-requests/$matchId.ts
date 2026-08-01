import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendExternalEmail } from "@/lib/email.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

/**
 * A matched business accepts or declines a consumer_request_matches row.
 * Accept is a real race between businesses (only one can win a request
 * fanned out to several), so the actual "first wins" guarantee comes from
 * a partial unique index on consumer_request_matches(request_id) WHERE
 * status = 'accepted' - the UPDATE below either lands cleanly or fails
 * with a unique-violation that this code turns into a normal 409, never a
 * hand-rolled read-then-write that a second request could slip through.
 */
export const Route = createFileRoute("/api/consumer-requests/$matchId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
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
            p_route: "consumer-requests-respond",
            p_max_requests: 30,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[consumer-requests/respond] rate limit check failed", rlErr);
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const body = await request.json().catch(() => null);
          const action = body?.action;
          if (action !== "accept" && action !== "decline") {
            return Response.json(
              { error: 'action must be "accept" or "decline".' },
              { status: 400 },
            );
          }

          const matchId = params.matchId;
          const nextStatus = action === "accept" ? "accepted" : "declined";

          const { data: updated, error: updateErr } = await supabaseAdmin
            .from("consumer_request_matches")
            .update({ status: nextStatus, updated_at: new Date().toISOString() })
            .eq("id", matchId)
            .eq("user_id", user.id)
            .eq("status", "pending")
            .select("id, request_id")
            .maybeSingle();

          if (updateErr) {
            // Postgres error 23505 = unique_violation: someone else's match
            // for this same request already won the accept race.
            if (updateErr.code === "23505") {
              return Response.json(
                { error: "This request was just accepted by another business." },
                { status: 409 },
              );
            }
            console.error("[consumer-requests/respond] update failed", updateErr);
            return Response.json(
              { error: "Something went wrong. Please try again." },
              { status: 500 },
            );
          }
          if (!updated) {
            return Response.json(
              { error: "This request is no longer available." },
              { status: 409 },
            );
          }

          if (action === "decline") {
            const { count: remainingPending } = await supabaseAdmin
              .from("consumer_request_matches")
              .select("id", { count: "exact", head: true })
              .eq("request_id", updated.request_id)
              .eq("status", "pending");
            if (!remainingPending) {
              await supabaseAdmin
                .from("consumer_requests")
                .update({ status: "declined_all", updated_at: new Date().toISOString() })
                .eq("id", updated.request_id)
                .eq("status", "pending");
            }
            return Response.json({ status: "declined" });
          }

          // Accept won the race - flip the remaining siblings and the
          // parent request, then reveal contact info both ways. Contact
          // reveal here matches the existing SMS marketplace's behavior
          // (raw phone/number shared directly, no messaging relay) - a
          // known gap flagged in CLAUDE.md to revisit before this opens
          // beyond trusted, verified businesses.
          await supabaseAdmin
            .from("consumer_request_matches")
            .update({ status: "superseded", updated_at: new Date().toISOString() })
            .eq("request_id", updated.request_id)
            .eq("status", "pending");

          const { data: fullRequest } = await supabaseAdmin
            .from("consumer_requests")
            .update({
              status: "accepted",
              accepted_user_id: user.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", updated.request_id)
            .eq("status", "pending")
            .select("id, user_id, service_type, city, description")
            .maybeSingle();

          let consumerContact: {
            email: string | null;
            phone: string | null;
            fullName: string | null;
          } = {
            email: null,
            phone: null,
            fullName: null,
          };
          if (fullRequest) {
            const [{ data: authConsumer }, { data: consumerProfile }] = await Promise.all([
              supabaseAdmin.auth.admin.getUserById(fullRequest.user_id),
              supabaseAdmin
                .from("consumer_profiles")
                .select("phone, full_name")
                .eq("id", fullRequest.user_id)
                .maybeSingle(),
            ]);
            consumerContact = {
              email: authConsumer?.user?.email ?? null,
              phone: consumerProfile?.phone ?? null,
              fullName: consumerProfile?.full_name ?? null,
            };

            if (consumerContact.email) {
              const { data: businessProfile } = await supabaseAdmin
                .from("profiles")
                .select("business_name, twilio_phone_number")
                .eq("id", user.id)
                .maybeSingle();
              const contactLine = businessProfile?.twilio_phone_number
                ? ` You can reach them at ${businessProfile.twilio_phone_number}.`
                : "";
              await sendExternalEmail(
                consumerContact.email,
                `${businessProfile?.business_name || "A business"} accepted your request`,
                `Good news - ${businessProfile?.business_name || "a business"} on Lanavix Network accepted your ${fullRequest.service_type} request and will be in touch.${contactLine}`,
              );
            }
          }

          return Response.json({ status: "accepted", consumer: consumerContact });
        } catch (err) {
          console.error("[consumer-requests/respond]", err);
          return Response.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
          );
        }
      },
    },
  },
});
