import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Phone, PhoneOff, MessageSquare, Reply, CheckCircle2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlowPanel } from "@/components/GlowPanel";
import { useMountReveal } from "@/hooks/use-mount-reveal";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export const Route = createFileRoute("/_authenticated/app/receptionist")({
  component: ReceptionistPage,
});

interface Conversation {
  id: string;
  customer_identifier: string;
  customer_name: string | null;
  started_at: string;
  status: string;
  notes: string | null;
}

interface Message {
  id: string;
  direction: string;
  message: string;
  sent_at: string;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  received:    { bg: "var(--muted)", color: "var(--muted-foreground)", label: "Text not sent" },
  texted:      { bg: "var(--accent)", color: "var(--primary)", label: "Texted" },
  replied:     { bg: "var(--accent)", color: "var(--accent-2)", label: "Replied" },
  booked:      { bg: "var(--accent)", color: "var(--accent-2)", label: "Booked ✓" },
  no_response: { bg: "var(--muted)", color: "var(--muted-foreground)", label: "No response" },
};

const PAGE_SIZE = 20;

function ReceptionistPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [callStats, setCallStats] = useState({ total: 0, texted: 0, replied: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<"calls" | "setup">("calls");
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [twilioVerifiedAt, setTwilioVerifiedAt] = useState<string | null>(null);
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [twilioMsg, setTwilioMsg] = useState("");
  const [twilioSaveOk, setTwilioSaveOk] = useState(false);
  const [appointmentsBooked, setAppointmentsBooked] = useState(0);

  const [businessHours, setBusinessHours] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [escalationRules, setEscalationRules] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState("");
  const [configSaveOk, setConfigSaveOk] = useState(false);

  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{ sampleMessage: string; reply: string } | null>(null);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    loadConversations(0);
    loadCallStats();
    loadProfile();
    loadAppointmentsBooked();
  }, []);

  /**
   * Independent of the paginated conversation list below - "texted"/"replied"
   * need accurate all-time counts regardless of how many pages have been
   * loaded. Counts use head:true, a real SQL COUNT rather than a row fetch.
   */
  async function loadCallStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [total, texted, replied] = await Promise.all([
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("channel", "sms"),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("channel", "sms").neq("status", "no_response"),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("channel", "sms").in("status", ["replied", "booked"]),
    ]);
    setCallStats({ total: total.count ?? 0, texted: texted.count ?? 0, replied: replied.count ?? 0 });
  }

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("twilio_account_sid, twilio_phone_number, twilio_verified_at, business_hours, greeting_message, escalation_rules")
      .eq("id", user.id)
      .single();
    setAccountSid(data?.twilio_account_sid || "");
    setPhoneNumber(data?.twilio_phone_number || "");
    setTwilioVerifiedAt(data?.twilio_verified_at || null);
    setBusinessHours(data?.business_hours || "");
    setGreetingMessage(data?.greeting_message || "");
    setEscalationRules(data?.escalation_rules || "");
  }

  async function connectTwilio() {
    setSavingTwilio(true);
    setTwilioMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSavingTwilio(false);
      setTwilioSaveOk(false);
      setTwilioMsg("Please sign in again and retry.");
      return;
    }
    try {
      const res = await fetch("/api/twilio-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ accountSid: accountSid.trim(), authToken: authToken.trim(), phoneNumber: phoneNumber.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwilioSaveOk(true);
        setTwilioMsg("Connected! Your calls and texts now send from your own Twilio number.");
        setAuthToken("");
        loadProfile();
      } else {
        setTwilioSaveOk(false);
        setTwilioMsg(data.error || "Could not connect. Please check your details and try again.");
      }
    } catch {
      setTwilioSaveOk(false);
      setTwilioMsg("Network error. Please try again.");
    }
    setSavingTwilio(false);
  }

  async function saveConfig() {
    setSavingConfig(true);
    setConfigMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingConfig(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({
        business_hours: businessHours.trim() || null,
        greeting_message: greetingMessage.trim() || null,
        escalation_rules: escalationRules.trim() || null,
      })
      .eq("id", user.id);
    setConfigSaveOk(!error);
    setConfigMsg(error ? "Could not save configuration." : "Saved!");
    setSavingConfig(false);
  }

  async function loadConversations(page: number) {
    if (page === 0) setLoading(true); else setLoadingMore(true);
    setLoadError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setLoadingMore(false); return; }
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("channel", "sms")
      .order("started_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[receptionist] failed to load conversations", error);
      setLoadError("Couldn't load your calls. Please refresh the page.");
    }
    const rows = data || [];
    setConversations((prev) => (page === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  }

  async function loadAppointmentsBooked() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("source", "inbound_sms");
    setAppointmentsBooked(count || 0);
  }

  async function loadMessages(conversationId: string) {
    setSelected(conversationId);
    const { data } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true });
    setMessages(data || []);
  }

  // Runs a real Anthropic call through the same prompt sms-reply.ts uses,
  // so a contractor can see what their AI receptionist would actually say
  // given their current settings and known facts. This is a preview, not
  // a real call or text - nothing is written to conversations, so it
  // never inflates the real call stats above.
  async function previewReceptionist() {
    setPreviewing(true);
    setPreviewError("");
    setPreviewResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
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

  const stats = {
    total: callStats.total,
    texted: callStats.texted,
    replied: callStats.replied,
    booked: appointmentsBooked,
  };

  const selectedConversation = conversations.find(c => c.id === selected);
  const connected = !!twilioVerifiedAt;
  const reducedMotion = usePrefersReducedMotion();
  const { step, delay } = useMountReveal();

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>

      {/* Header */}
      <div className={step} style={{ marginBottom: 28, ...delay(0) }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: 0 }}>
              Receptionist
            </h1>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
              padding: "4px 10px", borderRadius: 999,
              background: connected ? "var(--accent)" : "var(--muted)",
              color: connected ? "var(--accent-2)" : "var(--muted-foreground)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "var(--accent-2)" : "var(--muted-foreground)" }} />
              {connected ? "Twilio connected" : "Twilio not connected"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={previewReceptionist} disabled={previewing}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: previewing ? "not-allowed" : "pointer", opacity: previewing ? 0.7 : 1 }}
              title="See a sample AI reply based on your current settings - this doesn't place a real call or text">
              <Wand2 size={14} />
              {previewing ? "Generating preview..." : "Preview AI reply"}
            </button>
            <button onClick={() => setTab("calls")} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid var(--border)", background: tab === "calls" ? "var(--primary)" : "var(--card)", color: tab === "calls" ? "var(--primary-foreground)" : "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Calls
            </button>
            <button onClick={() => setTab("setup")} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid var(--border)", background: tab === "setup" ? "var(--primary)" : "var(--card)", color: tab === "setup" ? "var(--primary-foreground)" : "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Setup
            </button>
          </div>
        </div>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
          Every missed call gets an automatic text within 60 seconds — day or night.
        </p>
      </div>

      {loadError && <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 20 }}>{loadError}</p>}

      {previewError && (
        <div className="glass-dark" style={{ borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "var(--destructive)" }}>
          {previewError}
        </div>
      )}

      {previewResult && (
        <div className="glass-dark hd-blur-in" style={{ borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>AI reply preview</div>
            <button onClick={() => setPreviewResult(null)} style={{ fontSize: 12, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>
              Dismiss
            </button>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Sample customer text</div>
          <div style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 12, padding: "8px 12px", background: "var(--muted)", borderRadius: 8 }}>{previewResult.sampleMessage}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>Your AI receptionist would reply</div>
          <div style={{ fontSize: 13, color: "var(--foreground)", padding: "8px 12px", background: "var(--accent)", borderRadius: 8 }}>{previewResult.reply}</div>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 10 }}>
            This is a preview only - no call was placed and no text was sent.
          </div>
        </div>
      )}

      {/* Setup tab */}
      {tab === "setup" && (
        <div style={{ maxWidth: 620 }}>
          <div className="glass-dark" style={{ borderRadius: 20, padding: 28, marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>How it works</h2>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 20, lineHeight: 1.6 }}>
              When someone calls your business and you don't pick up, Lanavix automatically sends them a personalized text within 60 seconds and handles the conversation — qualifying the lead, answering questions, and booking appointments — so you wake up to booked jobs.
            </p>
            {[
              { step: "1", title: "Get a Twilio number", desc: "Sign up at twilio.com (free trial). Buy a local phone number for your area — costs ~$1/month." },
              { step: "2", title: "Point your number at Lanavix", desc: "In your Twilio console, set your number's Voice and SMS webhook URLs to the ones shown below. If you'd rather keep your existing business number, forward calls from it to your new Twilio number too." },
              { step: "3", title: "Connect your Twilio account", desc: "Paste your Account SID, Auth Token, and phone number below, and we'll confirm it works right away." },
              { step: "4", title: "Configure your auto-reply", desc: "Set your business hours, greeting message, and escalation rules below. Lanavix handles the rest." },
            ].map(s => (
              <div key={s.step} style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "var(--primary-foreground)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-dark" style={{ borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>Webhook URLs to paste into Twilio</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14, lineHeight: 1.5 }}>
              On your Twilio number's configuration page, set these as the Voice and SMS webhook URLs.
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 6, padding: "8px 10px", marginBottom: 8, wordBreak: "break-all" }}>
              Voice: https://lanavix.com/api/twilio/missed-call
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 6, padding: "8px 10px", wordBreak: "break-all" }}>
              SMS: https://lanavix.com/api/twilio/sms-reply
            </div>
          </div>

          <div className="glass-dark" style={{ borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Connect your Twilio account</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14, lineHeight: 1.5 }}>
              Your own Twilio account, so calls and texts send from your business's own number. Find your Account SID and Auth Token on your Twilio console's dashboard. We confirm your details with Twilio before saving them, and your Auth Token is encrypted, so once saved it's never shown again, only replaced.
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Account SID</label>
              <input value={accountSid} onChange={e => setAccountSid(e.target.value)} placeholder="AC..."
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Auth Token</label>
              <input value={authToken} onChange={e => setAuthToken(e.target.value)} type="password"
                placeholder={connected ? "•••••••• (saved, enter a new one to replace it)" : "Your Twilio Auth Token"}
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Phone number</label>
              <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+15555550100"
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <button onClick={connectTwilio} disabled={savingTwilio}
              style={{ padding: "10px 20px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: savingTwilio ? "not-allowed" : "pointer", opacity: savingTwilio ? 0.7 : 1 }}>
              {savingTwilio ? "Connecting..." : connected ? "Update connection" : "Connect Twilio"}
            </button>
            {twilioMsg && <div style={{ fontSize: 12, color: twilioSaveOk ? "var(--accent-2)" : "var(--destructive)", marginTop: 8 }}>{twilioMsg}</div>}
          </div>

          <div className="glass-dark" style={{ borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Configuration</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.5 }}>
              Greeting message is sent verbatim as your auto-text when a call is missed. Business hours and escalation rules are given to the AI receptionist so it can follow them in the conversation that follows. These same settings also power your Web Chat widget, whose embed code is on the Web Chat page.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Business hours</label>
              <input value={businessHours} onChange={e => setBusinessHours(e.target.value)} placeholder="Mon–Fri 8am–6pm, Sat 9am–1pm"
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Greeting message</label>
              <textarea value={greetingMessage} onChange={e => setGreetingMessage(e.target.value)} rows={3}
                placeholder={`Hi! This is [Your Business]. Sorry we missed your call — we're on a job right now. What do you need? Reply here and we'll get back to you ASAP.`}
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Escalation rules</label>
              <textarea value={escalationRules} onChange={e => setEscalationRules(e.target.value)} rows={3}
                placeholder="e.g. If the customer mentions a gas leak or flooding, tell them to call 911 / call us directly at [phone]."
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            <button onClick={saveConfig} disabled={savingConfig}
              style={{ padding: "10px 20px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: savingConfig ? "not-allowed" : "pointer", opacity: savingConfig ? 0.7 : 1 }}>
              {savingConfig ? "Saving..." : "Save configuration"}
            </button>
            {configMsg && <div style={{ fontSize: 12, color: configSaveOk ? "var(--accent-2)" : "var(--destructive)", marginTop: 8 }}>{configMsg}</div>}
          </div>
        </div>
      )}

      {/* Calls tab */}
      {tab === "calls" && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Calls captured", value: stats.total, Icon: Phone },
              { label: "Auto-texted", value: stats.texted, Icon: MessageSquare },
              { label: "Conversations handled", value: stats.replied, Icon: Reply },
              { label: "Appointments booked", value: stats.booked, Icon: CheckCircle2 },
            ].map((s, i) => (
              <GlowPanel key={s.label} reducedMotion={reducedMotion} className={`${step} glass-dark hover-lift-dark rounded-2xl`} style={{ padding: "16px 18px", ...delay(i + 1) }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <s.Icon size={16} color="var(--primary)" strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{s.label}</div>
              </GlowPanel>
            ))}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="glass-dark" style={{ borderRadius: 20, padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
              Loading...
            </div>
          )}

          {/* Empty state */}
          {!loading && conversations.length === 0 && (
            <div className={`${step} glass-dark`} style={{ borderRadius: 20, padding: "48px 32px", textAlign: "center", ...delay(5) }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <PhoneOff size={26} color="var(--primary)" strokeWidth={1.75} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>No missed calls yet</h3>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.6 }}>
                Once you connect Twilio, every missed call will appear here with the full conversation thread. Or click "Preview AI reply" above to see a sample response right now.
              </p>
              <button onClick={() => setTab("setup")} style={{ padding: "10px 24px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                View setup instructions →
              </button>
            </div>
          )}

          {/* Conversation list + thread */}
          {conversations.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {conversations.map(conversation => {
                  const s = STATUS_COLORS[conversation.status] || STATUS_COLORS.texted;
                  return (
                    <GlowPanel key={conversation.id} reducedMotion={reducedMotion} onClick={() => loadMessages(conversation.id)}
                      className="glass-dark hover-lift-dark rounded-2xl"
                      style={{ border: `1.5px solid ${selected === conversation.id ? "var(--primary)" : "var(--border)"}`, padding: "14px 18px", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{conversation.customer_name || conversation.customer_identifier}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                        {conversation.customer_name && <span style={{ marginRight: 8 }}>{conversation.customer_identifier}</span>}
                        {new Date(conversation.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                      {conversation.notes && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>{conversation.notes}</div>}
                    </GlowPanel>
                  );
                })}
                {hasMore && (
                  <button
                    onClick={() => { const next = pageIndex + 1; setPageIndex(next); loadConversations(next); }}
                    disabled={loadingMore}
                    style={{ alignSelf: "center", marginTop: 4, padding: "8px 16px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {loadingMore ? "Loading..." : "Load more"}
                  </button>
                )}
              </div>

              {selected && selectedConversation && (
                <div className="glass-dark hd-blur-in" style={{ borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", height: "fit-content", maxHeight: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{selectedConversation.customer_name || selectedConversation.customer_identifier}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>SMS conversation</div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>×</button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {messages.length === 0 && <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", marginTop: 16 }}>No messages yet</p>}
                    {messages.map(msg => (
                      <div key={msg.id} style={{ display: "flex", justifyContent: msg.direction === "outbound" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: msg.direction === "outbound" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                          background: msg.direction === "outbound" ? "var(--primary)" : "var(--secondary)",
                          color: msg.direction === "outbound" ? "var(--primary-foreground)" : "var(--foreground)", fontSize: 13 }}>
                          {msg.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
