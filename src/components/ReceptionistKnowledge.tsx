import { useEffect, useState } from "react";
import { Brain, Pencil, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WebsiteConnect } from "@/components/WebsiteConnect";
import { GoogleListingConnect } from "@/components/GoogleListingConnect";
import { AddFactForm, FACT_TYPE_LABELS, type FactType } from "@/components/AddFactForm";
import { cn } from "@/lib/utils";

type FactSource = "setup_form" | "google_synced" | "website_synced" | "auto_learned";

interface BusinessFact {
  id: string;
  fact_type: FactType;
  fact_text: string;
  source: FactSource;
  created_at: string;
}

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
 * "What Lanavix knows about your business" - real business_facts data,
 * same table and same shared components (WebsiteConnect, GoogleListingConnect,
 * AddFactForm) as the standalone /app/business-facts route, presented here as
 * a Receptionist tab per the approved IA. The standalone route stays intact
 * for anyone still linked to it.
 */
export function ReceptionistKnowledge() {
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
    loadActiveFacts(0);
    loadPendingFacts(0);
  }, []);

  async function currentUserId(): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
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

  function onFactAdded() {
    toast.success("Fact added.");
    setActivePageIndex(0);
    loadActiveFacts(0);
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
        <h2 className="lv-section text-foreground mb-1">Business knowledge</h2>
        <p className="lv-body text-muted-foreground">
          The information Lanavix uses when talking with customers - your receptionist answers with
          your real prices, services, and hours instead of guessing.
        </p>
      </div>

      {/* Sources */}
      <div className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="lv-label text-foreground mb-1">Sources</p>
        <p className="lv-meta text-muted-foreground mb-4">
          Sync now checks your website and Google listing on demand - this isn't automatic yet, so
          sync again whenever you've updated your prices, hours, or services.
        </p>

        <WebsiteConnect onSynced={refreshFactLists} />

        <div className="h-px bg-border my-4" />

        <GoogleListingConnect onSynced={refreshFactLists} />
      </div>

      {/* Add a fact manually */}
      <div className="rounded-md border border-border bg-card p-4 md:p-6">
        <p className="lv-label text-foreground mb-3">Add a fact</p>
        <AddFactForm onAdded={onFactAdded} />
      </div>

      {/* Pending review */}
      {(pendingLoading || pendingFacts.length > 0) && (
        <div className="rounded-md border border-border bg-card p-4 md:p-6">
          <p className="lv-label text-foreground mb-1">Needs your review</p>
          <p className="lv-meta text-muted-foreground mb-3">
            These came from a sync and conflict with something already on file - approve the correct
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
          Everything here is live and available to your receptionist right now.
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
                              className={cn(
                                "flex h-11 w-11 items-center justify-center text-muted-foreground",
                                "hover:text-foreground transition-colors duration-150 ease-out",
                              )}
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

export default ReceptionistKnowledge;
