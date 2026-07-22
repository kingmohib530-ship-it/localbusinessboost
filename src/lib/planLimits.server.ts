/**
 * Plan-tier feature limits, matching the feature comparison table on the
 * public /pricing page (SMS / month, Lead Generator runs / month). Starter
 * is the free tier; Solo/Crew/Empire are unlocked by an active or trialing
 * subscription (subscription_status is set by the Stripe webhook).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const STARTER_SMS_MONTHLY_CAP = 50;
export const SOLO_LEAD_GENERATOR_MONTHLY_CAP = 3;

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
 * Starter plan caps combined outbound SMS (missed-call auto-texts,
 * conversation replies, and review requests) at STARTER_SMS_MONTHLY_CAP per
 * calendar month. Paid plans (Solo/Crew/Empire) are unlimited.
 */
export async function checkSmsQuota(userId: string): Promise<QuotaResult> {
  const { isPaidActive } = await getPlan(userId);
  if (isPaidActive) return { allowed: true };

  const monthStart = monthStartIso();
  const [{ count: convoCount }, { count: reviewCount }] = await Promise.all([
    supabaseAdmin
      .from("sms_conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("direction", "outbound")
      .gte("sent_at", monthStart),
    supabaseAdmin
      .from("review_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "sent")
      .gte("created_at", monthStart),
  ]);

  const used = (convoCount ?? 0) + (reviewCount ?? 0);
  if (used >= STARTER_SMS_MONTHLY_CAP) {
    return {
      allowed: false,
      reason: `Starter plan is capped at ${STARTER_SMS_MONTHLY_CAP} SMS/month. Upgrade to Solo for unlimited SMS.`,
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
 * Lead Generator isn't available on Starter at all. Solo is capped at
 * SOLO_LEAD_GENERATOR_MONTHLY_CAP runs/month (counted via the
 * "lead_generator_research" activity_log entry each run writes). Crew and
 * Empire are unlimited.
 */
export async function checkLeadGeneratorQuota(userId: string): Promise<QuotaResult> {
  const { tier, isPaidActive } = await getPlan(userId);
  if (!isPaidActive) {
    return {
      allowed: false,
      reason: "The Lead Generator isn't available on the Starter plan. Upgrade to Solo or higher to unlock it.",
    };
  }
  if (tier !== "solo") return { allowed: true };

  const { count } = await supabaseAdmin
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "lead_generator_research")
    .gte("created_at", monthStartIso());

  if ((count ?? 0) >= SOLO_LEAD_GENERATOR_MONTHLY_CAP) {
    return {
      allowed: false,
      reason: `Solo plan is capped at ${SOLO_LEAD_GENERATOR_MONTHLY_CAP} Lead Generator runs/month. Upgrade to Crew for unlimited runs.`,
    };
  }
  return { allowed: true };
}
