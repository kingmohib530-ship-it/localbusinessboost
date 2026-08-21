import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Upload,
  Trash2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPES } from "@/lib/verificationDocumentTypes";

export const Route = createFileRoute("/_authenticated/app/verification")({
  component: VerificationPage,
});

const TEAM_SIZES = ["solo", "2-5", "6-10", "11-20", "20+"] as const;
const PRICE_UNITS: { value: string; label: string }[] = [
  { value: "per_job", label: "Per job" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_sqft", label: "Per sq ft" },
];

const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];
// Matches the verification-docs bucket's own file_size_limit.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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
}

const STEPS = ["Business details", "Documents", "Pricing", "Review & submit"];

function VerificationPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ProfileFields | null>(null);
  const [docs, setDocs] = useState<VerificationDocRow[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setLoadError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [{ data: profileData, error: profileError }, { data: docData, error: docsError }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "business_name, verification_status, verification_notes, license_number, license_state, insurance_carrier, insurance_policy_number, ein_number, business_address, business_zip, years_in_business, team_size, emergency_hours, price_range_low, price_range_high, price_unit, quote_required",
          )
          .eq("id", user.id)
          .single(),
        supabase
          .from("verification_documents")
          .select("id, document_type, file_name, storage_path, status, uploaded_at")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false }),
      ]);

    // A failed load must never fall through to a blank, editable form -
    // that would risk a "Continue"/"Submit" overwriting real profile data
    // with nulls. Show a clear error and a retry instead.
    if (profileError || docsError) {
      console.error("[verification] failed to load", profileError || docsError);
      setLoadError("Couldn't load your verification info. Please try again.");
      setLoading(false);
      return;
    }

    setProfile(profileData as ProfileFields);
    setDocs((docData as VerificationDocRow[]) ?? []);
    setLoading(false);
  }

  function updateField<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
  }

  async function saveProgress() {
    if (!userId || !profile) return false;
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
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

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
      console.error("[verification] upload failed", uploadError);
      setErrorMsg("Upload failed — please try again.");
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
    setErrorMsg("");
    const { error: storageError } = await supabase.storage
      .from("verification-docs")
      .remove([doc.storage_path]);
    if (storageError) {
      console.error("[verification] failed to delete file from storage", storageError);
      setErrorMsg("Could not delete this document, please try again.");
      return;
    }
    const { error: deleteError } = await supabase
      .from("verification_documents")
      .delete()
      .eq("id", doc.id);
    if (deleteError) {
      console.error("[verification] failed to delete document record", deleteError);
      setErrorMsg("Could not delete this document, please try again.");
      return;
    }
    setDocs((d) => d.filter((x) => x.id !== doc.id));
  }

  async function handleSubmit() {
    if (!userId) return;
    setSubmitting(true);
    setErrorMsg("");
    const ok = await saveProgress();
    if (!ok) {
      setSubmitting(false);
      return;
    }

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

  if (loadError) {
    return (
      <div className="lv-light min-h-full bg-background">
        <div className="max-w-[760px] mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="lv-label text-destructive">Couldn't load verification</p>
            <p className="lv-body text-foreground mt-0.5">{loadError}</p>
            <Button variant="outline" size="sm" className="mt-3 min-h-[44px]" onClick={load}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="lv-light min-h-full bg-background">
        <div className="max-w-[760px] mx-auto px-4 md:px-8 py-6 md:py-8 space-y-3">
          <Skeleton className="h-8 w-48 rounded-md" />
          <Skeleton className="h-40 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const requiredMissing = DOCUMENT_TYPES.filter((d) => d.required).filter(
    (d) => !docs.some((doc) => doc.document_type === d.value),
  );

  if (profile.verification_status === "pending") {
    return (
      <StatusScreen
        icon={<Clock className="h-6 w-6 text-primary" aria-hidden="true" />}
        title="Verification submitted"
        body="Your documents are under review. This usually takes 1–2 business days. We'll email you once a decision is made."
        notes={profile.verification_notes}
      />
    );
  }

  if (["verified", "pro", "elite"].includes(profile.verification_status)) {
    return (
      <StatusScreen
        icon={<ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />}
        title="You're verified"
        body="Your business license, insurance, and identity have been confirmed by the Lanavix team."
        notes={null}
        good
      />
    );
  }

  // Real states are unverified / pending / verified (+ pro / elite, unused
  // today). "Unverified with notes" means an admin already reviewed this
  // once and sent it back - worth a distinct heading from a first-time
  // visit, even though it's the same underlying status.
  const isResubmission = !!profile.verification_notes;

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[760px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1.5">
            {isResubmission ? (
              <AlertCircle className="h-6 w-6 text-[var(--warning)]" aria-hidden="true" />
            ) : (
              <BadgeCheck className="h-6 w-6 text-primary" aria-hidden="true" />
            )}
            <h1 className="lv-page-title text-foreground">
              {isResubmission ? "Action needed" : "Get verified"}
            </h1>
          </div>
          <p className="lv-body text-muted-foreground">
            Confirm your business license, insurance, and identity so Lanavix can mark your account
            as a verified business.
          </p>
          {profile.verification_notes && (
            <div className="mt-3 rounded-md border border-border bg-accent px-3.5 py-2.5">
              <p className="lv-meta text-foreground">
                <span className="font-semibold">Note from our team: </span>
                {profile.verification_notes}
              </p>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-7" role="list" aria-label="Verification steps">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className="flex-1"
              role="listitem"
              aria-current={i === step ? "step" : undefined}
            >
              <div
                className={cn("h-1 rounded-full mb-1.5", i <= step ? "bg-primary" : "bg-border")}
              />
              <div
                className={cn(
                  "lv-meta",
                  i === step ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="rounded-md border border-border bg-card p-5 md:p-6 mb-4">
            <h2 className="lv-section text-foreground mb-4">Business details</h2>
            <Field label="License number" id="v-license-number">
              <Input
                id="v-license-number"
                value={profile.license_number ?? ""}
                onChange={(e) => updateField("license_number", e.target.value || null)}
                placeholder="e.g. C-45678"
              />
            </Field>
            <Field label="License state" id="v-license-state">
              <Input
                id="v-license-state"
                value={profile.license_state ?? ""}
                onChange={(e) => updateField("license_state", e.target.value || null)}
                placeholder="e.g. CA"
                maxLength={2}
              />
            </Field>
            <Field label="Insurance carrier" id="v-insurance-carrier">
              <Input
                id="v-insurance-carrier"
                value={profile.insurance_carrier ?? ""}
                onChange={(e) => updateField("insurance_carrier", e.target.value || null)}
                placeholder="e.g. State Farm"
              />
            </Field>
            <Field label="Insurance policy number" id="v-insurance-policy">
              <Input
                id="v-insurance-policy"
                value={profile.insurance_policy_number ?? ""}
                onChange={(e) => updateField("insurance_policy_number", e.target.value || null)}
              />
            </Field>
            <Field
              label="EIN (optional)"
              id="v-ein"
              hint="Your business's federal tax ID number, like a Social Security number but for a business. Skip this if you don't have one, for example if you're a sole proprietor using your own SSN with the IRS."
            >
              <Input
                id="v-ein"
                value={profile.ein_number ?? ""}
                onChange={(e) => updateField("ein_number", e.target.value || null)}
                placeholder="12-3456789"
              />
            </Field>
            <Field label="Business address" id="v-address">
              <Input
                id="v-address"
                value={profile.business_address ?? ""}
                onChange={(e) => updateField("business_address", e.target.value || null)}
              />
            </Field>
            <Field label="ZIP code" id="v-zip">
              <Input
                id="v-zip"
                value={profile.business_zip ?? ""}
                onChange={(e) => updateField("business_zip", e.target.value || null)}
                maxLength={10}
              />
            </Field>
            <Field label="Years in business" id="v-years">
              <Input
                id="v-years"
                inputMode="numeric"
                value={profile.years_in_business != null ? String(profile.years_in_business) : ""}
                onChange={(e) =>
                  updateField(
                    "years_in_business",
                    e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null,
                  )
                }
              />
            </Field>
            <Field label="Team size" id="v-team-size">
              <Select
                value={profile.team_size ?? undefined}
                onValueChange={(v) => updateField("team_size", v)}
              >
                <SelectTrigger id="v-team-size">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_SIZES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <ToggleField
              label="We offer emergency / after-hours service"
              value={profile.emergency_hours}
              onChange={(v) => updateField("emergency_hours", v)}
            />
          </div>
        )}

        {step === 1 && (
          <div className="rounded-md border border-border bg-card p-5 md:p-6 mb-4">
            <h2 className="lv-section text-foreground mb-1">Verification documents</h2>
            <p className="lv-meta text-muted-foreground mb-4">
              Business license, insurance, and photo ID are required. Files are stored privately and
              only visible to you and the Lanavix review team.
            </p>
            {DOCUMENT_TYPES.map((dt) => {
              const existing = docs.filter((d) => d.document_type === dt.value);
              const inputId = `v-upload-${dt.value}`;
              return (
                <div
                  key={dt.value}
                  className="mb-4 pb-4 border-b border-border last:border-b-0 last:mb-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="lv-label text-foreground">
                      {dt.label}
                      {dt.required && (
                        <>
                          <span className="text-destructive" aria-hidden="true">
                            {" "}
                            *
                          </span>
                          <span className="sr-only"> (required)</span>
                        </>
                      )}
                    </span>
                    <label
                      htmlFor={inputId}
                      className={cn(
                        "flex items-center gap-1.5 lv-meta font-medium px-3 py-1.5 min-h-[36px] rounded-sm border border-border bg-card text-foreground cursor-pointer hover:bg-accent transition-colors duration-150 ease-out",
                        uploading !== null && "opacity-60 pointer-events-none",
                      )}
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      {uploading === dt.value ? "Uploading…" : "Upload"}
                      <input
                        id={inputId}
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
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
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-2 lv-meta text-muted-foreground rounded-sm border border-border px-2.5 py-1.5 mb-1.5"
                    >
                      <span className="truncate">{doc.file_name || "Uploaded file"}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <DocStatusBadge status={doc.status} />
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc)}
                          aria-label={`Remove ${doc.file_name || "this file"}`}
                          className="text-muted-foreground hover:text-destructive transition-colors duration-150 ease-out"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
          <div className="rounded-md border border-border bg-card p-5 md:p-6 mb-4">
            <h2 className="lv-section text-foreground mb-4">Pricing & customer expectations</h2>
            <Field label="Typical price range — low ($)" id="v-price-low">
              <Input
                id="v-price-low"
                inputMode="numeric"
                value={profile.price_range_low != null ? String(profile.price_range_low) : ""}
                onChange={(e) =>
                  updateField(
                    "price_range_low",
                    e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null,
                  )
                }
              />
            </Field>
            <Field label="Typical price range — high ($)" id="v-price-high">
              <Input
                id="v-price-high"
                inputMode="numeric"
                value={profile.price_range_high != null ? String(profile.price_range_high) : ""}
                onChange={(e) =>
                  updateField(
                    "price_range_high",
                    e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null,
                  )
                }
              />
            </Field>
            <Field label="Price unit" id="v-price-unit">
              <Select
                value={profile.price_unit}
                onValueChange={(v) => updateField("price_unit", v)}
              >
                <SelectTrigger id="v-price-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <ToggleField
              label="I require a quote before final pricing"
              value={profile.quote_required}
              onChange={(v) => updateField("quote_required", v)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="rounded-md border border-border bg-card p-5 md:p-6 mb-4">
            <h2 className="lv-section text-foreground mb-4">Review & submit</h2>
            <SummaryRow label="Business" value={profile.business_name || "—"} />
            <SummaryRow
              label="License"
              value={
                profile.license_number
                  ? `${profile.license_number} (${profile.license_state || "—"})`
                  : "Not provided"
              }
            />
            <SummaryRow label="Insurance" value={profile.insurance_carrier || "Not provided"} />
            <SummaryRow
              label="Address"
              value={
                profile.business_address
                  ? `${profile.business_address}, ${profile.business_zip || ""}`
                  : "Not provided"
              }
            />
            <SummaryRow label="Team size" value={profile.team_size || "Not provided"} />
            <SummaryRow
              label="Documents uploaded"
              value={`${docs.length} file${docs.length === 1 ? "" : "s"}`}
            />

            {requiredMissing.length > 0 && (
              <div className="mt-3 rounded-md border border-border bg-accent px-3.5 py-2.5">
                <p className="lv-meta text-foreground">
                  Missing required document{requiredMissing.length > 1 ? "s" : ""}:{" "}
                  {requiredMissing.map((d) => d.label).join(", ")}. You can still submit, but review
                  may be delayed until these are provided.
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-5 min-h-[44px] gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        )}

        {errorMsg && (
          <p className="lv-meta text-destructive mb-4" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="min-h-[44px]"
          >
            ← Back
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={goNext} disabled={saving} className="min-h-[44px]">
              {saving ? "Saving…" : "Continue →"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusScreen({
  icon,
  title,
  body,
  notes,
  good,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  notes: string | null;
  good?: boolean;
}) {
  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[560px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="rounded-md border border-border bg-card px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-accent">
            {icon}
          </div>
          <h1 className="lv-section text-foreground mb-2">{title}</h1>
          <p className="lv-body text-muted-foreground max-w-sm mx-auto">{body}</p>
          {notes && (
            <div className="mt-4 rounded-md border border-border bg-accent px-3.5 py-2.5 text-left">
              <p className="lv-meta text-foreground">
                <span className="font-semibold">Note from our team: </span>
                {notes}
              </p>
            </div>
          )}
          {good && (
            <Button asChild className="mt-5 min-h-[44px]">
              <Link to="/app">Go to your dashboard →</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { className: string; label: string }> = {
    pending: { className: "text-muted-foreground", label: "Pending review" },
    approved: { className: "text-primary", label: "Approved" },
    rejected: { className: "text-destructive", label: "Rejected" },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span className={cn("lv-meta font-medium whitespace-nowrap", c.className)}>{c.label}</span>
  );
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <Label htmlFor={id} className="lv-label text-foreground block mb-1.5">
        {label}
      </Label>
      {hint && <p className="lv-meta text-muted-foreground mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3.5">
      <span className="lv-body text-foreground">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0 lv-body">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}
