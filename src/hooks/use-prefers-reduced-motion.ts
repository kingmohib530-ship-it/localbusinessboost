import { useEffect, useState } from "react";

/** Tracks the user's OS-level motion preference at runtime, not just via
 * CSS. Needed because parallax/tilt/glow effects move elements by writing
 * inline transform or custom-property styles directly from JS on every
 * scroll or pointer event; the CSS reduced-motion overrides in styles.css
 * only catch actual CSS transitions/animations, they can't stop a script
 * from setting a style on every frame. So every effect that does that
 * checks this flag itself before touching anything. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
