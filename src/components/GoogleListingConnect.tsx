import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GoogleCandidate {
  placeId: string;
  name: string;
  address: string | null;
}

export interface GoogleListingConnectProps {
  /** Fires once a listing is confirmed and saved to profiles.google_place_id. */
  onConfirmed?: (placeId: string, name: string) => void;
  /** Fires after a sync run completes successfully. */
  onSynced?: (result: { synced: number; pendingReview: number }) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid var(--border)",
  borderRadius: 10,
  fontSize: 14,
  color: "var(--foreground)",
  background: "var(--card)",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

/**
 * Finds a business's real Google Business listing by name + city so they
 * can confirm which one is theirs, then syncs real facts (hours, ratings
 * context, services) off of it. Shared between Business Facts and the
 * onboarding wizard - same profiles.google_place_id field and the same
 * /api/business-facts/search-google-places + sync-google endpoints either
 * way.
 */
export function GoogleListingConnect({ onConfirmed, onSynced }: GoogleListingConnectProps) {
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<GoogleCandidate[]>([]);
  const [searchError, setSearchError] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [syncOk, setSyncOk] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("business_name, city, google_place_id")
      .eq("id", user.id)
      .maybeSingle();
    setBusinessName(data?.business_name || "");
    setCity(data?.city || "");
    setPlaceId(data?.google_place_id || null);
    setLoading(false);
  }

  async function authHeader() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Please sign in again and retry.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function search() {
    setSearching(true);
    setSearchError("");
    setCandidates([]);
    try {
      const headers = await authHeader();
      const res = await fetch("/api/business-facts/search-google-places", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: query.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || "Search failed. Please try again.");
        return;
      }
      const found: GoogleCandidate[] = data.candidates || [];
      setCandidates(found);
      if (found.length === 0)
        setSearchError("No matching listings found - try a more specific search.");
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSearching(false);
    }
  }

  async function confirm(candidate: GoogleCandidate) {
    setConfirmingId(candidate.placeId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setConfirmingId(null);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ google_place_id: candidate.placeId })
      .eq("id", user.id);
    if (!error) {
      setPlaceId(candidate.placeId);
      setPlaceLabel(candidate.name);
      setCandidates([]);
      onConfirmed?.(candidate.placeId, candidate.name);
    }
    setConfirmingId(null);
  }

  async function runSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/business-facts/sync-google", { method: "POST", headers });
      const data = await res.json();
      if (!res.ok) {
        setSyncOk(false);
        setSyncMsg(data.error || "Sync failed. Please try again.");
        return;
      }
      setSyncOk(true);
      const synced = data.synced ?? 0;
      const pendingReview = data.pendingReview ?? 0;
      setSyncMsg(
        data.message ||
          `Synced ${synced} fact(s)${pendingReview ? `, ${pendingReview} waiting for your review` : ""}.`,
      );
      onSynced?.({ synced, pendingReview });
    } catch (err) {
      setSyncOk(false);
      setSyncMsg(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <MapPin size={15} color="var(--primary)" strokeWidth={1.75} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
          Google Business listing
        </span>
      </div>

      {placeId ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--foreground)" }}>
            {placeLabel ? `Confirmed: ${placeLabel}` : "Listing confirmed."}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={runSync}
              disabled={syncing}
              style={{
                padding: "9px 18px",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {syncing ? "Syncing..." : "Sync now"}
            </button>
            <button
              onClick={() => setPlaceId(null)}
              style={{
                padding: "9px 18px",
                background: "var(--card)",
                color: "var(--foreground)",
                border: "1.5px solid var(--border)",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                businessName
                  ? `${businessName}${city ? ` ${city}` : ""}`
                  : "Your business name and city"
              }
              style={{ ...inputStyle, flex: "1 1 260px" }}
              disabled={loading}
            />
            <button
              onClick={search}
              disabled={searching || loading}
              style={{
                padding: "10px 18px",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                border: "none",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {searching ? "Searching..." : "Find my listing"}
            </button>
          </div>
          {searchError && (
            <p style={{ fontSize: 12, color: "var(--destructive)", marginBottom: 8 }}>
              {searchError}
            </p>
          )}
          {candidates.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
              {candidates.map((c) => (
                <div
                  key={c.placeId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                      {c.name}
                    </div>
                    {c.address && (
                      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                        {c.address}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => confirm(c)}
                    disabled={confirmingId === c.placeId}
                    style={{
                      padding: "7px 14px",
                      background: "var(--primary)",
                      color: "var(--primary-foreground)",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {confirmingId === c.placeId ? "Confirming..." : "This is mine"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {syncMsg && (
        <p style={{ fontSize: 12, color: syncOk ? "var(--accent-2)" : "var(--destructive)" }}>
          {syncMsg}
        </p>
      )}
    </div>
  );
}

export default GoogleListingConnect;
