import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneOff,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  MessageSquare,
  Reply,
  ClipboardCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReceptionistKnowledge } from "@/components/ReceptionistKnowledge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/receptionist")({
  component: ReceptionistPage,
});

// Same real, pre-existing taxonomy used by onboarding and the Audit tool
// (src/lib/auditApi.ts's Industry type) - not a new list invented here.
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

type TabKey = "overview" | "phone" | "greeting" | "knowledge" | "hours" | "escalation" | "preview";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "phone", label: "Phone" },
  { key: "greeting", label: "Greeting" },
  { key: "knowledge", label: "Knowledge" },
  { key: "hours", label: "Hours" },
  { key: "escalation", label: "Escalation" },
  { key: "preview", label: "Preview" },
];

type ReadinessStatus = "ready" | "needs_setup" | "not_active" | "error";

const STATUS_META: Record<
  ReadinessStatus,
  { label: string; description: string; dotClass: string; textClass: string }
> = {
  ready: {
    label: "Ready",
    description: "Lanavix is answering missed calls automatically.",
    dotClass: "bg-primary",
    textClass: "text-primary",
  },
  needs_setup: {
    label: "Needs setup",
    description: "Lanavix is answering calls, but a few things need attention below.",
    dotClass: "bg-[var(--warning)]",
    textClass: "text-[var(--warning)]",
  },
  not_active: {
    label: "Not active",
    description: "Lanavix isn't answering calls yet. Connect your phone number to turn it on.",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
  },
  error: {
    label: "Couldn't load",
    description: "Couldn't load your receptionist settings. Please refresh the page.",
    dotClass: "bg-destructive",
    textClass: "text-destructive",
  },
};

function ReceptionistPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Business info (feeds the AI prompt directly - see aiReceptionist.server.ts)
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [savingBusiness, setSavingBusiness] = useState(false);
  const businessNameRef = useRef<HTMLInputElement>(null);

  // Phone
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [twilioVerifiedAt, setTwilioVerifiedAt] = useState<string | null>(null);
  const [connectingTwilio, setConnectingTwilio] = useState(false);
  const [twilioMsg, setTwilioMsg] = useState("");
  const [twilioMsgOk, setTwilioMsgOk] = useState(true);

  // Greeting / Hours / Escalation share one backend contract (a single
  // profiles update), so each tab's Save button submits all three current
  // values rather than needing three separate endpoints.
  const [businessHours, setBusinessHours] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [escalationRules, setEscalationRules] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState("");
  const [configMsgOk, setConfigMsgOk] = useState(true);

  // Preview - the only real "test" capability that exists; no outbound
  // call is ever placed.
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    sampleMessage: string;
    reply: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState("");

  // Stats - same real counts the old Calls tab showed. The full
  // conversation thread viewer moved to Inbox (Phase 3), which already
  // reads the same conversations table, so it isn't duplicated here.
  const [stats, setStats] = useState({ total: 0, texted: 0, replied: 0, booked: 0 });

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  async function loadProfile() {
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
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "business_name, industry, twilio_account_sid, twilio_phone_number, twilio_verified_at, business_hours, greeting_message, escalation_rules",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[receptionist] failed to load profile", error);
      setLoadError("Couldn't load your receptionist settings. Please refresh the page.");
      setLoading(false);
      return;
    }
    setBusinessName(data?.business_name || "");
    setIndustry(data?.industry || "");
    setAccountSid(data?.twilio_account_sid || "");
    setPhoneNumber(data?.twilio_phone_number || "");
    setTwilioVerifiedAt(data?.twilio_verified_at || null);
    setBusinessHours(data?.business_hours || "");
    setGreetingMessage(data?.greeting_message || "");
    setEscalationRules(data?.escalation_rules || "");
    setLoading(false);
  }

  async function loadStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [total, texted, replied, booked] = await Promise.all([
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("channel", "sms"),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("channel", "sms")
        .neq("status", "no_response"),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("channel", "sms")
        .in("status", ["replied", "booked"]),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("source", "inbound_sms"),
    ]);
    setStats({
      total: total.count ?? 0,
      texted: texted.count ?? 0,
      replied: replied.count ?? 0,
      booked: booked.count ?? 0,
    });
  }

  async function saveBusinessInfo() {
    if (!businessName.trim() || !industry) {
      toast.error("Add your business name and industry.");
      return;
    }
    setSavingBusiness(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingBusiness(false);
      toast.error("Please sign in again and retry.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ business_name: businessName.trim(), industry })
      .eq("id", user.id);
    setSavingBusiness(false);
    if (error) {
      toast.error("Could not save your business info. Please try again.");
      return;
    }
    toast.success("Saved!");
  }

  async function connectTwilio() {
    if (!accountSid.trim() || !authToken.trim() || !phoneNumber.trim()) {
      setTwilioMsgOk(false);
      setTwilioMsg("Fill in all three fields to connect.");
      return;
    }
    setConnectingTwilio(true);
    setTwilioMsg("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setConnectingTwilio(false);
      setTwilioMsgOk(false);
      setTwilioMsg("Please sign in again and retry.");
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
        setTwilioMsgOk(true);
        setTwilioMsg("Connected! Your calls and texts now send from your own Twilio number.");
        setAuthToken("");
        loadProfile();
      } else {
        setTwilioMsgOk(false);
        setTwilioMsg(data.error || "Could not connect. Please check your details and try again.");
      }
    } catch {
      setTwilioMsgOk(false);
      setTwilioMsg("Network error. Please try again.");
    }
    setConnectingTwilio(false);
  }

  async function saveConfig() {
    setSavingConfig(true);
    setConfigMsg("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingConfig(false);
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
    setConfigMsgOk(!error);
    setConfigMsg(error ? "Could not save. Please try again." : "Saved!");
    setSavingConfig(false);
  }

  async function previewReceptionist() {
    setPreviewing(true);
    setPreviewError("");
    setPreviewResult(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setPreviewError("Please sign in again and retry.");
        return;
      }
      const res = await fetch("/api/receptionist-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  // Readiness - only genuine, backend-verifiable requirements. There is no
  // separate "receptionist enabled" flag anywhere in the schema or the
  // webhook handlers (missed-call.ts fires for any connected number
  // unconditionally) - a connected phone number IS the on/off switch, so
  // "not active" below maps 1:1 to "phone not connected" rather than a
  // fabricated toggle.
  const connected = !!twilioVerifiedAt;
  const greetingReady = greetingMessage.trim().length > 0;
  const businessReady = businessName.trim().length > 0 && !!industry;
  const hoursReady = businessHours.trim().length > 0;
  const allReady = connected && greetingReady && businessReady && hoursReady;

  const status: ReadinessStatus = loadError
    ? "error"
    : !connected
      ? "not_active"
      : allReady
        ? "ready"
        : "needs_setup";
  const statusMeta = STATUS_META[status];

  const readinessItems: {
    key: string;
    label: string;
    done: boolean;
    why: string;
    onFix: () => void;
  }[] = [
    {
      key: "phone",
      label: "Phone connected",
      done: connected,
      why: "Lanavix needs your own Twilio number to answer calls.",
      onFix: () => setActiveTab("phone"),
    },
    {
      key: "business",
      label: "Business info added",
      done: businessReady,
      why: "Your business name and industry shape every AI reply.",
      onFix: () => {
        setActiveTab("overview");
        requestAnimationFrame(() => businessNameRef.current?.focus());
      },
    },
    {
      key: "greeting",
      label: "Greeting configured",
      done: greetingReady,
      why: "Sent verbatim as the auto-text the moment a call is missed.",
      onFix: () => setActiveTab("greeting"),
    },
    {
      key: "hours",
      label: "Hours configured",
      done: hoursReady,
      why: "Lets the AI receptionist tell customers when you're open.",
      onFix: () => setActiveTab("hours"),
    },
  ];

  function handleTabKeyDown(e: React.KeyboardEvent, currentKey: TabKey) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const idx = TABS.findIndex((t) => t.key === currentKey);
    const nextIdx =
      e.key === "ArrowRight" ? (idx + 1) % TABS.length : (idx - 1 + TABS.length) % TABS.length;
    const nextKey = TABS[nextIdx].key;
    setActiveTab(nextKey);
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-recep-tab="${nextKey}"]`)?.focus();
    });
  }

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[880px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="lv-page-title text-foreground">Receptionist</h1>
          <span className="inline-flex items-center gap-1.5 lv-label whitespace-nowrap">
            <span
              className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusMeta.dotClass)}
              aria-hidden="true"
            />
            <span className={statusMeta.textClass}>{statusMeta.label}</span>
          </span>
        </div>
        <p className="lv-body text-muted-foreground mb-5">
          Every missed call gets an automatic text within 60 seconds — day or night.
        </p>

        {loadError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="lv-body text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" className="mt-2 min-h-[44px]" onClick={loadProfile}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="rounded-md border border-border py-16 text-center">
            <p className="lv-body text-muted-foreground">Loading…</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto mb-5 -mx-1 px-1"
              role="tablist"
              aria-label="Receptionist sections"
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  data-recep-tab={t.key}
                  aria-selected={activeTab === t.key}
                  tabIndex={activeTab === t.key ? 0 : -1}
                  onClick={() => setActiveTab(t.key)}
                  onKeyDown={(e) => handleTabKeyDown(e, t.key)}
                  className={cn(
                    "shrink-0 min-h-[44px] md:min-h-[36px] rounded-sm border px-3 py-1.5 lv-label transition-colors duration-150 ease-out whitespace-nowrap",
                    activeTab === t.key
                      ? "border-primary bg-accent text-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-card p-4 md:p-6">
                  <p className={cn("lv-section mb-1", statusMeta.textClass)}>{statusMeta.label}</p>
                  <p className="lv-body text-muted-foreground">{statusMeta.description}</p>
                </div>

                <div className="rounded-md border border-border bg-card p-4 md:p-6">
                  <p className="lv-label text-foreground mb-3">Setup checklist</p>
                  <ul className="flex flex-col gap-3">
                    {readinessItems.map((item) => (
                      <li key={item.key} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {item.done ? (
                            <CheckCircle2
                              className="h-4 w-4 text-primary mt-0.5 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <AlertTriangle
                              className="h-4 w-4 text-[var(--warning)] mt-0.5 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <div>
                            <p className="lv-body text-foreground">
                              {item.label}
                              <span className="sr-only">
                                {item.done ? " - done" : " - needs attention"}
                              </span>
                            </p>
                            <p className="lv-meta text-muted-foreground">{item.why}</p>
                          </div>
                        </div>
                        {!item.done && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-[44px] shrink-0"
                            onClick={item.onFix}
                          >
                            Fix
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-border bg-card p-4 md:p-6">
                  <p className="lv-label text-foreground mb-3">Business info</p>
                  <p className="lv-meta text-muted-foreground mb-3">
                    Shapes every AI reply — shown to customers and used by the receptionist.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="lv-meta text-foreground" htmlFor="recep-business-name">
                        Business name
                      </label>
                      <Input
                        id="recep-business-name"
                        ref={businessNameRef}
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Acme Plumbing Co."
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="lv-meta text-foreground" htmlFor="recep-industry">
                        Industry
                      </label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger id="recep-industry" className="min-h-[44px]">
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
                  </div>
                  <Button
                    className="min-h-[44px] mt-3"
                    disabled={savingBusiness}
                    onClick={saveBusinessInfo}
                  >
                    {savingBusiness ? "Saving…" : "Save"}
                  </Button>
                </div>

                <div className="rounded-md border border-border bg-card p-4 md:p-6">
                  <p className="lv-label text-foreground mb-3">Activity</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Calls captured", value: stats.total, Icon: Phone },
                      { label: "Auto-texted", value: stats.texted, Icon: MessageSquare },
                      { label: "Conversations handled", value: stats.replied, Icon: Reply },
                      { label: "Appointments booked", value: stats.booked, Icon: ClipboardCheck },
                    ].map((s) => (
                      <div key={s.label} className="rounded-sm border border-border p-3">
                        <s.Icon
                          className="h-4 w-4 text-primary mb-2"
                          aria-hidden="true"
                          strokeWidth={1.75}
                        />
                        <p className="lv-numbers text-foreground text-xl leading-none">{s.value}</p>
                        <p className="lv-meta text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="lv-meta text-muted-foreground mt-3">
                    See full conversation threads in{" "}
                    <a
                      href="/app/inbox"
                      className="underline text-foreground hover:text-muted-foreground transition-colors duration-150 ease-out"
                    >
                      Inbox
                    </a>
                    .
                  </p>
                </div>
              </div>
            )}

            {activeTab === "phone" && (
              <div className="space-y-4">
                <div className="rounded-md border border-border bg-card p-4 md:p-6">
                  {connected ? (
                    <div className="flex items-start gap-2.5 mb-4">
                      <CheckCircle2
                        className="h-4 w-4 text-primary mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="lv-body text-foreground">
                          Connected — <span className="font-medium">{phoneNumber}</span>
                        </p>
                        <p className="lv-meta text-muted-foreground">
                          This is the number Lanavix uses to answer your missed calls. Every call to
                          it that goes unanswered gets an automatic text within 60 seconds.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 mb-4">
                      <PhoneOff
                        className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="lv-body text-foreground">Not connected yet</p>
                        <p className="lv-meta text-muted-foreground">
                          Lanavix answers missed calls using your own Twilio number. Connect it
                          below and we'll confirm it works right away — nothing is provisioned
                          automatically.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="lv-meta text-foreground" htmlFor="recep-account-sid">
                        Account SID
                      </label>
                      <Input
                        id="recep-account-sid"
                        value={accountSid}
                        onChange={(e) => setAccountSid(e.target.value)}
                        placeholder="AC…"
                        autoComplete="off"
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="lv-meta text-foreground" htmlFor="recep-auth-token">
                        Auth Token
                      </label>
                      <Input
                        id="recep-auth-token"
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
                      <label className="lv-meta text-foreground" htmlFor="recep-phone-number">
                        Phone number
                      </label>
                      <Input
                        id="recep-phone-number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+15555550100"
                        onKeyDown={(e) => e.key === "Enter" && connectTwilio()}
                        autoComplete="off"
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>

                  {twilioMsg && (
                    <p
                      className={cn(
                        "lv-meta mt-3",
                        twilioMsgOk ? "text-accent-2" : "text-destructive",
                      )}
                    >
                      {twilioMsg}
                    </p>
                  )}

                  <Button
                    className="min-h-[44px] mt-3"
                    disabled={connectingTwilio}
                    onClick={connectTwilio}
                  >
                    {connectingTwilio
                      ? "Connecting…"
                      : connected
                        ? "Update connection"
                        : "Connect Twilio"}
                  </Button>
                </div>

                <div className="rounded-md border border-border bg-card p-4 md:p-6">
                  <p className="lv-label text-foreground mb-3">Setup instructions</p>
                  <ol className="space-y-3">
                    {[
                      {
                        title: "Get a Twilio number",
                        desc: "Sign up at twilio.com (free trial). Buy a local phone number for your area — costs ~$1/month.",
                      },
                      {
                        title: "Point your number at Lanavix",
                        desc: "In your Twilio console, set your number's Voice and SMS webhook URLs to the ones below. To keep an existing business number, forward calls from it to your new Twilio number too.",
                      },
                      {
                        title: "Connect your account above",
                        desc: "We confirm your details with Twilio before saving them, and your Auth Token is encrypted — once saved it's never shown again, only replaced.",
                      },
                    ].map((s, i) => (
                      <li key={s.title} className="flex gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground lv-meta font-medium">
                          {i + 1}
                        </span>
                        <div>
                          <p className="lv-body text-foreground font-medium">{s.title}</p>
                          <p className="lv-meta text-muted-foreground">{s.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="lv-meta text-muted-foreground mb-2">
                      Webhook URLs for your Twilio number's configuration page:
                    </p>
                    <div className="font-mono lv-meta text-muted-foreground bg-muted rounded-sm px-3 py-2 mb-1.5 break-all">
                      Voice: https://lanavix.com/api/twilio/missed-call
                    </div>
                    <div className="font-mono lv-meta text-muted-foreground bg-muted rounded-sm px-3 py-2 break-all">
                      SMS: https://lanavix.com/api/twilio/sms-reply
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "greeting" && (
              <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
                <div>
                  <h2 className="lv-section text-foreground mb-1">Greeting message</h2>
                  <p className="lv-body text-muted-foreground">
                    Sent verbatim as the auto-text the moment a call is missed — this is the first
                    thing a customer sees.
                  </p>
                </div>
                <Textarea
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  rows={4}
                  placeholder="Hi! This is [Your Business]. Sorry we missed your call — we're on a job right now. What do you need? Reply here and we'll get back to you ASAP."
                />
                {configMsg && (
                  <p className={cn("lv-meta", configMsgOk ? "text-accent-2" : "text-destructive")}>
                    {configMsg}
                  </p>
                )}
                <Button className="min-h-[44px]" disabled={savingConfig} onClick={saveConfig}>
                  {savingConfig ? "Saving…" : "Save"}
                </Button>
              </div>
            )}

            {activeTab === "knowledge" && <ReceptionistKnowledge />}

            {activeTab === "hours" && (
              <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
                <div>
                  <h2 className="lv-section text-foreground mb-1">Business hours</h2>
                  <p className="lv-body text-muted-foreground">
                    Given to the AI receptionist so it can tell customers when you're open.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="lv-meta text-foreground" htmlFor="recep-hours">
                    Hours
                  </label>
                  <Input
                    id="recep-hours"
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                    placeholder="Mon–Fri 8am–6pm, Sat 9am–1pm"
                    onKeyDown={(e) => e.key === "Enter" && saveConfig()}
                    className="min-h-[44px]"
                  />
                </div>
                {configMsg && (
                  <p className={cn("lv-meta", configMsgOk ? "text-accent-2" : "text-destructive")}>
                    {configMsg}
                  </p>
                )}
                <Button className="min-h-[44px]" disabled={savingConfig} onClick={saveConfig}>
                  {savingConfig ? "Saving…" : "Save"}
                </Button>
              </div>
            )}

            {activeTab === "escalation" && (
              <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
                <div>
                  <h2 className="lv-section text-foreground mb-1">Escalation rules</h2>
                  <p className="lv-body text-muted-foreground">
                    When should Lanavix stop handling a conversation and involve you? Given to the
                    AI receptionist so it can follow these rules exactly when they apply.
                  </p>
                </div>
                <Textarea
                  value={escalationRules}
                  onChange={(e) => setEscalationRules(e.target.value)}
                  rows={4}
                  placeholder="e.g. If the customer mentions a gas leak or flooding, tell them to call 911 / call us directly at [phone]."
                />
                {configMsg && (
                  <p className={cn("lv-meta", configMsgOk ? "text-accent-2" : "text-destructive")}>
                    {configMsg}
                  </p>
                )}
                <Button className="min-h-[44px]" disabled={savingConfig} onClick={saveConfig}>
                  {savingConfig ? "Saving…" : "Save"}
                </Button>
              </div>
            )}

            {activeTab === "preview" && (
              <div className="rounded-md border border-border bg-card p-4 md:p-6 space-y-3">
                <div>
                  <h2 className="lv-section text-foreground mb-1">Preview AI reply</h2>
                  <p className="lv-body text-muted-foreground">
                    See a real AI reply based on your current settings. This doesn't place a call or
                    send a text — it's a preview of what your receptionist would say.
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
                  className="min-h-[44px] gap-2"
                  disabled={previewing}
                  onClick={previewReceptionist}
                >
                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                  {previewing
                    ? "Generating preview…"
                    : previewResult || previewError
                      ? "Try again"
                      : "Preview AI reply"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
