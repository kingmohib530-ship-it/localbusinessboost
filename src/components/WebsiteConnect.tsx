import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface WebsiteConnectProps {
  /** Fires once the website URL is saved to profiles.website. */
  onSaved?: (website: string) => void;
  /** Fires after a sync run completes successfully. */
  onSynced?: (result: { synced: number; pendingReview: number }) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid var(--hd-border)",
  borderRadius: 10,
  fontSize: 14,
  color: "var(--hd-fg)",
  background: "var(--hd-glass)",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

/**
 * Confirms a business's website and syncs real facts (hours, pricing,
 * services) off of it. Shared between Business Facts and the onboarding
 * wizard - same profiles.website field and the same
 * /api/business-facts/sync-website endpoint either way.
 */
export function WebsiteConnect({ onSaved, onSynced }: WebsiteConnectProps) {
  const [loading, setLoading] = useState(true);
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveOk, setSaveOk] = useState(true);
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
      .select("website")
      .eq("id", user.id)
      .maybeSingle();
    setWebsite(data?.website || "");
    setLoading(false);
  }

  async function authHeader() {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Please sign in again and retry.");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  async function save() {
    setSaving(true);
    setSaveMsg("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const trimmed = website.trim();
    const { error } = await supabase
      .from("profiles")
      .update({ website: trimmed || null })
      .eq("id", user.id);
    setSaveOk(!error);
    setSaveMsg(error ? "Could not save - please try again." : "Saved!");
    setSaving(false);
    if (!error) onSaved?.(trimmed);
  }

  async function runSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const headers = await authHeader();
      const res = await fetch("/api/business-facts/sync-website", { method: "POST", headers });
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
        <Globe size={15} color="var(--hd-primary)" strokeWidth={1.75} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--hd-fg)" }}>Website</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourbusiness.com"
          style={{ ...inputStyle, flex: "1 1 260px" }}
          disabled={loading}
        />
        <button
          onClick={save}
          disabled={saving || loading}
          style={{
            padding: "10px 18px",
            background: "var(--hd-glass)",
            color: "var(--hd-fg)",
            border: "1.5px solid var(--hd-border)",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : "Confirm"}
        </button>
        <button
          onClick={runSync}
          disabled={syncing || !website.trim()}
          style={{
            padding: "10px 18px",
            background: "var(--hd-primary)",
            color: "var(--primary-foreground)",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: website.trim() ? "pointer" : "not-allowed",
            opacity: website.trim() ? 1 : 0.5,
          }}
        >
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>
      {saveMsg && (
        <p
          style={{
            fontSize: 12,
            color: saveOk ? "var(--hd-primary-2)" : "var(--destructive)",
            marginBottom: 4,
          }}
        >
          {saveMsg}
        </p>
      )}
      {syncMsg && (
        <p style={{ fontSize: 12, color: syncOk ? "var(--hd-primary-2)" : "var(--destructive)" }}>
          {syncMsg}
        </p>
      )}
    </div>
  );
}

export default WebsiteConnect;
