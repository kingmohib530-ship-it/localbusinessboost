import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateAdmin } from "@/lib/admin-auth.server";

// Neutral midpoint for any component with no measurable data yet — matches
// profiles.lanavix_score's own DEFAULT 50 for brand-new businesses. This
// avoids unfairly penalizing (0) or rewarding (100) businesses we simply
// haven't observed enough activity for.
const NEUTRAL_SCORE = 50;

// Worst-case response time used to normalize response_speed into 0-100.
// A response at or beyond this many minutes scores 0; an instant response
// scores 100; linear in between.
const RESPONSE_SPEED_WORST_CASE_MINUTES = 120;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export const Route = createFileRoute("/api/admin/update-scores")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateAdmin(request);
        if ("error" in auth) return auth.error;

        try {
          const [
            { data: profiles, error: profilesErr },
            { data: missedCalls },
            { data: outboundReplies },
            { data: appointments },
            { data: reviews },
          ] = await Promise.all([
            supabaseAdmin.from("profiles").select("id"),
            supabaseAdmin.from("missed_calls").select("id, user_id, called_at"),
            supabaseAdmin
              .from("sms_conversations")
              .select("missed_call_id, sent_at")
              .eq("direction", "outbound")
              .not("missed_call_id", "is", null)
              .order("sent_at", { ascending: true }),
            supabaseAdmin.from("appointments").select("user_id, status"),
            supabaseAdmin.from("review_responses").select("user_id, star_rating, created_at"),
          ]);

          if (profilesErr) {
            console.error("[update-scores] failed to load profiles", profilesErr);
            return Response.json({ error: "Failed to load profiles" }, { status: 500 });
          }

          // First outbound reply per missed_call_id (earliest, since the
          // query above is already ordered ascending).
          const firstReplyByMissedCall = new Map<string, string>();
          for (const r of outboundReplies ?? []) {
            if (r.missed_call_id && r.sent_at && !firstReplyByMissedCall.has(r.missed_call_id)) {
              firstReplyByMissedCall.set(r.missed_call_id, r.sent_at);
            }
          }

          // response_speed_avg_minutes per business
          const responseMinutesByUser = new Map<string, number[]>();
          for (const mc of missedCalls ?? []) {
            if (!mc.user_id || !mc.called_at) continue;
            const firstReply = firstReplyByMissedCall.get(mc.id);
            if (!firstReply) continue;
            const minutes = (new Date(firstReply).getTime() - new Date(mc.called_at).getTime()) / 60000;
            if (minutes < 0) continue;
            if (!responseMinutesByUser.has(mc.user_id)) responseMinutesByUser.set(mc.user_id, []);
            responseMinutesByUser.get(mc.user_id)!.push(minutes);
          }

          // booking_completion_rate per business
          const appointmentCountsByUser = new Map<string, { total: number; completed: number }>();
          for (const a of appointments ?? []) {
            if (!a.user_id) continue;
            if (!appointmentCountsByUser.has(a.user_id)) appointmentCountsByUser.set(a.user_id, { total: 0, completed: 0 });
            const entry = appointmentCountsByUser.get(a.user_id)!;
            entry.total++;
            if (a.status === "completed") entry.completed++;
          }

          // consumer_rating_avg + review volume this month per business.
          // Uses review_responses.star_rating — review_requests (the table
          // named in the spec) has no rating column at all; star ratings
          // only ever live on review_responses in this schema.
          const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          const starsByUser = new Map<string, number[]>();
          const reviewsThisMonthByUser = new Map<string, number>();
          for (const r of reviews ?? []) {
            if (!r.user_id) continue;
            if (typeof r.star_rating === "number") {
              if (!starsByUser.has(r.user_id)) starsByUser.set(r.user_id, []);
              starsByUser.get(r.user_id)!.push(r.star_rating);
            }
            if (r.created_at && new Date(r.created_at) >= monthStart) {
              reviewsThisMonthByUser.set(r.user_id, (reviewsThisMonthByUser.get(r.user_id) ?? 0) + 1);
            }
          }

          let updated = 0;
          for (const profile of profiles ?? []) {
            const minutesArr = responseMinutesByUser.get(profile.id);
            const avgMinutes = minutesArr?.length
              ? minutesArr.reduce((a, b) => a + b, 0) / minutesArr.length
              : null;
            const responseSpeedScore =
              avgMinutes === null ? NEUTRAL_SCORE : clamp(100 - (avgMinutes / RESPONSE_SPEED_WORST_CASE_MINUTES) * 100, 0, 100);

            const apptEntry = appointmentCountsByUser.get(profile.id);
            const bookingCompletionRate = apptEntry?.total ? Math.round((apptEntry.completed / apptEntry.total) * 100) : null;
            const bookingCompletionScore = bookingCompletionRate ?? NEUTRAL_SCORE;

            const starsArr = starsByUser.get(profile.id);
            const avgStars = starsArr?.length ? starsArr.reduce((a, b) => a + b, 0) / starsArr.length : null;
            const starScore = avgStars === null ? NEUTRAL_SCORE : Math.min(100, avgStars * 20);

            const reviewVolumeThisMonth = reviewsThisMonthByUser.get(profile.id) ?? 0;
            const reviewVolumeScore = Math.min(100, reviewVolumeThisMonth);

            const lanavixScore = Math.round(
              clamp(
                0.3 * responseSpeedScore + 0.25 * bookingCompletionScore + 0.25 * starScore + 0.2 * reviewVolumeScore,
                0,
                100,
              ),
            );

            const { error: updateErr } = await supabaseAdmin
              .from("profiles")
              .update({
                lanavix_score: lanavixScore,
                response_speed_avg_minutes: avgMinutes === null ? null : Math.round(avgMinutes),
                booking_completion_rate: bookingCompletionRate,
                consumer_rating_avg: avgStars === null ? null : Math.round(avgStars * 10) / 10,
              })
              .eq("id", profile.id);

            if (updateErr) {
              console.error("[update-scores] failed to update profile", profile.id, updateErr);
            } else {
              updated++;
            }
          }

          return Response.json({ success: true, businessesProcessed: profiles?.length ?? 0, updated });
        } catch (err) {
          console.error("[update-scores]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
