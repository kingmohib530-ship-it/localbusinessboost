import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Send, Star, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StarRatingInput } from "@/components/StarRatingInput";

export const Route = createFileRoute("/_authenticated/app/reputation")({
  component: ReputationPage,
});

interface ReviewRequest {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  job_description: string | null;
  status: string;
  sent_at: string;
}

interface ReviewResponse {
  id: string;
  reviewer_name: string | null;
  star_rating: number | null;
  review_text: string;
  ai_response: string | null;
  created_at: string;
}


const PAGE_SIZE = 20;

function ReputationPage() {
  const [tab, setTab] = useState<"dashboard" | "request" | "respond">("dashboard");
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [requestsLoadingMore, setRequestsLoadingMore] = useState(false);
  const [requestsHasMore, setRequestsHasMore] = useState(false);
  const [requestsPageIndex, setRequestsPageIndex] = useState(0);
  const [responses, setResponses] = useState<ReviewResponse[]>([]);
  const [responsesLoadingMore, setResponsesLoadingMore] = useState(false);
  const [responsesHasMore, setResponsesHasMore] = useState(false);
  const [responsesPageIndex, setResponsesPageIndex] = useState(0);
  const [stats, setStats] = useState({ sent: 0, reviewed: 0, responses: 0, avgRating: "—" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);

  // Request form
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [sendOk, setSendOk] = useState(false);

  // Response form
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [starRating, setStarRating] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [genError, setGenError] = useState("");

  useEffect(() => {
    loadStats();
    loadRequests(0);
    loadResponses(0);
    loadPlan();
  }, []);

  async function loadPlan() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle();
    setSubscriptionTier(data?.subscription_tier ?? null);
  }

  /**
   * Independent of the two paginated lists below - these tiles need
   * accurate all-time totals regardless of how many pages of history the
   * user has loaded so far. Counts use head:true (a real SQL COUNT, not a
   * row fetch); avg rating reads only the one narrow column it needs
   * instead of full rows.
   */
  async function loadStats() {
    setLoading(true);
    setLoadError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [sentCount, reviewedCount, responsesCount, ratings] = await Promise.all([
      supabase.from("review_requests").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("review_requests").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "reviewed"),
      supabase.from("review_responses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("review_responses").select("star_rating").eq("user_id", user.id).not("star_rating", "is", null),
    ]);
    if (sentCount.error || reviewedCount.error || responsesCount.error || ratings.error) {
      console.error("[reputation] failed to load stats", sentCount.error || reviewedCount.error || responsesCount.error || ratings.error);
      setLoadError("Couldn't load your reputation data. Please refresh the page.");
    }
    const ratingValues = (ratings.data || []).map((r) => r.star_rating || 0);
    setStats({
      sent: sentCount.count ?? 0,
      reviewed: reviewedCount.count ?? 0,
      responses: responsesCount.count ?? 0,
      avgRating: ratingValues.length > 0
        ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1)
        : "—",
    });
    setLoading(false);
  }

  async function loadRequests(page: number) {
    if (page > 0) setRequestsLoadingMore(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRequestsLoadingMore(false); return; }
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("review_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[reputation] failed to load requests", error);
      setLoadError("Couldn't load your reputation data. Please refresh the page.");
    }
    const rows = data || [];
    setRequests((prev) => (page === 0 ? rows : [...prev, ...rows]));
    setRequestsHasMore(rows.length === PAGE_SIZE);
    setRequestsLoadingMore(false);
  }

  async function loadResponses(page: number) {
    if (page > 0) setResponsesLoadingMore(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setResponsesLoadingMore(false); return; }
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("review_responses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[reputation] failed to load responses", error);
      setLoadError("Couldn't load your reputation data. Please refresh the page.");
    }
    const rows = data || [];
    setResponses((prev) => (page === 0 ? rows : [...prev, ...rows]));
    setResponsesHasMore(rows.length === PAGE_SIZE);
    setResponsesLoadingMore(false);
  }

  async function sendRequest() {
    if (!custPhone.trim()) { setSendOk(false); setSendMsg("Phone number is required."); return; }
    setSending(true);
    setSendMsg("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setSendOk(false);
        setSendMsg("Please sign in again and retry.");
        setSending(false);
        return;
      }

      const res = await fetch("/api/review-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: custName.trim(),
          customerPhone: custPhone.trim(),
          jobDescription: jobDesc.trim(),
          googleReviewUrl: googleUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) { setSendOk(false); setSendMsg(data.error); return; }
      setSendOk(true);
      setSendMsg("Review request sent!");
      setCustName(""); setCustPhone(""); setJobDesc("");
      setRequestsPageIndex(0);
      loadRequests(0);
      loadStats();
    } catch {
      setSendOk(false);
      setSendMsg("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function generateResponse() {
    if (!reviewText.trim()) { setGenError("Paste the review text first."); return; }
    setGenerating(true);
    setAiResponse("");
    setGenError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setGenError("Please sign in again and retry.");
        setGenerating(false);
        return;
      }

      const res = await fetch("/api/review-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewText: reviewText.trim(),
          reviewerName: reviewerName.trim(),
          starRating,
        }),
      });
      const data = await res.json();
      if (data.error) { setGenError(data.error); return; }
      setAiResponse(data.response);
    } catch {
      setGenError("Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function copyResponse() {
    navigator.clipboard.writeText(aiResponse);
    toast.success("Response copied to clipboard!");
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: 0 }}>
            Reputation
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            {(["dashboard", "request", "respond"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid var(--border)", background: tab === t ? "var(--primary)" : "var(--card)", color: tab === t ? "var(--primary-foreground)" : "var(--foreground)", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                {t === "request" ? "Send Request" : t === "respond" ? "Write Response" : "Dashboard"}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
          Send review requests after every job. Generate professional responses in seconds.
        </p>
      </div>

      {loadError && <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 20 }}>{loadError}</p>}

      {/* Dashboard tab */}
      {tab === "dashboard" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Requests sent", value: stats.sent, Icon: Send },
              { label: "Reviews received", value: stats.reviewed, Icon: Star },
              { label: "Responses written", value: stats.responses, Icon: PenLine },
              { label: "Avg star rating", value: stats.avgRating, Icon: Star },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <s.Icon size={16} color="var(--primary)" strokeWidth={1.75} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>
              Loading...
            </div>
          ) : requests.length === 0 && responses.length === 0 ? (
            <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Star size={26} color="var(--primary)" strokeWidth={1.75} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", marginBottom: 8 }}>Start building your reputation</h3>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)", maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>
                Send your first review request to a recent customer — it takes 30 seconds and can get you a 5-star review today.
              </p>
              <button onClick={() => setTab("request")}
                style={{ padding: "10px 24px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Send first request →
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Recent requests */}
              <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 14 }}>Recent requests</div>
                {requests.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{r.customer_name || r.customer_phone}</div>
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{new Date(r.sent_at).toLocaleDateString()}{r.job_description ? ` · ${r.job_description}` : ""}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                      background: "var(--accent)",
                      color: r.status === "reviewed" ? "var(--accent-2)" : "var(--primary)" }}>
                      {r.status === "reviewed" ? "Reviewed ✓" : "Sent"}
                    </span>
                  </div>
                ))}
                {requests.length === 0 && <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No requests yet</p>}
                {requestsHasMore && (
                  <button
                    onClick={() => { const next = requestsPageIndex + 1; setRequestsPageIndex(next); loadRequests(next); }}
                    disabled={requestsLoadingMore}
                    style={{ display: "block", margin: "10px auto 0", padding: "8px 16px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {requestsLoadingMore ? "Loading..." : "Load more"}
                  </button>
                )}
              </div>

              {/* Recent responses */}
              <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 14 }}>Responses written</div>
                {responses.map(r => (
                  <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {r.star_rating && <StarRatingInput rating={r.star_rating} size={16} />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{r.reviewer_name || "Anonymous"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {r.review_text}
                    </div>
                  </div>
                ))}
                {responses.length === 0 && <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No responses yet</p>}
                {responsesHasMore && (
                  <button
                    onClick={() => { const next = responsesPageIndex + 1; setResponsesPageIndex(next); loadResponses(next); }}
                    disabled={responsesLoadingMore}
                    style={{ display: "block", margin: "10px auto 0", padding: "8px 16px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {responsesLoadingMore ? "Loading..." : "Load more"}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Send Request tab */}
      {tab === "request" && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 28 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Send a review request</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24, lineHeight: 1.5 }}>
              We'll text your customer a friendly message with a direct link to leave you a Google review.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Customer name</label>
              <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="e.g. John Smith"
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Customer phone *</label>
              <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="e.g. 404-555-0100"
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Job completed</label>
              <input value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="e.g. AC repair, roof inspection..."
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Your Google review link</label>
              <input value={googleUrl} onChange={e => setGoogleUrl(e.target.value)} placeholder="https://g.page/r/your-business/review"
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>Find this in Google Business Profile → Get more reviews</div>
            </div>

            {sendMsg && (
              <div style={{ fontSize: 13, color: sendOk ? "var(--accent-2)" : "var(--destructive)", marginBottom: 14 }}>{sendMsg}</div>
            )}

            <button onClick={sendRequest} disabled={sending}
              style={{ width: "100%", padding: 13, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1, fontFamily: "inherit" }}>
              {sending ? "Sending..." : "Send review request →"}
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted-foreground)", marginTop: 10 }}>Requires Twilio to be connected</p>
          </div>
        </div>
      )}

      {/* Write Response tab */}
      {tab === "respond" && (() => {
        const isCrewPlus = subscriptionTier === "crew" || subscriptionTier === "agency";
        return (
        <div style={{ maxWidth: 680 }}>
          {!isCrewPlus && (
            <div style={{ background: "var(--accent)", borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, border: "1px solid var(--border)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", marginBottom: 2 }}>The AI review response writer is a Crew feature</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Upgrade to Crew or Agency to generate responses automatically.</div>
              </div>
              <Link to="/pricing" style={{ padding: "9px 20px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                Upgrade now →
              </Link>
            </div>
          )}
          <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 20, padding: 28, opacity: isCrewPlus ? 1 : 0.5, pointerEvents: isCrewPlus ? "auto" : "none" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Write a review response</div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24, lineHeight: 1.5 }}>
              Paste any review and get a professional, personalized response in seconds.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Star rating</label>
              <StarRatingInput rating={starRating} onChange={setStarRating} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Reviewer name</label>
              <input value={reviewerName} onChange={e => setReviewerName(e.target.value)} placeholder="e.g. Sarah M."
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>Review text *</label>
              <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                placeholder="Paste the review here..."
                rows={4}
                className="lv-input" style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 14, color: "var(--foreground)", background: "var(--input)", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            {genError && <p style={{ fontSize: 13, color: "var(--destructive)", marginBottom: 14 }}>{genError}</p>}

            <button onClick={generateResponse} disabled={generating || !isCrewPlus}
              style={{ width: "100%", padding: 13, background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1, fontFamily: "inherit", marginBottom: aiResponse ? 16 : 0 }}>
              {generating ? "Writing response..." : "Generate response →"}
            </button>

            {aiResponse && (
              <div style={{ background: "var(--elevated)", border: "1.5px solid var(--border)", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Response</div>
                  <button onClick={copyResponse}
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}>
                    Copy →
                  </button>
                </div>
                <p style={{ fontSize: 14, color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>{aiResponse}</p>
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
