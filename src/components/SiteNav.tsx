import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavLink = { to: string; label: string; anchor?: boolean };
const NAV_LINKS: NavLink[] = [
  { to: "/#workflow", label: "Product", anchor: true },
  { to: "/pricing", label: "Pricing" },
  { to: "/faq", label: "FAQ" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">L</span>
          </div>
          <span className="lv-section text-foreground">Lanavix</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 lv-body text-muted-foreground">
          {NAV_LINKS.map((l) =>
            l.anchor ? (
              <a
                key={l.label}
                href={l.to}
                className="px-3 py-2 rounded-md transition-colors duration-150 hover:text-foreground hover:bg-accent"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={l.to}
                className="px-3 py-2 rounded-md transition-colors duration-150 hover:text-foreground hover:bg-accent"
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/auth"
            className="lv-body text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm" className="min-h-[40px]">
              Get started
            </Button>
          </Link>
        </div>

        <button
          className="md:hidden flex h-11 w-11 items-center justify-center -mr-2 text-foreground"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 flex flex-col gap-1 lv-body">
            {NAV_LINKS.map((l) =>
              l.anchor ? (
                <a
                  key={l.label}
                  href={l.to}
                  className="min-h-[44px] flex items-center px-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.label}
                  to={l.to}
                  className="min-h-[44px] flex items-center px-2 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ),
            )}
            <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border">
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full min-h-[44px]">
                  Sign in
                </Button>
              </Link>
              <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full min-h-[44px]">
                  Get started <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
