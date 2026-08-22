import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  LayoutDashboard,
  Inbox,
  Users,
  Phone,
  Target,
  Calendar,
  Star,
  MessageCircle,
  CreditCard,
  Settings,
  Search as SearchIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

/**
 * Cmd+K / Ctrl+K command palette. Coach lives here rather than as a
 * permanent sidebar destination (approved App Shell spec) - this is its
 * primary entry point, alongside quick navigation to the rest of the app.
 */
const DESTINATIONS: { to: string; label: string; icon: typeof LayoutDashboard }[] = [
  { to: "/app", label: "Overview", icon: LayoutDashboard },
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/leads", label: "Leads", icon: Users },
  { to: "/app/calendar", label: "Calendar", icon: Calendar },
  { to: "/app/agents", label: "Outreach", icon: Target },
  { to: "/app/reputation", label: "Reviews", icon: Star },
  { to: "/app/receptionist", label: "Receptionist", icon: Phone },
  { to: "/app/web-chat", label: "Web Chat", icon: MessageCircle },
  { to: "/app/billing", label: "Billing", icon: CreditCard },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(to: string) {
    setOpen(false);
    navigate({ to });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[38px] items-center gap-2 rounded-sm border border-border bg-background px-3 lv-label text-muted-foreground transition-colors duration-150 ease-out hover:bg-accent hover:text-foreground"
        aria-label="Open command palette"
      >
        <SearchIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Search or ask Coach</span>
        <kbd className="hidden sm:inline lv-meta text-muted-foreground">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Ask Coach or jump to a page..." />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>
          <CommandGroup heading="Coach">
            <CommandItem onSelect={() => go("/app/coach")}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Open Coach
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Go to">
            {DESTINATIONS.map((d) => (
              <CommandItem key={d.to} onSelect={() => go(d.to)}>
                <d.icon className="h-4 w-4" aria-hidden="true" />
                {d.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
