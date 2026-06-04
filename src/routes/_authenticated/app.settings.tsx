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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
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
      <Button variant="destructive" onClick={signOut}>Sign out</Button>
    </div>
  );
}
