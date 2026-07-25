import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Upload, Trash2, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/verification")({
  component: VerificationPage,
});

const TEAM_SIZES = ["solo", "2-5", "6-10", "11-20", "20+"] as const;
const PRICE_UNITS: { value: string; label: string }[] = [
  { value: "per_job", label: "Per job" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_sqft", label: "Per sq ft" },
];

const DOCUMENT_TYPES: { value: string; label: string; required: boolean }[] = [
  { value: "business_license", label: "Business license", required: true },
  { value: "insurance_certificate", label: "Certificate of insurance", required: true },
  { value: "photo_id", label: "Photo ID", required: true },
  { value: "business_card", label: "Business card", required: false },
  { value: "website_screenshot", label: "Website screenshot", required: false },
  { value: "utility_bill", label: "Utility bill (proof of address)", required: false },
  { value: "other", label: "Other supporting document", required: false },
];

interface VerificationDocRow {
  id: string;
  document_type: string;
  file_name: string | null;
  storage_path: string;
  status: string;
  uploaded_at: string | null;
}

interface ProfileFields {
  business_name: string | null;
  verification_status: string;
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
  accept_consumer_leads: boolean;
}

const STEPS = ["Business details", "Documents", "Pricing", "Review & submit"];

function VerificationPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProfileFields | null>(null);
  const [docs, setDocs] = useState<VerificationDocRow[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [{ data: profileData }, { data: docData }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "business_name, verification_status, verification_notes, license_number, license_state, insurance_carrier, insurance_policy_number, ein_number, business_address, business_zip, years_in_business, team_size, emergency_hours, price_range_low, price_range_high, price_unit, quote_required, accept_consumer_leads"
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("verification_documents")
        .select("id, document_type, file_name, storage_path, status, uploaded_at")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false }),
    ]);

    setProfile(profileData as ProfileFields);
    setDocs((docData as VerificationDocRow[]) ?? []);
    setLoading(false);
  }

  function updateField<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  }

  async function saveProgress() {
    if (!userId || !profile) return;
    setSaving(true);
    setErrorMsg("");
    const { error } = await supabase
      .from("profiles")
      .update({
        license_number: profile.license_number,
        license_state: profile.license_state,
        insurance_carrier: profile.insurance_carrier,
        insurance_policy_number: profile.insurance_policy_number,
        ein_number: profile.ein_number,
        business_address: profile.business_address,
        business_zip: profile.business_zip,
        years_in_business: profile.years_in_business,
        team_size: profile.team_size,
        emergency_hours: profile.emergency_hours,
        price_range_low: profile.price_range_low,
        price_range_high: profile.price_range_high,
        price_unit: profile.price_unit,
        quote_required: profile.quote_required,
        accept_consumer_leads: profile.accept_consumer_leads,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setErrorMsg("Could not save — please try again.");
      return false;
    }
    return true;
  }

  async function goNext() {
    const ok = await saveProgress();
    if (ok !== false) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // matches the verification-docs bucket's server-side limit

  async function handleUpload(documentType: string, file: File) {
    if (!userId) return;
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      setErrorMsg("That file type isn't supported. Please upload a JPG, PNG, WEBP, HEIC, or PDF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrorMsg("That file is too large — please upload something under 10MB.");
      return;
    }
    setUploading(documentType);
    setErrorMsg("");
    const path = `${userId}/${documentType}-${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-docs")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setErrorMsg(`Upload failed: ${uploadError.message}`);
      setUploading(null);
      return;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("verification_documents")
      .insert({
        user_id: userId,
        document_type: documentType,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      })
      .select()
      .single();

    if (insertError) {
      setErrorMsg("Upload saved, but we couldn't record it — please try again.");
    } else if (inserted) {
      setDocs((d) => [inserted as VerificationDocRow, ...d]);
    }
    setUploading(null);
  }

  async function handleDeleteDoc(doc: VerificationDocRow) {
    await supabase.storage.from("verification-docs").remove([doc.storage_path]);
    await supabase.from("verification_documents").delete().eq("id", doc.id);
    setDocs((d) => d.filter((x) => x.id !== doc.id));
  }

  async function handleSubmit() {
    if (!userId) return;
    setSubmitting(true);
    setErrorMsg("");
    const ok = await saveProgress();
    if (ok === false) { setSubmitting(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update({
        verification_status: "pending",
        verification_submitted_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSubmitting(false);
    if (error) {
      setErrorMsg("Could not submit for review — please try again.");
      return;
    }
    setProfile((p) => (p ? { ...p, verification_status: "pending" } : p));
  }

  if (loading) {
    return (
      <div style={{ padding: "24px 32px", maxWidth: 760, margin: "0 auto" }}>
        <p style={{ color: "var(--muted-foreground)" }}>Loading…</p>
      </div>
    );
  }

  if (!profile) return null;

  const requiredMissing = DOCUMENT_TYPES.filter((d) => d.required).filter(
    (d) => !docs.some((doc) => doc.document_type === d.value)
  );

  if (profile.verification_status === "pending") {
    return (
      <StatusScreen
        icon={<Clock size={26} color="var(--primary)" strokeWidth={1.75} />}
        title="Verification submitted"
        body="Your documents are under review. This usually takes 1–2 business days. We'll email you once a decision is made."
        notes={profile.verification_notes}
      />
    );
  }

  if (["verified", "pro", "elite"].includes(profile.verification_status)) {
    return (
      <StatusScreen
        icon={<ShieldCheck size={26} color="var(--accent-2)" strokeWidth={1.75} />}
        title="You're verified"
        body="Your business is verified on Lanavix. This unlocks consumer marketplace matching and shows a verified badge to customers."
        notes={null}
        good
      />
    );
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 760, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <BadgeCheck size={24} color="var(--primary)" strokeWidth={1.75} />
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: 0 }}>
            Get verified
          </h1>
        </div>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
          Verified businesses get a trust badge and access to the consumer marketplace.
        </p>
        {profile.verification_notes && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--accent)", borderRadius: 10, fontSize: 13, color: "var(--foreground)" }}>
            <strong>Note from our team:</strong> {profile.verification_notes}
          </div>
        )}
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 999, background: i <= step ? "var(--primary)" : "var(--border)", marginBottom: 6 }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: i === step ? "var(--foreground)" : "var(--muted-foreground)" }}>{label}</div>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 16 }}>Business details</h2>
          <Field label="License number">
            <TextInput value={profile.license_number ?? ""} onChange={(v) => updateField("license_number", v || null)} placeholder="e.g. C-45678" />
          </Field>
          <Field label="License state">
            <TextInput value={profile.license_state ?? ""} onChange={(v) => updateField("license_state", v || null)} placeholder="e.g. CA" maxLength={2} />
          </Field>
          <Field label="Insurance carrier">
            <TextInput value={profile.insurance_carrier ?? ""} onChange={(v) => updateField("insurance_carrier", v || null)} placeholder="e.g. State Farm" />
          </Field>
          <Field label="Insurance policy number">
            <TextInput value={profile.insurance_policy_number ?? ""} onChange={(v) => updateField("insurance_policy_number", v || null)} />
          </Field>
          <Field label="EIN (optional)">
            <TextInput value={profile.ein_number ?? ""} onChange={(v) => updateField("ein_number", v || null)} placeholder="12-3456789" />
          </Field>
          <Field label="Business address">
            <TextInput value={profile.business_address ?? ""} onChange={(v) => updateField("business_address", v || null)} />
          </Field>
          <Field label="ZIP code">
            <TextInput value={profile.business_zip ?? ""} onChange={(v) => updateField("business_zip", v || null)} maxLength={10} />
          </Field>
          <Field label="Years in business">
            <TextInput
              value={profile.years_in_business != null ? String(profile.years_in_business) : ""}
              onChange={(v) => updateField("years_in_business", v ? Number(v.replace(/\D/g, "")) : null)}
            />
          </Field>
          <Field label="Team size">
            <select
              value={profile.team_size ?? ""}
              onChange={(e) => updateField("team_size", e.target.value || null)}
              style={selectStyle}
            >
              <option value="">Select…</option>
              {TEAM_SIZES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <ToggleField
            label="We offer emergency / after-hours service"
            value={profile.emergency_hours}
            onChange={(v) => updateField("emergency_hours", v)}
          />
        </div>
      )}

      {step === 1 && (
        <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Verification documents</h2>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
            Business license, insurance, and photo ID are required. Files are stored privately and only visible to you and the Lanavix review team.
          </p>
          {DOCUMENT_TYPES.map((dt) => {
            const existing = docs.filter((d) => d.document_type === dt.value);
            return (
              <div key={dt.value} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                    {dt.label} {dt.required && <span style={{ color: "var(--destructive)" }}>*</span>}
                  </div>
                  <label style={{
                    display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                    padding: "6px 12px", borderRadius: 8, border: "1.5px solid var(--border)",
                    background: "var(--card)", color: "var(--foreground)", cursor: "pointer",
                  }}>
                    <Upload size={13} />
                    {uploading === dt.value ? "Uploading…" : "Upload"}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: "none" }}
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(dt.value, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {existing.map((doc) => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--muted-foreground)", padding: "6px 10px", background: "var(--card)", borderRadius: 8, marginBottom: 6 }}>
                    <span>{doc.file_name || "Uploaded file"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <DocStatusBadge status={doc.status} />
                      <button onClick={() => handleDeleteDoc(doc)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 16 }}>Pricing & marketplace</h2>
          <Field label="Typical price range — low ($)">
            <TextInput
              value={profile.price_range_low != null ? String(profile.price_range_low) : ""}
              onChange={(v) => updateField("price_range_low", v ? Number(v.replace(/\D/g, "")) : null)}
            />
          </Field>
          <Field label="Typical price range — high ($)">
            <TextInput
              value={profile.price_range_high != null ? String(profile.price_range_high) : ""}
              onChange={(v) => updateField("price_range_high", v ? Number(v.replace(/\D/g, "")) : null)}
            />
          </Field>
          <Field label="Price unit">
            <select value={profile.price_unit} onChange={(e) => updateField("price_unit", e.target.value)} style={selectStyle}>
              {PRICE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </Field>
          <ToggleField
            label="I require a quote before final pricing"
            value={profile.quote_required}
            onChange={(v) => updateField("quote_required", v)}
          />
          <ToggleField
            label="Accept consumer marketplace leads"
            value={profile.accept_consumer_leads}
            onChange={(v) => updateField("accept_consumer_leads", v)}
          />
        </div>
      )}

      {step === 3 && (
        <div style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 16 }}>Review & submit</h2>
          <SummaryRow label="Business" value={profile.business_name || "—"} />
          <SummaryRow label="License" value={profile.license_number ? `${profile.license_number} (${profile.license_state || "—"})` : "Not provided"} />
          <SummaryRow label="Insurance" value={profile.insurance_carrier || "Not provided"} />
          <SummaryRow label="Address" value={profile.business_address ? `${profile.business_address}, ${profile.business_zip || ""}` : "Not provided"} />
          <SummaryRow label="Team size" value={profile.team_size || "Not provided"} />
          <SummaryRow label="Documents uploaded" value={`${docs.length} file${docs.length === 1 ? "" : "s"}`} />

          {requiredMissing.length > 0 && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--muted)", borderRadius: 10, fontSize: 13, color: "var(--foreground)" }}>
              Missing required document{requiredMissing.length > 1 ? "s" : ""}: {requiredMissing.map((d) => d.label).join(", ")}.
              You can still submit, but review may be delayed until these are provided.
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ marginTop: 20, width: "100%", padding: "12px 20px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <CheckCircle2 size={16} />
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </div>
      )}

      {errorMsg && <p style={{ fontSize: 13, color: "var(--destructive)", marginBottom: 16 }}>{errorMsg}</p>}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <button
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          style={{ padding: "10px 20px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: step === 0 ? "not-allowed" : "pointer", opacity: step === 0 ? 0.5 : 1 }}
        >
          ← Back
        </button>
        {step < STEPS.length - 1 && (
          <button
            onClick={goNext}
            disabled={saving}
            style={{ padding: "10px 20px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : "Continue →"}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusScreen({ icon, title, body, notes, good }: { icon: React.ReactNode; title: string; body: string; notes: string | null; good?: boolean }) {
  return (
    <div style={{ padding: "24px 32px", maxWidth: 620, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: "40px 32px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {icon}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>{body}</p>
        {notes && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--accent)", borderRadius: 10, fontSize: 13, color: "var(--foreground)", textAlign: "left" }}>
            <strong>Note from our team:</strong> {notes}
          </div>
        )}
        {good && (
          <Link to="/app/network" style={{ display: "inline-block", marginTop: 20, padding: "10px 24px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            Go to Network →
          </Link>
        )}
      </div>
    </div>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "var(--muted)", color: "var(--muted-foreground)", label: "Pending review" },
    approved: { bg: "var(--accent)", color: "var(--accent-2)", label: "Approved" },
    rejected: { bg: "var(--accent)", color: "var(--destructive)", label: "Rejected" },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: c.bg, color: c.color }}>{c.label}</span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, maxLength }: { value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
    />
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14,
  color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        style={{ width: 44, height: 26, borderRadius: 999, border: "none", cursor: "pointer", background: value ? "var(--primary)" : "var(--border)", position: "relative", flexShrink: 0, padding: 0 }}
      >
        <span style={{ position: "absolute", top: 3, left: value ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.15s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
