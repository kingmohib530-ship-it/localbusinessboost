import { Link } from "@tanstack/react-router";

type FooterLink = { to: string; label: string };
type FooterCol = { title: string; links: FooterLink[] };

const COLS: FooterCol[] = [
  {
    title: "Product",
    links: [
      { to: "/#workflow", label: "How it works" },
      { to: "/pricing", label: "Pricing" },
      { to: "/auth", label: "Start free trial" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/about", label: "About" },
      { to: "/audit", label: "Free audit" },
      { to: "/faq", label: "FAQ" },
      { to: "/chat", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy policy" },
      { to: "/terms", label: "Terms of service" },
      { to: "/refund", label: "Refund policy" },
      { to: "/cookies", label: "Cookie policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-bold">L</span>
              </div>
              <span className="lv-section text-foreground">Lanavix</span>
            </div>
            <p className="lv-body text-muted-foreground mt-3 max-w-xs">
              Missed-call text-back, review automation, and local lead-finding for service
              contractors — running quietly in the background of your day.
            </p>
            <a
              href="tel:+15719215254"
              className="block lv-meta text-muted-foreground hover:text-foreground transition-colors mt-3"
            >
              +1 (571) 921-5254
            </a>
          </div>
          {COLS.map((c) => (
            <div key={c.title}>
              <div className="lv-label text-foreground">{c.title}</div>
              <ul className="mt-3 space-y-2 lv-body text-muted-foreground">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="hover:text-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-8 pt-5 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="lv-meta text-muted-foreground">
            © {new Date().getFullYear()} Lanavix. All rights reserved.
          </p>
          <p className="lv-meta text-muted-foreground">
            Built by Mohib Ahmadzai in Prince William County, VA.
          </p>
        </div>
      </div>
    </footer>
  );
}
