import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Phone, Target, Calendar, Star, Users, Settings, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

const nav: {
  to: "/app" | "/app/receptionist" | "/app/agents" | "/app/calendar" | "/app/reputation" | "/app/network" | "/app/settings" | null;
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
  { to: "/app/settings", label: "Settings", icon: Settings },
];

function AppShell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 border-r border-border flex flex-col bg-card">
        <div className="h-16 px-5 flex items-center border-b border-border">
          <div className="font-display font-bold tracking-tight text-lg">Lanavix</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            if (!n.to) {
              return (
                <div
                  key={n.label}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground/50 cursor-default"
                >
                  <span className="flex items-center gap-3">
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide bg-secondary text-muted-foreground rounded px-1.5 py-0.5">
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
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
