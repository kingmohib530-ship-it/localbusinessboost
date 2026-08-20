import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PRICING_PLANS,
  PAID_PLAN_IDS,
  type PlanId,
  SOLO_REVIEW_REQUEST_MONTHLY_CAP,
  SOLO_LEAD_BLAST_MONTHLY_CAP,
} from "@/lib/pricingPlans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/billing")({
  component: Billing,
});

const SUPPORT_EMAIL = "moh@lanavix.com";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function UsageBar({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const nearCap = used >= cap;
  return (
    <div>
      <div className="flex items-center justify-between lv-meta mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={nearCap ? "text-destructive font-medium" : "text-foreground"}>
          {used}/{cap} this month
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full", nearCap ? "bg-destructive" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "positive" | "warning";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "lv-meta rounded-sm px-2 py-0.5 font-medium",
        tone === "positive"
          ? "text-primary bg-accent"
          : "text-destructive border border-destructive/40 bg-destructive/5",
      )}
    >
      {children}
    </span>
  );
}

function Billing() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [planId, setPlanId] = useState<PlanId>("starter");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [reviewRequestsThisMonth, setReviewRequestsThisMonth] = useState(0);
  const [leadBlastRunsThisMonth, setLeadBlastRunsThisMonth] = useState(0);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setLoadError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadError("Couldn't load your account. Please refresh the page.");
      setLoading(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status, subscription_period_end")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[billing] failed to load profile", error);
      setLoadError("Couldn't load your billing information. Please refresh the page.");
      setLoading(false);
      return;
    }

    const tier =
      profile?.subscription_tier && profile.subscription_tier in PRICING_PLANS
        ? (profile.subscription_tier as PlanId)
        : "starter";
    setPlanId(tier);
    setSubscriptionStatus(profile?.subscription_status ?? null);
    setPeriodEnd(profile?.subscription_period_end ?? null);
    setLoading(false);

    // Only Solo has caps worth showing usage against - Crew/Agency are
    // unlimited on both, matching Settings' same real-data-only usage query.
    if (tier === "solo") {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [reviewRequests, leadBlastRuns] = await Promise.all([
        supabase
          .from("review_requests")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("sent_at", monthStart),
        supabase
          .from("activity_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("type", "lead_generator_research")
          .gte("created_at", monthStart),
      ]);
      setReviewRequestsThisMonth(reviewRequests.count ?? 0);
      setLeadBlastRunsThisMonth(leadBlastRuns.count ?? 0);
    }
  }

  const plan = PRICING_PLANS[planId];
  // Same real-access rule enforced server-side in planLimits.server.ts -
  // mirrored here for display copy only, never for gating.
  const isPaidActive =
    planId !== "starter" && ["active", "trialing", "past_due"].includes(subscriptionStatus || "");
  const isTrialing = isPaidActive && subscriptionStatus === "trialing";
  const isPastDue = isPaidActive && subscriptionStatus === "past_due";
  // Had a paid plan before but it's no longer active (e.g. canceled) -
  // distinct from "starter" so the copy doesn't claim they never subscribed.
  const isLapsed = planId !== "starter" && !isPaidActive;

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[760px] mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4">
        <div>
          <h1 className="lv-page-title text-foreground">Billing</h1>
          <p className="lv-body text-muted-foreground mt-1">
            What plan you're on, what it costs, and what you can do next.
          </p>
        </div>

        {loadError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="lv-body text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" className="mt-2 min-h-[44px]" onClick={loadAll}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-9 w-40" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Current plan */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="lv-label text-foreground">Current plan</h2>
                {planId !== "starter" && !isLapsed && (
                  <StatusBadge tone={isPastDue ? "warning" : "positive"}>
                    {isTrialing ? "Trial" : isPastDue ? "Payment failed" : "Active"}
                  </StatusBadge>
                )}
                {isLapsed && <StatusBadge tone="warning">Canceled</StatusBadge>}
              </div>

              <p className="lv-section text-foreground">
                {plan.name}
                {planId !== "starter" && (
                  <span className="text-muted-foreground"> — ${plan.price}/mo</span>
                )}
              </p>

              <p className="lv-body text-muted-foreground">
                {planId === "starter" &&
                  "You don't have an active plan yet. Subscribe below to unlock Missed-Call Text-Back, Reputation Autopilot, and Lead Generator."}
                {isLapsed &&
                  `Your ${plan.name} subscription isn't active anymore. Subscribe again below to regain access.`}
                {isTrialing &&
                  (periodEnd
                    ? `You're in your 14-day free trial. It ends ${formatDate(periodEnd)} — you won't be charged until then.`
                    : "You're in your 14-day free trial. You won't be charged until it ends.")}
                {isPastDue &&
                  `Your last payment for ${plan.name} failed. Email ${SUPPORT_EMAIL} to update your payment method and keep your access.`}
                {planId !== "starter" &&
                  !isTrialing &&
                  !isPastDue &&
                  !isLapsed &&
                  (periodEnd
                    ? `Renews ${formatDate(periodEnd)} for $${plan.price}/mo.`
                    : `You're subscribed to ${plan.name} ($${plan.price}/mo).`)}
              </p>

              {planId === "solo" && !isLapsed && (
                <div className="space-y-3 pt-1">
                  <UsageBar
                    label="Review request texts"
                    used={reviewRequestsThisMonth}
                    cap={SOLO_REVIEW_REQUEST_MONTHLY_CAP}
                  />
                  <UsageBar
                    label="Lead Generator runs"
                    used={leadBlastRunsThisMonth}
                    cap={SOLO_LEAD_BLAST_MONTHLY_CAP}
                  />
                </div>
              )}
              {(planId === "crew" || planId === "agency") && !isLapsed && (
                <p className="lv-meta text-muted-foreground">
                  Review request texts and Lead Generator runs are unlimited on your plan.
                </p>
              )}
            </div>

            {/* Plans */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-4">
              <h2 className="lv-label text-foreground">Plans</h2>
              <div className="space-y-3">
                {PAID_PLAN_IDS.map((id) => {
                  const p = PRICING_PLANS[id];
                  const isCurrent = id === planId && isPaidActive;
                  return (
                    <div
                      key={id}
                      className={cn(
                        "rounded-md border p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between",
                        isCurrent ? "border-primary/40 bg-accent/40" : "border-border",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="lv-body text-foreground font-medium">{p.name}</p>
                          <span className="lv-meta text-foreground">${p.price}/mo</span>
                          {p.badge && !isCurrent && (
                            <span className="lv-meta text-muted-foreground border border-border rounded-sm px-1.5 py-0.5">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <p className="lv-meta text-muted-foreground mt-0.5">{p.tagline}</p>
                      </div>
                      <div className="shrink-0">
                        {isCurrent ? (
                          <span className="lv-meta text-primary bg-accent rounded-sm px-2 py-0.5 font-medium">
                            Current plan
                          </span>
                        ) : isPaidActive ? (
                          <span className="lv-meta text-muted-foreground">See note below</span>
                        ) : (
                          <Button asChild size="sm" className="min-h-[44px]">
                            <Link
                              to="/checkout/start"
                              search={{ plan: id as "solo" | "crew" | "agency" }}
                            >
                              {isLapsed ? "Resubscribe" : "Subscribe"}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {isPaidActive && (
                <p className="lv-meta text-muted-foreground">
                  Already on a paid plan and want to switch tiers? Email {SUPPORT_EMAIL} —
                  self-serve plan switching isn't available yet, and we want to make sure you're
                  never billed twice.
                </p>
              )}
            </div>

            {/* Manage subscription */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-2">
              <h2 className="lv-label text-foreground">Manage your subscription</h2>
              <p className="lv-body text-muted-foreground">
                Canceling, updating your payment method, and switching plans while already
                subscribed aren't self-serve yet. Email{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="underline text-foreground hover:text-muted-foreground transition-colors duration-150 ease-out"
                >
                  {SUPPORT_EMAIL}
                </a>{" "}
                and we'll take care of it. Canceling stays in effect through the end of your current
                billing period — you won't be billed again after that.
              </p>
            </div>

            {/* Money-back guarantee */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-2">
              <h2 className="lv-label text-foreground">30-day money-back guarantee</h2>
              <p className="lv-body text-muted-foreground">
                If you don't recover at least one job worth more than your monthly fee within 30
                days of your first paid month, email {SUPPORT_EMAIL} for a full refund. This applies
                to your first paid month only, and requires actively using Missed-Call Text-Back,
                Reputation Autopilot, or Lead Generator during that period.
              </p>
              <Link
                to="/refund"
                className="lv-meta underline text-foreground hover:text-muted-foreground transition-colors duration-150 ease-out"
              >
                Full refund policy →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
