import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, Globe, MapPin, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/business-facts")({
  component: BusinessFactsPage,
});

type FactType = "service" | "pricing" | "hours" | "service_area" | "general";
type FactSource = "setup_form" | "google_synced" | "website_synced" | "auto_learned";

interface BusinessFact {
  id: string;
  fact_type: FactType;
  fact_text: string;
  source: FactSource;
  created_at: string;
}

interface GoogleCandidate {
  placeId: string;
  name: string;
  address: string | null;
}

const FACT_TYPE_LABELS: Record<FactType, string> = {
  service: "Service",
  pricing: "Pricing",
  hours: "Hours",
  service_area: "Service area",
  general: "General",
};

const SOURCE_LABELS: Record<FactSource, string> = {
  setup_form: "Added by you",
  google_synced: "Synced from Google",
  website_synced: "Synced from your website",
  auto_learned: "Learned automatically",
};

const SOURCE_ORDER: FactSource[] = ["setup_form", "google_synced", "website_synced", "auto_learned"];

const PAGE_SIZE = 20;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid var(--border)",
  borderRadius: 10,
  fontSize: 14,
  color: "var(--foreground)",
  background: "var(--input)",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

function BusinessFactsPage() {
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");

  const [website, setWebsite] = useState("");
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [websiteMsg, setWebsiteMsg] = useState("");
  const [websiteMsgOk, setWebsiteMsgOk] = useState(true);
  const [syncingWebsite, setSyncingWebsite] = useState(false);
  const [syncWebsiteMsg, setSyncWebsiteMsg] = useState("");
  const [syncWebsiteOk, setSyncWebsiteOk] = useState(true);

  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  const [googlePlaceLabel, setGooglePlaceLabel] = useState<string | null>(null);
  const [googleQuery, setGoogleQuery] = useState("");
  const [searchingGoogle, setSearchingGoogle] = useState(false);
  const [googleCandidates, setGoogleCandidates] = useState<GoogleCandidate[]>([]);
  const [googleSearchError, setGoogleSearchError] = useState("");
  const [confirmingPlaceId, setConfirmingPlaceId] = useState<string | null>(null);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [syncGoogleMsg, setSyncGoogleMsg] = useState("");
  const [syncGoogleOk, setSyncGoogleOk] = useState(true);

  const [newFactType, setNewFactType] = useState<FactType>("service");
  const [newFactText, setNewFactText] = useState("");
  const [addingFact, setAddingFact] = useState(false);
  const [addFactError, setAddFactError] = useState("");

  const [activeFacts, setActiveFacts] = useState<BusinessFact[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [activeLoadingMore, setActiveLoadingMore] = useState(false);
  const [activeError, setActiveError] = useState("");
  const [activeHasMore, setActiveHasMore] = useState(false);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const [pendingFacts, setPendingFacts] = useState<BusinessFact[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingLoadingMore, setPendingLoadingMore] = useState(false);
  const [pendingError, setPendingError] = useState("");
  const [pendingHasMore, setPendingHasMore] = useState(false);
  const [pendingPageIndex, setPendingPageIndex] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    loadProfile();
    loadActiveFacts(0);
    loadPendingFacts(0);
  }, []);

  async function currentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  }

  async function authHeader() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Please sign in again and retry.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function loadProfile() {
    setProfileLoading(true);
    setProfileError("");
    const userId = await currentUserId();
    if (!userId) { setProfileLoading(false); return; }
    const { data, error } = await supabase
      .from("profiles")
      .select("business_name, city, website, google_place_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("[business-facts] failed to load profile", error);
      setProfileError("Couldn't load your business profile. Please refresh the page.");
    }
    setBusinessName(data?.business_name || "");
    setCity(data?.city || "");
    setWebsite(data?.website || "");
    setGooglePlaceId(data?.google_place_id || null);
    setProfileLoading(false);
  }

  async function loadActiveFacts(page: number) {
    if (page === 0) setActiveLoading(true); else setActiveLoadingMore(true);
    setActiveError("");
    const userId = await currentUserId();
    if (!userId) { setActiveLoading(false); setActiveLoadingMore(false); return; }
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("business_facts")
      .select("id, fact_type, fact_text, source, created_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[business-facts] failed to load active facts", error);
      setActiveError("Couldn't load your facts. Please refresh the page.");
    }
    const rows = (data as BusinessFact[]) || [];
    setActiveFacts((prev) => (page === 0 ? rows : [...prev, ...rows]));
    setActiveHasMore(rows.length === PAGE_SIZE);
    setActiveLoading(false);
    setActiveLoadingMore(false);
  }

  async function loadPendingFacts(page: number) {
    if (page === 0) setPendingLoading(true); else setPendingLoadingMore(true);
    setPendingError("");
    const userId = await currentUserId();
    if (!userId) { setPendingLoading(false); setPendingLoadingMore(false); return; }
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("business_facts")
      .select("id, fact_type, fact_text, source, created_at")
      .eq("user_id", userId)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[business-facts] failed to load pending facts", error);
      setPendingError("Couldn't load facts awaiting review. Please refresh the page.");
    }
    const rows = (data as BusinessFact[]) || [];
    setPendingFacts((prev) => (page === 0 ? rows : [...prev, ...rows]));
    setPendingHasMore(rows.length === PAGE_SIZE);
    setPendingLoading(false);
    setPendingLoadingMore(false);
  }

  function refreshFactLists() {
    setActivePageIndex(0);
    loadActiveFacts(0);
    setPendingPageIndex(0);
    loadPendingFacts(0);
  }

  async function saveWebsite() {
    setSavingWebsite(true);
    setWebsiteMsg("");
    const userId = await currentUserId();
    if (!userId) { setSavingWebsite(false); return; }
    const { error } = await supabase.from("profiles").update({ website: website.trim() || null }).eq("id", userId);
    setWebsiteMsgOk(!error);
    setWebsiteMsg(error ? "Could not save — please try again." : "Saved!");
    setSavingWebsite(false);
  }

  async function searchGoogle() {
    setSearchingGoogle(true);
    setGoogleSearchError("");
    setGoogleCandidates([]);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/business-facts/search-google-places", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: googleQuery.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setGoogleSearchError(data.error || "Search failed. Please try again."); return; }
      const candidates: GoogleCandidate[] = data.candidates || [];
      setGoogleCandidates(candidates);
      if (candidates.length === 0) setGoogleSearchError("No matching listings found — try a more specific search.");
    } catch (err: any) {
      setGoogleSearchError(err.message || "Network error. Please try again.");
    } finally {
      setSearchingGoogle(false);
    }
  }

  async function confirmGooglePlace(candidate: GoogleCandidate) {
    setConfirmingPlaceId(candidate.placeId);
    const userId = await currentUserId();
    if (!userId) { setConfirmingPlaceId(null); return; }
    const { error } = await supabase.from("profiles").update({ google_place_id: candidate.placeId }).eq("id", userId);
    if (error) {
      toast.error("Could not confirm this listing. Please try again.");
    } else {
      setGooglePlaceId(candidate.placeId);
      setGooglePlaceLabel(candidate.name);
      setGoogleCandidates([]);
      toast.success("Google listing confirmed!");
    }
    setConfirmingPlaceId(null);
  }

  async function runGoogleSync() {
    setSyncingGoogle(true);
    setSyncGoogleMsg("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/business-facts/sync-google", { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) { setSyncGoogleOk(false); setSyncGoogleMsg(data.error || "Sync failed. Please try again."); return; }
      setSyncGoogleOk(true);
      setSyncGoogleMsg(
        data.message ||
          `Synced ${data.synced} fact(s)${data.pendingReview ? `, ${data.pendingReview} waiting for your review` : ""}.`,
      );
      refreshFactLists();
    } catch (err: any) {
      setSyncGoogleOk(false);
      setSyncGoogleMsg(err.message || "Network error. Please try again.");
    } finally {
      setSyncingGoogle(false);
    }
  }

  async function runWebsiteSync() {
    setSyncingWebsite(true);
    setSyncWebsiteMsg("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/business-facts/sync-website", { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) { setSyncWebsiteOk(false); setSyncWebsiteMsg(data.error || "Sync failed. Please try again."); return; }
      setSyncWebsiteOk(true);
      setSyncWebsiteMsg(
        data.message ||
          `Synced ${data.synced} fact(s)${data.pendingReview ? `, ${data.pendingReview} waiting for your review` : ""}.`,
      );
      refreshFactLists();
    } catch (err: any) {
      setSyncWebsiteOk(false);
      setSyncWebsiteMsg(err.message || "Network error. Please try again.");
    } finally {
      setSyncingWebsite(false);
    }
  }

  async function addFact() {
    if (!newFactText.trim()) { setAddFactError("Enter a fact first."); return; }
    setAddingFact(true);
    setAddFactError("");
    const userId = await currentUserId();
    if (!userId) { setAddingFact(false); return; }
    const { error } = await supabase.from("business_facts").insert({
      user_id: userId,
      fact_type: newFactType,
      fact_text: newFactText.trim(),
      source: "setup_form",
      status: "active",
    });
    if (error) {
      setAddFactError("Could not save this fact. Please try again.");
    } else {
      setNewFactText("");
      toast.success("Fact added.");
      setActivePageIndex(0);
      loadActiveFacts(0);
    }
    setAddingFact(false);
  }

  async function approveFact(fact: BusinessFact) {
    const { error } = await supabase.from("business_facts").update({ status: "active" }).eq("id", fact.id);
    if (error) { toast.error("Could not approve this fact."); return; }
    setPendingFacts((prev) => prev.filter((f) => f.id !== fact.id));
    toast.success("Fact approved.");
    setActivePageIndex(0);
    loadActiveFacts(0);
  }

  async function rejectFact(fact: BusinessFact) {
    const { error } = await supabase.from("business_facts").update({ status: "rejected" }).eq("id", fact.id);
    if (error) { toast.error("Could not reject this fact."); return; }
    setPendingFacts((prev) => prev.filter((f) => f.id !== fact.id));
    toast.success("Fact rejected.");
  }

  async function deleteFact(fact: BusinessFact) {
    const { error } = await supabase.from("business_facts").delete().eq("id", fact.id);
    if (error) { toast.error("Could not delete this fact."); return; }
    setActiveFacts((prev) => prev.filter((f) => f.id !== fact.id));
    toast.success("Fact deleted.");
  }

  function startEdit(fact: BusinessFact) {
    setEditingId(fact.id);
    setEditingText(fact.fact_text);
  }

  async function saveEdit(fact: BusinessFact) {
    if (!editingText.trim()) return;
    const { error } = await supabase.from("business_facts").update({ fact_text: editingText.trim() }).eq("id", fact.id);
    if (error) { toast.error("Could not save changes."); return; }
    setActiveFacts((prev) => prev.map((f) => (f.id === fact.id ? { ...f, fact_text: editingText.trim() } : f)));
    setEditingId(null);
    toast.success("Fact updated.");
  }

  const groupedActive = new Map<FactSource, BusinessFact[]>();
  for (const fact of activeFacts) {
    if (!groupedActive.has(fact.source)) groupedActive.set(fact.source, []);
    groupedActive.get(fact.source)!.push(fact);
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, margin: "0 auto", fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--foreground)", margin: "0 0 6px" }}>
          What Lanavix knows about your business
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted-foreground)", margin: 0 }}>
          Missed-Call Text-Back uses these facts to answer with your real prices and hours instead of guessing.
        </p>
      </div>

      {profileError && <p style={{ color: "var(--destructive)", fontSize: 13, marginBottom: 20 }}>{profileError}</p>}

      {/* Sources */}
      <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Sources</div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 18, lineHeight: 1.5 }}>
          Sync now checks your website and Google listing on demand — this isn't live and automatic yet, so click Sync
          now whenever you've updated your prices, hours, or services.
        </p>

        {/* Website */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Globe size={15} color="var(--primary)" strokeWidth={1.75} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Website</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourbusiness.com"
            style={{ ...inputStyle, flex: "1 1 260px" }}
            disabled={profileLoading}
          />
          <button onClick={saveWebsite} disabled={savingWebsite || profileLoading}
            style={{ padding: "10px 18px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {savingWebsite ? "Saving..." : "Confirm"}
          </button>
          <button onClick={runWebsiteSync} disabled={syncingWebsite || !website.trim()}
            style={{ padding: "10px 18px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: website.trim() ? "pointer" : "not-allowed", opacity: website.trim() ? 1 : 0.5 }}>
            {syncingWebsite ? "Syncing..." : "Sync now"}
          </button>
        </div>
        {websiteMsg && <p style={{ fontSize: 12, color: websiteMsgOk ? "var(--accent-2)" : "var(--destructive)", marginBottom: 4 }}>{websiteMsg}</p>}
        {syncWebsiteMsg && <p style={{ fontSize: 12, color: syncWebsiteOk ? "var(--accent-2)" : "var(--destructive)", marginBottom: 4 }}>{syncWebsiteMsg}</p>}

        <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />

        {/* Google listing */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <MapPin size={15} color="var(--primary)" strokeWidth={1.75} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Google Business listing</span>
        </div>

        {googlePlaceId ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--foreground)" }}>
              {googlePlaceLabel ? `Confirmed: ${googlePlaceLabel}` : "Listing confirmed."}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={runGoogleSync} disabled={syncingGoogle}
                style={{ padding: "9px 18px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {syncingGoogle ? "Syncing..." : "Sync now"}
              </button>
              <button onClick={() => setGooglePlaceId(null)}
                style={{ padding: "9px 18px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Change
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <input
                value={googleQuery}
                onChange={(e) => setGoogleQuery(e.target.value)}
                placeholder={businessName ? `${businessName}${city ? ` ${city}` : ""}` : "Your business name and city"}
                style={{ ...inputStyle, flex: "1 1 260px" }}
              />
              <button onClick={searchGoogle} disabled={searchingGoogle}
                style={{ padding: "10px 18px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {searchingGoogle ? "Searching..." : "Find my listing"}
              </button>
            </div>
            {googleSearchError && <p style={{ fontSize: 12, color: "var(--destructive)", marginBottom: 8 }}>{googleSearchError}</p>}
            {googleCandidates.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {googleCandidates.map((c) => (
                  <div key={c.placeId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", background: "var(--muted)", borderRadius: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{c.name}</div>
                      {c.address && <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{c.address}</div>}
                    </div>
                    <button onClick={() => confirmGooglePlace(c)} disabled={confirmingPlaceId === c.placeId}
                      style={{ padding: "7px 14px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {confirmingPlaceId === c.placeId ? "Confirming..." : "This is mine"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {syncGoogleMsg && <p style={{ fontSize: 12, color: syncGoogleOk ? "var(--accent-2)" : "var(--destructive)" }}>{syncGoogleMsg}</p>}
      </div>

      {/* Add a fact manually */}
      <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 12 }}>Add a fact</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={newFactType} onChange={(e) => setNewFactType(e.target.value as FactType)} style={{ ...inputStyle, flex: "0 0 160px" }}>
            {(Object.keys(FACT_TYPE_LABELS) as FactType[]).map((t) => (
              <option key={t} value={t}>{FACT_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input
            value={newFactText}
            onChange={(e) => setNewFactText(e.target.value)}
            placeholder="e.g. Drain cleaning starts at $150"
            style={{ ...inputStyle, flex: "1 1 300px" }}
          />
          <button onClick={addFact} disabled={addingFact}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> {addingFact ? "Adding..." : "Add"}
          </button>
        </div>
        {addFactError && <p style={{ fontSize: 12, color: "var(--destructive)", marginTop: 8 }}>{addFactError}</p>}
      </div>

      {/* Pending review */}
      {(pendingLoading || pendingFacts.length > 0) && (
        <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Needs your review</div>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 14 }}>
            These came from a sync and conflict with something already on file — approve the correct one, reject the rest.
          </p>
          {pendingError && <p style={{ fontSize: 12, color: "var(--destructive)", marginBottom: 10 }}>{pendingError}</p>}
          {pendingLoading ? (
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingFacts.map((fact) => (
                <div key={fact.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", background: "var(--muted)", borderRadius: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                      {FACT_TYPE_LABELS[fact.fact_type]} · {SOURCE_LABELS[fact.source]}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--foreground)" }}>{fact.fact_text}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => approveFact(fact)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 14px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Check size={13} /> Approve
                    </button>
                    <button onClick={() => rejectFact(fact)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 14px", background: "var(--card)", color: "var(--destructive)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              ))}
              {pendingHasMore && (
                <button
                  onClick={() => { const next = pendingPageIndex + 1; setPendingPageIndex(next); loadPendingFacts(next); }}
                  disabled={pendingLoadingMore}
                  style={{ alignSelf: "center", marginTop: 4, padding: "8px 16px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {pendingLoadingMore ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active facts, grouped by source */}
      <div style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: 16, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>Active facts</div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 14 }}>
          Everything here is live and available to Missed-Call Text-Back right now.
        </p>

        {activeError && <p style={{ fontSize: 12, color: "var(--destructive)", marginBottom: 10 }}>{activeError}</p>}

        {activeLoading ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Loading...</p>
        ) : activeFacts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Brain size={22} color="var(--primary)" strokeWidth={1.75} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)", marginBottom: 6 }}>No facts yet</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 340, margin: "0 auto", lineHeight: 1.5 }}>
              Add a fact above, or confirm a source and sync to pull in your real hours, prices, and services.
            </p>
          </div>
        ) : (
          <>
            {SOURCE_ORDER.filter((source) => groupedActive.has(source)).map((source) => (
              <div key={source} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                  {SOURCE_LABELS[source]}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {groupedActive.get(source)!.map((fact) => (
                    <div key={fact.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", border: "1.5px solid var(--border)", borderRadius: 10, flexWrap: "wrap" }}>
                      {editingId === fact.id ? (
                        <>
                          <input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            style={{ ...inputStyle, flex: "1 1 260px" }}
                            autoFocus
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => saveEdit(fact)}
                              style={{ padding: "6px 12px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              Save
                            </button>
                            <button onClick={() => setEditingId(null)}
                              style={{ padding: "6px 12px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", background: "var(--accent)", borderRadius: 4, padding: "2px 6px", marginRight: 8 }}>
                              {FACT_TYPE_LABELS[fact.fact_type]}
                            </span>
                            <span style={{ fontSize: 13, color: "var(--foreground)" }}>{fact.fact_text}</span>
                          </div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => startEdit(fact)} title="Edit"
                              style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex" }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => deleteFact(fact)} title="Delete"
                              style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "var(--destructive)", display: "flex" }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {activeHasMore && (
              <button
                onClick={() => { const next = activePageIndex + 1; setActivePageIndex(next); loadActiveFacts(next); }}
                disabled={activeLoadingMore}
                style={{ display: "block", margin: "0 auto", padding: "8px 16px", background: "var(--card)", color: "var(--foreground)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {activeLoadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
