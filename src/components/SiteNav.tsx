import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavLink = { to: string; label: string; anchor?: boolean };
const NAV_LINKS: NavLink[] = [
  { to: "/", label: "Home" },
  { to: "/#features", label: "What you get", anchor: true },
  { to: "/#how-it-works", label: "How it works", anchor: true },
  { to: "/pricing", label: "Pricing" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold tracking-tight">LUNAVX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {NAV_LINKS.map((l) =>
            l.anchor ? (
              <a key={l.label} href={l.to} className="hover:text-foreground transition-colors">
                {l.label}
              </a>
            ) : (
              <Link key={l.label} to={l.to as string} className="hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" className="glow-primary">
              Free Audit <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
          <div className="px-6 py-4 flex flex-col gap-3 text-sm">
            {NAV_LINKS.map((l) =>
              l.anchor ? (
                <a key={l.label} href={l.to} className="py-1 text-muted-foreground" onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.label} to={l.to} className="py-1 text-muted-foreground" onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              ),
            )}
            <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">Login</Button>
              </Link>
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full">
                  Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
