import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/agents")({
  component: AgentsHub,
});

interface Lead {
  businessName: string;
  contactName: string;
  phone: string;
  need: string;
  openingLine: string;
}

interface LeadResult {
  leads: Lead[];
  revenueEstimate: string;
  topTip: string;
}

const CAMPAIGNS = [
  {
    id: "lead-blast",
    icon: "🎯",
    name: "Local Lead Blast",
    agent: "Atlas + Pulse",
    desc: "Find 15 qualified local leads in your area with personalized outreach copy.",
    time: "~30 seconds",
    color: "#818cf8",
    bg: "rgba(99,102,241,0.15)",
    active: true,
  },
  {
    id: "review-recovery",
    icon: "⭐",
    name: "Review Recovery",
    agent: "Pulse + Shield",
    desc: "Write professional responses to reviews and generate SMS review requests.",
    time: "~20 seconds",
    color: "#34d399",
    bg: "rgba(16,185,129,0.15)",
    active: false,
  },
  {
    id: "booking-booster",
    icon: "📅",
    name: "Booking Booster",
    agent: "Forge + Pulse",
    desc: "Create automated follow-up sequences to win back no-shows and fill your calendar.",
    time: "~45 seconds",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.15)",
    active: false,
  },
  {
    id: "competitor-intel",
    icon: "🔍",
    name: "Competitor Intelligence",
    agent: "Nexus",
    desc: "Analyse your top 3 local competitors and find the gaps you can win.",
    time: "~40 seconds",
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.15)",
    active: false,
  },
];

const STEPS = [
  "Orbis planning workflow...",
  "Atlas scanning your area...",
  "Nexus enriching with market data...",
  "Pulse writing personalized outreach...",
  "Shield reviewing quality...",
  "Aether calculating revenue projection...",
  "Vanguard preparing your checklist...",
];

function AgentsHub() {
  const [selected, setSelected] = useState<string | null>(null);
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<LeadResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("industry, city")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.industry) setIndustry(data.industry);
          if (data?.city) setCity(data.city);
        });
    });
  }, []);

  async function runCampaign() {
    if (!industry.trim() || !city.trim()) {
      setError("Please enter your trade type and city.");
      return;
    }
    setError("");
    setRunning(true);
    setResult(null);
    setStep(0);

    const timer = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 1400);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        clearInterval(timer);
        setError("Please sign in again and retry.");
        setRunning(false);
        return;
      }

      const res = await fetch("/api/lead-blast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ industry: industry.trim(), city: city.trim() }),
      });

      const data = await res.json();
      clearInterval(timer);
      setStep(STEPS.length);

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setResult(data);
    } catch (err) {
      clearInterval(timer);
      setError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  function copyLeads() {
    if (!result) return;
    const text = result.leads
      .map((l, i) => `${i + 1}. ${l.businessName}\n   ${l.contactName} | ${l.phone}\n   Need: ${l.need}\n   Opening: "${l.openingLine}"\n`)
      .join("\n");
    navigator.clipboard.writeText(text);
    alert("✅ Copied to clipboard!");
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: "0 0 6px" }}>🤖 Agents Hub</h1>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>Pick a campaign and your 8-agent AI team will run it end-to-end.</p>
      </div>

      {/* Grid */}
      {!selected && !running && !result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
          {CAMPAIGNS.map(c => (
            <div key={c.id} onClick={() => c.active && setSelected(c.id)}
              style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 22, cursor: c.active ? "pointer" : "default", opacity: c.active ? 1 : 0.55, position: "relative" }}>
              {!c.active && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 11, fontWeight: 600, background: "var(--secondary)", color: "var(--muted-foreground)", padding: "2px 8px", borderRadius: 4 }}>Coming soon</div>}
              <div style={{ width: 48, height: 48, borderRadius: 12, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14 }}>{c.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.color, marginBottom: 8 }}>Powered by {c.agent}</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 12 }}>{c.desc}</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: c.active ? 12 : 0 }}>⏱ {c.time}</div>
              {c.active && <div style={{ fontSize: 14, fontWeight: 600, color: c.color }}>Run this campaign →</div>}
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {selected === "lead-blast" && !running && !result && (
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 520 }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>← Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎯</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)" }}>Local Lead Blast</div>
              <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 600 }}>Atlas · Pulse · Aether · Vanguard</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Your trade / service *</label>
            <input value={industry} onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. HVAC, Plumbing, Cleaning, Roofing..."
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "var(--foreground)", background: "var(--input)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Your city / area *</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder="e.g. Atlanta GA, Dallas TX..."
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "var(--foreground)", background: "var(--input)", outline: "none", boxSizing: "border-box" }} />
          </div>
          {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 14 }}>{error}</p>}
          <button onClick={runCampaign}
            style={{ width: "100%", padding: 13, background: "#6366f1", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Run Local Lead Blast →
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", marginTop: 10 }}>~30 seconds · All 7 agents run</p>
        </div>
      )}

      {/* Loading */}
      {running && (
        <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 520 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#818cf8", marginBottom: 8 }}>Running campaign</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--foreground)", marginBottom: 24 }}>Finding {industry} leads in {city}...</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10,
                background: i < step ? "rgba(16,185,129,0.1)" : i === step ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i < step ? "rgba(16,185,129,0.2)" : i === step ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < step ? "#10b981" : i === step ? "#6366f1" : "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", flexShrink: 0 }}>
                  {i < step ? "✓" : ""}
                </div>
                <span style={{ fontSize: 13, color: i < step ? "#34d399" : i === step ? "#a5b4fc" : "rgba(255,255,255,0.3)" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && !running && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>✅ {result.leads.length} leads found in {city}</h2>
              <p style={{ fontSize: 14, color: "#34d399", fontWeight: 600, margin: 0 }}>💰 Revenue opportunity: {result.revenueEstimate}/mo</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyLeads} style={{ padding: "9px 18px", background: "#6366f1", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Copy all leads</button>
              <button onClick={() => { setResult(null); setSelected(null); }} style={{ padding: "9px 18px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>New campaign</button>
            </div>
          </div>
          {result.topTip && (
            <div style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "11px 16px", marginBottom: 18 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>⚡ Top tip: </span>
              <span style={{ fontSize: 13, color: "#fde68a" }}>{result.topTip}</span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.leads.map((lead, i) => (
              <div key={i} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,0.15)", color: "#818cf8", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>{lead.businessName}</span>
                  <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{lead.contactName}</span>
                  <span style={{ fontSize: 13, color: "#818cf8", fontWeight: 500 }}>{lead.phone}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 5px", paddingLeft: 30 }}>{lead.need}</p>
                <p style={{ fontSize: 13, color: "var(--foreground)", fontStyle: "italic", margin: 0, paddingLeft: 30 }}>"{lead.openingLine}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
