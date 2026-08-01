import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Phone, Target, Calendar, Star, Users, Brain, Settings, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

const nav: {
  to: "/app" | "/app/receptionist" | "/app/agents" | "/app/calendar" | "/app/reputation" | "/app/network" | "/app/business-facts" | "/app/settings" | null;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}[] = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/app/receptionist", label: "Receptionist", icon: Phone },
  { to: "/app/agents", label: "Campaigns", icon: Target },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
  { to: "/app/reputation", label: "Reputation", icon: Star },
  { to: "/app/network", label: "Network", icon: Users },
  { to: "/app/business-facts", label: "Business Facts", icon: Brain },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function AppShell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [signingOut, setSigningOut] = useState(false);
  const signOut = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[app] sign out failed", error);
      toast.error("Couldn't sign out. Please try again.");
      setSigningOut(false);
      return;
    }
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="app-dark min-h-screen flex relative">
      {/* Same animated gradient mesh as the homepage, held far dimmer and
          fixed in place: this is a workspace people read data in for
          hours, not a landing page, so the motion stays as a faint depth
          cue behind the glass panels rather than something to look at. */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="hd-mesh-blob hd-mesh-blob-a" style={{ top: "-15%", left: "-10%", width: 520, height: 520, background: "var(--hd-primary)", opacity: 0.12 }} />
        <div className="hd-mesh-blob hd-mesh-blob-b" style={{ bottom: "-20%", right: "-10%", width: 480, height: 480, background: "var(--hd-primary-2)", opacity: 0.08 }} />
      </div>

      <aside className="relative z-10 w-64 border-r border-[var(--hd-border)] flex flex-col bg-[var(--hd-glass)] backdrop-blur-xl">
        <div className="h-16 px-5 flex items-center border-b border-[var(--hd-border)]">
          <div className="font-display font-bold tracking-tight text-lg text-[var(--hd-fg)]">Lanavix</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            if (!n.to) {
              return (
                <div
                  key={n.label}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-[var(--hd-muted)]/50 cursor-default"
                >
                  <span className="flex items-center gap-3">
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide bg-white/[0.06] text-[var(--hd-muted)] rounded px-1.5 py-0.5">
                    Soon
                  </span>
                </div>
              );
            }
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-[var(--hd-primary)]/15 text-[var(--hd-primary-2)] border border-[var(--hd-primary)]/25"
                    : "text-[var(--hd-muted)] hover:bg-white/[0.05] hover:text-[var(--hd-fg)]"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[var(--hd-border)]">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-[var(--hd-muted)] hover:text-[var(--hd-fg)] hover:bg-white/[0.05]"
            onClick={signOut}
            disabled={signingOut}
          >
            <LogOut className="h-4 w-4" /> {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </aside>
      <main className="relative z-10 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
