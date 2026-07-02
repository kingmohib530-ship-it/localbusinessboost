import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/account/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lanavix-data-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || "Something went wrong. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Deletion failed");
      }

      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      setDeleteError(err.message || "Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Your workspace and account.</p>
      </div>
      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Account</div>
            <div className="font-medium">{email || "—"}</div>
          </div>
          <Badge variant="secondary">Free beta access</Badge>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="font-semibold mb-2">Plan</h2>
        <p className="text-sm text-muted-foreground">Currently in open beta. All agents and the orchestrator are unlocked.</p>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-muted-foreground">
          Download a copy of everything Lanavix has stored for your account —
          your profile, businesses, leads, missed calls, and messages.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? "Preparing export…" : "Export my data"}
        </Button>
        {exportError && (
          <p className="text-sm text-destructive">{exportError}</p>
        )}
      </Card>

      <Card className="p-6 space-y-3 border-destructive/30">
        <h2 className="font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            Delete my account
          </Button>
        ) : (
          <div className="space-y-3 border border-destructive/30 rounded-lg p-4 bg-destructive/5">
            <p className="text-sm font-medium">
              Type <span className="font-mono">DELETE</span> to permanently delete your account and all data.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
            />
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={deleteInput !== "DELETE" || deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Permanently delete account"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput("");
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Button variant="outline" onClick={signOut}>Sign out</Button>
    </div>
  );
}
