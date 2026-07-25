import { useState } from "react";
import type { AuditResult, AuditCategory } from "@/lib/auditApi";
import { saveAuditLead } from "@/lib/auditApi";

/* ── helpers ── */
const CATEGORY_META: Record<
  keyof AuditResult["categories"],
  { label: string; icon: string; description: string }
> = {
  visibility:  { label: "Visibility",   icon: "📍", description: "How easily customers find you on Google, Maps, and AI search" },
  reputation:  { label: "Reputation",   icon: "⭐", description: "Your reviews, rating, recency, and response rate"             },
  leadCapture: { label: "Lead Capture", icon: "📥", description: "How well your website and listings capture contact info"        },
  conversion:  { label: "Conversion",   icon: "💬", description: "How easy it is for visitors to book or call you"               },
};

const EFFORT_LABEL: Record<string, string> = {
  quick: "Quick win",
  medium: "This week",
  strategic: "This month",
};

const EFFORT_COLOR: Record<string, string> = {
  quick: "ar-badge--green",
  medium: "ar-badge--blue",
  strategic: "ar-badge--amber",
};

function gradeColor(grade: string) {
  if (grade === "Excellent" || grade === "Good") return "ar-grade--good";
  if (grade === "Fair") return "ar-grade--fair";
  return "ar-grade--bad";
}

function scoreColor(score: number) {
  if (score >= 70) return "#10B981";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

/* ── ScoreRing ── */
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ar-ring-bg, #E2E8F0)" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize="16" fontWeight="600" fontFamily="inherit">
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
    <div className={`ar-fix${locked ? " ar-fix--locked" : ""}`} aria-hidden={locked}>
      <div className="ar-fix-num">{index + 1}</div>
      <div className="ar-fix-body">
        <p className="ar-fix-text">{fix.text}</p>
        <div className="ar-fix-meta">
          <span className={`ar-badge ${EFFORT_COLOR[fix.effort]}`}>
            {EFFORT_LABEL[fix.effort]}
          </span>
          <span className="ar-fix-impact">
            {fix.impact === "high" ? "High impact" : fix.impact === "medium" ? "Medium impact" : "Low impact"}
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
    <section className="ar-cat" aria-labelledby={`cat-${catKey}`}>
      <div className="ar-cat-header">
        <div className="ar-cat-left">
          <span className="ar-cat-icon" aria-hidden="true">{meta.icon}</span>
          <div>
            <h3 id={`cat-${catKey}`} className="ar-cat-title">{meta.label}</h3>
            <p className="ar-cat-desc">{meta.description}</p>
          </div>
        </div>
        <div className="ar-cat-right">
          <ScoreRing score={category.score} />
          <span className={`ar-grade ${gradeColor(category.grade)}`}>{category.grade}</span>
        </div>
      </div>

      <p className="ar-cat-headline">{category.headline}</p>

      <div className="ar-fixes">
        {category.fixes.map((fix, i) => (
          <FixItem
            key={i}
            fix={fix}
            index={i}
            locked={!unlocked && i > 0}
          />
        ))}
      </div>
    </section>
  );
}

/* ── EmailGate ── */
function EmailGate({ result, onUnlock }: { result: AuditResult; onUnlock: (email: string) => void }) {
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
    <div className="ar-gate" role="complementary" aria-label="Unlock full audit">
      <div className="ar-gate-inner">
        <div className="ar-gate-lock" aria-hidden="true">🔒</div>
        <h3 className="ar-gate-title">Unlock your full audit — free</h3>
        <p className="ar-gate-sub">
          Enter your email to unlock all 8 remaining fixes and your full revenue opportunity estimate.
          No credit card. No spam.
        </p>
        <form className="ar-gate-form" onSubmit={handleSubmit} noValidate>
          <input
            type="email"
            className={`ar-gate-input${error ? " ar-gate-input--error" : ""}`}
            placeholder="your@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            aria-label="Email address"
            aria-describedby={error ? "gate-err" : undefined}
            autoComplete="email"
          />
          <button type="submit" className="ar-gate-btn" disabled={loading}>
            {loading ? (
              <span className="ar-gate-spinner" aria-label="Loading" />
            ) : (
              <>
                Unlock free
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </form>
        {error && <p id="gate-err" className="ar-gate-error" role="alert">{error}</p>}
        <p className="ar-gate-fine">
          By entering your email, you create a free Lanavix account.
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

  const overallColor = scoreColor(result.overallScore);

  return (
    <article className="ar-wrap" aria-label={`Business audit for ${result.businessName}`}>

      {/* ── Report header ── */}
      <header className="ar-header">
        <div className="ar-header-top">
          <div className="ar-header-meta">
            <span className="ar-header-tag">Lanavix Business Audit</span>
            <span className="ar-header-dot" aria-hidden="true">·</span>
            <span className="ar-header-tag">{result.industry}</span>
            <span className="ar-header-dot" aria-hidden="true">·</span>
            <time className="ar-header-tag" dateTime={result.generatedAt}>
              {new Date(result.generatedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
          <button className="ar-restart" onClick={onStartOver} aria-label="Start a new audit">
            ← New audit
          </button>
        </div>
        <h1 className="ar-title">{result.businessName}</h1>
        <p className="ar-summary">{result.executiveSummary}</p>
      </header>

      {/* ── Score overview ── */}
      <section className="ar-scores" aria-label="Overall scores">
        <div className="ar-overall">
          <div className="ar-overall-ring">
            <ScoreRing score={result.overallScore} size={96} />
          </div>
          <div className="ar-overall-text">
            <div className="ar-overall-label">Overall score</div>
            <div className="ar-overall-grade" style={{ color: overallColor }}>
              {result.overallGrade}
            </div>
            <div className="ar-overall-agents">
              Generated by {result.agentsUsed.join(", ")}
            </div>
          </div>
        </div>

        <div className="ar-score-grid">
          {cats.map(([key, cat]) => {
            const meta = CATEGORY_META[key];
            return (
              <a key={key} href={`#cat-${key}`} className="ar-score-card">
                <span className="ar-score-card-icon" aria-hidden="true">{meta.icon}</span>
                <span className="ar-score-card-label">{meta.label}</span>
                <span className="ar-score-card-val" style={{ color: scoreColor(cat.score) }}>
                  {cat.score}
                </span>
                <span className={`ar-score-card-grade ${gradeColor(cat.grade)}`}>
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
          style={{ background: "#fff", border: "1.5px solid var(--border, #E2E8F0)", borderTop: "none", padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "10px 20px", fontSize: 13, color: "#475569" }}
        >
          <span style={{ fontWeight: 700, color: "#0F172A" }}>Real website scan:</span>
          {!result.technicalCheck.reachable ? (
            <span>Site could not be reached — this alone is hurting every category above.</span>
          ) : (
            <>
              <span>SSL: {result.technicalCheck.sslValid ? "✅ Valid" : "❌ Not valid"}</span>
              <span>Load time: {result.technicalCheck.loadTimeMs}ms</span>
              <span>Title tag: {result.technicalCheck.hasTitleTag ? "✅" : "❌ Missing"}</span>
              <span>Meta description: {result.technicalCheck.hasMetaDescription ? "✅" : "❌ Missing"}</span>
              <span>Mobile-friendly tag: {result.technicalCheck.hasViewportTag ? "✅" : "❌ Missing"}</span>
            </>
          )}
        </section>
      )}

      {/* ── Revenue opportunity ── */}
      <section className="ar-revenue" aria-label="Revenue opportunity">
        <div className="ar-revenue-inner">
          <span className="ar-revenue-icon" aria-hidden="true">💰</span>
          <div className="ar-revenue-text">
            <div className="ar-revenue-label">Estimated revenue opportunity</div>
            <div className="ar-revenue-amount">{result.revenueOpportunity} in new revenue</div>
            <div className="ar-revenue-detail">{result.revenueOpportunityDetail}</div>
          </div>
        </div>
        <div className="ar-topwin">
          <span className="ar-topwin-label">⚡ Top win:</span>
          <span className="ar-topwin-text">{result.topWin}</span>
        </div>
      </section>

      {/* ── Category sections ── */}
      <div className="ar-categories">
        {cats.map(([key, cat]) => (
          <CategorySection
            key={key}
            catKey={key}
            category={cat}
            unlocked={unlocked}
          />
        ))}
      </div>

      {/* ── Email gate (shown if not yet unlocked) ── */}
      {!unlocked && (
        <EmailGate result={result} onUnlock={() => setUnlocked(true)} />
      )}

      {/* ── Post-unlock CTA ── */}
      {unlocked && (
        <section className="ar-cta" aria-label="Next steps">
          <div className="ar-cta-inner">
            <div className="ar-cta-icon" aria-hidden="true">🚀</div>
            <h2 className="ar-cta-title">
              Your audit is complete. Ready to fix this?
            </h2>
            <p className="ar-cta-sub">
              Lanavix's 8 AI agents can run your first growth campaign in 60 seconds —
              finding leads, writing outreach, and recovering reviews automatically.
            </p>
            <div className="ar-cta-actions">
              <a href="/auth" className="ar-cta-btn ar-cta-btn--primary">
                Start fixing for free
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <a href="/pricing" className="ar-cta-btn ar-cta-btn--secondary">
                View pricing
              </a>
            </div>
            <p className="ar-cta-trust">Free forever to start · No credit card · Cancel anytime</p>
          </div>
        </section>
      )}
    </article>
  );
}
