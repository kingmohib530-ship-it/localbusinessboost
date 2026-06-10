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
  totalFound: number;
  revenueEstimate: string;
  topTip: string;
}

const CAMPAIGNS = [
  {
    id: "lead-blast",
    icon: "🎯",
    name: "Local Lead Blast",
    agent: "Atlas + Pulse",
    desc: "Find 30 qualified local leads in your area with personalized outreach copy.",
    time: "~30 seconds",
    color: "#6366f1",
    bg: "#EEF2FF",
    active: true,
  },
  {
    id: "review-recovery",
    icon: "⭐",
    name: "Review Recovery",
    agent: "Pulse + Shield",
    desc: "Write professional responses to reviews and generate SMS review requests.",
    time: "~20 seconds",
    color: "#10b981",
    bg: "#ECFDF5",
    active: false,
  },
  {
    id: "booking-booster",
    icon: "📅",
    name: "Booking Booster",
    agent: "Forge + Pulse",
    desc: "Create automated follow-up sequences to win back no-shows and fill your calendar.",
    time: "~45 seconds",
    color: "#f59e0b",
    bg: "#FFFBEB",
    active: false,
  },
  {
    id: "competitor-intel",
    icon: "🔍",
    name: "Competitor Intelligence",
    agent: "Nexus",
    desc: "Analyse your top 3 local competitors and find the gaps you can win.",
    time: "~40 seconds",
    color: "#8b5cf6",
    bg: "#F5F3FF",
    active: false,
  },
];

function AgentsHub() {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<LeadResult | null>(null);
  const [error, setError] = useState("");

  const STEPS = [
    "Orbis planning workflow...",
    "Atlas scanning your area...",
    "Nexus enriching with market data...",
    "Pulse writing personalized outreach...",
    "Shield reviewing quality...",
    "Aether calculating revenue projection...",
    "Vanguard preparing your checklist...",
  ];

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("industry, city, business_name")
        .eq("id", user.id)
        .single();
      if (data?.industry) setIndustry(data.industry);
      if (data?.city) setCity(data.city);
    }
    loadProfile();
  }, []);

  async function runLeadBlast() {
    if (!industry || !city) {
      setError("Please enter your trade type and city.");
      return;
    }
    setError("");
    setRunning(true);
    setResult(null);
    setStep(0);

    // Animate steps
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i);
      await new Promise(r => setTimeout(r, 1200));
    }

    try {
      const prompt = `You are Atlas, a local business lead generation AI. Generate exactly 20 realistic local ${industry} businesses in ${city} that likely need ${industry} services.

Return ONLY valid JSON in this exact format, no markdown, no explanation:
{
  "leads": [
    {
      "businessName": "Example Restaurant",
      "contactName": "John Smith",
      "phone": "555-0100",
      "need": "One sentence explaining why they need ${industry} services",
      "openingLine": "Personalized 1-sentence outreach opener mentioning their business"
    }
  ],
  "revenueEstimate": "$3,000-$8,000/mo",
  "topTip": "One sentence on the highest-leverage outreach action"
}

Make businesses realistic for ${city}. Phone numbers should look real (area code for ${city} if known). Opening lines must mention the business name and feel personal.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map((b: any) => b.text || "").join("").trim();
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setResult({
        leads: parsed.leads,
        totalFound: parsed.leads.length,
        revenueEstimate: parsed.revenueEstimate,
        topTip: parsed.topTip,
      });
    } catch (err) {
      setError("Something went wrong generating leads. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  function copyLeads() {
    if (!result) return;
    const text = result.leads.map((l, i) =>
      `${i + 1}. ${l.businessName}\n   Contact: ${l.contactName} | ${l.phone}\n   Need: ${l.need}\n   Opening line: "${l.openingLine}"\n`
    ).join("\n");
    navigator.clipboard.writeText(text);
    alert("Leads copied to clipboard!");
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "#0f172a", margin: "0 0 6px" }}>
          🤖 Agents Hub
        </h1>
        <p style={{ fontSize: 15, color: "#475569", margin: 0 }}>
          Pick a campaign and your 8-agent AI team will run it end-to-end.
        </p>
      </div>

      {/* Campaign cards */}
      {!selectedCampaign && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 32 }}>
          {CAMPAIGNS.map((c) => (
            <div
              key={c.id}
              onClick={() => c.active && setSelectedCampaign(c.id)}
              style={{
                background: "white", border: "1.5px solid #e2e8f0", borderRadius: 16,
                padding: 22, cursor: c.active ? "pointer" : "default",
                opacity: c.active ? 1 : 0.6, position: "relative",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => c.active && ((e.currentTarget as HTMLDivElement).style.borderColor = c.color)}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0")}
            >
              {!c.active && (
                <div style={{ position: "absolute", top: 12, right: 12, fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#94a3b8", padding: "2px 8px", borderRadius: 4 }}>
                  Coming soon
                </div>
              )}
              <div style={{ width: 48, height: 48, borderRadius: 12, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14 }}>{c.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.color, marginBottom: 8 }}>Powered by {c.agent}</div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 12 }}>{c.desc}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>⏱ {c.time}</div>
              {c.active && (
                <div style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: c.color }}>
                  Run this campaign →
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Local Lead Blast form */}
      {selectedCampaign === "lead-blast" && !running && !result && (
        <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: 32, maxWidth: 560 }}>
          <button onClick={() => setSelectedCampaign(null)} style={{ fontSize: 13, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>
            ← Back to campaigns
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎯</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Local Lead Blast</div>
              <div style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>Atlas + Pulse + Aether + Vanguard</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>
              Your trade / service type *
            </label>
            <input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. HVAC, Plumbing, Cleaning, Roofing..."
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>
              Your city / area *
            </label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Atlanta GA, Dallas TX, Chicago IL..."
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {error && <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 16 }}>{error}</p>}

          <button
            onClick={runLeadBlast}
            style={{ width: "100%", padding: 14, background: "#6366f1", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Run Local Lead Blast →
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 10 }}>Takes ~30 seconds · All 7 agents will run</p>
        </div>
      )}

      {/* Loading state */}
      {running && (
        <div style={{ background: "#0f172a", borderRadius: 20, padding: 32, maxWidth: 560 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6366f1", marginBottom: 8 }}>Running campaign</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "white", marginBottom: 24 }}>Finding {industry} leads in {city}...</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: i < step ? "rgba(16,185,129,0.1)" : i === step ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${i < step ? "rgba(16,185,129,0.2)" : i === step ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < step ? "#10b981" : i === step ? "#6366f1" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>
                  {i < step ? "✓" : i === step ? "⟳" : ""}
                </div>
                <span style={{ fontSize: 13, color: i < step ? "#34d399" : i === step ? "#a5b4fc" : "rgba(255,255,255,0.35)" }}>{s}</span>
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
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                ✅ {result.totalFound} leads found in {city}
              </h2>
              <p style={{ fontSize: 14, color: "#10b981", fontWeight: 600, margin: 0 }}>
                💰 Estimated revenue opportunity: {result.revenueEstimate}/mo
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyLeads} style={{ padding: "9px 18px", background: "#6366f1", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Copy all leads
              </button>
              <button onClick={() => { setResult(null); setSelectedCampaign(null); }} style={{ padding: "9px 18px", background: "white", color: "#0f172a", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Run again
              </button>
            </div>
          </div>

          {result.topTip && (
            <div style={{ background: "#FFFBEB", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>⚡ Top tip: </span>
              <span style={{ fontSize: 13, color: "#92400e" }}>{result.topTip}</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {result.leads.map((lead, i) => (
              <div key={i} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#EEF2FF", color: "#6366f1", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{lead.businessName}</span>
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>{lead.contactName}</span>
                      <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 500 }}>{lead.phone}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#475569", margin: "0 0 6px", paddingLeft: 34 }}>{lead.need}</p>
                    <p style={{ fontSize: 13, color: "#0f172a", fontStyle: "italic", margin: 0, paddingLeft: 34 }}>
                      "{lead.openingLine}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
