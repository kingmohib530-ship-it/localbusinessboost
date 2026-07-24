import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, Calendar, Star, Target, TrendingUp, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/")({
  component: TodayDashboard,
});

interface Profile {
  full_name: string | null;
  business_name: string | null;
  industry: string | null;
  subscription_tier: string | null;
  verification_status: string | null;
}

interface ActivityRow {
  id: string;
  type: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface MissedCallRow {
  status: string | null;
  called_at: string | null;
}

interface SmsConversationRow {
  missed_call_id: string | null;
  sent_at: string | null;
}

interface ReviewResponseRow {
  star_rating: number | null;
  created_at: string | null;
}

interface AppointmentRevenueRow {
  estimated_value: number | null;
  created_at: string | null;
  source: string;
  status: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const QUICK_WINS = [
  {
    Icon: Target,
    title: "Run the Lead Generator",
    desc: "Build a complete intelligence profile on up to 50 local prospects with personalized outreach.",
    action: "Run now →",
    href: "/app/agents",
  },
  {
    Icon: Star,
    title: "Send review requests",
    desc: "Text your last few customers a review request and boost your Google rating.",
    action: "Send requests →",
    href: "/app/reputation",
  },
  {
    Icon: TrendingUp,
    title: "Check your audit score",
    desc: "See exactly what's costing you customers and get 12 plain-English fixes.",
    action: "View audit →",
    href: "/audit",
  },
];

function TodayDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [missedCalls, setMissedCalls] = useState<MissedCallRow[]>([]);
  const [conversations, setConversations] = useState<SmsConversationRow[]>([]);
  const [reviewResponses, setReviewResponses] = useState<ReviewResponseRow[]>([]);
  const [revenueAppointments, setRevenueAppointments] = useState<AppointmentRevenueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [
          { data: profileData },
          { data: activityData },
          { data: missedCallData },
          { data: conversationData },
          { data: reviewResponseData },
          { data: appointmentRevenueData },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, business_name, industry, subscription_tier, verification_status")
            .eq("id", user.id)
            .single(),
          supabase
            .from("activity_log")
            .select("id, type, summary, metadata, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("missed_calls")
            .select("status, called_at")
            .eq("user_id", user.id),
          supabase
            .from("sms_conversations")
            .select("missed_call_id, sent_at")
            .eq("user_id", user.id),
          supabase
            .from("review_responses")
            .select("star_rating, created_at")
            .eq("user_id", user.id),
          supabase
            .from("appointments")
            .select("estimated_value, created_at, source, status")
            .eq("user_id", user.id)
            .eq("source", "inbound_sms")
            .neq("status", "cancelled"),
        ]);
        setProfile(profileData);
        setActivity((activityData as ActivityRow[]) ?? []);
        setMissedCalls((missedCallData as MissedCallRow[]) ?? []);
        setConversations((conversationData as SmsConversationRow[]) ?? []);
        setReviewResponses((reviewResponseData as ReviewResponseRow[]) ?? []);
        setRevenueAppointments((appointmentRevenueData as AppointmentRevenueRow[]) ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const name = profile?.business_name || profile?.full_name || null;
  const isFree = !profile?.subscription_tier || profile?.subscription_tier === "starter";

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const inThisMonth = (iso: string | null) => !!iso && new Date(iso) >= monthStart;

  const missedCallsThisMonth = missedCalls.filter((c) => inThisMonth(c.called_at));
  const appointmentsBooked = missedCallsThisMonth.filter((c) => c.status === "booked").length;
  const respondedCount = missedCallsThisMonth.filter((c) => c.status === "replied" || c.status === "booked").length;
  const responseRate = missedCallsThisMonth.length > 0
    ? Math.round((respondedCount / missedCallsThisMonth.length) * 100)
    : null;

  const reviewsThisMonth = reviewResponses.filter((r) => inThisMonth(r.created_at));
  const newReviewsGained = reviewsThisMonth.length;
  const ratedReviews = reviewsThisMonth.filter((r) => typeof r.star_rating === "number");
  const avgStars = ratedReviews.length > 0
    ? (ratedReviews.reduce((sum, r) => sum + (r.star_rating ?? 0), 0) / ratedReviews.length).toFixed(1)
    : null;

  const leadBlastThisMonth = activity.filter((a) => a.type === "lead_blast" && inThisMonth(a.created_at));
  const outboundLeadsSent = leadBlastThisMonth.reduce((sum, a) => sum + (Number(a.metadata?.leadCount) || 0), 0);

  const conversationsThisMonth = conversations.filter((c) => inThisMonth(c.sent_at));
  const conversationsHandled = new Set(
    conversationsThisMonth.map((c) => c.missed_call_id).filter((id): id is string => !!id)
  ).size;

  const revenueThisMonth = revenueAppointments
    .filter((a) => inThisMonth(a.created_at))
    .reduce((sum, a) => sum + (a.estimated_value || 0), 0);

  const stats = [
    {
      label: "Revenue recovered this month",
      value: `$${revenueThisMonth.toLocaleString()}`,
      note: revenueThisMonth === 0 ? "Book your first appointment to see revenue here." : undefined,
      Icon: DollarSign,
    },
    {
      label: "Appointments booked",
      value: String(appointmentsBooked),
      Icon: Calendar,
    },
    {
      label: "New reviews gained",
      value: String(newReviewsGained),
      note: avgStars ? `${avgStars}★ average` : undefined,
      Icon: Star,
    },
    {
      label: "Outbound leads sent",
      value: String(outboundLeadsSent),
      Icon: Target,
    },
    {
      label: "Response rate",
      value: responseRate === null ? "—" : `${responseRate}%`,
      Icon: TrendingUp,
    },
    {
      label: "Conversations handled",
      value: String(conversationsHandled),
      Icon: MessageSquare,
    },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter, -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: "0 0 6px" }}>
          {loading ? "Loading..." : name ? `Welcome back, ${name}` : "Welcome to Lanavix"}
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
          Here's how your business is performing this month.
        </p>
      </div>

      {/* Upgrade banner for free users */}
      {isFree && !loading && (
        <div style={{ background: "var(--accent)", borderRadius: 16, padding: "16px 20px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 2 }}>You don't have an active plan yet</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Subscribe to unlock the receptionist, review automation, and Local Lead Blast.</div>
          </div>
          <Link to="/pricing" style={{ padding: "9px 20px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
            Upgrade now →
          </Link>
        </div>
      )}

      {/* Verification banner */}
      {!loading && profile?.verification_status === "unverified" && (
        <div style={{ background: "var(--accent)", borderRadius: 16, padding: "16px 20px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 2 }}>Get verified</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Earn a trust badge and unlock the consumer marketplace — takes about 5 minutes.</div>
          </div>
          <Link to="/app/verification" style={{ padding: "9px 20px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
            Get verified →
          </Link>
        </div>
      )}
      {!loading && profile?.verification_status === "pending" && (
        <div style={{ background: "var(--elevated)", borderRadius: 16, padding: "16px 20px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, border: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 2 }}>Verification in review</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>We're reviewing your documents — usually within 1–2 business days.</div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <s.Icon size={16} color="var(--primary)" strokeWidth={1.75} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--foreground)", lineHeight: 1 }}>{loading ? "—" : s.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{s.label}</div>
            {s.note && <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{s.note}</div>}
          </div>
        ))}
      </div>

      {/* Quick wins */}
      <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", marginBottom: 14 }}>Quick wins — pick one to start</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {QUICK_WINS.map((w) => (
          <div key={w.title} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <w.Icon size={18} color="var(--primary)" strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 5 }}>{w.title}</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{w.desc}</div>
            </div>
            <Link to={w.href} style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", textDecoration: "none", marginTop: "auto" }}>
              {w.action}
            </Link>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Recent activity</h2>
        {!loading && activity.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>Run your first campaign to see activity here.</p>
        )}
        {activity.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {activity.slice(0, 8).map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span style={{ color: "var(--foreground)" }}>{a.summary}</span>
                <span style={{ color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/app/agents" style={{ padding: "10px 20px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            Start a campaign →
          </Link>
          <Link to="/audit" style={{ padding: "10px 20px", background: "var(--card)", color: "var(--foreground)", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", border: "1.5px solid var(--border)" }}>
            Run free audit
          </Link>
        </div>
      </div>
    </div>
  );
}
