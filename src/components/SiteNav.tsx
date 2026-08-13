import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavLink = { to: string; label: string; anchor?: boolean };
const NAV_LINKS: NavLink[] = [
  { to: "/", label: "Home" },
  { to: "/#features", label: "What you get", anchor: true },
  { to: "/#how-it-works", label: "How it works", anchor: true },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
];

interface SiteNavProps {
  /** "dark" is the glass nav for the homepage's dark system; every other
   * page still using the light system (pricing, about, legal pages) keeps
   * the default. */
  variant?: "light" | "dark";
}

export function SiteNav({ variant = "light" }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dark = variant === "dark";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-xl transition-all duration-500 ease-out ${loaded ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"} ${
        dark
          ? "border-b border-[var(--hd-border)] bg-[var(--hd-bg)]/70"
          : "border-b border-border/60 bg-background/80"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src={dark ? "/logo-white.png" : "/logo.png"}
            alt="Lanavix"
            className="h-8 w-8 transition-transform duration-200 group-hover:scale-105"
          />
          <span
            className={`font-display font-bold tracking-tight ${dark ? "text-[var(--hd-fg)]" : ""}`}
          >
            Lanavix
          </span>
        </Link>

        <nav
          className={`hidden md:flex items-center gap-1 text-sm ${dark ? "text-[var(--hd-muted)]" : "text-muted-foreground"}`}
        >
          {NAV_LINKS.map((l) =>
            l.anchor ? (
              <a
                key={l.label}
                href={l.to}
                className={`px-3 py-2 rounded-md transition-colors duration-150 ${dark ? "hover:text-[var(--hd-fg)] hover:bg-[var(--hd-glass)]" : "hover:text-foreground hover:bg-accent"}`}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={l.to as string}
                className={`px-3 py-2 rounded-md transition-colors duration-150 ${dark ? "hover:text-[var(--hd-fg)] hover:bg-[var(--hd-glass)]" : "hover:text-foreground hover:bg-accent"}`}
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/auth"
            className={`text-sm transition-colors px-3 py-2 ${dark ? "text-[var(--hd-muted)] hover:text-[var(--hd-fg)]" : "text-muted-foreground hover:text-foreground"}`}
          >
            Sign in
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button
              size="sm"
              className={`transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md ${dark ? "bg-[var(--hd-primary)] hover:bg-[var(--hd-primary)]/90 text-white" : ""}`}
            >
              Sign up <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <button
          className={`md:hidden p-2 ${dark ? "text-[var(--hd-fg)]" : "text-foreground"}`}
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="relative block h-5 w-5">
            <Menu
              className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${open ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`}
            />
            <X
              className={`absolute inset-0 h-5 w-5 transition-all duration-200 ${open ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`}
            />
          </span>
        </button>
      </div>

      <div
        className={`md:hidden overflow-hidden backdrop-blur-xl transition-all duration-300 ease-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} ${
          dark
            ? "border-t border-[var(--hd-border)] bg-[var(--hd-bg)]/95"
            : "border-t border-border/60 bg-background/95"
        }`}
      >
        <div className="px-6 py-4 flex flex-col gap-1 text-sm">
          {NAV_LINKS.map((l) =>
            l.anchor ? (
              <a
                key={l.label}
                href={l.to}
                className={`py-2 px-2 rounded-md transition-colors ${dark ? "text-[var(--hd-muted)] hover:bg-[var(--hd-glass)] hover:text-[var(--hd-fg)]" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                to={l.to}
                className={`py-2 px-2 rounded-md transition-colors ${dark ? "text-[var(--hd-muted)] hover:bg-[var(--hd-glass)] hover:text-[var(--hd-fg)]" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ),
          )}
          <div
            className={`flex flex-col gap-2 pt-3 mt-2 border-t ${dark ? "border-[var(--hd-border)]" : "border-border/60"}`}
          >
            <Link to="/auth" onClick={() => setOpen(false)}>
              <Button
                variant="outline"
                size="sm"
                className={`w-full ${dark ? "bg-[var(--hd-glass)] border-[var(--hd-border)] text-[var(--hd-fg)]" : ""}`}
              >
                Sign in
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
              <Button
                size="sm"
                className={`w-full ${dark ? "bg-[var(--hd-primary)] hover:bg-[var(--hd-primary)]/90 text-white" : ""}`}
              >
                Sign up <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
