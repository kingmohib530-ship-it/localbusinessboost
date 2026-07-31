import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";

const STORAGE_KEY = "lanavix:cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  // Rendered once in __root.tsx for every route, so it can't inherit the
  // homepage's .page-dark scope the way a component nested inside that
  // page could. Checking the path directly is the plain way to match its
  // style to whichever page it's actually floating over.
  const { pathname } = useLocation();
  const dark = pathname === "/";

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
        dark ? "border-[var(--hd-border)] bg-[var(--hd-bg)]/90" : "border-border bg-background/95 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p className={`text-sm text-center sm:text-left flex-1 ${dark ? "text-[var(--hd-muted)]" : "text-muted-foreground"}`}>
          We use essential cookies only (login, preferences). No tracking or ads.{" "}
          <Link to="/cookies" className={`underline transition-colors ${dark ? "hover:text-[var(--hd-fg)]" : "hover:text-foreground"}`}>Learn more</Link>
        </p>
        <button
          onClick={dismiss}
          className={`shrink-0 rounded-lg text-sm font-semibold px-5 py-2 transition-colors ${
            dark ? "bg-[var(--hd-primary)] text-white hover:bg-[var(--hd-primary)]/90" : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
