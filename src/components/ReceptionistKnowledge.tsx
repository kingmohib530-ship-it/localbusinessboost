import { useEffect, useState } from "react";
import { Brain, Globe, MapPin, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

const SOURCE_ORDER: FactSource[] = [
  "setup_form",
  "google_synced",
  "website_synced",
  "auto_learned",
];

const PAGE_SIZE = 20;

/**
 * "What Lanavix knows about your business" - real business_facts data
 * (same table/endpoints as the standalone /app/business-facts route),
 * presented here as a Receptionist tab per the approved IA rather than a
 * separate primary nav destination. The standalone route stays intact for
 * anyone still linked to it from Settings.
 */
export function ReceptionistKnowledge() {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    if (!userId) {
      setProfileLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("business_name, city, website, google_place_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("[receptionist-knowledge] failed to load profile", error);
      setProfileError("Couldn't load your business profile. Please refresh the page.");
    }
    setBusinessName(data?.business_name || "");
    setCity(data?.city || "");
    setWebsite(data?.website || "");
    setGooglePlaceId(data?.google_place_id || null);
    setProfileLoading(false);
  }

  async function loadActiveFacts(page: number) {
    if (page === 0) setActiveLoading(true);
    else setActiveLoadingMore(true);
    setActiveError("");
    const userId = await currentUserId();
    if (!userId) {
      setActiveLoading(false);
      setActiveLoadingMore(false);
      return;
    }
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("business_facts")
      .select("id, fact_type, fact_text, source, created_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[receptionist-knowledge] failed to load active facts", error);
      setActiveError("Couldn't load your facts. Please refresh the page.");
    }
    const rows = (data as BusinessFact[]) || [];
    setActiveFacts((prev) => (page === 0 ? rows : [...prev, ...rows]));
    setActiveHasMore(rows.length === PAGE_SIZE);
    setActiveLoading(false);
    setActiveLoadingMore(false);
  }

  async function loadPendingFacts(page: number) {
    if (page === 0) setPendingLoading(true);
    else setPendingLoadingMore(true);
    setPendingError("");
    const userId = await currentUserId();
    if (!userId) {
      setPendingLoading(false);
      setPendingLoadingMore(false);
      return;
    }
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from("business_facts")
      .select("id, fact_type, fact_text, source, created_at")
      .eq("user_id", userId)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error("[receptionist-knowledge] failed to load pending facts", error);
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
    if (!userId) {
      setSavingWebsite(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ website: website.trim() || null })
      .eq("id", userId);
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
      if (!res.ok) {
        setGoogleSearchError(data.error || "Search failed. Please try again.");
        return;
      }
      const candidates: GoogleCandidate[] = data.candidates || [];
      setGoogleCandidates(candidates);
      if (candidates.length === 0)
        setGoogleSearchError("No matching listings found — try a more specific search.");
    } catch (err) {
      setGoogleSearchError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSearchingGoogle(false);
    }
  }

  async function confirmGooglePlace(candidate: GoogleCandidate) {
    setConfirmingPlaceId(candidate.placeId);
    const userId = await currentUserId();
    if (!userId) {
      setConfirmingPlaceId(null);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ google_place_id: candidate.placeId })
      .eq("id", userId);
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
      if (!res.ok) {
        setSyncGoogleOk(false);
        setSyncGoogleMsg(data.error || "Sync failed. Please try again.");
        return;
      }
      setSyncGoogleOk(true);
      setSyncGoogleMsg(
        data.message ||
          `Synced ${data.synced} fact(s)${data.pendingReview ? `, ${data.pendingReview} waiting for your review` : ""}.`,
      );
      refreshFactLists();
    } catch (err) {
      setSyncGoogleOk(false);
      setSyncGoogleMsg(err instanceof Error ? err.message : "Network error. Please try again.");
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
      if (!res.ok) {
        setSyncWebsiteOk(false);
        setSyncWebsiteMsg(data.error || "Sync failed. Please try again.");
        return;
      }
      setSyncWebsiteOk(true);
      setSyncWebsiteMsg(
        data.message ||
          `Synced ${data.synced} fact(s)${data.pendingReview ? `, ${data.pendingReview} waiting for your review` : ""}.`,
      );
      refreshFactLists();
    } catch (err) {
      setSyncWebsiteOk(false);
      setSyncWebsiteMsg(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSyncingWebsite(false);
    }
  }

  async function addFact() {
    if (!newFactText.trim()) {
      setAddFactError("Enter a fact first.");
      return;
    }
    setAddingFact(true);
    setAddFactError("");
    const userId = await currentUserId();
    if (!userId) {
      setAddingFact(false);
      return;
    }
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
    const { error } = await supabase
      .from("business_facts")
      .update({ status: "active" })
      .eq("id", fact.id);
    if (error) {
      toast.error("Could not approve this fact.");
      return;
    }
    setPendingFacts((prev) => prev.filter((f) => f.id !== fact.id));
    toast.success("Fact approved.");
    setActivePageIndex(0);
    loadActiveFacts(0);
  }

  async function rejectFact(fact: BusinessFact) {
    const { error } = await supabase
      .from("business_facts")
      .update({ status: "rejected" })
      .eq("id", fact.id);
    if (error) {
      toast.error("Could not reject this fact.");
      return;
    }
    setPendingFacts((prev) => prev.filter((f) => f.id !== fact.id));
    toast.success("Fact rejected.");
  }

  async function deleteFact(fact: BusinessFact) {
    const { error } = await supabase.from("business_facts").delete().eq("id", fact.id);
    if (error) {
      toast.error("Could not delete this fact.");
      return;
    }
    setActiveFacts((prev) => prev.filter((f) => f.id !== fact.id));
    toast.success("Fact deleted.");
  }

  function startEdit(fact: BusinessFact) {
    setEditingId(fact.id);
    setEditingText(fact.fact_text);
  }

  async function saveEdit(fact: BusinessFact) {
    if (!editingText.trim()) return;
    const { error } = await supabase
      .from("business_facts")
      .update({ fact_text: editingText.trim() })
      .eq("id", fact.id);
    if (error) {
      toast.error("Could not save changes.");
      return;
    }
    setActiveFacts((prev) =>
      prev.map((f) => (f.id === fact.id ? { ...f, fact_text: editingText.trim() } : f)),
    );
    setEditingId(null);
    toast.success("Fact updated.");
  }

  const groupedActive = new Map<FactSource, BusinessFact[]>();
  for (const fact of activeFacts) {
    if (!groupedActive.has(fact.source)) groupedActive.set(fact.source, []);
    groupedActive.get(fact.source)!.push(fact);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="lv-section text-foreground mb-1">What Lanavix knows about your business</h2>
        <p className="lv-body text-muted-foreground">
          Missed-Call Text-Back uses these facts to answer with your real prices and hours instead
          of guessing.
        </p>
      </div>

      {profileError && <p className="lv-meta text-destructive">{profileError}</p>}

      {/* Sources */}
      <div className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="lv-label text-foreground mb-1">Sources</p>
        <p className="lv-meta text-muted-foreground mb-4">
          Sync now checks your website and Google listing on demand — this isn't automatic yet, so
          sync again whenever you've updated your prices, hours, or services.
        </p>

        {/* Website */}
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="lv-label text-foreground">Website</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-1.5">
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourbusiness.com"
            disabled={profileLoading}
            className="min-h-[44px] flex-1 min-w-[220px]"
          />
          <Button
            variant="outline"
            onClick={saveWebsite}
            disabled={savingWebsite || profileLoading}
            className="min-h-[44px]"
          >
            {savingWebsite ? "Saving…" : "Confirm"}
          </Button>
          <Button
            onClick={runWebsiteSync}
            disabled={syncingWebsite || !website.trim()}
            className="min-h-[44px]"
          >
            {syncingWebsite ? "Syncing…" : "Sync now"}
          </Button>
        </div>
        {websiteMsg && (
          <p className={cn("lv-meta mb-1", websiteMsgOk ? "text-accent-2" : "text-destructive")}>
            {websiteMsg}
          </p>
        )}
        {syncWebsiteMsg && (
          <p className={cn("lv-meta mb-1", syncWebsiteOk ? "text-accent-2" : "text-destructive")}>
            {syncWebsiteMsg}
          </p>
        )}

        <div className="h-px bg-border my-4" />

        {/* Google listing */}
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="lv-label text-foreground">Google Business listing</span>
        </div>

        {googlePlaceId ? (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <span className="lv-body text-foreground">
              {googlePlaceLabel ? `Confirmed: ${googlePlaceLabel}` : "Listing confirmed."}
            </span>
            <div className="flex gap-2">
              <Button
                onClick={runGoogleSync}
                disabled={syncingGoogle}
                size="sm"
                className="min-h-[44px]"
              >
                {syncingGoogle ? "Syncing…" : "Sync now"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGooglePlaceId(null)}
                className="min-h-[44px]"
              >
                Change
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-1.5">
              <Input
                value={googleQuery}
                onChange={(e) => setGoogleQuery(e.target.value)}
                placeholder={
                  businessName
                    ? `${businessName}${city ? ` ${city}` : ""}`
                    : "Your business name and city"
                }
                className="min-h-[44px] flex-1 min-w-[220px]"
              />
              <Button onClick={searchGoogle} disabled={searchingGoogle} className="min-h-[44px]">
                {searchingGoogle ? "Searching…" : "Find my listing"}
              </Button>
            </div>
            {googleSearchError && (
              <p className="lv-meta text-destructive mb-1.5">{googleSearchError}</p>
            )}
            {googleCandidates.length > 0 && (
              <div className="flex flex-col gap-1.5 mb-1.5">
                {googleCandidates.map((c) => (
                  <div
                    key={c.placeId}
                    className="flex items-center justify-between gap-2 rounded-sm border border-border px-3 py-2"
                  >
                    <div>
                      <div className="lv-label text-foreground">{c.name}</div>
                      {c.address && (
                        <div className="lv-meta text-muted-foreground">{c.address}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => confirmGooglePlace(c)}
                      disabled={confirmingPlaceId === c.placeId}
                      className="min-h-[44px] whitespace-nowrap"
                    >
                      {confirmingPlaceId === c.placeId ? "Confirming…" : "This is mine"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {syncGoogleMsg && (
          <p className={cn("lv-meta", syncGoogleOk ? "text-accent-2" : "text-destructive")}>
            {syncGoogleMsg}
          </p>
        )}
      </div>

      {/* Add a fact manually */}
      <div className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="lv-label text-foreground mb-3">Add a fact</p>
        <div className="flex flex-wrap gap-2">
          <Select value={newFactType} onValueChange={(v) => setNewFactType(v as FactType)}>
            <SelectTrigger className="min-h-[44px] w-[160px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FACT_TYPE_LABELS) as FactType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {FACT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={newFactText}
            onChange={(e) => setNewFactText(e.target.value)}
            placeholder="e.g. Drain cleaning starts at $150"
            className="min-h-[44px] flex-1 min-w-[220px]"
            onKeyDown={(e) => e.key === "Enter" && addFact()}
          />
          <Button onClick={addFact} disabled={addingFact} className="min-h-[44px] gap-1.5">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {addingFact ? "Adding…" : "Add"}
          </Button>
        </div>
        {addFactError && <p className="lv-meta text-destructive mt-2">{addFactError}</p>}
      </div>

      {/* Pending review */}
      {(pendingLoading || pendingFacts.length > 0) && (
        <div className="rounded-md border border-border bg-card p-4 md:p-6">
          <p className="lv-label text-foreground mb-1">Needs your review</p>
          <p className="lv-meta text-muted-foreground mb-3">
            These came from a sync and conflict with something already on file — approve the correct
            one, reject the rest.
          </p>
          {pendingError && <p className="lv-meta text-destructive mb-2">{pendingError}</p>}
          {pendingLoading ? (
            <p className="lv-body text-muted-foreground">Loading…</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingFacts.map((fact) => (
                <div
                  key={fact.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border px-3 py-2.5"
                >
                  <div>
                    <div className="lv-meta font-medium text-primary uppercase tracking-wide mb-0.5">
                      {FACT_TYPE_LABELS[fact.fact_type]} · {SOURCE_LABELS[fact.source]}
                    </div>
                    <div className="lv-body text-foreground">{fact.fact_text}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => approveFact(fact)}
                      className="min-h-[44px] gap-1"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectFact(fact)}
                      className="min-h-[44px] gap-1 text-destructive"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
              {pendingHasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-center mt-1 min-h-[44px]"
                  disabled={pendingLoadingMore}
                  onClick={() => {
                    const next = pendingPageIndex + 1;
                    setPendingPageIndex(next);
                    loadPendingFacts(next);
                  }}
                >
                  {pendingLoadingMore ? "Loading…" : "Load more"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Active facts, grouped by source */}
      <div className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="lv-label text-foreground mb-1">Active facts</p>
        <p className="lv-meta text-muted-foreground mb-3">
          Everything here is live and available to Missed-Call Text-Back right now.
        </p>

        {activeError && <p className="lv-meta text-destructive mb-2">{activeError}</p>}

        {activeLoading ? (
          <p className="lv-body text-muted-foreground">Loading…</p>
        ) : activeFacts.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-sm bg-accent text-primary">
              <Brain className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="lv-body text-foreground font-medium mb-1">No facts yet</p>
            <p className="lv-meta text-muted-foreground max-w-sm mx-auto">
              Add a fact above, or confirm a source and sync to pull in your real hours, prices, and
              services.
            </p>
          </div>
        ) : (
          <>
            {SOURCE_ORDER.filter((source) => groupedActive.has(source)).map((source) => (
              <div key={source} className="mb-4 last:mb-0">
                <p className="lv-meta font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {SOURCE_LABELS[source]}
                </p>
                <div className="flex flex-col gap-1.5">
                  {groupedActive.get(source)!.map((fact) => (
                    <div
                      key={fact.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border px-3 py-2"
                    >
                      {editingId === fact.id ? (
                        <>
                          <Input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-[44px] flex-1 min-w-[220px]"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && saveEdit(fact)}
                          />
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(fact)}
                              className="min-h-[44px]"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                              className="min-h-[44px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="lv-meta font-medium text-primary bg-accent rounded-xs px-1.5 py-0.5 mr-2">
                              {FACT_TYPE_LABELS[fact.fact_type]}
                            </span>
                            <span className="lv-body text-foreground">{fact.fact_text}</span>
                          </div>
                          <div className="flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => startEdit(fact)}
                              title="Edit"
                              aria-label={`Edit fact: ${fact.fact_text}`}
                              className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150 ease-out"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteFact(fact)}
                              title="Delete"
                              aria-label={`Delete fact: ${fact.fact_text}`}
                              className="flex h-11 w-11 items-center justify-center text-destructive hover:text-destructive/80 transition-colors duration-150 ease-out"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
              <Button
                variant="outline"
                size="sm"
                className="mx-auto mt-1 flex min-h-[44px]"
                disabled={activeLoadingMore}
                onClick={() => {
                  const next = activePageIndex + 1;
                  setActivePageIndex(next);
                  loadActiveFacts(next);
                }}
              >
                {activeLoadingMore ? "Loading…" : "Load more"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
