import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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
  { id: "atlas", label: "Atlas", task: "Scanning business presence" },
  { id: "nexus", label: "Nexus", task: "Analysing local competitors" },
  { id: "pulse", label: "Pulse", task: "Reviewing online messaging" },
  { id: "shield", label: "Shield", task: "Validating all data points" },
  { id: "aether", label: "Aether", task: "Scoring & building your report" },
];

interface Props {
  onSubmit: (input: AuditInput) => void;
  loading: boolean;
  loadingStep: number; // 0–4, which agent step is active
}

export function AuditForm({ onSubmit, loading, loadingStep }: Props) {
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState<Industry | "">("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [noWebsite, setNoWebsite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!businessName.trim()) e.businessName = "Enter your business name";
    if (!city.trim()) e.city = "Enter your city or area";
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
      city: city.trim(),
      industry: industry as Industry,
      websiteUrl: noWebsite ? undefined : websiteUrl.trim() || undefined,
    });
  }

  const progressPct = loading ? Math.min(95, ((loadingStep + 1) / AGENT_STEPS.length) * 100) : 0;

  return (
    <div className="p-5 md:p-6">
      {!loading ? (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="biz-name" className="lv-label text-foreground block mb-1.5">
              Business name <span className="text-primary">*</span>
            </Label>
            <Input
              id="biz-name"
              type="text"
              placeholder="e.g. Smith Plumbing & Repair"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                if (errors.businessName) setErrors((p) => ({ ...p, businessName: "" }));
              }}
              autoComplete="organization"
              aria-invalid={!!errors.businessName}
              aria-describedby={errors.businessName ? "biz-name-err" : undefined}
              className={cn(errors.businessName && "border-destructive")}
            />
            {errors.businessName && (
              <p id="biz-name-err" className="lv-meta text-destructive mt-1.5" role="alert">
                {errors.businessName}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="biz-city" className="lv-label text-foreground block mb-1.5">
              City / Area <span className="text-primary">*</span>
            </Label>
            <Input
              id="biz-city"
              type="text"
              placeholder="e.g. Manassas VA, Atlanta GA..."
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (errors.city) setErrors((p) => ({ ...p, city: "" }));
              }}
              autoComplete="address-level2"
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? "biz-city-err" : undefined}
              className={cn(errors.city && "border-destructive")}
            />
            {errors.city && (
              <p id="biz-city-err" className="lv-meta text-destructive mt-1.5" role="alert">
                {errors.city}
              </p>
            )}
          </div>

          <div>
            <p className="lv-label text-foreground mb-1.5" id="industry-label">
              What type of business? <span className="text-primary">*</span>
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="industry-label">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  type="button"
                  onClick={() => {
                    setIndustry(ind);
                    if (errors.industry) setErrors((p) => ({ ...p, industry: "" }));
                  }}
                  aria-pressed={industry === ind}
                  className={cn(
                    "min-h-[36px] px-3.5 py-1.5 rounded-full lv-label font-medium border transition-colors duration-150 ease-out",
                    industry === ind
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary",
                  )}
                >
                  {ind}
                </button>
              ))}
            </div>
            {errors.industry && (
              <p className="lv-meta text-destructive mt-1.5" role="alert">
                {errors.industry}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="biz-url" className="lv-label text-foreground block mb-1.5">
              Website URL{" "}
              <span className="lv-meta text-muted-foreground font-normal">
                (optional — helps us audit lead capture)
              </span>
            </Label>
            <Input
              id="biz-url"
              type="url"
              placeholder="https://yourbusiness.com"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value);
                if (errors.websiteUrl) setErrors((p) => ({ ...p, websiteUrl: "" }));
              }}
              disabled={noWebsite}
              aria-invalid={!!errors.websiteUrl}
              aria-describedby={errors.websiteUrl ? "url-err" : undefined}
              className={cn(errors.websiteUrl && "border-destructive")}
            />
            {errors.websiteUrl && (
              <p id="url-err" className="lv-meta text-destructive mt-1.5" role="alert">
                {errors.websiteUrl}
              </p>
            )}
            <label className="flex items-center gap-2 mt-2.5 cursor-pointer min-h-[36px]">
              <Checkbox
                checked={noWebsite}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setNoWebsite(isChecked);
                  if (isChecked) setWebsiteUrl("");
                }}
              />
              <span className="lv-meta text-muted-foreground select-none">
                I don't have a website yet
              </span>
            </label>
          </div>

          <Button type="submit" className="w-full min-h-[44px] gap-1.5">
            Run My Free Audit
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>

          <p className="lv-meta text-muted-foreground text-center flex justify-center flex-wrap gap-x-1.5">
            <span>No signup required</span>
            <span aria-hidden="true">·</span>
            <span>No credit card</span>
            <span aria-hidden="true">·</span>
            <span>Results in ~15 seconds</span>
          </p>
        </form>
      ) : (
        <div aria-live="polite" aria-label="Audit in progress">
          <p className="lv-label text-primary mb-2">Your Lanavix agents are on it</p>
          <p className="lv-section text-foreground mb-5">
            Auditing <strong className="text-primary">{businessName}</strong>
            {city ? ` in ${city}` : ""}
          </p>

          <div
            className="h-1.5 bg-border rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="lv-meta text-muted-foreground text-right mt-1.5">
            {Math.round(progressPct)}%
          </p>

          <div className="flex flex-col gap-2 mt-4">
            {AGENT_STEPS.map((step, i) => {
              const done = i < loadingStep;
              const active = i === loadingStep;
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border",
                    done && "bg-accent border-primary/30",
                    active && "bg-accent border-primary/40",
                    !done && !active && "bg-background border-border",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      done ? "bg-primary text-primary-foreground" : "bg-border",
                    )}
                    aria-hidden="true"
                  >
                    {done ? (
                      <Check className="h-3 w-3" />
                    ) : active ? (
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin motion-reduce:animate-none" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="lv-label text-foreground font-medium mr-1.5">
                      {step.label}
                    </span>
                    <span className="lv-meta text-muted-foreground">{step.task}</span>
                  </div>
                  {(done || active) && (
                    <span
                      className={cn(
                        "lv-meta font-semibold px-2 py-0.5 rounded-sm shrink-0",
                        done ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary",
                      )}
                    >
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
