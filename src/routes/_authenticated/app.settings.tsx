import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, MapPin } from "lucide-react";
import {
  PRICING_PLANS,
  type PlanId,
  SOLO_REVIEW_REQUEST_MONTHLY_CAP,
  SOLO_LEAD_BLAST_MONTHLY_CAP,
} from "@/lib/pricingPlans";
import { cn } from "@/lib/utils";

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

// Lanavix currently only serves US contractors (the Daily Brief cron
// defaults every business to America/New_York) - this is a reasonable,
// bounded list for that reality, not an attempt at full IANA coverage.
const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Mountain, no DST (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
];

const BRIEF_CHANNELS: { value: string; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "Text message" },
  { value: "both", label: "Email and text" },
  { value: "none", label: "Off" },
];

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

function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [email, setEmail] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("unverified");

  const [planId, setPlanId] = useState<PlanId>("starter");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [reviewRequestsThisMonth, setReviewRequestsThisMonth] = useState(0);
  const [leadBlastRunsThisMonth, setLeadBlastRunsThisMonth] = useState(0);

  // General - business_name/industry are owned by Receptionist (they feed
  // the AI prompt and are edited there); shown here read-only so Settings
  // isn't a second, competing place to change them.
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalMsg, setGeneralMsg] = useState("");
  const [generalMsgOk, setGeneralMsgOk] = useState(true);

  // Notifications - daily_brief_enabled/channel/owner_phone are real,
  // already-consumed-by-the-cron fields (api/cron/daily-brief.ts) with no
  // prior UI anywhere in the app.
  const [briefEnabled, setBriefEnabled] = useState(true);
  const [briefChannel, setBriefChannel] = useState("email");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationsMsg, setNotificationsMsg] = useState("");
  const [notificationsMsgOk, setNotificationsMsgOk] = useState(true);

  // Integrations - read-only status, editing stays in Receptionist.
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [telnyxNumber, setTelnyxNumber] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
    setEmail(user.email ?? "");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "business_name, industry, city, timezone, subscription_tier, subscription_status, verification_status, daily_brief_enabled, daily_brief_channel, owner_phone, telnyx_number_provisioned_at, telnyx_number, google_place_id",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[settings] failed to load profile", error);
      setLoadError("Couldn't load your account settings. Please refresh the page.");
      setLoading(false);
      return;
    }

    setVerificationStatus(profile?.verification_status || "unverified");
    if (profile?.subscription_tier && profile.subscription_tier in PRICING_PLANS) {
      setPlanId(profile.subscription_tier as PlanId);
    }
    setSubscriptionStatus(profile?.subscription_status ?? null);

    setBusinessName(profile?.business_name || "");
    setIndustry(profile?.industry || "");
    setCity(profile?.city || "");
    setTimezone(profile?.timezone || "America/New_York");

    setBriefEnabled(profile?.daily_brief_enabled ?? true);
    setBriefChannel(profile?.daily_brief_channel || "email");
    setOwnerPhone(profile?.owner_phone || "");

    setPhoneConnected(!!profile?.telnyx_number_provisioned_at);
    setTelnyxNumber(profile?.telnyx_number || null);
    setGoogleConnected(!!profile?.google_place_id);

    setLoading(false);

    // Only Solo has caps worth showing usage against - Crew/Agency are
    // unlimited on both, so skip the count queries for every other tier.
    if (profile?.subscription_tier === "solo") {
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

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function saveGeneral() {
    setSavingGeneral(true);
    setGeneralMsg("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingGeneral(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ city: city.trim() || null, timezone })
      .eq("id", user.id);
    setGeneralMsgOk(!error);
    setGeneralMsg(error ? "Could not save. Please try again." : "Saved!");
    setSavingGeneral(false);
  }

  async function saveNotifications() {
    setSavingNotifications(true);
    setNotificationsMsg("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingNotifications(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        daily_brief_enabled: briefEnabled,
        daily_brief_channel: briefChannel,
        owner_phone: ownerPhone.trim() || null,
      })
      .eq("id", user.id);
    setNotificationsMsgOk(!error);
    setNotificationsMsg(error ? "Could not save. Please try again." : "Saved!");
    setSavingNotifications(false);
  }

  async function handleExport() {
    setExporting(true);
    setExportError("");
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
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Deletion failed");
      }

      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setDeleting(false);
    }
  }

  const needsOwnerPhone = briefChannel === "sms" || briefChannel === "both";

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[760px] mx-auto px-4 md:px-8 py-6 md:py-8 space-y-4">
        <div>
          <h1 className="lv-page-title text-foreground">Settings</h1>
          <p className="lv-body text-muted-foreground mt-1">
            Your account and product configuration.
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
          <div className="rounded-md border border-border py-16 text-center">
            <p className="lv-body text-muted-foreground">Loading…</p>
          </div>
        ) : (
          <>
            {/* Account */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
              <p className="lv-label text-foreground">Account</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="lv-body text-foreground">{email || "—"}</p>
                <span className="lv-meta text-muted-foreground rounded-sm border border-border px-2 py-0.5">
                  {VERIFICATION_LABELS[verificationStatus] || "Not verified"}
                </span>
              </div>
              {verificationStatus === "unverified" && (
                <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                  <Link to="/app/verification">Get verified →</Link>
                </Button>
              )}
              <div className="pt-1">
                <Button variant="outline" size="sm" className="min-h-[44px]" onClick={signOut}>
                  Sign out
                </Button>
              </div>
            </div>

            {/* General */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
              <div>
                <p className="lv-label text-foreground mb-1">General</p>
                <p className="lv-meta text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {businessName || "No business name yet"}
                  </span>
                  {industry && ` · ${industry}`} — managed in{" "}
                  <Link
                    to="/app/receptionist"
                    className="underline text-foreground hover:text-muted-foreground transition-colors duration-150 ease-out"
                  >
                    Receptionist
                  </Link>
                  .
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="lv-meta text-foreground" htmlFor="settings-city">
                    City
                  </label>
                  <Input
                    id="settings-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Austin, TX"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="lv-meta text-foreground" htmlFor="settings-timezone">
                    Time zone
                  </label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="settings-timezone" className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {generalMsg && (
                <p className={cn("lv-meta", generalMsgOk ? "text-accent-2" : "text-destructive")}>
                  {generalMsg}
                </p>
              )}
              <Button className="min-h-[44px]" disabled={savingGeneral} onClick={saveGeneral}>
                {savingGeneral ? "Saving…" : "Save"}
              </Button>
            </div>

            {/* Notifications */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
              <div>
                <p className="lv-label text-foreground mb-1">Notifications</p>
                <p className="lv-meta text-muted-foreground">
                  Your Daily Brief — a summary of what needs your attention, sent automatically.
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <div>
                  <p className="lv-body text-foreground">Daily Brief</p>
                  <p className="lv-meta text-muted-foreground">
                    {briefEnabled ? "Sent once a day." : "Turned off."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={briefEnabled}
                  aria-label="Daily Brief enabled"
                  onClick={() => setBriefEnabled((v) => !v)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center"
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-150 ease-out",
                      briefEnabled ? "bg-primary" : "bg-input",
                    )}
                  >
                    <span
                      className={cn(
                        "block h-4 w-4 rounded-full bg-background shadow-lg transition-transform duration-150 ease-out",
                        briefEnabled ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </span>
                </button>
              </div>
              {briefEnabled && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="lv-meta text-foreground" htmlFor="settings-brief-channel">
                      Delivery method
                    </label>
                    <Select value={briefChannel} onValueChange={setBriefChannel}>
                      <SelectTrigger
                        id="settings-brief-channel"
                        className="min-h-[44px] sm:w-[240px]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRIEF_CHANNELS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {needsOwnerPhone && (
                    <div className="space-y-1.5">
                      <label className="lv-meta text-foreground" htmlFor="settings-owner-phone">
                        Your phone number
                      </label>
                      <Input
                        id="settings-owner-phone"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="+15555550100"
                        className="min-h-[44px] sm:w-[240px]"
                      />
                      {!phoneConnected && (
                        <p className="lv-meta text-muted-foreground">
                          Text delivery also needs a connected phone number —{" "}
                          <Link
                            to="/app/receptionist"
                            className="underline text-foreground hover:text-muted-foreground transition-colors duration-150 ease-out"
                          >
                            connect one in Receptionist
                          </Link>
                          .
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {notificationsMsg && (
                <p
                  className={cn(
                    "lv-meta",
                    notificationsMsgOk ? "text-accent-2" : "text-destructive",
                  )}
                >
                  {notificationsMsg}
                </p>
              )}
              <Button
                className="min-h-[44px]"
                disabled={savingNotifications}
                onClick={saveNotifications}
              >
                {savingNotifications ? "Saving…" : "Save"}
              </Button>
            </div>

            {/* Integrations */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
              <p className="lv-label text-foreground">Integrations</p>
              <div className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                  <div>
                    <p className="lv-body text-foreground">Phone</p>
                    <p className="lv-meta text-muted-foreground">
                      {phoneConnected ? `Connected — ${telnyxNumber}` : "Not connected"}
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="min-h-[44px] shrink-0">
                  <Link to="/app/receptionist">Manage</Link>
                </Button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                  <div>
                    <p className="lv-body text-foreground">Google Business listing</p>
                    <p className="lv-meta text-muted-foreground">
                      {googleConnected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="min-h-[44px] shrink-0">
                  <Link to="/app/receptionist">Manage</Link>
                </Button>
              </div>
            </div>

            {/* Plan */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="lv-label text-foreground">Plan</p>
                <span className="lv-meta text-primary rounded-sm bg-accent px-2 py-0.5 font-medium">
                  {PRICING_PLANS[planId].name}
                </span>
              </div>
              <p className="lv-body text-muted-foreground">
                {planId === "starter"
                  ? "You don't have an active plan yet. Subscribe to Solo, Crew, or Agency to unlock the receptionist, review automation, and Lead Generator."
                  : subscriptionStatus === "trialing"
                    ? `You're in your free trial of ${PRICING_PLANS[planId].name}.`
                    : subscriptionStatus === "past_due"
                      ? "Your last payment failed — update your billing details to avoid losing access."
                      : `You're subscribed to ${PRICING_PLANS[planId].name} ($${PRICING_PLANS[planId].price}/mo).`}
              </p>
              {planId === "solo" && (
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
              <Button asChild variant="outline" size="sm" className="min-h-[44px]">
                <Link to="/app/billing">{planId === "starter" ? "View plans" : "Manage plan"}</Link>
              </Button>
            </div>

            {/* Data & Privacy */}
            <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
              <p className="lv-label text-foreground">Your data</p>
              <p className="lv-body text-muted-foreground">
                Download a copy of everything Lanavix has stored for your account — your profile,
                businesses, leads, missed calls, and messages.
              </p>
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? "Preparing export…" : "Export my data"}
              </Button>
              {exportError && <p className="lv-meta text-destructive">{exportError}</p>}
            </div>

            {/* Danger zone */}
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 md:p-6 space-y-3">
              <p className="lv-label text-destructive">Danger zone</p>
              <p className="lv-body text-muted-foreground">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  className="min-h-[44px]"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete my account
                </Button>
              ) : (
                <div className="space-y-3 rounded-sm border border-destructive/40 bg-card p-4">
                  <p className="lv-body text-foreground font-medium">
                    Type <span className="font-mono">DELETE</span> to permanently delete your
                    account and all data.
                  </p>
                  <Input
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="DELETE"
                    className="min-h-[44px] max-w-[200px]"
                    autoFocus
                  />
                  {deleteError && <p className="lv-meta text-destructive">{deleteError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      className="min-h-[44px]"
                      disabled={deleteInput !== "DELETE" || deleting}
                      onClick={handleDelete}
                    >
                      {deleting ? "Deleting…" : "Permanently delete account"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-[44px]"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteInput("");
                        setDeleteError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
