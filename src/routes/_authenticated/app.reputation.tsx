import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const STARS = [1, 2, 3, 4, 5];

function StarRating({ rating, onClick }: { rating: number; onClick?: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {STARS.map(s => (
        <span key={s} onClick={() => onClick?.(s)}
          style={{ fontSize: 20, cursor: onClick ? "pointer" : "default", color: s <= rating ? "#f59e0b" : "#e2e8f0" }}>
          ★
        </span>
      ))}
    </div>
  );
}

function ReputationPage() {
  const [tab, setTab] = useState<"dashboard" | "request" | "respond">("dashboard");
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [responses, setResponses] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Request form
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  // Response form
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [starRating, setStarRating] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [genError, setGenError] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [req, res] = await Promise.all([
      supabase.from("review_requests").select("*").eq("user_id", user.id).order("sent_at", { ascending: false }),
      supabase.from("review_responses").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setRequests(req.data || []);
    setResponses(res.data || []);
    setLoading(false);
  }

  async function sendRequest() {
    if (!custPhone.trim()) { setSendMsg("Phone number is required."); return; }
    setSending(true);
    setSendMsg("");
    try {
      const res = await fetch("/api/review-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: custName.trim(),
          customerPhone: custPhone.trim(),
          jobDescription: jobDesc.trim(),
          googleReviewUrl: googleUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.error) { setSendMsg(data.error); return; }
      setSendMsg("✅ Review request sent!");
      setCustName(""); setCustPhone(""); setJobDesc("");
      loadData();
    } catch {
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
      const res = await fetch("/api/review-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    alert("✅ Response copied to clipboard!");
  }

  const stats = {
    sent: requests.length,
    reviewed: requests.filter(r => r.status === "reviewed").length,
    responses: responses.length,
    avgRating: responses.filter(r => r.star_rating).length > 0
      ? (responses.reduce((a, r) => a + (r.star_rating || 0), 0) / responses.filter(r => r.star_rating).length).toFixed(1)
      : "—",
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1080, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "#0f172a", margin: 0 }}>
            ⭐ Reputation Autopilot
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            {(["dashboard", "request", "respond"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: tab === t ? "#0f172a" : "white", color: tab === t ? "white" : "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                {t === "request" ? "Send Request" : t === "respond" ? "Write Response" : "Dashboard"}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 15, color: "#475569", margin: 0 }}>
          Send review requests after every job. Generate professional responses in seconds.
        </p>
      </div>

      {/* Dashboard tab */}
      {tab === "dashboard" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Requests sent", value: stats.sent, icon: "📤" },
              { label: "Reviews received", value: stats.reviewed, icon: "⭐" },
              { label: "Responses written", value: stats.responses, icon: "✍️" },
              { label: "Avg star rating", value: stats.avgRating, icon: "🌟" },
            ].map(s => (
              <div key={s.label} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {requests.length === 0 && responses.length === 0 ? (
            <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Start building your reputation</h3>
              <p style={{ fontSize: 14, color: "#475569", maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>
                Send your first review request to a recent customer — it takes 30 seconds and can get you a 5-star review today.
              </p>
              <button onClick={() => setTab("request")}
                style={{ padding: "10px 24px", background: "#6366f1", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Send first request →
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Recent requests */}
              <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>Recent requests</div>
                {requests.slice(0, 6).map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{r.customer_name || r.customer_phone}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(r.sent_at).toLocaleDateString()}{r.job_description ? ` · ${r.job_description}` : ""}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                      background: r.status === "reviewed" ? "#ECFDF5" : "#EEF2FF",
                      color: r.status === "reviewed" ? "#10b981" : "#6366f1" }}>
                      {r.status === "reviewed" ? "Reviewed ✓" : "Sent"}
                    </span>
                  </div>
                ))}
                {requests.length === 0 && <p style={{ fontSize: 13, color: "#94a3b8" }}>No requests yet</p>}
              </div>

              {/* Recent AI responses */}
              <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 14 }}>AI responses written</div>
                {responses.slice(0, 4).map(r => (
                  <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {r.star_rating && <StarRating rating={r.star_rating} />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.reviewer_name || "Anonymous"}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {r.review_text}
                    </div>
                  </div>
                ))}
                {responses.length === 0 && <p style={{ fontSize: 13, color: "#94a3b8" }}>No responses yet</p>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Send Request tab */}
      {tab === "request" && (
        <div style={{ maxWidth: 520 }}>
          <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: 28 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>📤 Send a review request</div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 24, lineHeight: 1.5 }}>
              We'll text your customer a friendly message with a direct link to leave you a Google review.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Customer name</label>
              <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="e.g. John Smith"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Customer phone *</label>
              <input value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="e.g. 404-555-0100"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Job completed</label>
              <input value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="e.g. AC repair, roof inspection..."
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Your Google review link</label>
              <input value={googleUrl} onChange={e => setGoogleUrl(e.target.value)} placeholder="https://g.page/r/your-business/review"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Find this in Google Business Profile → Get more reviews</div>
            </div>

            {sendMsg && (
              <div style={{ fontSize: 13, color: sendMsg.startsWith("✅") ? "#10b981" : "#dc2626", marginBottom: 14 }}>{sendMsg}</div>
            )}

            <button onClick={sendRequest} disabled={sending}
              style={{ width: "100%", padding: 13, background: "#6366f1", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1, fontFamily: "inherit" }}>
              {sending ? "Sending..." : "Send review request →"}
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 10 }}>Requires Twilio to be connected</p>
          </div>
        </div>
      )}

      {/* Write Response tab */}
      {tab === "respond" && (
        <div style={{ maxWidth: 680 }}>
          <div style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: 20, padding: 28 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>✍️ Write a review response</div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 24, lineHeight: 1.5 }}>
              Paste any review and Claude will write a professional, personalized response in seconds.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Star rating</label>
              <StarRating rating={starRating} onClick={setStarRating} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Reviewer name</label>
              <input value={reviewerName} onChange={e => setReviewerName(e.target.value)} placeholder="e.g. Sarah M."
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Review text *</label>
              <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                placeholder="Paste the review here..."
                rows={4}
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "white", fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
            </div>

            {genError && <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 14 }}>{genError}</p>}

            <button onClick={generateResponse} disabled={generating}
              style={{ width: "100%", padding: 13, background: "#6366f1", color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1, fontFamily: "inherit", marginBottom: aiResponse ? 16 : 0 }}>
              {generating ? "Writing response..." : "Generate response →"}
            </button>

            {aiResponse && (
              <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>✅ AI Response</div>
                  <button onClick={copyResponse}
                    style={{ fontSize: 13, fontWeight: 600, color: "#6366f1", background: "none", border: "none", cursor: "pointer" }}>
                    Copy →
                  </button>
                </div>
                <p style={{ fontSize: 14, color: "#0f172a", lineHeight: 1.6, margin: 0 }}>{aiResponse}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
