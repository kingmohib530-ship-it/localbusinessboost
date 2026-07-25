import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "lanavix:cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

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
    <div className="fixed bottom-0 inset-x-0 z-[60] border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p className="text-sm text-muted-foreground text-center sm:text-left flex-1">
          We use essential cookies only (login, preferences). No tracking or ads.{" "}
          <Link to="/cookies" className="underline hover:text-foreground transition-colors">Learn more</Link>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 hover:bg-primary/90 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
