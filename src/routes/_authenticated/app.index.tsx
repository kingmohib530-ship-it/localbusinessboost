import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/")({
  component: TodayDashboard,
});

interface Profile {
  full_name: string | null;
  business_name: string | null;
  industry: string | null;
  subscription_tier: string;
}

const QUICK_WINS = [
  {
    icon: "🎯",
    title: "Run Local Lead Blast",
    desc: "Find 30 qualified local leads in your area with personalized outreach — in 60 seconds.",
    action: "Run now →",
    href: "/app/agents",
    color: "#6366f1",
    bg: "#EEF2FF",
  },
  {
    icon: "⭐",
    title: "Generate Review Requests",
    desc: "Send review request messages to your last 5 customers and boost your Google rating.",
    action: "Generate →",
    href: "/app/agents",
    color: "#10b981",
    bg: "#ECFDF5",
  },
  {
    icon: "📊",
    title: "Check Your Audit Score",
    desc: "See exactly what's costing you customers and get 12 plain-English fixes.",
    action: "View audit →",
    href: "/audit",
    color: "#f59e0b",
    bg: "#FFFBEB",
  },
];

const STATS = [
  { label: "Campaigns run", value: "0", icon: "⚡" },
  { label: "Leads found", value: "0", icon: "🎯" },
  { label: "Reviews requested", value: "0", icon: "⭐" },
  { label: "Est. revenue", value: "$0", icon: "💰" },
];

function TodayDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("full_name, business_name, industry, subscription_tier")
          .eq("id", user.id)
          .single();
        setProfile(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const name = profile?.business_name || profile?.full_name || null;
  const isFree = !profile?.subscription_tier || profile?.subscription_tier === "free";

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6366f1", background: "#EEF2FF", padding: "4px 12px", borderRadius: 20, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", display: "inline-block", animation: "pulse 2s infinite" }} />
          Your AI team is online
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em", color: "#0f172a", margin: "0 0 6px" }}>
          {loading ? "Loading..." : name ? `Welcome back, ${name} 👋` : "Welcome to Lunavx 👋"}
        </h1>
        <p style={{ fontSize: 15, color: "#475569", margin: 0 }}>
          Pick a quick win below and your AI team will handle the rest.
        </p>
      </div>

      {/* Upgrade banner for free users */}
      {isFree && !loading && (
        <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderRadius: 16, padding: "16px 20px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 2 }}>🚀 You're on the Free plan</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Upgrade to run unlimited campaigns and unlock all 8 AI agents.</div>
          </div>
          <Link to="/pricing" style={{ padding: "9px 20px", background: "#6366f1", color: "white", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
            Upgrade now →
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {STATS.map((s) => (
          <div key={s.label} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "#0f172a", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick wins */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>⚡ Quick wins — pick one to start</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {QUICK_WINS.map((w) => (
          <div key={w.title} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 10, transition: "border-color 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = w.color; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px rgba(0,0,0,0.08)`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: w.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{w.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 5 }}>{w.title}</div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>{w.desc}</div>
            </div>
            <Link to={w.href} style={{ fontSize: 14, fontWeight: 600, color: w.color, textDecoration: "none", marginTop: "auto" }}>
              {w.action}
            </Link>
          </div>
        ))}
      </div>

      {/* This week */}
      <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>📅 This week</h2>
        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Run your first campaign to see activity here.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/app/agents" style={{ padding: "10px 20px", background: "#6366f1", color: "white", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            Start a campaign →
          </Link>
          <Link to="/audit" style={{ padding: "10px 20px", background: "white", color: "#0f172a", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", border: "1.5px solid #e2e8f0" }}>
            Run free audit
          </Link>
        </div>
      </div>
    </div>
  );
}
