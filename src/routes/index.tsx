import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lunavx — Get More Calls, Jobs & 5-Star Reviews. Automatically." },
      { name: "description", content: "The AI system that texts back missed calls in 60 seconds, gets you Google reviews after every job, and finds 30 new leads in your area — all on autopilot. Built for HVAC, plumbing, roofing, cleaning & landscaping." },
      { property: "og:title", content: "Lunavx — Stop Losing Jobs to Missed Calls" },
      { property: "og:description", content: "Text back every missed call in 60 seconds. Double your Google reviews. Find 30 new leads. All automated." },
    ],
  }),
  component: HomePage,
});

// ─── Data ─────────────────────────────────────────────────────────────────────

const TRADES = ["HVAC","Plumbing","Roofing","Cleaning","Landscaping","Electrical","Pest Control"];

const TESTIMONIALS = [
  {
    quote: "We were missing 6–8 calls a day while on jobs. Lunavx texts them back instantly. We booked 14 extra jobs in the first month — that's over $4,200 we would've lost.",
    name: "Marcus T.",
    role: "Owner",
    company: "Crystal Clean Services",
    trade: "Cleaning",
    result: "+$4,200 first month",
    avatar: "MT",
    stars: 5,
  },
  {
    quote: "Our Google reviews went from 31 to 147 in 90 days. We do nothing — it automatically texts customers after every job. Our phone rings way more now.",
    name: "Dana R.",
    role: "Owner",
    company: "Apex HVAC",
    trade: "HVAC",
    result: "31 → 147 reviews",
    avatar: "DR",
    stars: 5,
  },
  {
    quote: "I ran the Local Lead Blast for roofing in my area. Got 30 real leads with phone numbers and a message to send each one. Closed 3 jobs from it. Paid for itself 10 times over.",
    name: "Luis P.",
    role: "Owner",
    company: "Peak Roofing",
    trade: "Roofing",
    result: "3 jobs from 1 campaign",
    avatar: "LP",
    stars: 5,
  },
];

const FEATURES = [
  {
    icon: "📞",
    title: "Missed Call Text-Back",
    tagline: "Never lose a job to voicemail again",
    desc: "When you're on a roof, under a sink, or driving between jobs — Lunavx texts back every missed call within 60 seconds. AI handles the conversation and books the appointment.",
    stat: "62% of calls to small businesses go unanswered. Each one is a $200–$2,000 job walking out the door.",
    color: "#6366f1",
    bg: "#EEF2FF",
  },
  {
    icon: "⭐",
    title: "Reputation Autopilot",
    tagline: "Double your Google reviews in 90 days",
    desc: "After every job, we automatically text your customer a direct Google review link. When a bad review hits, we alert you instantly and write a professional response in 30 seconds.",
    stat: "Going from 3.8 → 4.5 stars increases calls by 30%. That's the difference between 10 and 13 jobs a week.",
    color: "#f59e0b",
    bg: "#FFFBEB",
  },
  {
    icon: "🎯",
    title: "Local Lead Blast",
    tagline: "30 new leads in your area — in 60 seconds",
    desc: "Tell us your trade and city. Our AI finds 30 real local businesses that need your service, with the owner's name, phone number, and a personalized opening line ready to send.",
    stat: "The average Lunavx user closes 2–4 jobs from their first Lead Blast. Average job value: $350–$1,800.",
    color: "#10b981",
    bg: "#ECFDF5",
  },
];

const FAQS = [
  {
    q: "Do I need to be tech-savvy to use this?",
    a: "Not at all. If you can send a text, you can use Lunavx. Setup takes under 5 minutes — just enter your trade, city, and phone number. We handle everything else.",
  },
  {
    q: "How fast will I see results?",
    a: "Most contractors see their first recovered lead within 24 hours of connecting their phone. Review requests start going out after your next job. Lead Blast results come in under 60 seconds.",
  },
  {
    q: "Does this work for my trade?",
    a: "Yes. Lunavx is built specifically for HVAC, plumbing, roofing, electrical, cleaning, landscaping, and pest control. The AI understands your trade, your customers, and your local market.",
  },
  {
    q: "Will it replace my current software?",
    a: "No — it works alongside whatever you already use. Most contractors use it alongside ServiceTitan, Jobber, or just their phone. No migration, no learning curve.",
  },
  {
    q: "What if I don't like it?",
    a: "You get 14 days free — no credit card required to start. If you upgrade and don't see results in your first 30 days, we'll refund every penny. Zero risk.",
  },
  {
    q: "How does the free audit work?",
    a: "Enter your website and Google Business Profile URL. In 60 seconds you get scored on Visibility, Reputation, Lead Capture, and Conversion — with 12 specific fixes ranked by revenue impact. It's free, takes 60 seconds, and you keep the report.",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function Stars({ n = 5 }: { n?: number }) {
  return <span style={{ color: "#f59e0b", fontSize: 14 }}>{"★".repeat(n)}</span>;
}

function Badge({ children, color = "#6366f1" }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color, background: color + "18", padding: "4px 12px", borderRadius: 20, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

function Btn({ children, href, variant = "primary", size = "md", style: extraStyle }: { children: React.ReactNode; href: string; variant?: "primary" | "outline" | "ghost"; size?: "md" | "lg"; style?: React.CSSProperties }) {
  const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, borderRadius: 12, cursor: "pointer", textDecoration: "none", transition: "all .15s", fontFamily: "inherit", border: "none" };
  const sizes = { md: { padding: "11px 22px", fontSize: 14 }, lg: { padding: "15px 32px", fontSize: 16 } };
  const variants = {
    primary: { background: "#6366f1", color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,.35)" },
    outline: { background: "transparent", color: "#0f172a", border: "2px solid #e2e8f0" },
    ghost: { background: "rgba(255,255,255,.08)", color: "#fff" },
  };
  return <Link to={href} style={{ ...base, ...sizes[size], ...variants[variant], ...extraStyle }}>{children}</Link>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function HomePage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [tradeTicker, setTradeTicker] = useState(0);
  const [annualToggle, setAnnualToggle] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTradeTicker(n => (n + 1) % TRADES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", WebkitFontSmoothing: "antialiased", background: "#f8fafc", color: "#0f172a", minHeight: "100vh" }}>

      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <div style={{ background: "#1e1b4b", color: "white", textAlign: "center", padding: "9px 16px", fontSize: 13, fontWeight: 500 }}>
        🔥 <strong>Limited:</strong> First 100 contractors get locked-in pricing — 47 spots left.{" "}
        <Link to="/audit" style={{ color: "#a5b4fc", textDecoration: "underline", fontWeight: 700 }}>Claim yours →</Link>
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{ background: "rgba(255,255,255,.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", gap: 8 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 20, color: "#0f172a", textDecoration: "none", letterSpacing: "-.02em", marginRight: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 2L15.5 5.5V12.5L9 16L2.5 12.5V5.5L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="9" r="2.5" fill="white"/></svg>
            </div>
            Lunavx
          </Link>
          <div style={{ display: "flex", gap: 2, flex: 1 }}>
            {[["#features","Features"],["#how-it-works","How It Works"],["#testimonials","Results"],["#pricing","Pricing"]].map(([href, label]) => (
              <a key={href} href={href} style={{ fontSize: 14, fontWeight: 500, color: "#475569", padding: "6px 12px", borderRadius: 8, textDecoration: "none" }}>{label}</a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link to="/auth" style={{ fontSize: 14, fontWeight: 500, color: "#475569", padding: "8px 14px", textDecoration: "none" }}>Sign in</Link>
            <Link to="/audit" style={{ fontSize: 14, fontWeight: 700, padding: "9px 20px", background: "#6366f1", color: "white", borderRadius: 10, textDecoration: "none", boxShadow: "0 2px 12px rgba(99,102,241,.3)" }}>
              Get Free Audit →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)", padding: "80px 24px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(99,102,241,.25) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
          <div style={{ marginBottom: 20 }}>
            <Badge color="#6366f1">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulse 2s infinite" }} />
              Built for {TRADES[tradeTicker]}
            </Badge>
          </div>

          <h1 style={{ fontSize: "clamp(32px, 6vw, 58px)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.08, color: "white", marginBottom: 20 }}>
            Stop Losing{" "}
            <span style={{ background: "linear-gradient(135deg, #818cf8, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>$2,000/Week</span>
            <br />
            to Missed Calls
          </h1>

          <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "rgba(255,255,255,.75)", lineHeight: 1.65, maxWidth: 580, margin: "0 auto 32px" }}>
            Lunavx texts back every missed call in <strong style={{ color: "white" }}>60 seconds</strong>, gets you 5-star reviews after every job, and finds 30 new leads in your area — all without you lifting a finger.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <Link to="/audit" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", background: "#6366f1", color: "white", borderRadius: 14, fontSize: 17, fontWeight: 800, textDecoration: "none", boxShadow: "0 8px 30px rgba(99,102,241,.5)", letterSpacing: "-.01em" }}>
              Get My Free Business Audit →
            </Link>
            <a href="#how-it-works" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 28px", background: "rgba(255,255,255,.08)", color: "white", borderRadius: 14, fontSize: 16, fontWeight: 600, textDecoration: "none", border: "1px solid rgba(255,255,255,.15)" }}>
              ▶ See How It Works
            </a>
          </div>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            Free forever · No credit card · 60 seconds
          </p>

          {/* Social proof strip */}
          <div style={{ display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap", marginTop: 48, padding: "20px 24px", background: "rgba(255,255,255,.05)", borderRadius: 16, border: "1px solid rgba(255,255,255,.08)" }}>
            {[
              { num: "500+", label: "Active contractors" },
              { num: "4.9★", label: "Average rating" },
              { num: "$2.4M", label: "Revenue recovered" },
              { num: "60s", label: "To text back calls" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "white", letterSpacing: "-.02em" }}>{s.num}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRADE TRUST BAR ──────────────────────────────────────────────── */}
      <section style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em" }}>Trusted by</span>
          {["🔧 HVAC","🚿 Plumbing","🏠 Roofing","✨ Cleaning","🌿 Landscaping","⚡ Electrical","🐛 Pest Control"].map(t => (
            <span key={t} style={{ fontSize: 14, fontWeight: 600, color: "#475569", padding: "5px 14px", background: "#f8fafc", borderRadius: 20, border: "1px solid #e2e8f0" }}>{t}</span>
          ))}
        </div>
      </section>

      {/* ── PAIN SECTION ─────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Badge color="#dc2626">Sound familiar?</Badge>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.025em", marginTop: 14, marginBottom: 12 }}>
              You're working 12-hour days and still<br />losing customers you've already earned
            </h2>
            <p style={{ fontSize: 17, color: "#475569", maxWidth: 520, margin: "0 auto" }}>
              Every one of these is costing you hundreds of dollars. Every single week.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {[
              { icon: "📵", pain: "Phone rings while you're on a job", cost: "Avg. missed job: $450" },
              { icon: "😶", pain: "Customers don't leave reviews even when they love you", cost: "Losing 30% of potential jobs" },
              { icon: "📋", pain: "Leads scattered across phone, Facebook, and voicemail", cost: "40% of leads go cold in 24 hrs" },
              { icon: "🕐", pain: "Following up with leads eats your whole evening", cost: "3–5 hrs/week of your time" },
              { icon: "🔍", pain: "Competitors with more reviews rank above you on Google", cost: "Invisible to new customers" },
              { icon: "💸", pain: "Paying for ads that go to a website that doesn't convert", cost: "Avg. wasted: $800/month" },
            ].map(p => (
              <div key={p.pain} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{p.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{p.pain}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>{p.cost}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <Badge color="#6366f1">The solution</Badge>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.025em", marginTop: 14, marginBottom: 12 }}>
              Three tools that pay for themselves<br />in the first week
            </h2>
            <p style={{ fontSize: 17, color: "#475569", maxWidth: 480, margin: "0 auto" }}>
              No setup fees. No tech skills. No training. Just more booked jobs.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {FEATURES.map((f, idx) => (
              <div key={f.title} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", direction: idx % 2 === 1 ? "rtl" : "ltr" }}>
                <div style={{ direction: "ltr" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: f.color, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{f.tagline}</div>
                  <h3 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", marginBottom: 14 }}>{f.title}</h3>
                  <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>{f.desc}</p>
                  <div style={{ background: f.bg, border: `1px solid ${f.color}25`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: f.color, fontWeight: 600, lineHeight: 1.5 }}>
                    💡 {f.stat}
                  </div>
                </div>
                <div style={{ direction: "ltr" }}>
                  {/* Feature visual card */}
                  <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", borderRadius: 20, padding: 28, border: "1px solid rgba(99,102,241,.2)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: f.color, marginBottom: 16 }}>
                      Live example
                    </div>
                    {idx === 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "rgba(255,255,255,.6)" }}>📵 Missed call from (571) 555-0182</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", textAlign: "center" }}>Lunavx responds in 47 seconds</div>
                        <div style={{ background: "rgba(99,102,241,.2)", borderRadius: 12, padding: "12px 14px", fontSize: 13, color: "#a5b4fc" }}>
                          💬 "Hi! This is Peak HVAC. Sorry we missed you — we're on a call right now. What do you need help with? Reply and we'll get you booked today!"
                        </div>
                        <div style={{ background: "rgba(16,185,129,.1)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#34d399" }}>
                          ✅ Reply: "AC unit not cooling. Can come tomorrow?"
                        </div>
                        <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600, textAlign: "center" }}>Job booked. $380 revenue saved.</div>
                      </div>
                    )}
                    {idx === 1 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ background: "rgba(255,255,255,.05)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "rgba(255,255,255,.6)" }}>✅ Job completed for Sarah M.</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", textAlign: "center" }}>Lunavx sends review request 2 hours later</div>
                        <div style={{ background: "rgba(245,158,11,.15)", borderRadius: 12, padding: "12px 14px", fontSize: 13, color: "#fbbf24" }}>
                          ⭐ "Hi Sarah! Thanks for choosing us for your AC tune-up. If we did a great job, a quick Google review means the world: [link] 🙏"
                        </div>
                        <div style={{ background: "rgba(16,185,129,.1)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#34d399" }}>
                          ★★★★★ New 5-star review received
                        </div>
                        <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600, textAlign: "center" }}>Review #89. Google ranking improved.</div>
                      </div>
                    )}
                    {idx === 2 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>Lead Blast results — Roofing · Atlanta GA</div>
                        {["Piedmont Coffee Roasters · 404-555-0110", "Midtown Gym & Fitness · 404-555-0234", "Buckhead Medical Spa · 404-555-0891"].map((l, i) => (
                          <div key={i} style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.15)", borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#34d399" }}>{l}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 3 }}>Opening: "Hi, noticed your building's roof is getting some age — we specialize in commercial flat roofs in Buckhead..."</div>
                          </div>
                        ))}
                        <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600, textAlign: "center" }}>+27 more leads. Generated in 34 seconds.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
          <Badge color="#6366f1">Setup takes 5 minutes</Badge>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.025em", marginTop: 14, marginBottom: 12 }}>
            Set it up once. It works forever.
          </h2>
          <p style={{ fontSize: 17, color: "#475569", marginBottom: 52 }}>No IT team. No training. No ongoing work from you.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 48 }}>
            {[
              { step: "01", icon: "🔗", title: "Connect in 5 minutes", desc: "Add your phone number and Google Business Profile link. That's it. No installs, no code, no tech skills." },
              { step: "02", icon: "🤖", title: "AI works 24/7 for you", desc: "Missed calls get texted back. Reviews get requested. Leads get found. All automatically, day and night." },
              { step: "03", icon: "💰", title: "Open inbox to booked jobs", desc: "Wake up to new conversations, confirmed appointments, and fresh 5-star reviews you didn't have to ask for." },
            ].map(s => (
              <div key={s.step} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: 28, textAlign: "center", position: "relative" }}>
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#6366f1", color: "white", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 20 }}>{s.step}</div>
                <div style={{ fontSize: 36, marginBottom: 14, marginTop: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { num: "+38%", label: "more booked jobs in 60 days" },
              { num: "4.9★", label: "average Google rating" },
              { num: "<60s", label: "to reply to missed calls" },
              { num: "$2k–$8k", label: "recovered revenue/month" },
            ].map(s => (
              <div key={s.label} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#6366f1", letterSpacing: "-.02em" }}>{s.num}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <Badge color="#10b981">Real results</Badge>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.025em", marginTop: 14, marginBottom: 12 }}>
              Contractors who use Lunavx<br />make more money. Full stop.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#ECFDF5", border: "1px solid rgba(16,185,129,.2)", borderRadius: 8, padding: "6px 12px", width: "fit-content" }}>
                  <span style={{ fontSize: 18 }}>💰</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>{t.result}</span>
                </div>
                <Stars />
                <p style={{ fontSize: 15, color: "#0f172a", lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>"{t.quote}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#6366f1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{t.role}, {t.company}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, background: "#EEF2FF", color: "#6366f1", padding: "2px 8px", borderRadius: 4 }}>{t.trade}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ───────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800, letterSpacing: "-.025em" }}>
              What changes when you use Lunavx
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: "white", border: "1.5px solid #fecaca", borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626", marginBottom: 20 }}>❌ Without Lunavx</div>
              {["Missed call = lost $400 job","Customers forget to leave reviews","Leads scattered across 5 places","Evenings spent chasing follow-ups","Competitors outrank you on Google","Paying for ads that don't convert"].map(i => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, fontSize: 14, color: "#475569" }}>
                  <span style={{ color: "#dc2626", flexShrink: 0 }}>✕</span>{i}
                </div>
              ))}
            </div>
            <div style={{ background: "white", border: "1.5px solid rgba(16,185,129,.3)", borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#065f46", marginBottom: 20 }}>✅ With Lunavx</div>
              {["Every missed call texted back in 60s","Reviews arrive after every job, automatically","All leads in one simple inbox","AI books jobs while you sleep","More reviews = higher Google rank = more calls","Organic leads from the AI, no ad spend"].map(i => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12, fontSize: 14, color: "#475569" }}>
                  <span style={{ color: "#10b981", flexShrink: 0 }}>✓</span>{i}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "80px 24px", background: "white" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Badge color="#6366f1">Pricing</Badge>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: "-.025em", marginTop: 14, marginBottom: 12 }}>
              Pays for itself with one recovered job
            </h2>
            <p style={{ fontSize: 16, color: "#475569", maxWidth: 440, margin: "0 auto 24px" }}>
              Every plan includes a 14-day free trial. No credit card required.
            </p>
            {/* Toggle */}
            <div style={{ display: "inline-flex", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 10, padding: 3 }}>
              <button onClick={() => setAnnualToggle(false)} style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: !annualToggle ? "#6366f1" : "transparent", color: !annualToggle ? "white" : "#475569" }}>Monthly</button>
              <button onClick={() => setAnnualToggle(true)} style={{ padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", background: annualToggle ? "#6366f1" : "transparent", color: annualToggle ? "white" : "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                Annual <span style={{ fontSize: 11, fontWeight: 700, background: annualToggle ? "rgba(255,255,255,.2)" : "#ECFDF5", color: annualToggle ? "white" : "#065f46", padding: "2px 6px", borderRadius: 4 }}>Save 20%</span>
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              {
                name: "Starter", price: annualToggle ? 39 : 49, desc: "Solo operators getting their first jobs automated",
                features: ["Local Lead Blast (50 campaigns/mo)","Missed Call Text-Back","Basic review requests","500 lead lookups/month","Email support"],
                cta: "Start free trial", featured: false,
              },
              {
                name: "Growth", price: annualToggle ? 79 : 99, desc: "The complete AI team for businesses ready to scale",
                badge: "Most popular",
                features: ["Everything in Starter","Unlimited campaigns","Reputation Autopilot (full)","AI Review Response Generator","1,000 lead lookups/month","Competitor intelligence","Priority support"],
                cta: "Start free trial", featured: true,
              },
              {
                name: "Pro", price: annualToggle ? 159 : 199, desc: "Multi-location operators, franchises, and agencies",
                features: ["Everything in Growth","Unlimited everything","Multi-location + team seats","Custom AI agent training","Dedicated success manager","API access + SLA"],
                cta: "Start free trial", featured: false,
              },
            ].map(plan => (
              <div key={plan.name} style={{ background: "white", border: `${plan.featured ? "2px solid #6366f1" : "1.5px solid #e2e8f0"}`, borderRadius: 24, padding: 28, position: "relative", display: "flex", flexDirection: "column", boxShadow: plan.featured ? "0 0 0 6px rgba(99,102,241,.08)" : "none" }}>
                {"badge" in plan && plan.badge && (
                  <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#6366f1", color: "white", fontSize: 12, fontWeight: 700, padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap" }}>{plan.badge}</div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#94a3b8", marginBottom: 8 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>$</span>
                  <span style={{ fontSize: 46, fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: "#94a3b8" }}>/mo</span>
                </div>
                {annualToggle && <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600, marginBottom: 8 }}>Billed annually · save ${(plan.price === 39 ? 10 : plan.price === 79 ? 20 : 40) * 12}/yr</div>}
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 20 }}>{plan.desc}</p>
                <div style={{ height: 1, background: "#e2e8f0", marginBottom: 20 }} />
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "#475569", marginBottom: 10 }}>
                      <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#ECFDF5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/pricing" style={{ display: "block", width: "100%", padding: "13px", background: plan.featured ? "#6366f1" : "white", color: plan.featured ? "white" : "#0f172a", border: `1.5px solid ${plan.featured ? "#6366f1" : "#e2e8f0"}`, borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", textAlign: "center", boxSizing: "border-box", boxShadow: plan.featured ? "0 4px 16px rgba(99,102,241,.3)" : "none" }}>
                  {plan.cta} →
                </Link>
              </div>
            ))}
          </div>

          {/* Guarantee */}
          <div style={{ textAlign: "center", marginTop: 32, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🛡️</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>30-Day Money-Back Guarantee</div>
            <div style={{ fontSize: 14, color: "#475569", maxWidth: 480, margin: "0 auto" }}>
              If you don't recover at least one job worth more than your monthly fee in the first 30 days, we'll refund every penny. No questions asked.
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: "72px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, letterSpacing: "-.025em" }}>Common questions</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", fontSize: 15, fontWeight: 600, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", color: "#0f172a" }}>
                  {faq.q}
                  <span style={{ fontSize: 18, color: "#94a3b8", transform: faqOpen === i ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0, marginLeft: 12 }}>▾</span>
                </button>
                {faqOpen === i && (
                  <div style={{ padding: "0 20px 18px", fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={{ padding: "88px 24px", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(99,102,241,.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: "clamp(26px, 4.5vw, 42px)", fontWeight: 900, letterSpacing: "-.03em", color: "white", marginBottom: 14, lineHeight: 1.15 }}>
            Find out how many customers<br />you're losing right now — free
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,.65)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.6 }}>
            Run a free 60-second audit of your website and Google profile. Get your scores and 12 specific fixes — no credit card, no signup required.
          </p>
          <Link to="/audit" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 40px", background: "#6366f1", color: "white", borderRadius: 14, fontSize: 18, fontWeight: 800, textDecoration: "none", boxShadow: "0 8px 32px rgba(99,102,241,.45)", letterSpacing: "-.01em" }}>
            Get My Free Business Audit →
          </Link>
          <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,.35)" }}>
            Free forever · No credit card · 60 seconds · Keep the report
          </p>

          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginTop: 40 }}>
            {["🔒 Bank-grade security","⚡ Setup in 5 minutes","📈 Results in week 1","💳 No credit card to start"].map(t => (
              <span key={t} style={{ fontSize: 13, color: "rgba(255,255,255,.5)", fontWeight: 500 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0f172a", borderTop: "1px solid rgba(255,255,255,.06)", padding: "40px 24px 24px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M9 2L15.5 5.5V12.5L9 16L2.5 12.5V5.5L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="9" r="2.5" fill="white"/></svg>
                </div>
                <span style={{ fontWeight: 800, fontSize: 16, color: "white" }}>Lunavx</span>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.6, maxWidth: 260 }}>
                Your 24/7 AI business team. Built for local service businesses who want more customers without more hours.
              </p>
            </div>
            {[
              { title: "Product", links: [["Features","/#features"],["Pricing","/pricing"],["Free Audit","/audit"],["Sign In","/auth"]] },
              { title: "Company", links: [["About","/#about"],["Contact","/chat"]] },
              { title: "Legal", links: [["Privacy","/#privacy"],["Terms","/#terms"]] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "rgba(255,255,255,.3)", marginBottom: 12 }}>{col.title}</div>
                {col.links.map(([label, href]) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <Link to={href} style={{ fontSize: 13, color: "rgba(255,255,255,.5)", textDecoration: "none" }}>{label}</Link>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.25)" }}>© 2026 Lunavx. All rights reserved.</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.25)" }}>Built for the trades. Powered by AI.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
