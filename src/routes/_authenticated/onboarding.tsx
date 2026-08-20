import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your business — Lanavix" }] }),
  component: OnboardingPage,
});

// Real, pre-existing taxonomy (src/lib/auditApi.ts's Industry type) - the
// same list the Audit tool already uses, so onboarding doesn't invent a
// second one.
const INDUSTRIES = [
  "HVAC",
  "Plumbing",
  "Roofing",
  "Cleaning",
  "Landscaping",
  "Salon",
  "Electrician",
  "Pest Control",
  "Painting",
  "Other",
] as const;

// Standard IANA identifiers covering the US time zones this app's
// default (America/New_York) and Coach Daily Brief scheduling assume.
const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Mountain, no DST (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
];

const STEP_TITLES = ["Business details", "Phone setup", "Your receptionist", "Preview & finish"];

function friendlyLoadError(): string {
  return "Couldn't load your account. Please refresh the page.";
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [alreadyDone, setAlreadyDone] = useState(false);

  // Step 1 - business details
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [savingStep1, setSavingStep1] = useState(false);

  // Step 2 - phone / forwarding (same fields and endpoint as Receptionist Setup)
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [twilioVerifiedAt, setTwilioVerifiedAt] = useState<string | null>(null);
  const [connectingTwilio, setConnectingTwilio] = useState(false);
  const [twilioError, setTwilioError] = useState("");

  // Step 3 - greeting + receptionist config (same fields as Receptionist Setup)
  const [businessHours, setBusinessHours] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [escalationRules, setEscalationRules] = useState("");
  const [savingStep3, setSavingStep3] = useState(false);

  // Step 4 - AI-reply preview (the only real "test" capability that exists;
  // no outbound call is ever placed)
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    sampleMessage: string;
    reply: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoadingProfile(true);
    setLoadError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadError(friendlyLoadError());
      setLoadingProfile(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "business_name, industry, city, timezone, twilio_account_sid, twilio_phone_number, twilio_verified_at, business_hours, greeting_message, escalation_rules, onboarding_completed",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      setLoadError(friendlyLoadError());
      setLoadingProfile(false);
      return;
    }
    if (data?.onboarding_completed) {
      setAlreadyDone(true);
      setLoadingProfile(false);
      return;
    }
    setBusinessName(data?.business_name || "");
    setIndustry(data?.industry || "");
    setCity(data?.city || "");
    setTimezone(data?.timezone || "America/New_York");
    setAccountSid(data?.twilio_account_sid || "");
    setPhoneNumber(data?.twilio_phone_number || "");
    setTwilioVerifiedAt(data?.twilio_verified_at || null);
    setBusinessHours(data?.business_hours || "");
    setGreetingMessage(data?.greeting_message || "");
    setEscalationRules(data?.escalation_rules || "");
    setLoadingProfile(false);
  }

  async function saveStep1() {
    if (!businessName.trim()) {
      toast.error("Please enter your business name.");
      return;
    }
    if (!industry) {
      toast.error("Please choose your industry.");
      return;
    }
    if (!city.trim()) {
      toast.error("Please enter the city you serve.");
      return;
    }
    setSavingStep1(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingStep1(false);
      toast.error("Please sign in again and retry.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        business_name: businessName.trim(),
        industry,
        city: city.trim(),
        timezone,
      })
      .eq("id", user.id);
    setSavingStep1(false);
    if (error) {
      toast.error("Couldn't save your business details. Please try again.");
      return;
    }
    setStep(2);
  }

  async function connectTwilioAndContinue() {
    if (!accountSid.trim() || !authToken.trim() || !phoneNumber.trim()) {
      toast.error("Fill in all three fields, or skip this step for now.");
      return;
    }
    setConnectingTwilio(true);
    setTwilioError("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setConnectingTwilio(false);
      setTwilioError("Please sign in again and retry.");
      return;
    }
    try {
      const res = await fetch("/api/twilio-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accountSid: accountSid.trim(),
          authToken: authToken.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthToken("");
        toast.success("Twilio connected!");
        setStep(3);
      } else {
        setTwilioError(data.error || "Could not connect. Please check your details and try again.");
      }
    } catch {
      setTwilioError("Network error. Please try again.");
    }
    setConnectingTwilio(false);
  }

  async function saveStep3() {
    setSavingStep3(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingStep3(false);
      toast.error("Please sign in again and retry.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        business_hours: businessHours.trim() || null,
        greeting_message: greetingMessage.trim() || null,
        escalation_rules: escalationRules.trim() || null,
      })
      .eq("id", user.id);
    setSavingStep3(false);
    if (error) {
      toast.error("Couldn't save your receptionist settings. Please try again.");
      return;
    }
    setStep(4);
  }

  // Runs one real AI call through the same prompt sms-reply.ts uses, so the
  // contractor sees a genuine sample reply based on what they just
  // configured. This never places a call or sends a text.
  async function runPreview() {
    setPreviewing(true);
    setPreviewError("");
    setPreviewResult(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setPreviewing(false);
      setPreviewError("Please sign in again and retry.");
      return;
    }
    try {
      const res = await fetch("/api/receptionist-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setPreviewError(data.error || "Couldn't generate a preview right now. Please try again.");
        return;
      }
      setPreviewResult({ sampleMessage: data.sampleMessage, reply: data.reply });
    } catch {
      setPreviewError("Couldn't generate a preview right now. Please try again.");
    } finally {
      setPreviewing(false);
    }
  }

  async function finishSetup() {
    setFinishing(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setFinishing(false);
      toast.error("Please sign in again and retry.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
    setFinishing(false);
    if (error) {
      toast.error("Couldn't finish setup. Please try again.");
      return;
    }
    toast.success("You're all set!");
    navigate({ to: "/app" });
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <p className="lv-body text-muted-foreground">Loading your account…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-md border border-border bg-card p-6 text-center space-y-4">
          <p className="lv-body text-destructive">{loadError}</p>
          <Button className="w-full min-h-[44px]" onClick={loadProfile}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-md border border-border bg-card p-6 sm:p-8 text-center space-y-4">
          <div className="h-10 w-10 rounded-sm bg-accent flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="lv-section text-foreground mb-1">Setup already complete</h1>
            <p className="lv-body text-muted-foreground">
              Your business is already set up. Head to your dashboard to keep going.
            </p>
          </div>
          <Button className="w-full min-h-[44px]" onClick={() => navigate({ to: "/app" })}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  const connected = !!twilioVerifiedAt;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="lv-page-title text-foreground">Lanavix</span>
        </Link>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="lv-label text-foreground">{STEP_TITLES[step - 1]}</span>
            <span className="lv-meta text-muted-foreground" aria-live="polite">
              Step {step} of 4
            </span>
          </div>
          <Progress value={(step / 4) * 100} aria-label={`Setup progress: step ${step} of 4`} />
        </div>

        <div className="rounded-md border border-border bg-card p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h1 className="lv-section text-foreground mb-1">Tell us about your business</h1>
                <p className="lv-body text-muted-foreground">
                  This is what your AI receptionist and customers will see.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="business-name">Business name</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Acme Plumbing Co."
                  autoFocus
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger id="industry" className="min-h-[44px]">
                    <SelectValue placeholder="Choose your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City you serve</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Austin, TX"
                  onKeyDown={(e) => e.key === "Enter" && saveStep1()}
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="timezone">Time zone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone" className="min-h-[44px]">
                    <SelectValue placeholder="Choose your time zone" />
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

              <Button className="w-full min-h-[44px]" disabled={savingStep1} onClick={saveStep1}>
                {savingStep1 ? "Saving…" : "Continue"}
              </Button>
              <p className="lv-meta text-muted-foreground text-center">
                Takes about a minute. You can change these later in Settings.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h1 className="lv-section text-foreground mb-1">Connect your phone number</h1>
                <p className="lv-body text-muted-foreground">
                  Lanavix answers missed calls using your own Twilio number. Paste your Twilio
                  Account SID, Auth Token, and phone number below, and we'll confirm it works right
                  away.
                </p>
              </div>

              {connected && (
                <div className="flex items-center gap-2 rounded-sm border border-border bg-accent px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                  <span className="lv-meta text-foreground">
                    Connected — {phoneNumber || "your Twilio number"} is live.
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="account-sid">Account SID</Label>
                <Input
                  id="account-sid"
                  value={accountSid}
                  onChange={(e) => setAccountSid(e.target.value)}
                  placeholder="AC…"
                  autoComplete="off"
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-token">Auth Token</Label>
                <Input
                  id="auth-token"
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder={
                    connected
                      ? "•••••••• (saved, enter a new one to replace it)"
                      : "Your Twilio Auth Token"
                  }
                  autoComplete="off"
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone-number">Phone number</Label>
                <Input
                  id="phone-number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+15555550100"
                  onKeyDown={(e) => e.key === "Enter" && connectTwilioAndContinue()}
                  autoComplete="off"
                  className="min-h-[44px]"
                />
              </div>

              {twilioError && <p className="lv-meta text-destructive">{twilioError}</p>}

              <Button
                className="w-full min-h-[44px]"
                disabled={connectingTwilio}
                onClick={connectTwilioAndContinue}
              >
                {connectingTwilio
                  ? "Connecting…"
                  : connected
                    ? "Update & continue"
                    : "Connect & continue"}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 min-h-[44px]" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="ghost" className="flex-1 min-h-[44px]" onClick={() => setStep(3)}>
                  Skip for now
                </Button>
              </div>
              <p className="lv-meta text-muted-foreground text-center">
                You can connect this anytime from Receptionist → Setup.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h1 className="lv-section text-foreground mb-1">Configure your receptionist</h1>
                <p className="lv-body text-muted-foreground">
                  These settings shape how Lanavix represents your business on every missed call.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="business-hours">Business hours</Label>
                <Input
                  id="business-hours"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  placeholder="Mon–Fri 8am–6pm, Sat 9am–1pm"
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="greeting-message">Greeting message</Label>
                <Textarea
                  id="greeting-message"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  rows={3}
                  placeholder="Hi! This is [Your Business]. Sorry we missed your call — we're on a job right now. What do you need? Reply here and we'll get back to you ASAP."
                />
                <p className="lv-meta text-muted-foreground">
                  Sent verbatim as the auto-text the moment a call is missed.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="escalation-rules">Escalation rules</Label>
                <Textarea
                  id="escalation-rules"
                  value={escalationRules}
                  onChange={(e) => setEscalationRules(e.target.value)}
                  rows={3}
                  placeholder="e.g. If the customer mentions a gas leak or flooding, tell them to call 911 / call us directly at [phone]."
                />
                <p className="lv-meta text-muted-foreground">
                  Given to the AI receptionist so it can follow these rules in conversation.
                </p>
              </div>

              <Button className="w-full min-h-[44px]" disabled={savingStep3} onClick={saveStep3}>
                {savingStep3 ? "Saving…" : "Continue"}
              </Button>
              <Button variant="ghost" className="w-full min-h-[44px]" onClick={() => setStep(2)}>
                Back
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h1 className="lv-section text-foreground mb-1">See it in action</h1>
                <p className="lv-body text-muted-foreground">
                  Preview a real AI reply based on what you just configured. This doesn't place a
                  call or send a text — it's a preview of what your receptionist would say.
                </p>
              </div>

              {previewError && <p className="lv-meta text-destructive">{previewError}</p>}

              {previewResult && (
                <div className="rounded-sm border border-border bg-muted/40 p-4 space-y-3">
                  <div>
                    <p className="lv-label text-muted-foreground mb-1">Sample customer text</p>
                    <p className="lv-body text-foreground rounded-sm bg-card border border-border px-3 py-2">
                      {previewResult.sampleMessage}
                    </p>
                  </div>
                  <div>
                    <p className="lv-label text-muted-foreground mb-1">
                      Your receptionist would reply
                    </p>
                    <p className="lv-body text-foreground rounded-sm bg-accent px-3 py-2">
                      {previewResult.reply}
                    </p>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full min-h-[44px] gap-2"
                disabled={previewing}
                onClick={runPreview}
              >
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                {previewing
                  ? "Generating preview…"
                  : previewResult || previewError
                    ? "Try again"
                    : "Preview AI reply"}
              </Button>

              <Button className="w-full min-h-[44px]" disabled={finishing} onClick={finishSetup}>
                {finishing ? "Finishing…" : "Finish setup"}
              </Button>
              <Button variant="ghost" className="w-full min-h-[44px]" onClick={() => setStep(3)}>
                Back
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
