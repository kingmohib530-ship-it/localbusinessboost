/**
 * Plan-tier feature limits, matching the feature comparison table on the
 * public /pricing page. There is no marketed free tier — "starter" is the
 * internal subscription_tier for an account with no active subscription,
 * and gets no product access at all (missed-call text-back, review texts,
 * and Lead Blast all require an active Solo/Crew/Agency subscription,
 * set by the Stripe webhook via subscription_status).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PAID_PLAN_IDS, SOLO_REVIEW_REQUEST_MONTHLY_CAP, SOLO_LEAD_BLAST_MONTHLY_CAP } from "./pricingPlans";

// Pure abuse/cost-control ceiling, independent of plan tier — even an
// unlimited-SMS paid plan shouldn't be able to blow through hundreds of
// sends in a single hour because of a bug or a compromised account. Kept
// separate from the monthly plan-tier quota above, which exists to
// differentiate plans, not to catch abuse.
const SMS_HOURLY_ABUSE_CAP = 50;
const SMS_HOURLY_WINDOW_SECONDS = 3600;

interface QuotaResult {
  allowed: boolean;
  reason?: string;
}

async function getPlan(userId: string): Promise<{ tier: string; isPaidActive: boolean }> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", userId)
    .maybeSingle();
  const tier = data?.subscription_tier || "starter";
  // Explicit allow-list, not "anything but starter" — an unrecognized or
  // corrupted tier value should default to no access, not paid access.
  const isPaidActive =
    (PAID_PLAN_IDS as string[]).includes(tier) &&
    ["active", "trialing", "past_due"].includes(data?.subscription_status || "");
  return { tier, isPaidActive };
}

/**
 * Missed-call auto-texts and conversation replies are unlimited on every
 * paid plan (Solo/Crew/Agency) — there's no marketed free tier to
 * differentiate against anymore. An account with no active subscription
 * ("starter") gets no product access at all.
 */
export async function checkSmsQuota(userId: string): Promise<QuotaResult> {
  const { isPaidActive } = await getPlan(userId);
  if (isPaidActive) return { allowed: true };
  return {
    allowed: false,
    reason: "Subscribe to Solo, Crew, or Agency to unlock the missed-call receptionist.",
  };
}

/**
 * Review request texts are capped at SOLO_REVIEW_REQUEST_MONTHLY_CAP/month
 * on Solo; unlimited on Crew and Agency. An account with no active
 * subscription gets no access at all.
 */
export async function checkReviewRequestQuota(userId: string): Promise<QuotaResult> {
  const { tier, isPaidActive } = await getPlan(userId);
  if (!isPaidActive) {
    return {
      allowed: false,
      reason: "Subscribe to Solo, Crew, or Agency to unlock review request texts.",
    };
  }
  if (tier !== "solo") return { allowed: true };

  // Atomic claim against the monthly cap - reuses the same atomic
  // increment-and-check RPC as the hourly SMS rate limit below, keyed by
  // calendar month so each month gets a fresh bucket. A plain read-count-
  // then-compare here would let two concurrent sends both read a count
  // under the cap and both pass.
  const monthKey = new Date().toISOString().slice(0, 7);
  const { data: allowed, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_user_id: userId,
    p_route: `review-request-quota-${monthKey}`,
    p_max_requests: SOLO_REVIEW_REQUEST_MONTHLY_CAP,
    p_window_seconds: 31 * 24 * 3600,
  });
  if (error) {
    console.error("[planLimits] review request quota check failed", error);
    return { allowed: false, reason: "Service temporarily unavailable. Please try again shortly." };
  }
  if (!allowed) {
    return {
      allowed: false,
      reason: `Solo plan is capped at ${SOLO_REVIEW_REQUEST_MONTHLY_CAP} review request texts/month. Upgrade to Crew for unlimited review texts.`,
    };
  }
  return { allowed: true };
}

/**
 * Flat per-business, per-hour SMS-send ceiling that applies regardless of
 * plan tier — a safety net against abuse/cost blowups, not a plan feature.
 * Uses the same check_rate_limit RPC as every other authenticated-style
 * rate limit in this codebase, keyed by business user id.
 */
export async function checkSmsHourlyRateLimit(userId: string): Promise<QuotaResult> {
  const { data: allowed, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_user_id: userId,
    p_route: "sms-send-hourly",
    p_max_requests: SMS_HOURLY_ABUSE_CAP,
    p_window_seconds: SMS_HOURLY_WINDOW_SECONDS,
  });
  if (error) {
    console.error("[planLimits] sms hourly rate limit check failed", error);
    // Fail closed — this cap exists specifically to stop a bug or a
    // compromised account from blowing through hundreds of sends, so an
    // infra hiccup here should block sends, not wave them through.
    return { allowed: false, reason: "Service temporarily unavailable. Please try again shortly." };
  }
  if (!allowed) {
    return { allowed: false, reason: "Too many messages sent in the last hour. Please try again shortly." };
  }
  return { allowed: true };
}

/**
 * Gate for the AI-generation features marketed as Crew-and-up on the
 * pricing page: the AI review response writer, the competitor intelligence
 * report, and Booking Booster. Solo doesn't include these — only Crew and
 * Agency do — so unlike the checks above, there's no Solo-specific cap
 * here, just a flat tier requirement.
 */
export async function checkCrewFeatureQuota(userId: string): Promise<QuotaResult> {
  const { tier, isPaidActive } = await getPlan(userId);
  if (!isPaidActive || (tier !== "crew" && tier !== "agency")) {
    return {
      allowed: false,
      reason: "This feature is included in Crew and Agency. Upgrade to unlock it.",
    };
  }
  return { allowed: true };
}

/**
 * Local Lead Blast isn't available without an active subscription. Solo is
 * capped at SOLO_LEAD_BLAST_MONTHLY_CAP runs/month. Crew and Agency are
 * unlimited.
 *
 * Uses the same atomic increment-and-check RPC as the other monthly caps
 * in this file, keyed by calendar month so each month gets a fresh
 * bucket. This used to be a plain read-count-then-compare against
 * activity_log, which had two problems: two concurrent runs could both
 * read a count under the cap and both pass (the actual activity_log write
 * only happens after the run finishes, so there was a wide race window),
 * and a failed count query silently defaulted to allowed instead of
 * denying. Both are fixed by switching to the atomic RPC and failing
 * closed on error, matching every sibling check in this file.
 */
export async function checkLeadGeneratorQuota(userId: string): Promise<QuotaResult> {
  const { tier, isPaidActive } = await getPlan(userId);
  if (!isPaidActive) {
    return {
      allowed: false,
      reason: "Local Lead Blast isn't available without an active plan. Subscribe to Solo or higher to unlock it.",
    };
  }
  if (tier !== "solo") return { allowed: true };

  const monthKey = new Date().toISOString().slice(0, 7);
  const { data: allowed, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_user_id: userId,
    p_route: `lead-generator-quota-${monthKey}`,
    p_max_requests: SOLO_LEAD_BLAST_MONTHLY_CAP,
    p_window_seconds: 31 * 24 * 3600,
  });
  if (error) {
    console.error("[planLimits] lead generator quota check failed", error);
    return { allowed: false, reason: "Service temporarily unavailable. Please try again shortly." };
  }
  if (!allowed) {
    return {
      allowed: false,
      reason: `Solo plan is capped at ${SOLO_LEAD_BLAST_MONTHLY_CAP} Local Lead Blast runs/month. Upgrade to Crew for unlimited runs.`,
    };
  }
  return { allowed: true };
}
