import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { generateDailyBriefCards, type CoachCard } from "@/lib/coach.server";
import { sendExternalEmail } from "@/lib/email.server";
import { loadBusinessTwilioCredentials } from "@/lib/twilioCredentials.server";
import { checkSmsHourlyRateLimit } from "@/lib/planLimits.server";

// Same constant-time comparison approach as every other cron in this
// codebase (quote-follow-ups.ts) - a naive `===` on the secret
// short-circuits on the first mismatched byte.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Ideally this would run hourly and only process each business at its own
// local 7am, the same way it's written for every business's timezone below.
// It doesn't: quote-follow-ups.ts's cron already had to settle for daily
// instead of hourly to stay compatible with Vercel's Hobby-plan cron limits
// (see DECISIONS.md), and that constraint is unconfirmed either way for
// this project right now (Vercel access unavailable this session). Given
// that, this runs once daily at a fixed UTC hour chosen to land near 7am
// Eastern (see vercel.json) and processes every enabled business on that
// single run, regardless of their exact local hour - every business
// currently defaults to America/New_York (see profiles.timezone), so this
// is the real, honest behavior today, not an approximation that happens to
// work. brief_date and the cards themselves still use each business's own
// local calendar day, so what gets reported is correct even though the
// send time isn't personalized per timezone. If Lanavix expands outside
// Eastern time, or confirms a Vercel plan that supports hourly crons,
// switch the schedule to hourly and reinstate an exact-local-hour check
// here - no other change needed.
const MAX_BUSINESSES_PER_RUN = 200;
const COACH_URL = "https://lanavix.com/app/coach";

function localDateString(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildEmailText(businessName: string | null, cards: CoachCard[]): string {
  const greeting = `Good morning${businessName ? `, ${businessName}` : ""}.`;
  if (cards.length === 0) {
    return `${greeting} You're caught up - nothing needs your attention right now.\n\n${COACH_URL}`;
  }
  const lines = cards.map((c) => `- ${c.title}: ${c.detail}`).join("\n");
  return `${greeting} Here's what deserves your attention today.\n\n${lines}\n\nOpen Coach to review everything: ${COACH_URL}`;
}

function buildEmailHtml(businessName: string | null, cards: CoachCard[]): string {
  const greeting = `Good morning${businessName ? `, ${businessName}` : ""}.`;
  if (cards.length === 0) {
    return `<p>${greeting} You're caught up, nothing needs your attention right now.</p><p><a href="${COACH_URL}">Open Coach</a></p>`;
  }
  const items = cards.map((c) => `<li><strong>${c.title}</strong>: ${c.detail}</li>`).join("");
  return `<p>${greeting} Here's what deserves your attention today.</p><ul>${items}</ul><p><a href="${COACH_URL}">Open Coach to review everything</a></p>`;
}

/** Short per-card phrase for the SMS teaser, matching the approved sample copy's style. */
function smsPhrase(card: CoachCard): string {
  switch (card.id) {
    case "missed_calls":
      return `Return ${card.count} missed call${card.count === 1 ? "" : "s"}`;
    case "estimates":
      return `Follow up on ${card.count} estimate${card.count === 1 ? "" : "s"}`;
    case "todays_schedule":
      return `${card.count} job${card.count === 1 ? "" : "s"} scheduled today`;
    case "review_asks":
      return `${card.count} review request${card.count === 1 ? "" : "s"} to send`;
    case "network_requests":
      return `${card.count} new customer request${card.count === 1 ? "" : "s"}`;
    default:
      return card.title;
  }
}

/** Kept short on purpose - a small SMS teaser pointing at the full brief, not the brief itself (see DECISIONS.md). */
function buildSmsTeaser(cards: CoachCard[]): string {
  if (cards.length === 0) {
    return `Good morning. You're caught up today. Open Coach: ${COACH_URL}`;
  }
  const shown = cards.slice(0, 3);
  const more = cards.length > shown.length ? ` +${cards.length - shown.length} more` : "";
  return `Good morning. Today's priorities: ${shown.map(smsPhrase).join(" · ")}${more}. Open Coach to review everything.`;
}

export const Route = createFileRoute("/api/cron/daily-brief")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization") || "";
        const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
        if (!process.env.CRON_SECRET || !timingSafeEqualStr(authHeader, expected)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let processed = 0;
        let sent = 0;
        let skipped = 0;
        let failed = 0;

        try {
          const { data: profiles, error: profilesErr } = await supabaseAdmin
            .from("profiles")
            .select("id, business_name, timezone, daily_brief_channel, owner_phone")
            .eq("daily_brief_enabled", true);

          if (profilesErr) {
            console.error("[cron/daily-brief] failed to load profiles", profilesErr);
            return Response.json({ error: "Failed to load profiles" }, { status: 500 });
          }

          for (const profile of profiles || []) {
            if (processed >= MAX_BUSINESSES_PER_RUN) break;

            const timezone = profile.timezone || "America/New_York";
            processed++;

            const briefDate = localDateString(timezone);
            const channel = profile.daily_brief_channel || "email";
            const cards = await generateDailyBriefCards(profile.id, timezone);

            // The insert itself is the atomic claim: unique(user_id, brief_date)
            // means a concurrent or duplicate run's insert fails with 23505
            // instead of ever creating two briefs for the same business on
            // the same local day.
            const { data: inserted, error: insertErr } = await supabaseAdmin
              .from("daily_briefs")
              .insert({
                user_id: profile.id,
                brief_date: briefDate,
                timezone,
                delivery_method: channel,
                delivery_status: "pending",
                brief_payload: cards as unknown as Json,
              })
              .select("id")
              .single();

            if (insertErr) {
              if (insertErr.code === "23505") {
                skipped++;
                continue;
              }
              console.error("[cron/daily-brief] failed to create brief", profile.id, insertErr);
              failed++;
              continue;
            }

            if (channel === "none") {
              await supabaseAdmin
                .from("daily_briefs")
                .update({ delivery_status: "skipped" })
                .eq("id", inserted.id);
              skipped++;
              continue;
            }

            let anySent = false;
            let anyAttempted = false;

            if (channel === "email" || channel === "both") {
              anyAttempted = true;
              try {
                const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id);
                if (authUser?.user?.email) {
                  await sendExternalEmail(
                    authUser.user.email,
                    "Your Lanavix Daily Brief",
                    buildEmailText(profile.business_name, cards),
                    buildEmailHtml(profile.business_name, cards),
                  );
                  anySent = true;
                }
              } catch (err) {
                console.error("[cron/daily-brief] email send failed", profile.id, err);
              }
            }

            if (channel === "sms" || channel === "both") {
              anyAttempted = true;
              if (profile.owner_phone) {
                const [credentials, hourlyOk] = await Promise.all([
                  loadBusinessTwilioCredentials(profile.id),
                  checkSmsHourlyRateLimit(profile.id),
                ]);
                if (credentials && hourlyOk.allowed) {
                  try {
                    const res = await fetch(
                      `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/x-www-form-urlencoded",
                          Authorization: `Basic ${btoa(`${credentials.accountSid}:${credentials.authToken}`)}`,
                        },
                        body: new URLSearchParams({
                          From: credentials.phoneNumber,
                          To: profile.owner_phone,
                          Body: buildSmsTeaser(cards),
                        }).toString(),
                      },
                    );
                    if (res.ok) {
                      anySent = true;
                    } else {
                      console.error(
                        "[cron/daily-brief] Twilio send failed",
                        profile.id,
                        await res.text(),
                      );
                    }
                  } catch (err) {
                    console.error("[cron/daily-brief] sms send failed", profile.id, err);
                  }
                }
              }
            }

            await supabaseAdmin
              .from("daily_briefs")
              .update({ delivery_status: anySent ? "sent" : anyAttempted ? "failed" : "skipped" })
              .eq("id", inserted.id);

            if (anySent) sent++;
            else if (anyAttempted) failed++;
            else skipped++;
          }

          return Response.json({ processed, sent, skipped, failed });
        } catch (err) {
          console.error("[cron/daily-brief]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
