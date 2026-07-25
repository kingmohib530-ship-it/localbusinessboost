import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Phone, PhoneOff, MessageSquare, Reply, CheckCircle2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/receptionist")({
  component: ReceptionistPage,
});

interface MissedCall {
  id: string;
  caller_phone: string;
  caller_name: string | null;
  called_at: string;
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
  texted:      { bg: "var(--accent)", color: "var(--primary)", label: "Texted" },
  replied:     { bg: "var(--accent)", color: "var(--accent-2)", label: "Replied" },
  booked:      { bg: "var(--accent)", color: "var(--accent-2)", label: "Booked ✓" },
  no_response: { bg: "var(--muted)", color: "var(--muted-foreground)", label: "No response" },
};

const TEST_CALLER_PHONE = "+15555550100";

function ReceptionistPage() {
  const [calls, setCalls] = useState<MissedCall[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
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
    loadCalls();
    loadProfile();
    loadAppointmentsBooked();
  }, []);

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

  async function loadCalls() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("missed_calls")
      .select("*")
      .eq("user_id", user.id)
      .order("called_at", { ascending: false });
    setCalls(data || []);
    setLoading(false);
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

  async function loadMessages(callId: string) {
    setSelected(callId);
    const { data } = await supabase
      .from("sms_conversations")
      .select("*")
      .eq("missed_call_id", callId)
      .order("sent_at", { ascending: true });
    setMessages(data || []);
  }

  async function testReceptionist() {
    setTestingReceptionist(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setTestingReceptionist(false); return; }

    const message =
      greetingMessage.trim() ||
      "Hi! Sorry we missed your call — we're on a job right now. What do you need? Reply here and we'll get back to you ASAP 👇";

    const { data: missedCall, error } = await supabase
      .from("missed_calls")
      .insert({
        user_id: user.id,
        caller_phone: TEST_CALLER_PHONE,
        caller_name: "Test Call",
        status: "texted",
        notes: "Simulated by \"Test your receptionist\" — no real call was placed.",
      })
      .select()
      .single();

    if (!error && missedCall) {
      await supabase.from("sms_conversations").insert({
        missed_call_id: missedCall.id,
        user_id: user.id,
        caller_phone: TEST_CALLER_PHONE,
        direction: "outbound",
        message,
      });
      await loadCalls();
      setTab("calls");
      loadMessages(missedCall.id);
    }
    setTestingReceptionist(false);
  }

  const stats = {
    total: calls.length,
    texted: calls.filter(c => c.status !== "no_response").length,
    replied: calls.filter(c => ["replied", "booked"].includes(c.status)).length,
    booked: appointmentsBooked,
  };

  const selectedCall = calls.find(c => c.id === selected);
  const connected = !!twilioNumber;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
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

      {/* Setup tab */}
      {tab === "setup" && (
        <div style={{ maxWidth: 620 }}>
          <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 28, marginBottom: 16 }}>
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

          <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Your Twilio number</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 14, lineHeight: 1.5 }}>
              Enter the Twilio number Lanavix sends and receives texts on for your business. This is how missed calls get matched to your account.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={twilioNumber} onChange={e => setTwilioNumber(e.target.value)} placeholder="+15555550100"
                style={{ flex: 1, padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", outline: "none" }} />
              <button onClick={saveTwilioNumber} disabled={savingNumber}
                style={{ padding: "10px 20px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: savingNumber ? "not-allowed" : "pointer", opacity: savingNumber ? 0.7 : 1 }}>
                {savingNumber ? "Saving..." : "Save"}
              </button>
            </div>
            {numberMsg && <div style={{ fontSize: 12, color: numberSaveOk ? "var(--accent-2)" : "var(--destructive)", marginTop: 8 }}>{numberMsg}</div>}
          </div>

          <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Configuration</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16, lineHeight: 1.5 }}>
              Greeting message is sent verbatim as your auto-text when a call is missed. Business hours and escalation rules are saved to your business profile for reference.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Business hours</label>
              <input value={businessHours} onChange={e => setBusinessHours(e.target.value)} placeholder="Mon–Fri 8am–6pm, Sat 9am–1pm"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Greeting message</label>
              <textarea value={greetingMessage} onChange={e => setGreetingMessage(e.target.value)} rows={3}
                placeholder={`Hi! This is [Your Business]. Sorry we missed your call — we're on a job right now. What do you need? Reply here and we'll get back to you ASAP 👇`}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>Escalation rules</label>
              <textarea value={escalationRules} onChange={e => setEscalationRules(e.target.value)} rows={3}
                placeholder="e.g. If the customer mentions a gas leak or flooding, tell them to call 911 / call us directly at [phone]."
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            <button onClick={saveConfig} disabled={savingConfig}
              style={{ padding: "10px 20px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: savingConfig ? "not-allowed" : "pointer", opacity: savingConfig ? 0.7 : 1 }}>
              {savingConfig ? "Saving..." : "Save configuration"}
            </button>
            {configMsg && <div style={{ fontSize: 12, color: configSaveOk ? "var(--accent-2)" : "var(--destructive)", marginTop: 8 }}>{configMsg}</div>}
          </div>

          <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
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
            ].map(s => (
              <div key={s.label} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <s.Icon size={16} color="var(--primary)" strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {!loading && calls.length === 0 && (
            <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
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

          {/* Call list + conversation */}
          {calls.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {calls.map(call => {
                  const s = STATUS_COLORS[call.status] || STATUS_COLORS.texted;
                  return (
                    <div key={call.id} onClick={() => loadMessages(call.id)}
                      style={{ background: "var(--card)", border: `1.5px solid ${selected === call.id ? "var(--primary)" : "var(--border)"}`, borderRadius: 14, padding: "14px 18px", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{call.caller_name || call.caller_phone}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                        {call.caller_name && <span style={{ marginRight: 8 }}>{call.caller_phone}</span>}
                        {new Date(call.called_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                      {call.notes && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6 }}>{call.notes}</div>}
                    </div>
                  );
                })}
              </div>

              {selected && selectedCall && (
                <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", height: "fit-content", maxHeight: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{selectedCall.caller_name || selectedCall.caller_phone}</div>
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
