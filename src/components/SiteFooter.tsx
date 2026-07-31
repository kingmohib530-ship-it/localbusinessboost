import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

type FooterLink = { to: string; label: string; external?: boolean };
type FooterCol = { title: string; links: FooterLink[] };

const COLS: FooterCol[] = [
  {
    title: "Product",
    links: [
      { to: "/#features", label: "Features" },
      { to: "/#how-it-works", label: "How It Works" },
      { to: "/pricing", label: "Pricing" },
      { to: "/auth", label: "Start Free Trial" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/audit", label: "Free Audit" },
      { to: "/faq", label: "FAQ" },
      { to: "/chat", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Service" },
      { to: "/refund", label: "Refund Policy" },
      { to: "/cookies", label: "Cookie Policy" },
    ],
  },
];

interface SiteFooterProps {
  /** "dark" matches the homepage's dark system; every other page keeps
   * the default light footer. */
  variant?: "light" | "dark";
}

export function SiteFooter({ variant = "light" }: SiteFooterProps) {
  const dark = variant === "dark";

  return (
    <footer className={dark ? "border-t border-[var(--hd-border)] bg-[var(--hd-surface)]" : "border-t border-border/60 bg-card/20"}>
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className={`font-display font-bold tracking-tight ${dark ? "text-[var(--hd-fg)]" : ""}`}>Lanavix</span>
            </div>
            <p className={`text-sm mt-4 max-w-xs ${dark ? "text-[var(--hd-muted)]" : "text-muted-foreground"}`}>
              Missed-call text-back, review requests, and local lead-finding, built for contractors
              and running quietly in the background of your day.
            </p>
            <a
              href="tel:+15719215254"
              className={`block text-sm mt-3 transition-colors ${dark ? "text-[var(--hd-muted)] hover:text-[var(--hd-fg)]" : "text-muted-foreground hover:text-foreground"}`}
            >
              +1 (571) 921-5254
            </a>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <div className={`text-xs font-semibold uppercase tracking-widest ${dark ? "text-[var(--hd-fg)]/80" : "text-foreground/80"}`}>
                {c.title}
              </div>
              <ul className={`mt-4 space-y-2 text-sm ${dark ? "text-[var(--hd-muted)]" : "text-muted-foreground"}`}>
                {c.links.map((l) =>
                  l.external ? (
                    <li key={l.label}>
                      <a href={l.to} className={`transition-colors ${dark ? "hover:text-[var(--hd-fg)]" : "hover:text-foreground"}`}>
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link to={l.to as string} className={`transition-colors ${dark ? "hover:text-[var(--hd-fg)]" : "hover:text-foreground"}`}>
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className={`border-t mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2 ${dark ? "border-[var(--hd-border)]" : "border-border/60"}`}>
          <p className={`text-xs ${dark ? "text-[var(--hd-muted)]" : "text-muted-foreground"}`}>
            © {new Date().getFullYear()} Lanavix. All rights reserved.
          </p>
          <p className={`text-xs ${dark ? "text-[var(--hd-muted)]" : "text-muted-foreground"}`}>
            Built by Mohib Ahmadzai in Prince William County, VA.
          </p>
        </div>
      </div>
    </footer>
  );
}
