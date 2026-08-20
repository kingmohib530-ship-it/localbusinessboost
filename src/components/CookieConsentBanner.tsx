import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";

const STORAGE_KEY = "lanavix:cookie_consent";
const DARK_PATHS = ["/", "/pricing", "/about", "/terms", "/privacy", "/refund", "/cookies", "/faq"];

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  // Rendered once in __root.tsx as a sibling of <Outlet/>, not a descendant
  // of it, so it can't inherit --hd-* custom properties from either the
  // homepage's .page-dark or the dashboard's .app-dark scope: those only
  // cascade to elements nested inside them, not to siblings. Hardcoding the
  // same dark palette values directly below (rather than reading the
  // custom properties) is what actually makes this render correctly on
  // both dark surfaces, not just by coincidence on one of them.
  const { pathname } = useLocation();
  const dark = DARK_PATHS.includes(pathname) || pathname.startsWith("/app");
  // The App Shell's mobile bottom tab bar (Today/Calendar/More, <md only)
  // sits at bottom-0 with z-20 - at the banner's usual bottom-4 it would
  // render on top of and block those tap targets. Only /app routes have
  // that tab bar, so only they need the extra clearance.
  const inApp = pathname.startsWith("/app");

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage unavailable (e.g. private browsing) — skip silently.
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      // A full-width bottom bar covered the homepage's primary CTA button
      // on common viewport heights (it sits right at the fold). A compact
      // corner card keeps the same content but clears that CTA - and any
      // other bottom-of-viewport content - on both the marketing pages and
      // the dashboard.
      className={`fixed ${inApp ? "bottom-20 md:bottom-4" : "bottom-4"} right-4 left-4 sm:left-auto sm:max-w-sm z-[60] rounded-2xl border shadow-lg backdrop-blur-md ${
        dark ? "border-white/10 bg-[#08090b]/95" : "border-border bg-background/95"
      }`}
    >
      <div className="p-3 flex items-center gap-3">
        <p className={`text-xs flex-1 ${dark ? "text-[#9096a3]" : "text-muted-foreground"}`}>
          Essential cookies only. No tracking or ads.{" "}
          <Link
            to="/cookies"
            className={`underline transition-colors ${dark ? "hover:text-[#f5f6f7]" : "hover:text-foreground"}`}
          >
            Learn more
          </Link>
        </p>
        <button
          onClick={dismiss}
          className={`shrink-0 rounded-lg text-xs font-semibold px-4 py-1.5 transition-colors ${
            dark
              ? "bg-[#6366f1] text-white hover:bg-[#6366f1]/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
