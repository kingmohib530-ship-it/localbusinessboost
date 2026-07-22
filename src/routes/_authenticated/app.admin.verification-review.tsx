import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAdmin } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/app/admin/verification-review")({
  component: VerificationReviewPage,
});

interface ProfileRow {
  id: string;
  business_name: string | null;
  industry: string | null;
  city: string | null;
  verification_status: string;
  verification_submitted_at: string | null;
  verification_reviewed_at: string | null;
  verification_notes: string | null;
  license_number: string | null;
  license_state: string | null;
  insurance_carrier: string | null;
  insurance_policy_number: string | null;
  ein_number: string | null;
  business_address: string | null;
  business_zip: string | null;
  years_in_business: number | null;
  team_size: string | null;
  emergency_hours: boolean;
  price_range_low: number | null;
  price_range_high: number | null;
  price_unit: string;
  quote_required: boolean;
}

interface DocRow {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string | null;
  storage_path: string;
  status: string;
  uploaded_at: string | null;
}

const FILTERS = ["pending", "verified", "unverified", "all"] as const;
type Filter = (typeof FILTERS)[number];

function VerificationReviewPage() {
  const allowed = useRequireAdmin();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [acting, setActing] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    if (!allowed) return;
    load();
  }, [allowed]);

  async function load() {
    setLoading(true);
    const [{ data: profileData }, { data: docData }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, business_name, industry, city, verification_status, verification_submitted_at, verification_reviewed_at, verification_notes, license_number, license_state, insurance_carrier, insurance_policy_number, ein_number, business_address, business_zip, years_in_business, team_size, emergency_hours, price_range_low, price_range_high, price_unit, quote_required"
        )
        .order("verification_submitted_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("verification_documents")
        .select("id, user_id, document_type, file_name, storage_path, status, uploaded_at")
        .order("uploaded_at", { ascending: false }),
    ]);
    setProfiles((profileData as ProfileRow[]) ?? []);
    setDocs((docData as DocRow[]) ?? []);
    setLoading(false);
  }

  async function authedFetch(path: string, body: object) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Not signed in");
    const res = await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  async function viewDocument(doc: DocRow) {
    const { data, error } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(doc.storage_path, 300);
    if (error || !data?.signedUrl) {
      setActionMsg("Could not open document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function setDocStatus(doc: DocRow, status: "approved" | "rejected") {
    try {
      await authedFetch("/api/admin/verification-review", { documentId: doc.id, status });
      setDocs((d) => d.map((x) => (x.id === doc.id ? { ...x, status } : x)));
    } catch (e: any) {
      setActionMsg(e.message || "Failed to update document.");
    }
  }

  async function decide(action: "approve" | "reject" | "request_info") {
    if (!selectedId) return;
    setActing(true);
    setActionMsg("");
    try {
      const result = await authedFetch("/api/admin/verification-review", {
        userId: selectedId,
        action,
        notes,
      });
      setProfiles((ps) =>
        ps.map((p) =>
          p.id === selectedId
            ? { ...p, verification_status: result.verification_status, verification_notes: notes || null, verification_reviewed_at: new Date().toISOString() }
            : p
        )
      );
      setActionMsg("Saved.");
    } catch (e: any) {
      setActionMsg(e.message || "Failed to save decision.");
    } finally {
      setActing(false);
    }
  }

  if (!allowed) return null;

  const filtered = profiles.filter((p) => filter === "all" || p.verification_status === filter);
  const selected = profiles.find((p) => p.id === selectedId) || null;
  const selectedDocs = docs.filter((d) => d.user_id === selectedId);

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1180, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <ShieldCheck size={24} color="var(--primary)" strokeWidth={1.75} />
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: 0 }}>
          Verification review
        </h1>
      </div>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 20 }}>
        Review submitted business details and documents, then approve, reject, or request more info.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "1.5px solid var(--border)",
              background: filter === f ? "var(--primary)" : "var(--card)",
              color: filter === f ? "var(--primary-foreground)" : "var(--foreground)",
              fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
            }}
          >
            {f} {f !== "all" && `(${profiles.filter((p) => p.verification_status === f).length})`}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "380px 1fr" : "1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!loading && filtered.length === 0 && (
            <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: 24, textAlign: "center", fontSize: 13, color: "var(--muted-foreground)" }}>
              Nothing here.
            </div>
          )}
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => { setSelectedId(p.id); setNotes(p.verification_notes || ""); setActionMsg(""); }}
              style={{
                background: "var(--card)", border: `1.5px solid ${selectedId === p.id ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 14, padding: "14px 18px", cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{p.business_name || "Unnamed business"}</span>
                <StatusBadge status={p.verification_status} />
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                {[p.industry, p.city].filter(Boolean).join(" · ") || "—"}
              </div>
              {p.verification_submitted_at && (
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
                  Submitted {new Date(p.verification_submitted_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>

        {selected && (
          <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{selected.business_name || "Unnamed business"}</h2>
              <StatusBadge status={selected.verification_status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <Detail label="License" value={selected.license_number ? `${selected.license_number} (${selected.license_state || "—"})` : "—"} />
              <Detail label="Insurance" value={selected.insurance_carrier ? `${selected.insurance_carrier} / ${selected.insurance_policy_number || "—"}` : "—"} />
              <Detail label="EIN" value={selected.ein_number || "—"} />
              <Detail label="Address" value={selected.business_address ? `${selected.business_address}, ${selected.business_zip || ""}` : "—"} />
              <Detail label="Years in business" value={selected.years_in_business != null ? String(selected.years_in_business) : "—"} />
              <Detail label="Team size" value={selected.team_size || "—"} />
              <Detail label="Emergency hours" value={selected.emergency_hours ? "Yes" : "No"} />
              <Detail label="Pricing" value={
                selected.price_range_low != null && selected.price_range_high != null
                  ? `$${selected.price_range_low}–$${selected.price_range_high} (${selected.price_unit})`
                  : "—"
              } />
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", marginBottom: 10 }}>Documents ({selectedDocs.length})</h3>
            {selectedDocs.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>No documents uploaded.</p>
            )}
            {selectedDocs.map((doc) => (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--card)", borderRadius: 10, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <FileText size={14} color="var(--primary)" />
                  <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{doc.document_type.replace(/_/g, " ")}</span>
                  <button onClick={() => viewDocument(doc)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 12 }}>
                    <ExternalLink size={12} /> View
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusBadge status={doc.status} />
                  {doc.status !== "approved" && (
                    <button onClick={() => setDocStatus(doc, "approved")} style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer" }}>Approve</button>
                  )}
                  {doc.status !== "rejected" && (
                    <button onClick={() => setDocStatus(doc, "rejected")} style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", color: "var(--destructive)" }}>Reject</button>
                  )}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
                Notes to applicant (shown to them if rejected or more info requested)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g. Please upload a clearer photo of your insurance certificate."
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => decide("approve")} disabled={acting}
                style={{ flex: 1, padding: "10px 16px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.7 : 1 }}>
                Approve
              </button>
              <button onClick={() => decide("request_info")} disabled={acting}
                style={{ flex: 1, padding: "10px 16px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.7 : 1 }}>
                Request info
              </button>
              <button onClick={() => decide("reject")} disabled={acting}
                style={{ flex: 1, padding: "10px 16px", background: "var(--card)", color: "var(--destructive)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: acting ? "not-allowed" : "pointer", opacity: acting ? 0.7 : 1 }}>
                Reject
              </button>
            </div>
            {actionMsg && <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 10 }}>{actionMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    unverified: { bg: "var(--muted)", color: "var(--muted-foreground)", label: "Unverified" },
    pending: { bg: "var(--accent)", color: "var(--primary)", label: "Pending" },
    verified: { bg: "var(--accent)", color: "var(--accent-2)", label: "Verified" },
    pro: { bg: "var(--accent)", color: "var(--accent-2)", label: "Pro" },
    elite: { bg: "var(--accent)", color: "var(--accent-2)", label: "Elite" },
    approved: { bg: "var(--accent)", color: "var(--accent-2)", label: "Approved" },
    rejected: { bg: "var(--accent)", color: "var(--destructive)", label: "Rejected" },
  };
  const c = cfg[status] || cfg.unverified;
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>{c.label}</span>;
}
