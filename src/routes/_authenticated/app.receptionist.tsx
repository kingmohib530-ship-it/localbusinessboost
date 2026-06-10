import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
  texted:    { bg: "#EEF2FF", color: "#6366f1", label: "Texted" },
  replied:   { bg: "#ECFDF5", color: "#10b981", label: "Replied" },
  booked:    { bg: "#F0FDF4", color: "#16a34a", label: "Booked ✓" },
  no_response: { bg: "#F8FAFC", color: "#94a3b8", label: "No response" },
};

function ReceptionistPage() {
  const [calls, setCalls] = useState<MissedCall[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState<"calls" | "setup">("calls");

  useEffect(() => {
    loadCalls();
    checkConnected();
  }, []);

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

  async function checkConnected() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();
    setConnected(!!data && data.subscription_tier !== "free");
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

  const stats = {
    total: calls.length,
    texted: calls.filter(c => c.status !== "no_response").length,
    replied: calls.filter(c => ["replied", "booked"].includes(c.status)).length,
    booked: calls.filter(c => c.status === "booked").length,
  };

  const selectedCall = calls.find(c => c.id === selected);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "#0f172a", margin: 0 }}>
            📞 Missed Call Text-Back
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setTab("calls")} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: tab === "calls" ? "#0f172a" : "white", color: tab === "calls" ? "white" : "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Calls
            </button>
            <button onClick={() => setTab("setup")} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: tab === "setup" ? "#0f172a" : "white", color: tab === "setup" ? "white" : "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Setup
            </button>
          </div>
        </div>
        <p style={{ fontSize: 15, color: "#475569", margin: 0 }}>
          Every missed call gets an automatic text within 60 seconds — day or night.
        </p>
      </div>

      {/* Setup tab */}
      {tab === "setup" && (
        <div style={{ maxWidth: 620 }}>
          <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: 28, marginBottom: 16 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>How it works</h2>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
              When someone calls your business and you don't pick up, Lunavx automatically sends them a personalized text within 60 seconds. Claude then handles the conversation — qualifying the lead, answering questions, and booking appointments — so you wake up to booked jobs.
            </p>
            {[
              { step: "1", title: "Get a Twilio number", desc: "Sign up at twilio.com (free trial). Buy a local phone number for your area — costs ~$1/month." },
              { step: "2", title: "Forward your calls", desc: "Set up call forwarding on your existing business phone to your Twilio number. Takes 2 minutes." },
              { step: "3", title: "Add your Twilio credentials", desc: "Paste your Account SID and Auth Token into Vercel environment variables." },
              { step: "4", title: "Configure your auto-reply", desc: "Set your business name, services, and available hours. Lunavx handles the rest." },
            ].map(s => (
              <div key={s.step} style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", color: "white", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "#0f172a", borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 8 }}>Environment variables needed</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>Add these to Vercel → Environment Variables</div>
            {["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"].map(v => (
              <div key={v} style={{ fontFamily: "monospace", fontSize: 12, color: "#a5b4fc", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "6px 10px", marginBottom: 8 }}>{v}</div>
            ))}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 8 }}>Twilio webhook URLs to configure</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
                Voice: https://localbusinessboost.vercel.app/api/twilio/missed-call
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "8px 10px" }}>
                SMS: https://localbusinessboost.vercel.app/api/twilio/sms-reply
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
              { label: "Total missed calls", value: stats.total, icon: "📞" },
              { label: "Auto-texted", value: stats.texted, icon: "💬" },
              { label: "Replied back", value: stats.replied, icon: "↩️" },
              { label: "Jobs booked", value: stats.booked, icon: "✅" },
            ].map(s => (
              <div key={s.label} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {!loading && calls.length === 0 && (
            <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📵</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>No missed calls yet</h3>
              <p style={{ fontSize: 14, color: "#475569", maxWidth: 380, margin: "0 auto 24px", lineHeight: 1.6 }}>
                Once you connect Twilio, every missed call will appear here with the full conversation thread.
              </p>
              <button onClick={() => setTab("setup")} style={{ padding: "10px 24px", background: "#6366f1", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
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
                      style={{ background: "white", border: `1.5px solid ${selected === call.id ? "#6366f1" : "#e2e8f0"}`, borderRadius: 14, padding: "14px 18px", cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{call.caller_name || call.caller_phone}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: s.bg, color: s.color }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#94a3b8" }}>
                        {call.caller_name && <span style={{ marginRight: 8 }}>{call.caller_phone}</span>}
                        {new Date(call.called_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </div>
                      {call.notes && <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>{call.notes}</div>}
                    </div>
                  );
                })}
              </div>

              {selected && selectedCall && (
                <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", height: "fit-content", maxHeight: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{selectedCall.caller_name || selectedCall.caller_phone}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>SMS conversation</div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>×</button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                    {messages.length === 0 && <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", marginTop: 16 }}>No messages yet</p>}
                    {messages.map(msg => (
                      <div key={msg.id} style={{ display: "flex", justifyContent: msg.direction === "outbound" ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: msg.direction === "outbound" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                          background: msg.direction === "outbound" ? "#6366f1" : "#f1f5f9",
                          color: msg.direction === "outbound" ? "white" : "#0f172a", fontSize: 13 }}>
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
