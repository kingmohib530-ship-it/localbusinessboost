import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Calendar,
  Target,
  FileText,
  Briefcase,
  Star,
  ClipboardCheck,
  Phone,
  MessageCircle,
  CreditCard,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CommandPalette } from "@/components/CommandPalette";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

type NavItem = {
  to: string | null;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

type NavSection = { heading: string; items: NavItem[] };

/**
 * Approved App Shell IA. Inbox, Leads (Slice 2), Quotes (Product Depth
 * Slice 2), and Jobs (Product Depth Slice 3) now have real pages on this
 * branch, so they're back in Today/Pipeline where the originally-approved
 * spec put them. Web Chat is
 * a real, currently-linked main route with no explicit slot in the
 * originally-approved sections list, so it sits under Setup alongside
 * the other account/config pages rather than being dropped. Business
 * Facts was removed from here (its route now redirects to Receptionist's
 * Knowledge tab, which has full functional parity). Coach is deliberately
 * not here - it lives in the Cmd+K palette instead (see CommandPalette).
 * Billing (Launch Sprint 1) was previously a real page with no nav entry
 * at all, reachable only via a breadcrumb or Web Chat's "Upgrade now"
 * button - a new subscriber had no way to discover where to subscribe.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Today",
    items: [
      { to: "/app", label: "Overview", icon: LayoutDashboard, exact: true },
      { to: "/app/inbox", label: "Inbox", icon: Inbox },
      { to: "/app/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    heading: "Pipeline",
    items: [
      { to: "/app/leads", label: "Leads", icon: Users },
      { to: "/app/quotes", label: "Quotes", icon: FileText },
      { to: "/app/jobs", label: "Jobs", icon: Briefcase },
      { to: "/app/agents", label: "Outreach", icon: Target },
    ],
  },
  {
    heading: "Growth",
    items: [
      { to: "/app/reputation", label: "Reviews", icon: Star },
      { to: "/audit", label: "Audit", icon: ClipboardCheck },
    ],
  },
  {
    heading: "Setup",
    items: [
      { to: "/app/receptionist", label: "Receptionist", icon: Phone },
      { to: "/app/web-chat", label: "Web Chat", icon: MessageCircle },
      { to: "/app/billing", label: "Billing", icon: CreditCard },
      { to: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

const MOBILE_TABS: NavItem[] = [
  { to: "/app", label: "Today", icon: LayoutDashboard, exact: true },
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
];

const BREADCRUMB_LABELS: { prefix: string; label: string }[] = [
  { prefix: "/app/inbox", label: "Inbox" },
  { prefix: "/app/leads", label: "Leads" },
  { prefix: "/app/quotes", label: "Quotes" },
  { prefix: "/app/jobs", label: "Jobs" },
  { prefix: "/app/calendar", label: "Calendar" },
  { prefix: "/app/agents", label: "Outreach" },
  { prefix: "/app/reputation", label: "Reviews" },
  { prefix: "/app/receptionist", label: "Receptionist" },
  { prefix: "/app/web-chat", label: "Web Chat" },
  { prefix: "/app/settings", label: "Settings" },
  { prefix: "/app/billing", label: "Billing" },
  { prefix: "/app/coach", label: "Coach" },
  { prefix: "/app/verification", label: "Verification" },
  { prefix: "/app/admin", label: "Admin" },
  { prefix: "/app", label: "Overview" },
];

function breadcrumbLabel(path: string): string {
  const match = BREADCRUMB_LABELS.find((b) => path.startsWith(b.prefix));
  return match?.label ?? "Overview";
}

function isActive(item: NavItem, path: string): boolean {
  if (!item.to) return false;
  return item.exact ? path === item.to : path.startsWith(item.to);
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  if (!item.to) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-sm px-3 py-2 lv-body text-muted-foreground/60">
        <span className="flex items-center gap-3">
          <item.icon className="h-4 w-4" aria-hidden="true" />
          {item.label}
        </span>
        <span className="lv-meta rounded-sm bg-muted px-1.5 py-0.5 text-muted-foreground">
          Soon
        </span>
      </div>
    );
  }
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-sm px-3 py-2 lv-body transition-colors duration-150 ease-out ${
        active ? "bg-accent text-primary font-medium" : "text-foreground hover:bg-accent"
      }`}
    >
      <item.icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [signingOut, setSigningOut] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

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
    <div className="lv-light min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border flex-col bg-card">
        <div className="h-[52px] px-5 flex items-center gap-2 border-b border-border">
          <img src="/logo.png" alt="" className="h-6 w-6" />
          <span className="lv-section text-foreground">Lanavix</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              <div className="lv-meta px-3 pb-1 uppercase tracking-wide text-muted-foreground">
                {section.heading}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.label} item={item} active={isActive(item, path)} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={signOut}
            disabled={signingOut}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar: 52px, hairline border, breadcrumb left, search/Coach right */}
        <header className="h-[52px] shrink-0 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-sm text-foreground hover:bg-accent"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="lv-label text-muted-foreground truncate">{breadcrumbLabel(path)}</span>
          </div>
          <CommandPalette />
        </header>

        {/* Every other route (not yet redesigned this slice) keeps its
            current dark presentation exactly as before - app-dark is
            scoped here instead of on the whole shell so Overview (which
            opts back out via .lv-light on its own root) can render the
            new light Foundations while everything else is untouched. */}
        <main className="app-dark flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lv-light md:hidden fixed bottom-0 inset-x-0 h-16 border-t border-border bg-card flex items-stretch z-20">
          {MOBILE_TABS.map((item) => {
            const active = isActive(item, path);
            const content = (
              <>
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span className="lv-meta">{item.label}</span>
              </>
            );
            return item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {content}
              </Link>
            ) : (
              <div
                key={item.label}
                className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] text-muted-foreground/50"
              >
                {content}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] text-muted-foreground"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="lv-meta">More</span>
          </button>
        </nav>
      </div>

      {/* Mobile "More" sheet: everything not on the tab bar */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="lv-light max-h-[80vh] overflow-y-auto rounded-t-lg">
          <SheetHeader>
            <SheetTitle className="lv-section">More</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {NAV_SECTIONS.map((section) => (
              <div key={section.heading}>
                <div className="lv-meta pb-1 uppercase tracking-wide text-muted-foreground">
                  {section.heading}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.label}
                      item={item}
                      active={isActive(item, path)}
                      onClick={() => setMoreOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 min-h-[44px] text-muted-foreground hover:text-foreground"
                onClick={signOut}
                disabled={signingOut}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {signingOut ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
