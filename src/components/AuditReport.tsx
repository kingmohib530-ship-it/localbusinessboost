import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, ArrowRight, Zap, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AuditResult, AuditCategory } from "@/lib/auditApi";
import { saveAuditLead } from "@/lib/auditApi";

/* ── helpers ── */
const CATEGORY_META: Record<
  keyof AuditResult["categories"],
  { label: string; icon: string; description: string }
> = {
  visibility: {
    label: "Visibility",
    icon: "📍",
    description: "How easily customers find you on Google, Maps, and AI search",
  },
  reputation: {
    label: "Reputation",
    icon: "⭐",
    description: "Your reviews, rating, recency, and response rate",
  },
  leadCapture: {
    label: "Lead Capture",
    icon: "📥",
    description: "How well your website and listings capture contact info",
  },
  conversion: {
    label: "Conversion",
    icon: "💬",
    description: "How easy it is for visitors to book or call you",
  },
};

const EFFORT_LABEL: Record<string, string> = {
  quick: "Quick win",
  medium: "This week",
  strategic: "This month",
};

const EFFORT_CLASS: Record<string, string> = {
  quick: "bg-primary/10 text-primary",
  medium: "bg-accent text-foreground",
  strategic: "bg-[var(--warning)]/15 text-[var(--warning)]",
};

function gradeClass(grade: string) {
  if (grade === "Excellent" || grade === "Good") return "text-primary";
  if (grade === "Fair") return "text-[var(--warning)]";
  return "text-destructive";
}

function scoreColor(score: number) {
  if (score >= 70) return "var(--primary)";
  if (score >= 50) return "var(--warning)";
  return "var(--destructive)";
}

/* ── ScoreRing ── */
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth="5"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize="16"
        fontWeight="700"
        fontFamily="inherit"
      >
        {score}
      </text>
    </svg>
  );
}

/* ── FixItem ── */
function FixItem({
  fix,
  index,
  locked,
}: {
  fix: AuditCategory["fixes"][number];
  index: number;
  locked: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 items-start rounded-md border px-4 py-3.5",
        index === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-background",
        locked && "blur-sm pointer-events-none select-none",
      )}
      aria-hidden={locked}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full lv-meta font-bold",
          index === 0 ? "bg-primary text-primary-foreground" : "bg-border text-muted-foreground",
        )}
      >
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="lv-body text-foreground mb-2">{fix.text}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn("lv-meta font-semibold px-2 py-0.5 rounded-sm", EFFORT_CLASS[fix.effort])}
          >
            {EFFORT_LABEL[fix.effort]}
          </span>
          <span className="lv-meta text-muted-foreground">
            {fix.impact === "high"
              ? "High impact"
              : fix.impact === "medium"
                ? "Medium impact"
                : "Low impact"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── CategorySection ── */
function CategorySection({
  catKey,
  category,
  unlocked,
}: {
  catKey: keyof AuditResult["categories"];
  category: AuditCategory;
  unlocked: boolean;
}) {
  const meta = CATEGORY_META[catKey];

  return (
    <section
      className="border border-border border-t-0 bg-card px-5 md:px-7 py-6"
      aria-labelledby={`cat-${catKey}`}
    >
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xl mt-0.5" aria-hidden="true">
            {meta.icon}
          </span>
          <div>
            <h3 id={`cat-${catKey}`} className="lv-section text-foreground">
              {meta.label}
            </h3>
            <p className="lv-meta text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <ScoreRing score={category.score} />
          <span className={cn("lv-meta font-semibold", gradeClass(category.grade))}>
            {category.grade}
          </span>
        </div>
      </div>

      <p className="lv-body text-muted-foreground italic mb-4">{category.headline}</p>

      <div className="flex flex-col gap-2.5">
        {category.fixes.map((fix, i) => (
          <FixItem key={i} fix={fix} index={i} locked={!unlocked && i > 0} />
        ))}
      </div>
    </section>
  );
}

/* ── EmailGate ── */
function EmailGate({
  result,
  onUnlock,
}: {
  result: AuditResult;
  onUnlock: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await saveAuditLead({ email, result });
      onUnlock(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-border border-t-0 bg-card px-5 md:px-7 py-6">
      <div className="rounded-lg bg-foreground px-6 py-8 md:px-8 text-center">
        <Lock className="h-7 w-7 text-background mx-auto mb-3" aria-hidden="true" />
        <h3 className="lv-section text-background mb-1.5">Unlock your full audit — free</h3>
        <p className="lv-body text-background/70 max-w-md mx-auto mb-5">
          Enter your email to unlock all 8 remaining fixes and your full revenue opportunity
          estimate. No credit card. No spam.
        </p>
        <form
          className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          onSubmit={handleSubmit}
          noValidate
        >
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            aria-label="Email address"
            aria-invalid={!!error}
            aria-describedby={error ? "gate-err" : undefined}
            autoComplete="email"
            className={cn(
              "bg-background/10 border-background/20 text-background placeholder:text-background/40 min-h-[44px]",
              error && "border-destructive",
            )}
          />
          <Button type="submit" disabled={loading} className="min-h-[44px] gap-1.5 shrink-0">
            {loading ? "Unlocking..." : "Unlock free"}
            {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </form>
        {error && (
          <p id="gate-err" className="lv-meta text-destructive mt-2" role="alert">
            {error}
          </p>
        )}
        <p className="lv-meta text-background/40 mt-3">
          We'll email you this report and occasional tips for running a service business.
          Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}

/* ── Main AuditReport ── */
interface Props {
  result: AuditResult;
  onStartOver: () => void;
}

export function AuditReport({ result, onStartOver }: Props) {
  const [unlocked, setUnlocked] = useState(false);

  const cats = Object.entries(result.categories) as Array<
    [keyof AuditResult["categories"], AuditCategory]
  >;

  return (
    <article
      className="rounded-xl border border-border overflow-hidden"
      aria-label={`Business audit for ${result.businessName}`}
    >
      {/* ── Report header ── */}
      <header className="bg-foreground px-5 md:px-7 pt-6 pb-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="flex flex-wrap items-center gap-1.5 lv-meta text-background/50">
            <span>Lanavix Business Audit</span>
            <span aria-hidden="true">·</span>
            <span>{result.industry}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={result.generatedAt}>
              {new Date(result.generatedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
          <button
            type="button"
            onClick={onStartOver}
            className="lv-meta text-background/60 hover:text-background transition-colors duration-150 ease-out"
          >
            ← New audit
          </button>
        </div>
        <h1 className="lv-display text-[26px] md:text-[30px] text-background mb-2">
          {result.businessName}
        </h1>
        <p className="lv-body text-background/70 max-w-xl">{result.executiveSummary}</p>
      </header>

      {/* ── Score overview ── */}
      <section
        className="bg-card border-x border-border px-5 md:px-7 py-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center"
        aria-label="Overall scores"
      >
        <div className="flex items-center gap-4">
          <ScoreRing score={result.overallScore} size={88} />
          <div>
            <div className="lv-meta text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">
              Overall score
            </div>
            <div className={cn("lv-section", gradeClass(result.overallGrade))}>
              {result.overallGrade}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {cats.map(([key, cat]) => {
            const meta = CATEGORY_META[key];
            return (
              <a
                key={key}
                href={`#cat-${key}`}
                className="flex flex-col items-center text-center gap-1 rounded-md border border-border bg-background px-2 py-3 hover:border-primary transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-lg" aria-hidden="true">
                  {meta.icon}
                </span>
                <span className="lv-meta text-muted-foreground">{meta.label}</span>
                <span className="lv-numbers text-xl" style={{ color: scoreColor(cat.score) }}>
                  {cat.score}
                </span>
                <span className={cn("lv-meta font-medium", gradeClass(cat.grade))}>
                  {cat.grade}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      {/* ── Technical scan ── */}
      {result.technicalCheck.hasWebsite && (
        <section
          aria-label="Website technical scan"
          className="bg-card border-x border-border px-5 md:px-7 py-4 flex flex-wrap gap-x-5 gap-y-2 lv-meta text-muted-foreground"
        >
          <span className="font-semibold text-foreground">Real website scan:</span>
          {!result.technicalCheck.reachable ? (
            <span>Site could not be reached — this alone is hurting every category above.</span>
          ) : (
            <>
              <span>SSL: {result.technicalCheck.sslValid ? "Valid" : "Not valid"}</span>
              <span>Load time: {result.technicalCheck.loadTimeMs}ms</span>
              <span>Title tag: {result.technicalCheck.hasTitleTag ? "Present" : "Missing"}</span>
              <span>
                Meta description: {result.technicalCheck.hasMetaDescription ? "Present" : "Missing"}
              </span>
              <span>
                Mobile-friendly tag: {result.technicalCheck.hasViewportTag ? "Present" : "Missing"}
              </span>
            </>
          )}
        </section>
      )}

      {/* ── Revenue opportunity ── */}
      <section
        className="bg-primary/5 border border-primary/20 border-t-0 px-5 md:px-7 py-5"
        aria-label="Revenue opportunity"
      >
        <div className="flex items-center gap-3 mb-2.5">
          <DollarSign className="h-6 w-6 text-primary shrink-0" aria-hidden="true" />
          <div>
            <div className="lv-meta text-primary/80 uppercase tracking-wide font-semibold">
              Estimated revenue opportunity
            </div>
            <div className="lv-section text-foreground">
              {result.revenueOpportunity} in new revenue
            </div>
            <div className="lv-body text-muted-foreground mt-0.5">
              {result.revenueOpportunityDetail}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-sm border border-primary/25 bg-primary/10 px-3 py-2 lv-body text-foreground">
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <span className="font-semibold">Top win: </span>
            {result.topWin}
          </span>
        </div>
      </section>

      {/* ── Category sections ── */}
      {cats.map(([key, cat]) => (
        <CategorySection key={key} catKey={key} category={cat} unlocked={unlocked} />
      ))}

      {/* ── Email gate (shown if not yet unlocked) ── */}
      {!unlocked && <EmailGate result={result} onUnlock={() => setUnlocked(true)} />}

      {/* ── AI disclosure ── */}
      <div className="border border-border border-t-0 bg-card px-5 md:px-7 py-3">
        <p className="lv-meta text-muted-foreground">
          This audit is generated by AI from what you entered and a real scan of your website. It's
          an assessment to help you prioritize, not a guarantee.
        </p>
      </div>

      {/* ── Post-unlock CTA ── */}
      {unlocked && (
        <section
          className="border border-border border-t-0 rounded-b-xl overflow-hidden"
          aria-label="Next steps"
        >
          <div className="border-t-[3px] border-primary px-5 md:px-7 py-8 text-center">
            <h2 className="lv-section text-foreground mb-2">
              Your audit is complete. Ready to fix this?
            </h2>
            <p className="lv-body text-muted-foreground max-w-md mx-auto mb-5">
              Lanavix runs the missed-call text-back, review requests, and lead prospecting for
              service businesses like {result.businessName || "yours"} — real automation you can
              turn on today.
            </p>
            <div className="flex justify-center gap-3 flex-wrap mb-3">
              <Button asChild size="lg" className="gap-1.5 min-h-[44px]">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start your free trial
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-[44px]">
                <Link to="/pricing">View pricing</Link>
              </Button>
            </div>
            <p className="lv-meta text-muted-foreground">
              14-day free trial · No credit card to start
            </p>
          </div>
        </section>
      )}
    </article>
  );
}
