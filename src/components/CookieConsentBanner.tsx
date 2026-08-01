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
      className={`fixed bottom-0 inset-x-0 z-[60] border-t backdrop-blur-md ${
        dark ? "border-white/10 bg-[#08090b]/90" : "border-border bg-background/95 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p
          className={`text-sm text-center sm:text-left flex-1 ${dark ? "text-[#9096a3]" : "text-muted-foreground"}`}
        >
          We use essential cookies only (login, preferences). No tracking or ads.{" "}
          <Link
            to="/cookies"
            className={`underline transition-colors ${dark ? "hover:text-[#f5f6f7]" : "hover:text-foreground"}`}
          >
            Learn more
          </Link>
        </p>
        <button
          onClick={dismiss}
          className={`shrink-0 rounded-lg text-sm font-semibold px-5 py-2 transition-colors ${
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
