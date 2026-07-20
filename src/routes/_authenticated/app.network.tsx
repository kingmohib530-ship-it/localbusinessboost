import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, TrendingUp, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/network")({
  component: NetworkPage,
});

interface ConsumerAppointmentRow {
  status: string;
  created_at: string | null;
}

function NetworkPage() {
  const [loading, setLoading] = useState(true);
  const [accept, setAccept] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [appointments, setAppointments] = useState<ConsumerAppointmentRow[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: profile }, { data: appts }] = await Promise.all([
      supabase.from("profiles").select("accept_consumer_leads").eq("id", user.id).single(),
      supabase
        .from("appointments")
        .select("status, created_at")
        .eq("user_id", user.id)
        .eq("source", "consumer_marketplace"),
    ]);

    setAccept(profile?.accept_consumer_leads ?? true);
    setAppointments((appts as ConsumerAppointmentRow[]) ?? []);
    setLoading(false);
  }

  async function toggleAccept() {
    const next = !accept;
    setAccept(next);
    setSaving(true);
    setSaveMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ accept_consumer_leads: next })
      .eq("id", user.id);
    if (error) {
      setAccept(!next);
      setSaveMsg("Could not save — please try again.");
    } else {
      setSaveMsg("Saved!");
    }
    setSaving(false);
  }

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = appointments.filter((a) => a.created_at && new Date(a.created_at) >= monthStart);
  const leadsThisMonth = thisMonth.length;
  const keptCount = thisMonth.filter((a) => a.status !== "cancelled" && a.status !== "no_show").length;
  const conversionRate = leadsThisMonth > 0 ? Math.round((keptCount / leadsThisMonth) * 100) : null;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: "0 0 6px" }}>Network</h1>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
          Leads from consumers who text the Lanavix Local marketplace number.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Users size={16} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{loading ? "—" : leadsThisMonth}</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Consumer leads this month</div>
        </div>
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <TrendingUp size={16} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{loading ? "—" : conversionRate === null ? "—" : `${conversionRate}%`}</div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>Kept (not cancelled / no-show)</div>
        </div>
      </div>

      <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Accept consumer marketplace leads</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              When on, consumers who text Lanavix Local looking for your service in your city can be matched and booked directly onto your calendar.
            </div>
          </div>
          <button
            onClick={toggleAccept}
            disabled={saving || loading}
            role="switch"
            aria-checked={accept}
            style={{
              width: 48, height: 28, borderRadius: 999, border: "none", cursor: saving ? "not-allowed" : "pointer",
              background: accept ? "var(--primary)" : "var(--border)", position: "relative", flexShrink: 0, padding: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: accept ? 23 : 3, width: 22, height: 22, borderRadius: "50%",
              background: "white", transition: "left 0.15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>
        {saveMsg && <div style={{ fontSize: 12, color: "var(--accent-2)", marginTop: 10 }}>{saveMsg}</div>}
      </div>

      <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gauge size={16} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>Network Score</div>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
          Coming soon — your Network Score will rank how often you're matched to consumer leads based on response speed, reviews, and booking completion rate.
        </p>
      </div>
    </div>
  );
}
