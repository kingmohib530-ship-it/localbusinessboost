import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRICING_PLANS, type PlanId, SOLO_REVIEW_REQUEST_MONTHLY_CAP, SOLO_LEAD_BLAST_MONTHLY_CAP } from "@/lib/pricingPlans";
import { useMountReveal } from "@/hooks/use-mount-reveal";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: Settings,
});

const VERIFICATION_LABELS: Record<string, string> = {
  unverified: "Not verified",
  pending: "Verification in review",
  verified: "Verified",
  pro: "Verified Pro",
  elite: "Verified Elite",
};

function UsageBar({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const nearCap = used >= cap;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={nearCap ? "text-destructive font-medium" : "text-foreground"}>
          {used}/{cap} this month
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={nearCap ? "h-full bg-destructive" : "h-full bg-primary"}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Settings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [planId, setPlanId] = useState<PlanId>("starter");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>("unverified");
  const [reviewRequestsThisMonth, setReviewRequestsThisMonth] = useState(0);
  const [leadBlastRunsThisMonth, setLeadBlastRunsThisMonth] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { step, delay } = useMountReveal();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? "");
      if (!data.user) { setLoading(false); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, verification_status")
        .eq("id", data.user.id)
        .single();
      if (profile?.subscription_tier && profile.subscription_tier in PRICING_PLANS) {
        setPlanId(profile.subscription_tier as PlanId);
      }
      setSubscriptionStatus(profile?.subscription_status ?? null);
      setVerificationStatus(profile?.verification_status || "unverified");
      setLoading(false);

      // Only Solo has caps worth showing usage against — Crew/Agency are
      // unlimited on both, so skip the count queries for every other tier.
      if (profile?.subscription_tier === "solo") {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const [reviewRequests, leadBlastRuns] = await Promise.all([
          supabase.from("review_requests").select("id", { count: "exact", head: true })
            .eq("user_id", data.user.id).gte("sent_at", monthStart),
          supabase.from("activity_log").select("id", { count: "exact", head: true })
            .eq("user_id", data.user.id).eq("type", "lead_generator_research").gte("created_at", monthStart),
        ]);
        setReviewRequestsThisMonth(reviewRequests.count ?? 0);
        setLeadBlastRunsThisMonth(leadBlastRuns.count ?? 0);
      }
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/account/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lanavix-data-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || "Something went wrong. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Deletion failed");
      }

      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      setDeleteError(err.message || "Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className={step} style={delay(0)}>
        <h1 className="text-3xl font-display font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Your workspace and account.</p>
      </div>
      {loading ? (
        <Card className="p-6 text-center text-sm text-muted-foreground backdrop-blur-xl">Loading...</Card>
      ) : (
        <>
          <Card className={`p-6 space-y-3 backdrop-blur-xl hover-lift-dark ${step}`} style={delay(1)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Account</div>
                <div className="font-medium">{email || "—"}</div>
              </div>
              <Badge variant="secondary">{VERIFICATION_LABELS[verificationStatus] || "Not verified"}</Badge>
            </div>
            {verificationStatus === "unverified" && (
              <Button asChild variant="outline" size="sm">
                <Link to="/app/verification">Get verified →</Link>
              </Button>
            )}
          </Card>
          <Card className={`p-6 space-y-3 backdrop-blur-xl hover-lift-dark ${step}`} style={delay(2)}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Plan</h2>
              <Badge>{PRICING_PLANS[planId].name}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {planId === "starter"
                ? "You don't have an active plan yet. Subscribe to Solo, Crew, or Agency to unlock the receptionist, review automation, and Lead Generator."
                : subscriptionStatus === "trialing"
                  ? `You're in your free trial of ${PRICING_PLANS[planId].name}.`
                  : subscriptionStatus === "past_due"
                    ? "Your last payment failed — update your billing details to avoid losing access."
                    : `You're subscribed to ${PRICING_PLANS[planId].name} ($${PRICING_PLANS[planId].price}/mo).`}
            </p>
            {planId === "solo" && !loading && (
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
            <Button asChild variant="outline" size="sm">
              <Link to="/pricing">{planId === "starter" ? "View plans" : "Manage plan"}</Link>
            </Button>
          </Card>
          <Card className={`p-6 space-y-3 backdrop-blur-xl hover-lift-dark ${step}`} style={delay(3)}>
            <h2 className="font-semibold">Business facts</h2>
            <p className="text-sm text-muted-foreground">
              See what Lanavix knows about your business, and add or correct facts your AI receptionist can use.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/business-facts">What Lanavix knows →</Link>
            </Button>
          </Card>
        </>
      )}

      <Card className={`p-6 space-y-3 backdrop-blur-xl hover-lift-dark ${step}`} style={delay(4)}>
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-muted-foreground">
          Download a copy of everything Lanavix has stored for your account —
          your profile, businesses, leads, missed calls, and messages.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? "Preparing export…" : "Export my data"}
        </Button>
        {exportError && (
          <p className="text-sm text-destructive">{exportError}</p>
        )}
      </Card>

      <Card className={`p-6 space-y-3 border-destructive/30 backdrop-blur-xl ${step}`} style={delay(5)}>
        <h2 className="font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            Delete my account
          </Button>
        ) : (
          <div className="space-y-3 border border-destructive/30 rounded-lg p-4 bg-destructive/5">
            <p className="text-sm font-medium">
              Type <span className="font-mono">DELETE</span> to permanently delete your account and all data.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            />
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={deleteInput !== "DELETE" || deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Permanently delete account"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput("");
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Button variant="outline" onClick={signOut}>Sign out</Button>
    </div>
  );
}
