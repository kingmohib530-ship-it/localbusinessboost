import { useEffect, useState, type CSSProperties } from "react";

/** Flips true one animation frame after mount, so a dashboard page can
 * trigger the same hd-blur-in spring/blur-to-focus entrance the marketing
 * homepage uses (see styles.css), instead of content just hard-cutting in.
 * Stays at opacity-0 (no animation class) until then, so a visitor without
 * JS still sees everything immediately. */
export function useMountReveal() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const step = loaded ? "hd-blur-in" : "opacity-0";
  const delay = (i: number): CSSProperties | undefined => (loaded ? { animationDelay: `${i * 70}ms` } : undefined);
  return { loaded, step, delay };
}
