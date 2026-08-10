import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { useMountReveal } from "@/hooks/use-mount-reveal";
import { GoogleListingConnect } from "@/components/GoogleListingConnect";
import { WebsiteConnect } from "@/components/WebsiteConnect";
import { TwilioConnect } from "@/components/TwilioConnect";
import { AddFactForm } from "@/components/AddFactForm";

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

type StepId = "identity" | "google" | "website" | "twilio" | "facts" | "done";

const STEPS: { id: StepId; label: string; Icon: typeof Building2 }[] = [
  { id: "identity", label: "Business", Icon: Building2 },
  { id: "google", label: "Google", Icon: MapPin },
  { id: "website", label: "Website", Icon: Globe },
  { id: "twilio", label: "Phone", Icon: Phone },
  { id: "facts", label: "Facts", Icon: Brain },
  { id: "done", label: "Done", Icon: Sparkles },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const { step: reveal, delay } = useMountReveal();
  const [loading, setLoading] = useState(true);
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
  const [twilioStatus, setTwilioStatus] = useState<ConnectStatus>("pending");
  const [factsStatus, setFactsStatus] = useState<ConnectStatus>("pending");

  const [factCount, setFactCount] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "industry, business_name, city, business_hours, google_place_id, website, twilio_verified_at",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("business_facts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

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
    if (data?.twilio_verified_at) setTwilioStatus("connected");
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
    else if (!data?.twilio_verified_at) setStepIndex(3);
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
      <div
        className="app-dark"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "var(--hd-muted)", fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="app-dark"
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {/* Top bar: brand mark + step rail + always-available exit */}
      <div
        className={reveal}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          borderBottom: "1px solid var(--hd-border)",
          ...delay(0),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--hd-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={15} color="var(--primary-foreground)" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--hd-fg)" }}>Lanavix</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {STEPS.map((s, i) => {
            const done =
              (s.id === "identity" && identityDone) ||
              (s.id === "google" && googleStatus !== "pending") ||
              (s.id === "website" && websiteStatus !== "pending") ||
              (s.id === "twilio" && twilioStatus !== "pending") ||
              (s.id === "facts" && factsStatus !== "pending") ||
              (s.id === "done" && i === stepIndex && identityDone);
            const skipped =
              (s.id === "google" && googleStatus === "skipped") ||
              (s.id === "website" && websiteStatus === "skipped") ||
              (s.id === "twilio" && twilioStatus === "skipped") ||
              (s.id === "facts" && factsStatus === "skipped");
            const active = i === stepIndex;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  title={s.label}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    background: active
                      ? "var(--hd-primary)"
                      : done && !skipped
                        ? "var(--hd-primary-2)"
                        : "var(--hd-glass)",
                    color:
                      active || (done && !skipped)
                        ? "var(--primary-foreground)"
                        : "var(--hd-muted)",
                    border: `1.5px solid ${active ? "var(--hd-primary)" : done && !skipped ? "var(--hd-primary-2)" : "var(--hd-border)"}`,
                  }}
                >
                  {done && !skipped ? <Check size={13} /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 18, height: 1.5, background: "var(--hd-border)" }} />
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={finish}
          disabled={exiting}
          style={{
            fontSize: 12,
            color: "var(--hd-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Skip setup for now
        </button>
      </div>

      {/* Step content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div key={currentStep.id} className="hd-blur-in" style={{ width: "100%", maxWidth: 520 }}>
          {currentStep.id === "identity" && (
            <StepShell
              Icon={Building2}
              title="What do you do, and for who"
              subtitle="Real answers here mean your AI receptionist stops guessing and starts sounding like someone who actually works here."
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Trade / main service">
                  <input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. HVAC"
                    list="onboarding-industry-suggestions"
                    style={inputStyle}
                  />
                  <datalist id="onboarding-industry-suggestions">
                    {INDUSTRY_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Business name">
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Sunshine HVAC"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Service area (city)">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Tampa, FL"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Business hours (optional)">
                  <input
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    placeholder="Mon-Fri 8am-6pm, Sat 9am-1pm"
                    style={inputStyle}
                  />
                </Field>
              </div>
              {identityError && (
                <p style={{ fontSize: 12, color: "var(--destructive)", marginTop: 12 }}>
                  {identityError}
                </p>
              )}
              <StepFooter>
                <div />
                <PrimaryButton onClick={saveIdentity} disabled={savingIdentity}>
                  {savingIdentity ? "Saving..." : "Continue"} <ArrowRight size={14} />
                </PrimaryButton>
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
                <SecondaryButton onClick={goBack}>
                  <ArrowLeft size={14} /> Back
                </SecondaryButton>
                <div style={{ display: "flex", gap: 8 }}>
                  {googleStatus === "pending" && (
                    <SecondaryButton
                      onClick={() => {
                        setGoogleStatus("skipped");
                        goNext();
                      }}
                    >
                      I'll connect this later
                    </SecondaryButton>
                  )}
                  <PrimaryButton onClick={goNext}>
                    Continue <ArrowRight size={14} />
                  </PrimaryButton>
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
                <SecondaryButton onClick={goBack}>
                  <ArrowLeft size={14} /> Back
                </SecondaryButton>
                <div style={{ display: "flex", gap: 8 }}>
                  {websiteStatus === "pending" && (
                    <SecondaryButton
                      onClick={() => {
                        setWebsiteStatus("skipped");
                        goNext();
                      }}
                    >
                      I'll connect this later
                    </SecondaryButton>
                  )}
                  <PrimaryButton onClick={goNext}>
                    Continue <ArrowRight size={14} />
                  </PrimaryButton>
                </div>
              </StepFooter>
            </StepShell>
          )}

          {currentStep.id === "twilio" && (
            <StepShell
              Icon={Phone}
              title="Connect your Twilio number"
              subtitle="This is what actually lets Lanavix answer calls and texts as your business, not a demo. We verify it with Twilio before saving anything."
            >
              <TwilioConnect onConnected={() => setTwilioStatus("connected")} />
              <StepFooter>
                <SecondaryButton onClick={goBack}>
                  <ArrowLeft size={14} /> Back
                </SecondaryButton>
                <div style={{ display: "flex", gap: 8 }}>
                  {twilioStatus === "pending" && (
                    <SecondaryButton
                      onClick={() => {
                        setTwilioStatus("skipped");
                        goNext();
                      }}
                    >
                      I'll connect this later
                    </SecondaryButton>
                  )}
                  <PrimaryButton onClick={goNext}>
                    Continue <ArrowRight size={14} />
                  </PrimaryButton>
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
                <SecondaryButton onClick={goBack}>
                  <ArrowLeft size={14} /> Back
                </SecondaryButton>
                <div style={{ display: "flex", gap: 8 }}>
                  {factsStatus === "pending" && (
                    <SecondaryButton
                      onClick={() => {
                        setFactsStatus("skipped");
                        goNext();
                      }}
                    >
                      I'll add these later
                    </SecondaryButton>
                  )}
                  <PrimaryButton onClick={goNext}>
                    Continue <ArrowRight size={14} />
                  </PrimaryButton>
                </div>
              </StepFooter>
            </StepShell>
          )}

          {currentStep.id === "done" && (
            <DoneStep
              googleStatus={googleStatus}
              websiteStatus={websiteStatus}
              twilioStatus={twilioStatus}
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
  twilioStatus,
  factsStatus,
  factCount,
  onFinish,
  exiting,
  onBack,
  onLoadFactCount,
}: {
  googleStatus: ConnectStatus;
  websiteStatus: ConnectStatus;
  twilioStatus: ConnectStatus;
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

  const connectedCount = [googleStatus, websiteStatus, twilioStatus, factsStatus].filter(
    (s) => s === "connected",
  ).length;

  return (
    <StepShell
      Icon={Sparkles}
      title={connectedCount === 4 ? "You're set up" : `${connectedCount} of 4 connected`}
      subtitle={
        connectedCount === 4
          ? "Google, your website, Twilio, and your own facts are all in. Your AI receptionist is working from real information now, not guesses."
          : "The rest you can finish anytime from Business Facts or Receptionist Setup - nothing here is locked."
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
        <StatusRow label="Google Business listing" status={googleStatus} />
        <StatusRow label="Website" status={websiteStatus} />
        <StatusRow label="Twilio phone number" status={twilioStatus} />
        <StatusRow label="Business facts" status={factsStatus} />
      </div>
      <p style={{ fontSize: 12, color: "var(--hd-muted)", marginTop: 10 }}>
        {factCount > 0
          ? `${factCount} fact${factCount === 1 ? "" : "s"} on file - review or edit them anytime in Business Facts.`
          : "No facts on file yet - that's fine, add them anytime in Business Facts."}
      </p>
      <StepFooter>
        <SecondaryButton onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </SecondaryButton>
        <PrimaryButton onClick={onFinish} disabled={exiting}>
          {exiting ? "Taking you there..." : "Go to my dashboard"} <ArrowRight size={14} />
        </PrimaryButton>
      </StepFooter>
    </StepShell>
  );
}

function StatusRow({ label, status }: { label: string; status: ConnectStatus }) {
  const color = status === "connected" ? "var(--hd-primary-2)" : "var(--hd-muted)";
  const text =
    status === "connected"
      ? "Connected"
      : status === "skipped"
        ? "Skipped for now"
        : "Not connected";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderRadius: 10,
        background: "var(--hd-glass)",
        border: "1px solid var(--hd-border)",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--hd-fg)" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{text}</span>
    </div>
  );
}

function FactsStep({ factCount, onFactAdded }: { factCount: number; onFactAdded: () => void }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hd-fg)", marginBottom: 8 }}>
          Services and pricing
        </div>
        <AddFactForm fixedType="pricing" onAdded={onFactAdded} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--hd-fg)", marginBottom: 8 }}>
          Common questions customers ask
        </div>
        <QAForm onAdded={onFactAdded} />
      </div>
      <p style={{ fontSize: 12, color: "var(--hd-muted)", marginTop: 16 }}>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Do you offer emergency service?"
          maxLength={240}
          style={inputStyle}
        />
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="e.g. Yes, 24/7, no extra charge on weekends"
          maxLength={240}
          style={inputStyle}
        />
        <button
          onClick={add}
          disabled={adding}
          style={{
            alignSelf: "flex-start",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: "var(--hd-primary)",
            color: "var(--primary-foreground)",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> {adding ? "Adding..." : "Add question"}
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--destructive)", marginTop: 8 }}>{error}</p>}
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
  children: React.ReactNode;
}) {
  return (
    <div className="glass-dark" style={{ borderRadius: 20, padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "var(--hd-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={17} color="var(--primary-foreground)" strokeWidth={1.75} />
        </div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "var(--hd-fg)",
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--hd-muted)", lineHeight: 1.5, marginBottom: 22 }}>
        {subtitle}
      </p>
      {children}
    </div>
  );
}

function StepFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 24,
        paddingTop: 20,
        borderTop: "1px solid var(--hd-border)",
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--hd-fg)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 20px",
        background: "var(--hd-primary)",
        color: "var(--primary-foreground)",
        border: "none",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "10px 16px",
        background: "var(--hd-glass)",
        color: "var(--hd-fg)",
        border: "1.5px solid var(--hd-border)",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid var(--hd-border)",
  borderRadius: 10,
  fontSize: 14,
  color: "var(--hd-fg)",
  background: "var(--hd-glass)",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
