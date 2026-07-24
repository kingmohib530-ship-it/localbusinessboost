/**
 * Plan-tier feature limits, matching the feature comparison table on the
 * public /pricing page. There is no marketed free tier — "starter" is the
 * internal subscription_tier for an account with no active subscription,
 * and gets no product access at all (missed-call text-back, review texts,
 * and Lead Blast all require an active Solo/Crew/Agency subscription,
 * set by the Stripe webhook via subscription_status).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const SOLO_REVIEW_REQUEST_MONTHLY_CAP = 100;
export const SOLO_LEAD_BLAST_MONTHLY_CAP = 5;

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
  const isPaidActive = tier !== "starter" && ["active", "trialing", "past_due"].includes(data?.subscription_status || "");
  return { tier, isPaidActive };
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
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

  const { count } = await supabaseAdmin
    .from("review_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "sent")
    .gte("created_at", monthStartIso());

  if ((count ?? 0) >= SOLO_REVIEW_REQUEST_MONTHLY_CAP) {
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
    return { allowed: true }; // fail open — never block sends on an infra hiccup
  }
  if (!allowed) {
    return { allowed: false, reason: "Too many messages sent in the last hour. Please try again shortly." };
  }
  return { allowed: true };
}

/**
 * Local Lead Blast isn't available without an active subscription. Solo is
 * capped at SOLO_LEAD_BLAST_MONTHLY_CAP runs/month (counted via the
 * "lead_generator_research" activity_log entry each run writes). Crew and
 * Agency are unlimited.
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

  const { count } = await supabaseAdmin
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "lead_generator_research")
    .gte("created_at", monthStartIso());

  if ((count ?? 0) >= SOLO_LEAD_BLAST_MONTHLY_CAP) {
    return {
      allowed: false,
      reason: `Solo plan is capped at ${SOLO_LEAD_BLAST_MONTHLY_CAP} Local Lead Blast runs/month. Upgrade to Crew for unlimited runs.`,
    };
  }
  return { allowed: true };
}
