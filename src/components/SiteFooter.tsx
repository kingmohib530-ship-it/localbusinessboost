import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

const COLS = [
  {
    title: "Product",
    links: [
      { to: "/#features", label: "Features", anchor: true },
      { to: "/#agents", label: "AI Agents", anchor: true },
      { to: "/pricing", label: "Pricing" },
      { to: "/auth", label: "Start Free Trial" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/#about", label: "About", anchor: true },
      { to: "/#blog", label: "Blog", anchor: true },
      { to: "/chat", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/#privacy", label: "Privacy", anchor: true },
      { to: "/#terms", label: "Terms", anchor: true },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/20">
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold tracking-tight">LUNAVX</span>
            </div>
            <p className="text-sm text-muted-foreground mt-4 max-w-xs">
              Your 24/7 AI business team. Built for local service businesses and freelancers who want
              more customers without more hours.
            </p>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <div className="text-xs font-semibold uppercase tracking-widest text-foreground/80">
                {c.title}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {c.links.map((l) =>
                  l.anchor ? (
                    <li key={l.label}>
                      <a href={l.to} className="hover:text-foreground transition-colors">
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link to={l.to} className="hover:text-foreground transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border/60 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} LUNAVX. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            AI Workforce OS · Built for businesses that want to grow.
          </p>
        </div>
      </div>
    </footer>
  );
}
