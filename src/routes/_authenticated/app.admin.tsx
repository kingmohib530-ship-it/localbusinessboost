import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Users, Target, Star, DollarSign, Database, Rocket, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAdmin } from "@/lib/admin";
import { GlowPanel } from "@/components/GlowPanel";
import { useMountReveal } from "@/hooks/use-mount-reveal";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export const Route = createFileRoute("/_authenticated/app/admin")({
  component: AdminDashboard,
});

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  full_name: string | null;
  business_name: string | null;
  industry: string | null;
  city: string | null;
  subscription_tier: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

function AdminDashboard() {
  const allowed = useRequireAdmin();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [totalAudits, setTotalAudits] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const { step, delay } = useMountReveal();

  useEffect(() => {
    if (!allowed) return;
    async function load() {
      setLoadError("");
      // Load profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, business_name, industry, city, subscription_tier")
        .order("id");

      // Load auth users via admin — fallback to profiles only
      // We'll join what we can from profiles + use created_at trick
      const { data: leads, error: leadsError } = await supabase.from("lead_profiles").select("id");
      const { data: reviews, error: reviewsError } = await supabase.from("review_requests").select("id");

      if (profilesError || leadsError || reviewsError) {
        console.error("[admin] failed to load data", profilesError || leadsError || reviewsError);
        setLoadError("Couldn't load platform data. Please refresh the page.");
      }

      setTotalLeads(leads?.length ?? 0);
      setTotalReviews(reviews?.length ?? 0);

      // Build user rows from profiles (no email — Supabase client can't read auth.users)
      const rows: UserRow[] = (profiles ?? []).map((p: any) => ({
        id: p.id,
        email: "—",
        created_at: "",
        last_sign_in_at: "",
        full_name: p.full_name,
        business_name: p.business_name,
        industry: p.industry,
        city: p.city,
        subscription_tier: p.subscription_tier,
      }));
      setUsers(rows);
      setLoading(false);
    }
    load();
  }, [allowed]);

  if (!allowed) return null;

  const stats = [
    { label: "Total users", value: users.length, Icon: Users },
    { label: "Leads generated", value: totalLeads, Icon: Target },
    { label: "Review requests", value: totalReviews, Icon: Star },
    { label: "Paying customers", value: users.filter(u => u.subscription_tier && u.subscription_tier !== "starter").length, Icon: DollarSign },
  ];

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>

      {/* Header */}
      <div className={step} style={{ marginBottom: 32, ...delay(0) }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--destructive)", background: "var(--accent)", padding: "4px 12px", borderRadius: 20, marginBottom: 12, border: "1px solid var(--border)" }}>
          <Lock size={12} strokeWidth={2} /> Admin only
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", margin: "0 0 6px" }}>
          Lanavix Admin
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: "0 0 14px" }}>
          Overview of all users and platform activity.
        </p>
        <Link to="/app/admin/verification-review" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          Review business verifications →
        </Link>
      </div>

      {loadError && <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 20 }}>{loadError}</p>}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <GlowPanel key={s.label} reducedMotion={reducedMotion} className={`${step} glass-dark hover-lift-dark rounded-2xl`} style={{ padding: "16px 18px", ...delay(i + 1) }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <s.Icon size={16} color="var(--primary)" strokeWidth={1.75} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--foreground)", lineHeight: 1 }}>{loading ? "—" : s.value}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{s.label}</div>
          </GlowPanel>
        ))}
      </div>

      {/* Users table */}
      <div className={`${step} glass-dark`} style={{ borderRadius: 16, overflow: "hidden", ...delay(5) }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>All users ({users.length})</h2>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)" }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: "48px 32px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Users size={26} color="var(--primary)" strokeWidth={1.75} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>No users yet</h3>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
              Once someone signs up for Lanavix, they'll show up here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["#", "Business", "Industry", "City", "Plan"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "var(--muted-foreground)", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--elevated)"}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{i + 1}</td>
                    <td style={{ padding: "12px 16px", color: "var(--foreground)", fontWeight: 600 }}>
                      {u.business_name || u.full_name || <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>No profile</span>}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{u.industry || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--muted-foreground)" }}>{u.city || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                        background: "var(--accent)",
                        color: u.subscription_tier && u.subscription_tier !== "starter" ? "var(--accent-2)" : "var(--muted-foreground)"
                      }}>
                        {u.subscription_tier || "starter"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 24 }}>
        {[
          { label: "Supabase dashboard", url: "https://supabase.com/dashboard/project/fnmmojfvxbdupzigcnyw", Icon: Database },
          { label: "Vercel deployments", url: "https://vercel.com/dashboard", Icon: Rocket },
          { label: "Anthropic usage", url: "https://console.anthropic.com/settings/billing", Icon: Bot },
        ].map((l, i) => (
          <GlowPanel key={l.label} reducedMotion={reducedMotion} className={`${step} glass-dark hover-lift-dark rounded-xl`} style={{ padding: "14px 16px", ...delay(i + 6) }}>
            <a href={l.url} target="_blank" rel="noreferrer"
              style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, color: "var(--foreground)", fontSize: 14, fontWeight: 500 }}>
              <l.Icon size={18} color="var(--primary)" strokeWidth={1.75} />
              {l.label}
            </a>
          </GlowPanel>
        ))}
      </div>

      {/* app.admin.verification-review.tsx is a child route of this one in the
          file-based router, so it only renders here, through this Outlet. */}
      <Outlet />
    </div>
  );
}
