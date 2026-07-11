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

interface Competitor {
  name: string;
  strength: string;
  weakness: string;
}

interface CompetitorResult {
  competitors: Competitor[];
  opportunities: string[];
  insights: string[];
}

interface ForgeEmailTemplate {
  name: string;
  subject: string;
  body: string;
}

interface ForgeSmsTemplate {
  name: string;
  body: string;
}

interface ForgeNextAction {
  title: string;
  owner?: string;
  eta?: string;
  why?: string;
}

interface BookingPlanResult {
  trigger: string;
  steps: { action: string; details: string }[];
  kpis?: string[];
  estimatedRoi?: string;
  emailTemplates?: ForgeEmailTemplate[];
  smsTemplates?: ForgeSmsTemplate[];
  nextActions?: ForgeNextAction[];
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
    agent: "Pulse",
    desc: "Write a professional, personalized response to any customer review in seconds.",
    time: "~10 seconds",
    color: "#34d399",
    bg: "rgba(16,185,129,0.15)",
    active: true,
  },
  {
    id: "booking-booster",
    icon: "📅",
    name: "Booking Booster",
    agent: "Forge",
    desc: "Get a ready-to-use follow-up and booking plan to win back no-shows and fill your calendar.",
    time: "~30 seconds",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.15)",
    active: true,
  },
  {
    id: "competitor-intel",
    icon: "🔍",
    name: "Competitor Intelligence",
    agent: "Nexus",
    desc: "Analyse your top local competitors and find the gaps you can win.",
    time: "~20 seconds",
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.15)",
    active: true,
  },
];

const STEPS_BY_CAMPAIGN: Record<string, string[]> = {
  "lead-blast": [
    "Orbis planning workflow...",
    "Atlas scanning your area...",
    "Nexus enriching with market data...",
    "Pulse writing personalized outreach...",
    "Shield reviewing quality...",
    "Aether calculating revenue projection...",
    "Vanguard preparing your checklist...",
  ],
  "competitor-intel": [
    "Nexus scanning your local market...",
    "Nexus profiling competitor archetypes...",
    "Nexus surfacing opportunities...",
    "Nexus synthesizing sharp insights...",
  ],
  "review-recovery": [
    "Pulse reading the review...",
    "Pulse drafting a personalized response...",
    "Pulse polishing tone and phrasing...",
  ],
  "booking-booster": [
    "Forge designing the follow-up flow...",
    "Forge writing email + SMS templates...",
    "Forge setting up booking + reminders...",
    "Forge projecting revenue impact...",
  ],
};

function AgentsHub() {
  const [selected, setSelected] = useState<string | null>(null);
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [leadResult, setLeadResult] = useState<LeadResult | null>(null);
  const [competitorResult, setCompetitorResult] = useState<CompetitorResult | null>(null);
  const [error, setError] = useState("");

  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [starRating, setStarRating] = useState(5);
  const [reviewResponse, setReviewResponse] = useState<string | null>(null);

  const [bookingPlan, setBookingPlan] = useState<BookingPlanResult | null>(null);

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

  const campaign = CAMPAIGNS.find((c) => c.id === selected);
  const steps = STEPS_BY_CAMPAIGN[selected ?? ""] ?? [];

  async function runCampaign() {
    if (!industry.trim() || !city.trim()) {
      setError("Please enter your trade type and city.");
      return;
    }
    const endpoint =
      selected === "competitor-intel" ? "/api/competitor-intel" :
      selected === "booking-booster" ? "/api/booking-plan" :
      "/api/lead-blast";

    setError("");
    setRunning(true);
    setLeadResult(null);
    setCompetitorResult(null);
    setReviewResponse(null);
    setBookingPlan(null);
    setStep(0);

    const timer = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1400);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        clearInterval(timer);
        setError("Please sign in again and retry.");
        setRunning(false);
        return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ industry: industry.trim(), city: city.trim() }),
      });

      const data = await res.json();
      clearInterval(timer);
      setStep(steps.length);

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (selected === "competitor-intel") {
        setCompetitorResult(data);
      } else if (selected === "booking-booster") {
        setBookingPlan(data);
      } else {
        setLeadResult(data);
      }
    } catch (err) {
      clearInterval(timer);
      setError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  async function runReviewRecovery() {
    if (!reviewText.trim()) {
      setError("Please paste the review text.");
      return;
    }

    setError("");
    setRunning(true);
    setLeadResult(null);
    setCompetitorResult(null);
    setReviewResponse(null);
    setBookingPlan(null);
    setStep(0);

    const timer = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 1400);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        clearInterval(timer);
        setError("Please sign in again and retry.");
        setRunning(false);
        return;
      }

      const res = await fetch("/api/review-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewText: reviewText.trim(),
          reviewerName: reviewerName.trim(),
          starRating,
        }),
      });

      const data = await res.json();
      clearInterval(timer);
      setStep(steps.length);

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setReviewResponse(data.response);
    } catch (err) {
      clearInterval(timer);
      setError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  }

  function copyLeads() {
    if (!leadResult) return;
    const text = leadResult.leads
      .map((l, i) => `${i + 1}. ${l.businessName}\n   ${l.contactName} | ${l.phone}\n   Need: ${l.need}\n   Opening: "${l.openingLine}"\n`)
      .join("\n");
    navigator.clipboard.writeText(text);
    alert("✅ Copied to clipboard!");
  }

  function copyCompetitorIntel() {
    if (!competitorResult) return;
    const lines: string[] = [];
    lines.push("COMPETITORS");
    competitorResult.competitors.forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}\n   Strength: ${c.strength}\n   Weakness: ${c.weakness}`);
    });
    lines.push("", "OPPORTUNITIES");
    competitorResult.opportunities.forEach((o, i) => lines.push(`${i + 1}. ${o}`));
    lines.push("", "INSIGHTS");
    competitorResult.insights.forEach((n, i) => lines.push(`${i + 1}. ${n}`));
    navigator.clipboard.writeText(lines.join("\n"));
    alert("✅ Copied to clipboard!");
  }

  function copyReviewResponse() {
    if (!reviewResponse) return;
    navigator.clipboard.writeText(reviewResponse);
    alert("✅ Response copied to clipboard!");
  }

  function copyBookingPlan() {
    if (!bookingPlan) return;
    const lines: string[] = [];
    lines.push(`TRIGGER\n${bookingPlan.trigger}`);
    if (bookingPlan.estimatedRoi) lines.push("", `ESTIMATED ROI\n${bookingPlan.estimatedRoi}`);
    lines.push("", "FOLLOW-UP FLOW");
    bookingPlan.steps.forEach((s, i) => lines.push(`${i + 1}. ${s.action} — ${s.details}`));
    if (bookingPlan.emailTemplates?.length) {
      lines.push("", "EMAIL TEMPLATES");
      bookingPlan.emailTemplates.forEach(t => lines.push(`- ${t.name}\n  Subject: ${t.subject}\n  ${t.body}`));
    }
    if (bookingPlan.smsTemplates?.length) {
      lines.push("", "SMS TEMPLATES");
      bookingPlan.smsTemplates.forEach(t => lines.push(`- ${t.name}: ${t.body}`));
    }
    if (bookingPlan.kpis?.length) {
      lines.push("", "KPIS");
      bookingPlan.kpis.forEach(k => lines.push(`- ${k}`));
    }
    if (bookingPlan.nextActions?.length) {
      lines.push("", "NEXT ACTIONS");
      bookingPlan.nextActions.forEach((a, i) => lines.push(`${i + 1}. ${a.title}${a.eta ? ` (${a.eta})` : ""}`));
    }
    navigator.clipboard.writeText(lines.join("\n"));
    alert("✅ Plan copied to clipboard!");
  }

  const hasResult = !!leadResult || !!competitorResult || !!reviewResponse || !!bookingPlan;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: "0 0 6px" }}>🤖 Agents Hub</h1>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>Pick a campaign and your AI team will run it end-to-end.</p>
      </div>

      {/* Grid */}
      {!selected && !running && !hasResult && (
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

      {/* Form: Local Lead Blast */}
      {selected === "lead-blast" && !running && !hasResult && (
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

      {/* Form: Competitor Intelligence */}
      {selected === "competitor-intel" && !running && !hasResult && (
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 520 }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>← Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(139,92,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔍</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)" }}>Competitor Intelligence</div>
              <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>Nexus</div>
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
            style={{ width: "100%", padding: 13, background: "#a78bfa", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Run Competitor Intelligence →
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", marginTop: 10 }}>~20 seconds · Nexus market analysis</p>
        </div>
      )}

      {/* Form: Booking Booster */}
      {selected === "booking-booster" && !running && !hasResult && (
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 520 }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>← Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📅</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)" }}>Booking Booster</div>
              <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>Forge</div>
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
            style={{ width: "100%", padding: 13, background: "#fbbf24", color: "#1a1200", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Run Booking Booster →
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", marginTop: 10 }}>~30 seconds · Forge builds the plan</p>
        </div>
      )}

      {/* Form: Review Recovery */}
      {selected === "review-recovery" && !running && !hasResult && (
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 520 }}>
          <button onClick={() => setSelected(null)} style={{ fontSize: 13, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", marginBottom: 20, padding: 0 }}>← Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⭐</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)" }}>Review Recovery</div>
              <div style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>Pulse</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Star rating</label>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <span key={n} onClick={() => setStarRating(n)}
                  style={{ fontSize: 24, cursor: "pointer", color: n <= starRating ? "#fbbf24" : "var(--border)" }}>★</span>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Reviewer name</label>
            <input value={reviewerName} onChange={e => setReviewerName(e.target.value)}
              placeholder="e.g. Sarah M."
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "var(--foreground)", background: "var(--input)", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Review text *</label>
            <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
              placeholder="Paste the review here..."
              rows={4}
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: "var(--foreground)", background: "var(--input)", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
          </div>
          {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 14 }}>{error}</p>}
          <button onClick={runReviewRecovery}
            style={{ width: "100%", padding: 13, background: "#34d399", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Run Review Recovery →
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", marginTop: 10 }}>~10 seconds · Pulse writes the response</p>
        </div>
      )}

      {/* Loading */}
      {running && (
        <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 520 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: campaign?.color ?? "#818cf8", marginBottom: 8 }}>Running campaign</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: "var(--foreground)", marginBottom: 24 }}>
            {selected === "review-recovery"
              ? "Writing your response..."
              : selected === "competitor-intel"
              ? `Analyzing ${industry} competitors in ${city}...`
              : selected === "booking-booster"
              ? `Building a booking system for ${industry} in ${city}...`
              : `Finding ${industry} leads in ${city}...`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {steps.map((s, i) => (
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

      {/* Results: Local Lead Blast */}
      {leadResult && !running && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>✅ {leadResult.leads.length} leads found in {city}</h2>
              <p style={{ fontSize: 14, color: "#34d399", fontWeight: 600, margin: 0 }}>💰 Revenue opportunity: {leadResult.revenueEstimate}/mo</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyLeads} style={{ padding: "9px 18px", background: "#6366f1", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Copy all leads</button>
              <button onClick={() => { setLeadResult(null); setSelected(null); }} style={{ padding: "9px 18px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>New campaign</button>
            </div>
          </div>
          {leadResult.topTip && (
            <div style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "11px 16px", marginBottom: 18 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>⚡ Top tip: </span>
              <span style={{ fontSize: 13, color: "#fde68a" }}>{leadResult.topTip}</span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leadResult.leads.map((lead, i) => (
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

      {/* Results: Competitor Intelligence */}
      {competitorResult && !running && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>🔍 Market analysis for {industry} in {city}</h2>
              <p style={{ fontSize: 14, color: "#a78bfa", fontWeight: 600, margin: 0 }}>{competitorResult.competitors.length} competitor archetypes · {competitorResult.opportunities.length} opportunities</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyCompetitorIntel} style={{ padding: "9px 18px", background: "#a78bfa", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Copy full report</button>
              <button onClick={() => { setCompetitorResult(null); setSelected(null); }} style={{ padding: "9px 18px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>New campaign</button>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 8, marginTop: 4 }}>These are plausible competitor archetypes for your market, not named real businesses.</div>

          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "18px 0 10px" }}>Competitor archetypes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {competitorResult.competitors.map((c, i) => (
              <div key={i} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>{c.name}</div>
                <p style={{ fontSize: 13, color: "#34d399", margin: "0 0 4px" }}><strong>Strength:</strong> {c.strength}</p>
                <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}><strong>Weakness:</strong> {c.weakness}</p>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "18px 0 10px" }}>Opportunities</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {competitorResult.opportunities.map((o, i) => (
              <div key={i} style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--foreground)" }}>{o}</div>
            ))}
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "18px 0 10px" }}>Sharp insights</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {competitorResult.insights.map((n, i) => (
              <div key={i} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--muted-foreground)" }}>{n}</div>
            ))}
          </div>
        </div>
      )}

      {/* Results: Review Recovery */}
      {reviewResponse && !running && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>✅ Response ready</h2>
              <p style={{ fontSize: 14, color: "#34d399", fontWeight: 600, margin: 0 }}>For {reviewerName || "this reviewer"} · {starRating}★ review</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyReviewResponse} style={{ padding: "9px 18px", background: "#34d399", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Copy response</button>
              <button onClick={() => { setReviewResponse(null); setSelected(null); setReviewText(""); setReviewerName(""); }} style={{ padding: "9px 18px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>New campaign</button>
            </div>
          </div>
          <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>{reviewResponse}</p>
          </div>
        </div>
      )}

      {/* Results: Booking Booster */}
      {bookingPlan && !running && (
        <div style={{ maxWidth: 760 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", margin: "0 0 4px" }}>📅 Booking plan for {industry} in {city}</h2>
              {bookingPlan.estimatedRoi && <p style={{ fontSize: 14, color: "#fbbf24", fontWeight: 600, margin: 0 }}>{bookingPlan.estimatedRoi}</p>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyBookingPlan} style={{ padding: "9px 18px", background: "#fbbf24", color: "#1a1200", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Copy full plan</button>
              <button onClick={() => { setBookingPlan(null); setSelected(null); }} style={{ padding: "9px 18px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>New campaign</button>
            </div>
          </div>

          {bookingPlan.trigger && (
            <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "11px 16px", marginBottom: 20, fontSize: 13, color: "var(--foreground)" }}>
              <strong>Trigger:</strong> {bookingPlan.trigger}
            </div>
          )}

          {bookingPlan.kpis && bookingPlan.kpis.length > 0 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 10px" }}>Target KPIs</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {bookingPlan.kpis.map((k, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 100, padding: "5px 12px" }}>{k}</span>
                ))}
              </div>
            </>
          )}

          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 10px" }}>Follow-up flow</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {bookingPlan.steps.map((s, i) => (
              <div key={i} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "14px 18px", display: "flex", gap: 12 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 3 }}>{s.action}</div>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>{s.details}</p>
                </div>
              </div>
            ))}
          </div>

          {bookingPlan.emailTemplates && bookingPlan.emailTemplates.length > 0 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 10px" }}>Email templates</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {bookingPlan.emailTemplates.map((t, i) => (
                  <div key={i} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "14px 18px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: "#fbbf24", marginBottom: 6 }}>Subject: {t.subject}</div>
                    <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0, whiteSpace: "pre-wrap" }}>{t.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {bookingPlan.smsTemplates && bookingPlan.smsTemplates.length > 0 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 10px" }}>SMS templates</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {bookingPlan.smsTemplates.map((t, i) => (
                  <div key={i} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                    <strong style={{ color: "var(--foreground)" }}>{t.name}:</strong> <span style={{ color: "var(--muted-foreground)" }}>{t.body}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {bookingPlan.nextActions && bookingPlan.nextActions.length > 0 && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: "0 0 10px" }}>Week 1 action plan</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
                {bookingPlan.nextActions.map((a, i) => (
                  <div key={i} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                      {a.title}
                      {a.eta && <span style={{ fontWeight: 500, color: "var(--muted-foreground)" }}> · {a.eta}</span>}
                    </div>
                    {a.why && <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "3px 0 0" }}>{a.why}</p>}
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 12 }}>
            This plan gives you ready-to-use copy and setup steps. Automatically sending texts and emails on a schedule isn't wired up yet — for now, copy these templates and use them manually.
          </div>
        </div>
      )}
    </div>
  );
}
