import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Copy, Plus, Send, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StarRatingInput } from "@/components/StarRatingInput";
import { StatusDot, type LvStatus } from "@/components/StatusDot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/timeFormat";

export const Route = createFileRoute("/_authenticated/app/reputation")({
  component: ReputationPage,
});

interface RequestRow {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  job_description: string | null;
  google_review_url: string | null;
  status: string;
  sent_at: string;
}

interface ReviewRow {
  id: string;
  reviewer_name: string | null;
  star_rating: number | null;
  review_text: string;
  ai_response: string | null;
  created_at: string;
}

type ReviewTab = "attention" | "all";

const PAGE_SIZE = 20;
const STALE_REQUEST_DAYS = 14;
const NEEDS_ATTENTION_MAX_RATING = 3;

function requestStatus(r: RequestRow): LvStatus {
  if (r.status === "reviewed") return "done";
  const ageDays = (Date.now() - new Date(r.sent_at).getTime()) / 86400000;
  return ageDays >= STALE_REQUEST_DAYS ? "stale" : "no_reply";
}

// Every persisted review already has a drafted response (the backend only
// ever inserts a row after generation succeeds - see /api/review-response),
// so this isn't "responded vs unanswered." It's "still worth a personal
// look before you post that draft" (low rating) vs "drafted, low urgency."
function reviewStatus(r: ReviewRow): LvStatus {
  return r.star_rating !== null && r.star_rating <= NEEDS_ATTENTION_MAX_RATING
    ? "waiting_on_you"
    : "done";
}

function reviewerLabel(r: ReviewRow): string {
  return r.reviewer_name || "Anonymous";
}

function requestLabel(r: RequestRow): string {
  return r.customer_name || r.customer_phone;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }
    : { "Content-Type": "application/json" };
}

function ReviewSkeletonRows() {
  return (
    <div className="rounded-md border border-border overflow-hidden divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}

const EMPTY_REQUEST_FORM = { name: "", phone: "", job: "", googleUrl: "" };
const EMPTY_WRITE_FORM = { reviewerName: "", starRating: 5, reviewText: "" };

function ReputationPage() {
  const [reviewTab, setReviewTab] = useState<ReviewTab>("attention");
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsLoadingMore, setReviewsLoadingMore] = useState(false);
  const [reviewsHasMore, setReviewsHasMore] = useState(false);
  const [reviewsPageIndex, setReviewsPageIndex] = useState(0);
  const [reviewsError, setReviewsError] = useState("");

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsLoadingMore, setRequestsLoadingMore] = useState(false);
  const [requestsHasMore, setRequestsHasMore] = useState(false);
  const [requestsPageIndex, setRequestsPageIndex] = useState(0);
  const [requestsError, setRequestsError] = useState("");
  const [markingReviewedId, setMarkingReviewedId] = useState<string | null>(null);

  const [everCount, setEverCount] = useState<number | null>(null);
  const [avgRating, setAvgRating] = useState<string>("—");
  const [attentionCount, setAttentionCount] = useState<number | null>(null);
  const [waitingCount, setWaitingCount] = useState<number | null>(null);

  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const [selectedReview, setSelectedReview] = useState<ReviewRow | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST_FORM);
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestFormError, setRequestFormError] = useState("");

  const [writeOpen, setWriteOpen] = useState(false);
  const [writeForm, setWriteForm] = useState(EMPTY_WRITE_FORM);
  const [generating, setGenerating] = useState(false);
  const [writeResult, setWriteResult] = useState("");
  const [writeError, setWriteError] = useState("");

  const isPaidActive =
    ["solo", "crew", "agency"].includes(subscriptionTier || "") &&
    ["active", "trialing", "past_due"].includes(subscriptionStatus || "");
  const isCrewPlus = subscriptionTier === "crew" || subscriptionTier === "agency";

  useEffect(() => {
    loadPlan();
    loadEverCount();
    loadSummaryStats();
    loadRequests(0);
  }, []);

  useEffect(() => {
    setReviewsPageIndex(0);
    loadReviews(reviewTab, 0);
  }, [reviewTab]);

  async function loadPlan() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("subscription_tier, subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    setSubscriptionTier(data?.subscription_tier ?? null);
    setSubscriptionStatus(data?.subscription_status ?? null);
  }

  async function loadEverCount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [reviewsCount, requestsCount] = await Promise.all([
      supabase
        .from("review_responses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("review_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    setEverCount((reviewsCount.count ?? 0) + (requestsCount.count ?? 0));
  }

  /** Small summary strip only - three real numbers, independent of
   * whichever page of either paginated list is currently loaded. */
  async function loadSummaryStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [ratings, attention, waiting] = await Promise.all([
      supabase
        .from("review_responses")
        .select("star_rating")
        .eq("user_id", user.id)
        .not("star_rating", "is", null),
      supabase
        .from("review_responses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lte("star_rating", NEEDS_ATTENTION_MAX_RATING),
      supabase
        .from("review_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "sent"),
    ]);
    if (!ratings.error) {
      const values = (ratings.data || []).map((r) => r.star_rating || 0);
      setAvgRating(
        values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "—",
      );
    }
    // Leave the count at its previous value (null until first loaded) on
    // error, rather than defaulting to 0 - a failed count is unknown, not
    // zero, and showing 0 would misleadingly read as "you're caught up."
    if (!attention.error) setAttentionCount(attention.count ?? 0);
    if (!waiting.error) setWaitingCount(waiting.count ?? 0);
  }

  async function loadReviews(tab: ReviewTab, page: number) {
    if (page === 0) setReviewsLoading(true);
    else setReviewsLoadingMore(true);
    setReviewsError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const from = page * PAGE_SIZE;
      let query = supabase.from("review_responses").select("*").eq("user_id", user.id);
      if (tab === "attention") {
        query = query
          .lte("star_rating", NEEDS_ATTENTION_MAX_RATING)
          .order("star_rating", { ascending: true })
          .order("created_at", { ascending: true });
      } else {
        query = query.order("created_at", { ascending: false });
      }
      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data as ReviewRow[]) ?? [];
      setReviews((prev) => (page === 0 ? rows : [...prev, ...rows]));
      setReviewsHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setReviewsError(errorMessage(err, "Reviews couldn't load."));
    } finally {
      setReviewsLoading(false);
      setReviewsLoadingMore(false);
    }
  }

  async function loadRequests(page: number) {
    if (page === 0) setRequestsLoading(true);
    else setRequestsLoadingMore(true);
    setRequestsError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const from = page * PAGE_SIZE;
      const { data, error } = await supabase
        .from("review_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const rows = (data as RequestRow[]) ?? [];
      setRequests((prev) => (page === 0 ? rows : [...prev, ...rows]));
      setRequestsHasMore(rows.length === PAGE_SIZE);
    } catch (err) {
      setRequestsError(errorMessage(err, "Review requests couldn't load."));
    } finally {
      setRequestsLoading(false);
      setRequestsLoadingMore(false);
    }
  }

  function refreshAfterRequestSent() {
    setRequestsPageIndex(0);
    loadRequests(0);
    loadEverCount();
    loadSummaryStats();
  }

  function refreshAfterReviewWritten() {
    setReviewsPageIndex(0);
    loadReviews(reviewTab, 0);
    loadEverCount();
    loadSummaryStats();
  }

  async function markReviewed(id: string) {
    setMarkingReviewedId(id);
    try {
      const headers = await authHeader();
      const res = await fetch(`/api/review-requests/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "reviewed" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Couldn't mark this as reviewed. Please try again.");
        return;
      }
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "reviewed" } : r)));
      loadSummaryStats();
      toast.success("Marked as reviewed.");
    } catch {
      toast.error("Couldn't mark this as reviewed. Please try again.");
    } finally {
      setMarkingReviewedId(null);
    }
  }

  function openRequestDialog() {
    setRequestForm(EMPTY_REQUEST_FORM);
    setRequestFormError("");
    setRequestOpen(true);
  }

  async function handleSendRequest(e: FormEvent) {
    e.preventDefault();
    if (!requestForm.phone.trim()) {
      setRequestFormError("Customer phone is required.");
      return;
    }
    setRequestSaving(true);
    setRequestFormError("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/review-request", {
        method: "POST",
        headers,
        body: JSON.stringify({
          customerName: requestForm.name.trim(),
          customerPhone: requestForm.phone.trim(),
          jobDescription: requestForm.job.trim(),
          googleReviewUrl: requestForm.googleUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to send the review request");
      setRequestOpen(false);
      toast.success("Review request sent.");
      refreshAfterRequestSent();
    } catch (err) {
      setRequestFormError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setRequestSaving(false);
    }
  }

  function openWriteDialog() {
    setWriteForm(EMPTY_WRITE_FORM);
    setWriteResult("");
    setWriteError("");
    setWriteOpen(true);
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!writeForm.reviewText.trim()) {
      setWriteError("Paste the review text first.");
      return;
    }
    setGenerating(true);
    setWriteError("");
    setWriteResult("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/review-response", {
        method: "POST",
        headers,
        body: JSON.stringify({
          reviewText: writeForm.reviewText.trim(),
          reviewerName: writeForm.reviewerName.trim(),
          starRating: writeForm.starRating,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to generate a response");
      setWriteResult(data.response);
      refreshAfterReviewWritten();
    } catch (err) {
      setWriteError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setGenerating(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Response copied to clipboard.");
    } catch {
      toast.error("Couldn't copy - please select and copy the text manually.");
    }
  }

  const isFirstRun = everCount === 0;
  const isReviewsEmpty = !reviewsLoading && !reviewsError && reviews.length === 0;

  return (
    <div className="lv-light min-h-full bg-background">
      <div className="max-w-[1080px] mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="lv-page-title text-foreground">Reviews</h1>
            {!isFirstRun && attentionCount !== null && waitingCount !== null && (
              <p className="lv-body text-muted-foreground mt-1">
                <span className="lv-numbers">{avgRating}</span> average
                {" · "}
                <span className="lv-numbers">{attentionCount}</span> need attention
                {" · "}
                <span className="lv-numbers">{waitingCount}</span>{" "}
                {waitingCount === 1 ? "request" : "requests"} waiting
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={openRequestDialog}
              className="gap-1.5 min-h-[44px] md:min-h-[38px]"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              Send request
            </Button>
            <Button
              size="sm"
              onClick={openWriteDialog}
              className="gap-1.5 min-h-[44px] md:min-h-[38px]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Log a review
            </Button>
          </div>
        </div>

        {isFirstRun ? (
          <div className="rounded-md border border-border py-16 px-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
              <Star className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="lv-body text-foreground font-medium">No reviews or requests yet</p>
            <p className="lv-meta text-muted-foreground mt-1 max-w-sm mx-auto">
              Send a review request after your next job, or log a review you've already received to
              draft a response.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button size="sm" onClick={openRequestDialog} className="gap-1.5">
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
                Send first request
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Reviews */}
            <div
              className="flex items-center gap-1.5 mb-4"
              role="tablist"
              aria-label="Reviews filter"
              onKeyDown={(e) => {
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const next: ReviewTab = reviewTab === "attention" ? "all" : "attention";
                setReviewTab(next);
                requestAnimationFrame(() => {
                  document.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
                });
              }}
            >
              {(
                [
                  { key: "attention" as const, label: "Needs attention", count: attentionCount },
                  { key: "all" as const, label: "All reviews", count: null },
                ] satisfies { key: ReviewTab; label: string; count: number | null }[]
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  data-tab={t.key}
                  aria-selected={reviewTab === t.key}
                  tabIndex={reviewTab === t.key ? 0 : -1}
                  onClick={() => setReviewTab(t.key)}
                  className={cn(
                    "min-h-[36px] rounded-sm border px-3 py-1.5 lv-label transition-colors duration-150 ease-out whitespace-nowrap",
                    reviewTab === t.key
                      ? "border-primary bg-accent text-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {t.label}
                  {t.count !== null && (
                    <span
                      className={cn(
                        "ml-1.5 lv-numbers",
                        reviewTab === t.key ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {reviewsError && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="lv-label text-destructive">Reviews couldn't load</p>
                <p className="lv-body text-foreground mt-0.5">{reviewsError}</p>
                <p className="lv-meta text-muted-foreground mt-1">
                  Review requests below still work - try again, or come back in a moment.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => loadReviews(reviewTab, 0)}
                >
                  Retry
                </Button>
              </div>
            )}

            {reviewsLoading ? (
              <ReviewSkeletonRows />
            ) : reviewsError ? null : isReviewsEmpty ? (
              <div className="rounded-md border border-border py-10 px-6 text-center mb-8">
                <p className="lv-body text-foreground font-medium">
                  {reviewTab === "attention" ? "You're caught up" : "No reviews logged yet"}
                </p>
                <p className="lv-meta text-muted-foreground mt-1">
                  {reviewTab === "attention"
                    ? "No reviews need a response right now."
                    : "Log a review to draft a response for it."}
                </p>
              </div>
            ) : (
              <div className="mb-8">
                <ul className="rounded-md border border-border bg-card divide-y divide-border overflow-hidden">
                  {reviews.map((r) => (
                    <li key={r.id}>
                      {/* Not a <button>: StarRatingInput renders its own
                          (disabled, non-interactive) star buttons, and a
                          button can't legally contain a nested button - a
                          role="button" div with the same keyboard handling
                          gets the same click/keyboard behavior without the
                          invalid HTML. */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedReview(r)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          setSelectedReview(r);
                        }}
                        className="w-full min-h-[44px] text-left px-4 py-3 hover:bg-accent transition-colors duration-150 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="lv-body text-foreground font-medium truncate"
                            title={reviewerLabel(r)}
                          >
                            {reviewerLabel(r)}
                          </span>
                          <StatusDot status={reviewStatus(r)} className="shrink-0" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <StarRatingInput rating={r.star_rating ?? 0} size={13} />
                          <span className="lv-meta text-muted-foreground shrink-0">
                            {r.star_rating ? `${r.star_rating}.0` : "No rating"}
                            {" · "}
                            {relativeTime(r.created_at)} ago
                          </span>
                        </div>
                        <p className="lv-body text-foreground mt-1.5 line-clamp-2">
                          {r.review_text || "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {reviewsHasMore && (
                  <div className="flex justify-center mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reviewsLoadingMore}
                      onClick={() => {
                        const next = reviewsPageIndex + 1;
                        setReviewsPageIndex(next);
                        loadReviews(reviewTab, next);
                      }}
                    >
                      {reviewsLoadingMore ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Review requests */}
            <section aria-labelledby="requests-heading">
              <h2 id="requests-heading" className="lv-label text-muted-foreground mb-2">
                Review requests
              </h2>

              {requestsError && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <p className="lv-label text-destructive">Review requests couldn't load</p>
                  <p className="lv-body text-foreground mt-0.5">{requestsError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => loadRequests(0)}
                  >
                    Retry
                  </Button>
                </div>
              )}

              {requestsLoading ? (
                <ReviewSkeletonRows />
              ) : requestsError ? null : requests.length === 0 ? (
                <div className="rounded-md border border-border py-8 px-6 text-center">
                  <p className="lv-body text-foreground font-medium">No requests sent yet</p>
                  <p className="lv-meta text-muted-foreground mt-1">
                    Send one after your next completed job.
                  </p>
                </div>
              ) : (
                <>
                  <ul className="rounded-md border border-border bg-card divide-y divide-border overflow-hidden">
                    {requests.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 min-h-[44px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="lv-body text-foreground font-medium truncate"
                              title={requestLabel(r)}
                            >
                              {requestLabel(r)}
                            </span>
                            <StatusDot status={requestStatus(r)} className="shrink-0" />
                          </div>
                          <div className="lv-meta text-muted-foreground truncate mt-0.5">
                            {new Date(r.sent_at).toLocaleDateString()}
                            {r.job_description ? ` · ${r.job_description}` : ""}
                          </div>
                        </div>
                        {r.status !== "reviewed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 min-h-[44px] md:min-h-[32px]"
                            onClick={() => markReviewed(r.id)}
                            disabled={markingReviewedId === r.id}
                            title="Mark this request as reviewed once the customer leaves a review"
                          >
                            {markingReviewedId === r.id ? "Saving..." : "Mark reviewed"}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {requestsHasMore && (
                    <div className="flex justify-center mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={requestsLoadingMore}
                        onClick={() => {
                          const next = requestsPageIndex + 1;
                          setRequestsPageIndex(next);
                          loadRequests(next);
                        }}
                      >
                        {requestsLoadingMore ? "Loading..." : "Load more"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>

      {/* Send review request dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="lv-light sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="lv-section">Send a review request</DialogTitle>
          </DialogHeader>
          {!isPaidActive ? (
            <PlanGateNotice
              title="Review request texts are a paid feature"
              description="Subscribe to Solo, Crew, or Agency to start sending them."
            />
          ) : (
            <form onSubmit={handleSendRequest} className="space-y-3">
              <p className="lv-meta text-muted-foreground">
                We'll text your customer a friendly message with a direct link to leave you a Google
                review.
              </p>
              <div>
                <label htmlFor="req-name" className="lv-label text-foreground block mb-1">
                  Customer name
                </label>
                <Input
                  id="req-name"
                  value={requestForm.name}
                  onChange={(e) => setRequestForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. John Smith"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="req-phone" className="lv-label text-foreground block mb-1">
                  Customer phone
                </label>
                <Input
                  id="req-phone"
                  value={requestForm.phone}
                  onChange={(e) => setRequestForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. 404-555-0100"
                  required
                />
              </div>
              <div>
                <label htmlFor="req-job" className="lv-label text-foreground block mb-1">
                  Job completed
                </label>
                <Input
                  id="req-job"
                  value={requestForm.job}
                  onChange={(e) => setRequestForm((f) => ({ ...f, job: e.target.value }))}
                  placeholder="e.g. AC repair, roof inspection..."
                />
              </div>
              <div>
                <label htmlFor="req-url" className="lv-label text-foreground block mb-1">
                  Your Google review link
                </label>
                <Input
                  id="req-url"
                  value={requestForm.googleUrl}
                  onChange={(e) => setRequestForm((f) => ({ ...f, googleUrl: e.target.value }))}
                  placeholder="https://g.page/r/your-business/review"
                />
                <p className="lv-meta text-muted-foreground mt-1">
                  Find this in Google Business Profile → Get more reviews
                </p>
              </div>
              {requestFormError && <p className="lv-meta text-destructive">{requestFormError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={requestSaving} className="gap-1.5">
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  {requestSaving ? "Sending..." : "Send request"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Log a review / write a response dialog */}
      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent className="lv-light sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="lv-section">Log a review</DialogTitle>
          </DialogHeader>
          {!isCrewPlus ? (
            <PlanGateNotice
              title="The AI review response writer is a Crew feature"
              description="Upgrade to Crew or Agency to generate responses automatically."
            />
          ) : (
            <form onSubmit={handleGenerate} className="space-y-3">
              <p className="lv-meta text-muted-foreground">
                Paste a review you've received and get a professional draft response - copy it and
                post it as your reply on Google.
              </p>
              <div>
                <label className="lv-label text-foreground block mb-1">Star rating</label>
                <StarRatingInput
                  rating={writeForm.starRating}
                  onChange={(n) => setWriteForm((f) => ({ ...f, starRating: n }))}
                />
              </div>
              <div>
                <label htmlFor="write-name" className="lv-label text-foreground block mb-1">
                  Reviewer name
                </label>
                <Input
                  id="write-name"
                  value={writeForm.reviewerName}
                  onChange={(e) => setWriteForm((f) => ({ ...f, reviewerName: e.target.value }))}
                  placeholder="e.g. Sarah M."
                />
              </div>
              <div>
                <label htmlFor="write-text" className="lv-label text-foreground block mb-1">
                  Review text
                </label>
                <Textarea
                  id="write-text"
                  value={writeForm.reviewText}
                  onChange={(e) => setWriteForm((f) => ({ ...f, reviewText: e.target.value }))}
                  placeholder="Paste the review here..."
                  rows={4}
                  required
                />
              </div>
              {writeError && <p className="lv-meta text-destructive">{writeError}</p>}
              {!writeResult && (
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setWriteOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={generating}>
                    {generating ? "Writing response..." : "Generate response"}
                  </Button>
                </DialogFooter>
              )}
              {writeResult && (
                <>
                  <div className="rounded-md border border-border px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="lv-label text-foreground">Drafted response</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => copyText(writeResult)}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy
                      </Button>
                    </div>
                    <p className="lv-body text-foreground">{writeResult}</p>
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={() => setWriteOpen(false)}>
                      Done
                    </Button>
                  </DialogFooter>
                </>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Review detail sheet */}
      <Sheet
        open={!!selectedReview}
        onOpenChange={(v) => {
          if (!v) setSelectedReview(null);
        }}
      >
        <SheetContent side="right" className="lv-light w-full sm:max-w-xl overflow-y-auto">
          {selectedReview && (
            <>
              <SheetHeader className="pr-8 text-left">
                <SheetTitle className="lv-section text-foreground truncate">
                  {reviewerLabel(selectedReview)}
                </SheetTitle>
                <div className="flex items-center gap-1.5 mt-1">
                  <StarRatingInput rating={selectedReview.star_rating ?? 0} size={16} />
                  <span className="lv-meta text-muted-foreground">
                    {selectedReview.star_rating ? `${selectedReview.star_rating}.0` : "No rating"}
                    {" · "}
                    {relativeTime(selectedReview.created_at)} ago
                  </span>
                </div>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                <div>
                  <p className="lv-label text-foreground mb-1.5">Review</p>
                  <p className="lv-body text-foreground whitespace-pre-wrap">
                    {selectedReview.review_text || "—"}
                  </p>
                </div>

                {selectedReview.ai_response && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="lv-label text-foreground">Drafted response</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => copyText(selectedReview.ai_response!)}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        Copy
                      </Button>
                    </div>
                    <p className="lv-body text-foreground rounded-md border border-border px-3 py-2">
                      {selectedReview.ai_response}
                    </p>
                    <p className="lv-meta text-muted-foreground mt-1.5">
                      Lanavix doesn't post to Google automatically - copy this and paste it as your
                      reply.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PlanGateNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-border px-4 py-3">
      <p className="lv-label text-foreground">{title}</p>
      <p className="lv-body text-muted-foreground mt-0.5">{description}</p>
      <Button size="sm" className="mt-3" asChild>
        <Link to="/app/billing">Upgrade now</Link>
      </Button>
    </div>
  );
}
