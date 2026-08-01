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

const TEST_CALLER_PHONE = "+15555550100";

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
  const [twilioNumber, setTwilioNumber] = useState("");
  const [savingNumber, setSavingNumber] = useState(false);
  const [numberMsg, setNumberMsg] = useState("");
  const [numberSaveOk, setNumberSaveOk] = useState(false);
  const [appointmentsBooked, setAppointmentsBooked] = useState(0);

  const [businessHours, setBusinessHours] = useState("");
  const [greetingMessage, setGreetingMessage] = useState("");
  const [escalationRules, setEscalationRules] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState("");
  const [configSaveOk, setConfigSaveOk] = useState(false);

  const [testingReceptionist, setTestingReceptionist] = useState(false);

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
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "no_response"),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", ["replied", "booked"]),
    ]);
    setCallStats({ total: total.count ?? 0, texted: texted.count ?? 0, replied: replied.count ?? 0 });
  }

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("twilio_phone_number, business_hours, greeting_message, escalation_rules")
      .eq("id", user.id)
      .single();
    setTwilioNumber(data?.twilio_phone_number || "");
    setBusinessHours(data?.business_hours || "");
    setGreetingMessage(data?.greeting_message || "");
    setEscalationRules(data?.escalation_rules || "");
  }

  async function saveTwilioNumber() {
    setSavingNumber(true);
    setNumberMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingNumber(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ twilio_phone_number: twilioNumber.trim() || null })
      .eq("id", user.id);
    setNumberSaveOk(!error);
    setNumberMsg(error ? "Could not save — that number may already be linked to another account." : "Saved!");
    setSavingNumber(false);
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

  async function testReceptionist() {
    setTestingReceptionist(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in again and retry.");
      setTestingReceptionist(false);
      return;
    }

    const message =
      greetingMessage.trim() ||
      "Hi! Sorry we missed your call — we're on a job right now. What do you need? Reply here and we'll get back to you ASAP.";

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        channel: "sms",
        customer_identifier: TEST_CALLER_PHONE,
        customer_name: "Test Call",
        status: "texted",
        notes: "Simulated by \"Test your receptionist\" — no real call was placed.",
      })
      .select()
      .single();

    if (!error && conversation) {
      await supabase.from("conversation_messages").insert({
        conversation_id: conversation.id,
        user_id: user.id,
        direction: "outbound",
        message,
      });
      setPageIndex(0);
      await loadConversations(0);
      loadCallStats();
      setTab("calls");
      loadMessages(conversation.id);
    } else {
      console.error("[receptionist] test call failed", error);
      toast.error("Couldn't send the test message. Please try again.");
    }
    setTestingReceptionist(false);
  }

  const stats = {
    total: callStats.total,
    texted: callStats.texted,
    replied: callStats.replied,
    booked: appointmentsBooked,
  };

  const selectedConversation = conversations.find(c => c.id === selected);
  const connected = !!twilioNumber;
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
            <button onClick={testReceptionist} disabled={testingReceptionist}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: testingReceptionist ? "not-allowed" : "pointer", opacity: testingReceptionist ? 0.7 : 1 }}>
              <Wand2 size={14} />
              {testingReceptionist ? "Sending test..." : "Test your receptionist"}
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
              { step: "2", title: "Forward your calls", desc: "Set up call forwarding on your existing business phone to your Twilio number. Takes 2 minutes." },
              { step: "3", title: "Add your Twilio credentials", desc: "Paste your Account SID and Auth Token into Vercel environment variables." },
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
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Your Twilio number</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14, lineHeight: 1.5 }}>
              Enter the Twilio number Lanavix sends and receives texts on for your business. This is how missed calls get matched to your account.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={twilioNumber} onChange={e => setTwilioNumber(e.target.value)} placeholder="+15555550100"
                className="lv-input" style={{ flex: 1, padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit" }} />
              <button onClick={saveTwilioNumber} disabled={savingNumber}
                style={{ padding: "10px 20px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: savingNumber ? "not-allowed" : "pointer", opacity: savingNumber ? 0.7 : 1 }}>
                {savingNumber ? "Saving..." : "Save"}
              </button>
            </div>
            {numberMsg && <div style={{ fontSize: 12, color: numberSaveOk ? "var(--accent-2)" : "var(--destructive)", marginTop: 8 }}>{numberMsg}</div>}
          </div>

          <div className="glass-dark" style={{ borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Configuration</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.5 }}>
              Greeting message is sent verbatim as your auto-text when a call is missed. Business hours and escalation rules are given to the AI receptionist so it can follow them in the conversation that follows.
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

          <div className="glass-dark" style={{ borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>Environment variables needed</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14 }}>Add these to Vercel → Environment Variables</div>
            {["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"].map(v => (
              <div key={v} style={{ fontFamily: "monospace", fontSize: 12, color: "var(--primary)", background: "var(--accent)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", marginBottom: 8 }}>{v}</div>
            ))}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>Twilio webhook URLs to configure</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                Voice: https://lanavix.com/api/twilio/missed-call
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted-foreground)", background: "var(--muted)", borderRadius: 6, padding: "8px 10px" }}>
                SMS: https://lanavix.com/api/twilio/sms-reply
              </div>
            </div>
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
                Once you connect Twilio, every missed call will appear here with the full conversation thread. Or try "Test your receptionist" above to see it in action right now.
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
