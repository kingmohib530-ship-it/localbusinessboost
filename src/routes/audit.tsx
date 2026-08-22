import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { AuditForm } from "@/components/AuditForm";
import { AuditReport } from "@/components/AuditReport";
import { runBusinessAudit } from "@/lib/auditApi";
import type { AuditInput, AuditResult } from "@/lib/auditApi";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/audit")({
  component: AuditPage,
  head: () => ({
    meta: pageMeta({
      title: "Free Business Audit — Lanavix",
      description:
        "Get a free AI-powered audit of your local business: visibility, reputation, lead capture, and conversion.",
      path: "/audit",
    }),
  }),
});

type PageState = "form" | "loading" | "report" | "error";

const AGENT_STEP_DURATION_MS = 1800;

function AuditPage() {
  const [pageState, setPageState] = useState<PageState>("form");
  const [loadingStep, setLoadingStep] = useState(0); // 0–4
  const [result, setResult] = useState<AuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<AuditInput | null>(null);

  /* Advance loading steps while the API call runs */
  useEffect(() => {
    if (pageState !== "loading") return;
    if (loadingStep >= 4) return;

    const t = setTimeout(() => {
      setLoadingStep((s) => s + 1);
    }, AGENT_STEP_DURATION_MS);

    return () => clearTimeout(t);
  }, [pageState, loadingStep]);

  async function handleSubmit(input: AuditInput) {
    inputRef.current = input;
    setLoadingStep(0);
    setPageState("loading");

    try {
      const auditResult = await runBusinessAudit(input);
      setResult(auditResult);
      setLoadingStep(4); // ensure all steps marked done
      // Small delay so the last step visually completes
      setTimeout(() => setPageState("report"), 600);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPageState("error");
    }
  }

  function handleStartOver() {
    setPageState("form");
    setResult(null);
    setErrorMsg("");
    setLoadingStep(0);
  }

  const showForm = pageState === "form" || pageState === "loading" || pageState === "error";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal nav - deliberately not the full marketing SiteNav, since
          this tool is meant to feel secondary to the main product, not a
          primary destination competing with it for attention. */}
      <nav className="border-b border-border" aria-label="Audit page navigation">
        <div className="max-w-[1120px] mx-auto px-6 h-[60px] flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 lv-label font-bold text-foreground"
            aria-label="Lanavix home"
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary"
              aria-hidden="true"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 2L15.5 5.5V12.5L9 16L2.5 12.5V5.5L9 2Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="9" r="2.5" fill="white" />
              </svg>
            </div>
            Lanavix
          </Link>
          <Link
            to="/"
            className="ml-auto flex items-center gap-1 lv-meta font-medium text-muted-foreground border border-border bg-card rounded-sm px-3 py-1.5 min-h-[36px] hover:border-primary hover:text-primary transition-colors duration-150 ease-out"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </nav>

      {/* Hero strip - hidden once a report is showing, so the report's own
          heading is the page's only H1 and the report doesn't sit under
          marketing copy that no longer applies. */}
      {pageState !== "report" && (
        <div className="border-b border-border py-7 md:py-8 text-center px-6">
          <div className="max-w-[640px] mx-auto">
            <div className="inline-flex items-center gap-1.5 lv-meta font-semibold uppercase tracking-wide text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Free · AI-assisted audit
            </div>
            <h1 className="lv-display text-[24px] md:text-[32px] text-foreground mb-2.5">
              Find out what's costing your business <span className="text-primary">customers</span>
            </h1>
            <p className="lv-body text-muted-foreground max-w-[480px] mx-auto mb-4">
              Enter your business details and get a scored audit across 4 categories — with
              plain-English fixes you can act on today.
            </p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 lv-meta text-muted-foreground">
              <span>Takes 60 seconds</span>
              <span>No credit card</span>
              <span>Free to run</span>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-[720px] w-full mx-auto px-6 py-8 pb-16 flex-1" id="main-content">
        {showForm && (
          <div
            className="rounded-xl border border-border bg-card overflow-hidden"
            role="region"
            aria-label="Business audit form"
          >
            <div className="px-5 md:px-7 pt-5 pb-4 border-b border-border flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="lv-body text-foreground font-semibold">Free Business Audit</div>
                <div className="lv-meta text-muted-foreground mt-0.5">
                  Scored across Visibility · Reputation · Lead Capture · Conversion
                </div>
              </div>
            </div>

            <AuditForm
              onSubmit={handleSubmit}
              loading={pageState === "loading"}
              loadingStep={loadingStep}
            />

            {pageState === "error" && (
              <div
                className="mx-5 md:mx-7 mb-5 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3"
                role="alert"
              >
                <p className="lv-label text-destructive">Audit failed</p>
                <p className="lv-body text-foreground mt-0.5">{errorMsg}</p>
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="mt-2.5 min-h-[36px] px-3.5 rounded-sm bg-destructive text-white lv-label font-semibold hover:opacity-90 transition-opacity duration-150 ease-out"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {pageState === "report" && result && (
          <div role="region" aria-label="Audit report">
            <AuditReport result={result} onStartOver={handleStartOver} />
          </div>
        )}
      </main>
    </div>
  );
}
