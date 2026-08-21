import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  MapPin,
  Globe,
  Phone,
  Brain,
  Plus,
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleListingConnect } from "@/components/GoogleListingConnect";
import { WebsiteConnect } from "@/components/WebsiteConnect";
import { PhoneForwardingSetup } from "@/components/PhoneForwardingSetup";
import { AddFactForm } from "@/components/AddFactForm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

const INDUSTRY_SUGGESTIONS = [
  "HVAC",
  "Plumbing",
  "Roofing",
  "Electrical",
  "Landscaping",
  "Cleaning Services",
  "Auto Repair",
  "General Contracting",
];

type ConnectStatus = "pending" | "connected" | "skipped";

type StepId = "identity" | "google" | "website" | "phone" | "facts" | "done";

const STEPS: { id: StepId; label: string; Icon: typeof Building2 }[] = [
  { id: "identity", label: "Business", Icon: Building2 },
  { id: "google", label: "Google", Icon: MapPin },
  { id: "website", label: "Website", Icon: Globe },
  { id: "phone", label: "Phone", Icon: Phone },
  { id: "facts", label: "Facts", Icon: Brain },
  { id: "done", label: "Done", Icon: Sparkles },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const [industry, setIndustry] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState("");
  const [identityDone, setIdentityDone] = useState(false);

  const [googleStatus, setGoogleStatus] = useState<ConnectStatus>("pending");
  const [websiteStatus, setWebsiteStatus] = useState<ConnectStatus>("pending");
  const [phoneStatus, setPhoneStatus] = useState<ConnectStatus>("pending");
  const [factsStatus, setFactsStatus] = useState<ConnectStatus>("pending");

  const [factCount, setFactCount] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadError(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const [{ data, error: profileErr }, { count, error: factsErr }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "industry, business_name, city, business_hours, google_place_id, website, telnyx_number_provisioned_at",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("business_facts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

    // A failed initial load must not render an editable blank form that
    // could then overwrite real profile data on save - show a retry state
    // instead of the wizard itself.
    if (profileErr || factsErr) {
      console.error("[onboarding] failed to load profile/facts", profileErr || factsErr);
      setLoadError(true);
      setLoading(false);
      return;
    }

    setIndustry(data?.industry || "");
    setBusinessName(data?.business_name || "");
    setCity(data?.city || "");
    setBusinessHours(data?.business_hours || "");
    setFactCount(count || 0);

    const hasIdentity = !!(data?.industry && data?.business_name && data?.city);
    const hasFacts = (count || 0) > 0;
    setIdentityDone(hasIdentity);
    if (data?.google_place_id) setGoogleStatus("connected");
    if (data?.website) setWebsiteStatus("connected");
    if (data?.telnyx_number_provisioned_at) setPhoneStatus("connected");
    // Any real fact already on file - synced or typed in - satisfies this
    // step's purpose, so it's marked done even if the wizard itself never
    // walked through it.
    if (hasFacts) setFactsStatus("connected");

    // Land on the first real gap, not always step 0 - a returning visitor
    // (refresh, or came back after finishing setup elsewhere) shouldn't
    // have to walk past steps they've already done.
    if (!hasIdentity) setStepIndex(0);
    else if (!data?.google_place_id) setStepIndex(1);
    else if (!data?.website) setStepIndex(2);
    else if (!data?.telnyx_number_provisioned_at) setStepIndex(3);
    else if (!hasFacts) setStepIndex(4);
    else setStepIndex(5);

    setLoading(false);
  }

  async function loadFactCount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from("business_facts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");
    setFactCount(count || 0);
  }

  async function saveIdentity() {
    if (!industry.trim() || !businessName.trim() || !city.trim()) {
      setIdentityError(
        "Business name, trade, and service area are required - everything after this step depends on your AI actually knowing who it's speaking for.",
      );
      return;
    }
    setSavingIdentity(true);
    setIdentityError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingIdentity(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        industry: industry.trim(),
        business_name: businessName.trim(),
        city: city.trim(),
        business_hours: businessHours.trim() || null,
      })
      .eq("id", user.id);
    setSavingIdentity(false);
    if (error) {
      setIdentityError("Could not save - please try again.");
      return;
    }
    setIdentityDone(true);
    goNext();
  }

  function goNext() {
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function finish() {
    setExiting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    }
    navigate({ to: "/app" });
  }

  const currentStep = STEPS[stepIndex];

  if (loading) {
    return (
      <div className="lv-light min-h-screen flex items-center justify-center bg-background">
        <p className="lv-body text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="lv-light min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-md border border-border bg-card p-6 text-center">
          <p className="lv-body text-foreground font-medium">Couldn't load your setup</p>
          <p className="lv-meta text-muted-foreground mt-1">
            Your existing information is safe - we just couldn't load it to show you here. Please
            try again.
          </p>
          <Button className="w-full min-h-[44px] mt-4" onClick={load}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="lv-light min-h-screen flex flex-col bg-background">
      {/* Top bar: brand mark + step rail + always-available exit */}
      <div className="flex items-center justify-between gap-3 px-4 md:px-7 py-3 md:py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="" className="h-6 w-6" />
          <span className="lv-section text-foreground hidden sm:inline">Lanavix</span>
        </div>

        {/* Full dot rail only fits from md up - 6 dots + 5 connectors +
            "Skip setup for now" overflowed 390px. Mobile gets a compact
            "Step X of 6" label instead of a squeezed rail. */}
        <span
          className="lv-meta text-muted-foreground md:hidden"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Step ${stepIndex + 1} of ${STEPS.length}: ${currentStep.label}`}
        >
          Step {stepIndex + 1} of {STEPS.length}
        </span>
        <div
          className="hidden md:flex items-center gap-1.5"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label={`Step ${stepIndex + 1} of ${STEPS.length}: ${currentStep.label}`}
        >
          {STEPS.map((s, i) => {
            const done =
              (s.id === "identity" && identityDone) ||
              (s.id === "google" && googleStatus !== "pending") ||
              (s.id === "website" && websiteStatus !== "pending") ||
              (s.id === "phone" && phoneStatus !== "pending") ||
              (s.id === "facts" && factsStatus !== "pending") ||
              (s.id === "done" && i === stepIndex && identityDone);
            const skipped =
              (s.id === "google" && googleStatus === "skipped") ||
              (s.id === "website" && websiteStatus === "skipped") ||
              (s.id === "phone" && phoneStatus === "skipped") ||
              (s.id === "facts" && factsStatus === "skipped");
            const active = i === stepIndex;
            const complete = done && !skipped;
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <div
                  title={s.label}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full lv-meta font-semibold border",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : complete
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-transparent text-muted-foreground border-border",
                  )}
                >
                  {complete ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className="w-3 md:w-4 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={finish}
          disabled={exiting}
          className="lv-meta text-muted-foreground hover:text-foreground underline transition-colors duration-150 ease-out shrink-0 min-h-[44px] md:min-h-0"
        >
          Skip setup for now
        </button>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-10">
        <div key={currentStep.id} className="animate-fade-up w-full max-w-[560px]">
          {currentStep.id === "identity" && (
            <StepShell
              Icon={Building2}
              title="What do you do, and for who"
              subtitle="Real answers here mean your AI receptionist stops guessing and starts sounding like someone who actually works here."
            >
              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-industry">Trade / main service</Label>
                  <Input
                    id="ob-industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. HVAC"
                    list="onboarding-industry-suggestions"
                    className="min-h-[44px]"
                    autoFocus
                  />
                  <datalist id="onboarding-industry-suggestions">
                    {INDUSTRY_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-business-name">Business name</Label>
                  <Input
                    id="ob-business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Sunshine HVAC"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-city">Service area (city)</Label>
                  <Input
                    id="ob-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Tampa, FL"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-hours">Business hours (optional)</Label>
                  <Input
                    id="ob-hours"
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    placeholder="Mon-Fri 8am-6pm, Sat 9am-1pm"
                    className="min-h-[44px]"
                  />
                </div>
              </div>
              {identityError && (
                <p className="lv-meta text-destructive mt-3" role="alert">
                  {identityError}
                </p>
              )}
              <StepFooter>
                <div />
                <Button
                  onClick={saveIdentity}
                  disabled={savingIdentity}
                  className="w-full sm:w-auto min-h-[44px] gap-1.5"
                >
                  {savingIdentity ? "Saving..." : "Continue"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </StepFooter>
            </StepShell>
          )}

          {currentStep.id === "google" && (
            <StepShell
              Icon={MapPin}
              title="Connect your Google Business listing"
              subtitle="We pull your real hours and details straight off it, so nobody has to type them twice."
            >
              <GoogleListingConnect
                onConfirmed={() => setGoogleStatus("connected")}
                onSynced={() => setGoogleStatus("connected")}
              />
              <StepFooter>
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="w-full sm:w-auto min-h-[44px] gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
                </Button>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  {googleStatus === "pending" && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto min-h-[44px]"
                      onClick={() => {
                        setGoogleStatus("skipped");
                        goNext();
                      }}
                    >
                      I'll connect this later
                    </Button>
                  )}
                  <Button onClick={goNext} className="w-full sm:w-auto min-h-[44px] gap-1.5">
                    Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </StepFooter>
            </StepShell>
          )}

          {currentStep.id === "website" && (
            <StepShell
              Icon={Globe}
              title="Point us at your website"
              subtitle="Same idea: real prices and services pulled from the page you already have, never invented."
            >
              <WebsiteConnect
                onSaved={(website) => {
                  if (website) setWebsiteStatus("connected");
                }}
                onSynced={() => setWebsiteStatus("connected")}
              />
              <StepFooter>
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="w-full sm:w-auto min-h-[44px] gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
                </Button>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  {websiteStatus === "pending" && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto min-h-[44px]"
                      onClick={() => {
                        setWebsiteStatus("skipped");
                        goNext();
                      }}
                    >
                      I'll connect this later
                    </Button>
                  )}
                  <Button onClick={goNext} className="w-full sm:w-auto min-h-[44px] gap-1.5">
                    Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </StepFooter>
            </StepShell>
          )}

          {currentStep.id === "phone" && (
            <StepShell
              Icon={Phone}
              title="Confirm your business phone number"
              subtitle="This is what actually lets Lanavix answer missed calls as your business, not a demo. We automatically set up a dedicated number behind it - no separate account, nothing to sign up for."
            >
              <PhoneForwardingSetup onConnected={() => setPhoneStatus("connected")} />
              <StepFooter>
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="w-full sm:w-auto min-h-[44px] gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
                </Button>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  {phoneStatus === "pending" && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto min-h-[44px]"
                      onClick={() => {
                        setPhoneStatus("skipped");
                        goNext();
                      }}
                    >
                      I'll connect this later
                    </Button>
                  )}
                  <Button onClick={goNext} className="w-full sm:w-auto min-h-[44px] gap-1.5">
                    Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </StepFooter>
            </StepShell>
          )}

          {currentStep.id === "facts" && (
            <StepShell
              Icon={Brain}
              title="A few more real answers"
              subtitle="Sync doesn't always catch everything. Add the services, prices, or common questions you want your AI to get right every time - skip this and it'll still work, just with less to go on."
            >
              <FactsStep
                factCount={factCount}
                onFactAdded={() => {
                  setFactsStatus("connected");
                  loadFactCount();
                }}
              />
              <StepFooter>
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="w-full sm:w-auto min-h-[44px] gap-1.5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
                </Button>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  {factsStatus === "pending" && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto min-h-[44px]"
                      onClick={() => {
                        setFactsStatus("skipped");
                        goNext();
                      }}
                    >
                      I'll add these later
                    </Button>
                  )}
                  <Button onClick={goNext} className="w-full sm:w-auto min-h-[44px] gap-1.5">
                    Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </StepFooter>
            </StepShell>
          )}

          {currentStep.id === "done" && (
            <DoneStep
              googleStatus={googleStatus}
              websiteStatus={websiteStatus}
              phoneStatus={phoneStatus}
              factsStatus={factsStatus}
              factCount={factCount}
              onFinish={finish}
              exiting={exiting}
              onBack={goBack}
              onLoadFactCount={loadFactCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DoneStep({
  googleStatus,
  websiteStatus,
  phoneStatus,
  factsStatus,
  factCount,
  onFinish,
  exiting,
  onBack,
  onLoadFactCount,
}: {
  googleStatus: ConnectStatus;
  websiteStatus: ConnectStatus;
  phoneStatus: ConnectStatus;
  factsStatus: ConnectStatus;
  factCount: number;
  onFinish: () => void;
  exiting: boolean;
  onBack: () => void;
  onLoadFactCount: () => void;
}) {
  useEffect(() => {
    onLoadFactCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectedCount = [googleStatus, websiteStatus, phoneStatus, factsStatus].filter(
    (s) => s === "connected",
  ).length;

  return (
    <StepShell
      Icon={Sparkles}
      title={connectedCount === 4 ? "You're set up" : `${connectedCount} of 4 connected`}
      subtitle={
        connectedCount === 4
          ? "Google, your website, your phone, and your own facts are all in. Your AI receptionist is working from real information now, not guesses."
          : "The rest you can finish anytime from Receptionist → Knowledge - nothing here is locked."
      }
    >
      <div className="flex flex-col gap-2 mb-1">
        <StatusRow label="Google Business listing" status={googleStatus} />
        <StatusRow label="Website" status={websiteStatus} />
        <StatusRow label="Phone number" status={phoneStatus} />
        <StatusRow label="Business facts" status={factsStatus} />
      </div>
      <p className="lv-meta text-muted-foreground mt-2.5">
        {factCount > 0
          ? `${factCount} fact${factCount === 1 ? "" : "s"} on file - review or edit them anytime in Receptionist → Knowledge.`
          : "No facts on file yet - that's fine, add them anytime in Receptionist → Knowledge."}
      </p>
      <StepFooter>
        <Button
          variant="outline"
          onClick={onBack}
          className="w-full sm:w-auto min-h-[44px] gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
        </Button>
        <Button
          onClick={onFinish}
          disabled={exiting}
          className="w-full sm:w-auto min-h-[44px] gap-1.5"
        >
          {exiting ? "Taking you there..." : "Go to my dashboard"}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </StepFooter>
    </StepShell>
  );
}

// Not the approved closed StatusDot vocabulary (waiting_on_you/booked/
// stale/...) - none of those labels actually describe "connected /
// skipped for now / not connected" honestly, and reusing one for its dot
// color alone while showing its unrelated label text would violate the
// same "dot + text, never color alone" rule it exists to enforce. This is
// its own small, closed 3-value vocabulary instead.
const STATUS_DOT_COLOR: Record<ConnectStatus, string> = {
  connected: "bg-primary",
  skipped: "bg-[var(--warning)]",
  pending: "bg-muted-foreground",
};
const STATUS_LABEL: Record<ConnectStatus, string> = {
  connected: "Connected",
  skipped: "Skipped for now",
  pending: "Not connected",
};

function StatusRow({ label, status }: { label: string; status: ConnectStatus }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-3.5 py-2.5">
      <span className="lv-body text-foreground">{label}</span>
      <span className="inline-flex items-center gap-1.5 lv-label text-foreground whitespace-nowrap">
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT_COLOR[status])}
          aria-hidden="true"
        />
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}

function FactsStep({ factCount, onFactAdded }: { factCount: number; onFactAdded: () => void }) {
  return (
    <div>
      <div className="mb-6">
        <p className="lv-label text-foreground mb-2">Services and pricing</p>
        <AddFactForm fixedType="pricing" onAdded={onFactAdded} />
      </div>
      <div>
        <p className="lv-label text-foreground mb-2">Common questions customers ask</p>
        <QAForm onAdded={onFactAdded} />
      </div>
      <p className="lv-meta text-muted-foreground mt-4">
        {factCount > 0
          ? `${factCount} fact${factCount === 1 ? "" : "s"} on file so far.`
          : "Nothing on file yet - the AI will still answer, just more generally until you add something here."}
      </p>
    </div>
  );
}

function QAForm({ onAdded }: { onAdded: () => void }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (!question.trim() || !answer.trim()) {
      setError("Enter both a question and an answer.");
      return;
    }
    setAdding(true);
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAdding(false);
      return;
    }
    const { error: insertError } = await supabase.from("business_facts").insert({
      user_id: user.id,
      fact_type: "faq",
      fact_text: `Q: ${question.trim()}\nA: ${answer.trim()}`.slice(0, 500),
      source: "setup_form",
      status: "active",
    });
    setAdding(false);
    if (insertError) {
      setError("Could not save this question. Please try again.");
      return;
    }
    setQuestion("");
    setAnswer("");
    onAdded();
  }

  return (
    <div>
      <div className="flex flex-col gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Do you offer emergency service?"
          maxLength={240}
          className="min-h-[44px]"
          aria-label="Question"
        />
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="e.g. Yes, 24/7, no extra charge on weekends"
          maxLength={240}
          className="min-h-[44px]"
          aria-label="Answer"
        />
        <Button onClick={add} disabled={adding} className="self-start min-h-[44px] gap-1.5">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />{" "}
          {adding ? "Adding..." : "Add question"}
        </Button>
      </div>
      {error && (
        <p className="lv-meta text-destructive mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function StepShell({
  Icon,
  title,
  subtitle,
  children,
}: {
  Icon: typeof Building2;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-accent text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <h1 className="lv-page-title text-foreground">{title}</h1>
      </div>
      <p className="lv-body text-muted-foreground mb-6">{subtitle}</p>
      {children}
    </div>
  );
}

function StepFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mt-6 pt-5 border-t border-border">
      {children}
    </div>
  );
}
