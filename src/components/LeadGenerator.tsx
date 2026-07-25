import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { Phone, Mail, ChevronDown, ChevronUp, X, Wand2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const INDUSTRIES = [
  "HVAC", "Plumbing", "Roofing", "Electrical", "Cleaning",
  "Landscaping", "Dental", "Legal", "Pest Control", "Auto Repair",
];

const PIPELINE_COLUMNS: { status: string; label: string }[] = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "responded", label: "Responded" },
  { status: "qualified", label: "Qualified" },
  { status: "scheduled", label: "Scheduled" },
];

const STATUS_OPTIONS = ["new", "contacted", "responded", "qualified", "scheduled", "nurture", "dead"];

interface LeadProfile {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  industry: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  has_website: boolean | null;
  website_quality: string | null;
  social_media: { facebook?: string; instagram?: string; linkedin?: string } | null;
  pain_signals: string[] | null;
  lead_score: number | null;
  status: string;
  priority: string;
  ai_research_summary: string | null;
  personalized_opening_line: string | null;
  outreach_history: { channel: string; sent_at: string; message: string; response: string | null }[] | null;
  notes: string | null;
  created_at: string;
}

interface SequenceStep {
  id: string;
  lead_id: string;
  step_number: number;
  channel: string;
  delay_hours: number;
  message_template: string;
  status: string;
  sent_at: string | null;
}

const cardStyle: CSSProperties = {
  background: "var(--card)",
  border: "1.5px solid var(--border)",
  borderRadius: 14,
  padding: "14px 16px",
};

function priorityColor(priority: string): { bg: string; color: string } {
  if (priority === "hot") return { bg: "rgba(239,68,68,0.12)", color: "#ef4444" };
  if (priority === "cold") return { bg: "var(--muted)", color: "var(--muted-foreground)" };
  return { bg: "rgba(245,158,11,0.14)", color: "#d97706" };
}

function copyText(text: string) {
  navigator.clipboard.writeText(text);
}

export default function LeadGenerator() {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [city, setCity] = useState("");
  const [count, setCount] = useState(30);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState("");

  const [leads, setLeads] = useState<LeadProfile[]>([]);
  const [sequences, setSequences] = useState<Record<string, SequenceStep[]>>({});
  const [pipelineValue, setPipelineValue] = useState(0);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [outreachOpenId, setOutreachOpenId] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<LeadProfile | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [runningStepFor, setRunningStepFor] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: leadRows } = await supabase
      .from("lead_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    const typedLeads = (leadRows || []) as unknown as LeadProfile[];
    setLeads(typedLeads);

    if (typedLeads.length > 0) {
      const ids = typedLeads.map((l) => l.id);
      const { data: seqRows } = await supabase
        .from("lead_sequences")
        .select("*")
        .in("lead_id", ids)
        .order("step_number", { ascending: true });
      const grouped: Record<string, SequenceStep[]> = {};
      for (const s of (seqRows || []) as unknown as SequenceStep[]) {
        if (!s.lead_id) continue;
        (grouped[s.lead_id] ||= []).push(s);
      }
      setSequences(grouped);

      const scheduledPhones = typedLeads
        .filter((l) => l.status === "scheduled" && l.phone)
        .map((l) => l.phone as string);
      if (scheduledPhones.length > 0) {
        const { data: appts } = await supabase
          .from("appointments")
          .select("estimated_value, customer_phone")
          .eq("user_id", user.id)
          .in("customer_phone", scheduledPhones);
        const value = (appts || []).reduce((sum, a) => sum + (a.estimated_value || 0), 0);
        setPipelineValue(value);
      } else {
        setPipelineValue(0);
      }
    } else {
      setSequences({});
      setPipelineValue(0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("city").eq("id", user.id).single().then(({ data }) => {
        if (data?.city) setCity(data.city);
      });
    });
  }, [loadLeads]);

  async function generateLeads() {
    if (!city.trim()) {
      setError("Please enter a city.");
      return;
    }
    setError("");
    setResearching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Please sign in again and retry.");
        setResearching(false);
        return;
      }
      const res = await fetch("/api/lead-generator/research", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ industry, city: city.trim(), count }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong. Please try again.");
        setResearching(false);
        return;
      }
      await loadLeads();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResearching(false);
    }
  }

  async function updateStatus(leadId: string, status: string) {
    await supabase.from("lead_profiles").update({ status }).eq("id", leadId);
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    if (detailLead?.id === leadId) setDetailLead((d) => (d ? { ...d, status } : d));
  }

  async function saveNotes(leadId: string) {
    await supabase.from("lead_profiles").update({ notes: notesDraft }).eq("id", leadId);
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notes: notesDraft } : l)));
  }

  async function runNextStep(leadId: string) {
    const steps = sequences[leadId] || [];
    const next = steps.find((s) => s.status === "pending");
    if (!next) return;
    setRunningStepFor(leadId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/lead-generator/execute-step", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lead_id: leadId, step_id: next.id }),
      });
      const data = await res.json();
      if (res.ok) {
        await loadLeads();
      } else {
        setError(data.error || "Failed to run sequence step.");
      }
    } catch {
      setError("Network error running sequence step.");
    } finally {
      setRunningStepFor(null);
    }
  }

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const hotThisWeek = leads.filter((l) => l.priority === "hot" && now - new Date(l.created_at).getTime() < weekMs).length;
  const contactedOrLater = leads.filter((l) => l.status !== "new").length;
  const respondedOrLater = leads.filter((l) => ["responded", "qualified", "scheduled"].includes(l.status)).length;
  const responseRate = contactedOrLater > 0 ? Math.round((respondedOrLater / contactedOrLater) * 100) : 0;
  const appointmentsScheduled = leads.filter((l) => l.status === "scheduled").length;

  const mainColumnLeads = (status: string) => leads.filter((l) => l.status === status);
  const otherLeads = leads.filter((l) => l.status === "nurture" || l.status === "dead");

  return (
    <div>
      {/* Research panel */}
      <div style={{ ...cardStyle, padding: 24, marginBottom: 24, maxWidth: 720 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wand2 size={18} color="var(--primary)" strokeWidth={1.75} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)" }}>Lead Generator</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Industry</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit" }}>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Fairfax VA"
              style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>
            Number of leads: {count}
          </label>
          <input type="range" min={10} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))}
            style={{ width: "100%" }} />
        </div>
        {error && <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 14 }}>{error}</p>}
        <button onClick={generateLeads} disabled={researching}
          style={{ width: "100%", padding: 13, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: researching ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: researching ? 0.7 : 1 }}>
          {researching ? `Researching ${count} businesses in ${city || "your area"}...` : "Generate Intelligence →"}
        </button>
      </div>

      {/* Stats bar */}
      {!loading && leads.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total leads generated", value: leads.length },
            { label: "Hot leads this week", value: hotThisWeek },
            { label: "Response rate", value: `${responseRate}%` },
            { label: "Appointments scheduled", value: appointmentsScheduled },
            { label: "Pipeline value", value: `$${pipelineValue.toLocaleString()}` },
          ].map((s) => (
            <div key={s.label} style={{ ...cardStyle, padding: "14px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline */}
      {!loading && leads.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, alignItems: "start" }}>
          {PIPELINE_COLUMNS.map((col) => (
            <div key={col.status}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                <span>{col.label}</span>
                <span>{mainColumnLeads(col.status).length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {mainColumnLeads(col.status).map((lead) => {
                  const pc = priorityColor(lead.priority);
                  const steps = sequences[lead.id] || [];
                  const nextPending = steps.find((s) => s.status === "pending");
                  return (
                    <div key={lead.id} style={cardStyle}>
                      <div onClick={() => setDetailLead(lead)} style={{ cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{lead.business_name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: pc.bg, color: pc.color, flexShrink: 0 }}>
                            {lead.lead_score ?? 0}
                          </span>
                        </div>
                        {lead.owner_name && (
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>{lead.owner_name}</div>
                        )}
                        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                          {lead.phone && (
                            <span onClick={(e) => { e.stopPropagation(); copyText(lead.phone!); }}
                              title="Copy phone" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--primary)", cursor: "pointer" }}>
                              <Phone size={12} /> {lead.phone}
                            </span>
                          )}
                          {lead.email && (
                            <span onClick={(e) => { e.stopPropagation(); copyText(lead.email!); }}
                              title="Copy email" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--primary)", cursor: "pointer" }}>
                              <Mail size={12} />
                            </span>
                          )}
                        </div>
                        {lead.pain_signals && lead.pain_signals.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                            {lead.pain_signals.map((p) => (
                              <span key={p} style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "var(--accent)", color: "var(--primary)" }}>{p}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }}>
                        {expandedId === lead.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Research
                      </button>
                      {expandedId === lead.id && (
                        <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5, margin: "0 0 8px" }}>
                          {lead.ai_research_summary || "No summary available."}
                        </p>
                      )}

                      <select value={lead.status} onChange={(e) => updateStatus(lead.id, e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--input)", color: "var(--foreground)", marginBottom: 8, fontFamily: "inherit" }}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>

                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => runNextStep(lead.id)} disabled={!nextPending || runningStepFor === lead.id}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 8px", fontSize: 11, fontWeight: 600, background: nextPending ? "var(--primary)" : "var(--muted)", color: nextPending ? "var(--primary-foreground)" : "var(--muted-foreground)", border: "none", borderRadius: 8, cursor: nextPending ? "pointer" : "not-allowed" }}>
                          <Send size={11} /> {runningStepFor === lead.id ? "Sending..." : nextPending ? `Run step ${nextPending.step_number}` : "All sent"}
                        </button>
                        <button onClick={() => setOutreachOpenId(outreachOpenId === lead.id ? null : lead.id)}
                          style={{ padding: "7px 10px", fontSize: 11, fontWeight: 600, background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 8, cursor: "pointer" }}>
                          History
                        </button>
                      </div>

                      {outreachOpenId === lead.id && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                          {(lead.outreach_history || []).length === 0 && (
                            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0 }}>No messages sent yet.</p>
                          )}
                          {(lead.outreach_history || []).map((h, i) => (
                            <div key={i} style={{ marginBottom: 6 }}>
                              <div style={{ fontSize: 11, color: "var(--foreground)" }}>→ {h.message}</div>
                              {h.response && <div style={{ fontSize: 11, color: "var(--accent-2)" }}>← {h.response}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {mainColumnLeads(col.status).length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", padding: "8px 0" }}>—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && otherLeads.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 10 }}>Nurture / Dead ({otherLeads.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {otherLeads.map((lead) => (
              <div key={lead.id} onClick={() => setDetailLead(lead)}
                style={{ ...cardStyle, padding: "8px 12px", cursor: "pointer", opacity: 0.7 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{lead.business_name}</span>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginLeft: 8 }}>{lead.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && leads.length === 0 && (
        <div style={{ ...cardStyle, padding: "48px 32px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0 }}>
            No leads yet. Run Generate Intelligence above to research your first batch of prospects.
          </p>
        </div>
      )}

      {/* Detail drawer */}
      {detailLead && (
        <div onClick={() => setDetailLead(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: 440, maxWidth: "100%", height: "100%", background: "var(--card)", borderLeft: "1px solid var(--border)", overflowY: "auto", padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "var(--foreground)" }}>{detailLead.business_name}</div>
                {detailLead.owner_name && <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{detailLead.owner_name}</div>}
              </div>
              <button onClick={() => setDetailLead(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={20} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18, fontSize: 13 }}>
              {detailLead.phone && <div><strong>Phone:</strong> {detailLead.phone}</div>}
              {detailLead.email && <div><strong>Email:</strong> {detailLead.email}</div>}
              {detailLead.website && <div><strong>Website:</strong> {detailLead.website}</div>}
              {detailLead.address && <div><strong>Address:</strong> {detailLead.address}</div>}
              {detailLead.google_rating !== null && (
                <div><strong>Google:</strong> {detailLead.google_rating}★ ({detailLead.google_review_count ?? 0} reviews)</div>
              )}
              {detailLead.website_quality && <div><strong>Website quality:</strong> {detailLead.website_quality}</div>}
              {detailLead.social_media && Object.keys(detailLead.social_media).length > 0 && (
                <div><strong>Social:</strong> {Object.entries(detailLead.social_media).map(([k]) => k).join(", ")}</div>
              )}
            </div>

            {detailLead.pain_signals && detailLead.pain_signals.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Pain signals</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {detailLead.pain_signals.map((p) => (
                    <span key={p} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "var(--accent)", color: "var(--primary)" }}>{p}</span>
                  ))}
                </div>
              </div>
            )}

            {detailLead.ai_research_summary && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Research summary</div>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>{detailLead.ai_research_summary}</p>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Sequence</div>
              {(sequences[detailLead.id] || []).map((s) => (
                <div key={s.id} style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6, padding: "8px 10px", background: "var(--elevated)", borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: "var(--foreground)" }}>Step {s.step_number} · {s.channel} · {s.status}</div>
                  <div>{s.message_template}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>Notes</div>
              <textarea
                defaultValue={detailLead.notes || ""}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={() => saveNotes(detailLead.id)}
                rows={4}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, background: "var(--input)", color: "var(--foreground)", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>

            <button onClick={() => updateStatus(detailLead.id, "dead")}
              style={{ width: "100%", padding: 11, background: "var(--card)", color: "var(--destructive)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Mark as Dead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
