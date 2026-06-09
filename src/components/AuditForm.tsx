import { useState } from "react";
import type { AuditInput, Industry } from "@/lib/auditApi";

const INDUSTRIES: Industry[] = [
  "HVAC",
  "Plumbing",
  "Roofing",
  "Cleaning",
  "Landscaping",
  "Salon",
  "Electrician",
  "Pest Control",
  "Painting",
  "Other",
];

const AGENT_STEPS = [
  { id: "atlas",   label: "Atlas",   task: "Scanning business presence"   },
  { id: "nexus",   label: "Nexus",   task: "Analysing local competitors"   },
  { id: "pulse",   label: "Pulse",   task: "Reviewing online messaging"    },
  { id: "shield",  label: "Shield",  task: "Validating all data points"    },
  { id: "aether",  label: "Aether",  task: "Scoring & building your report"},
];

interface Props {
  onSubmit: (input: AuditInput) => void;
  loading: boolean;
  loadingStep: number; // 0–4, which agent step is active
}

export function AuditForm({ onSubmit, loading, loadingStep }: Props) {
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<Industry | "">("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [noWebsite, setNoWebsite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!businessName.trim()) e.businessName = "Enter your business name";
    if (!industry) e.industry = "Select your industry";
    if (!noWebsite && websiteUrl && !/^https?:\/\/.+/.test(websiteUrl.trim())) {
      e.websiteUrl = "Enter a valid URL starting with https://";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      businessName: businessName.trim(),
      industry: industry as Industry,
      websiteUrl: noWebsite ? undefined : websiteUrl.trim() || undefined,
    });
  }

  const progressPct = loading
    ? Math.min(95, ((loadingStep + 1) / AGENT_STEPS.length) * 100)
    : 0;

  return (
    <div className="audit-form-wrap">
      {!loading ? (
        <form onSubmit={handleSubmit} noValidate>
          {/* ── Business name ── */}
          <div className="af-field">
            <label htmlFor="biz-name" className="af-label">
              Business name <span className="af-required">*</span>
            </label>
            <input
              id="biz-name"
              type="text"
              className={`af-input${errors.businessName ? " af-input--error" : ""}`}
              placeholder="e.g. Smith Plumbing & Repair"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                if (errors.businessName) setErrors((p) => ({ ...p, businessName: "" }));
              }}
              autoComplete="organization"
              aria-describedby={errors.businessName ? "biz-name-err" : undefined}
            />
            {errors.businessName && (
              <p id="biz-name-err" className="af-error" role="alert">
                {errors.businessName}
              </p>
            )}
          </div>

          {/* ── Industry chips ── */}
          <div className="af-field">
            <p className="af-label" id="industry-label">
              What type of business? <span className="af-required">*</span>
            </p>
            <div
              className="af-chips"
              role="group"
              aria-labelledby="industry-label"
            >
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  className={`af-chip${industry === ind ? " af-chip--active" : ""}`}
                  onClick={() => {
                    setIndustry(ind);
                    if (errors.industry) setErrors((p) => ({ ...p, industry: "" }));
                  }}
                  aria-pressed={industry === ind}
                >
                  {ind}
                </button>
              ))}
            </div>
            {errors.industry && (
              <p className="af-error" role="alert">
                {errors.industry}
              </p>
            )}
          </div>

          {/* ── Website URL ── */}
          <div className="af-field">
            <label htmlFor="biz-url" className="af-label">
              Website URL{" "}
              <span className="af-optional">(optional — helps us audit lead capture)</span>
            </label>
            <input
              id="biz-url"
              type="url"
              className={`af-input${errors.websiteUrl ? " af-input--error" : ""}${noWebsite ? " af-input--disabled" : ""}`}
              placeholder="https://yourbusiness.com"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value);
                if (errors.websiteUrl) setErrors((p) => ({ ...p, websiteUrl: "" }));
              }}
              disabled={noWebsite}
              aria-describedby={errors.websiteUrl ? "url-err" : undefined}
            />
            {errors.websiteUrl && (
              <p id="url-err" className="af-error" role="alert">
                {errors.websiteUrl}
              </p>
            )}
            <label className="af-checkbox-row">
              <input
                type="checkbox"
                checked={noWebsite}
                onChange={(e) => {
                  setNoWebsite(e.target.checked);
                  if (e.target.checked) setWebsiteUrl("");
                }}
                className="af-checkbox"
              />
              <span className="af-checkbox-label">I don't have a website yet</span>
            </label>
          </div>

          {/* ── Submit ── */}
          <button type="submit" className="af-submit">
            Run My Free Audit
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <p className="af-trust">
            <span>Free forever</span>
            <span className="af-trust-dot" aria-hidden="true">·</span>
            <span>No credit card</span>
            <span className="af-trust-dot" aria-hidden="true">·</span>
            <span>Results in ~15 seconds</span>
          </p>
        </form>
      ) : (
        /* ── Loading state ── */
        <div className="af-loading" aria-live="polite" aria-label="Audit in progress">
          <div className="af-loading-eyebrow">Your Lunavex agents are on it</div>
          <p className="af-loading-name">
            Auditing <strong>{businessName}</strong>
          </p>

          {/* Progress bar */}
          <div className="af-progress-track" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="af-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="af-progress-pct">{Math.round(progressPct)}%</p>

          {/* Agent steps */}
          <div className="af-steps">
            {AGENT_STEPS.map((step, i) => {
              const done = i < loadingStep;
              const active = i === loadingStep;
              return (
                <div
                  key={step.id}
                  className={`af-step${done ? " af-step--done" : ""}${active ? " af-step--active" : ""}`}
                >
                  <div className="af-step-icon" aria-hidden="true">
                    {done ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : active ? (
                      <span className="af-step-spinner" />
                    ) : (
                      <span className="af-step-dot" />
                    )}
                  </div>
                  <div className="af-step-text">
                    <span className="af-step-name">{step.label}</span>
                    <span className="af-step-task">{step.task}</span>
                  </div>
                  {(done || active) && (
                    <span className={`af-step-badge${done ? " af-step-badge--done" : " af-step-badge--running"}`}>
                      {done ? "Done" : "Running"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
