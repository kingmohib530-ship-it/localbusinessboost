import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

interface GlowPanelProps {
  /** Merged onto the panel's own div, same as any other dashboard card:
   * this is the inline-style-with-CSS-vars convention the rest of the
   * authenticated app uses, not the marketing site's Tailwind classes. */
  style?: CSSProperties;
  className?: string;
  reducedMotion?: boolean;
  children: ReactNode;
  onClick?: () => void;
}

/** The dashboard's version of the marketing homepage's cursor-glow card:
 * a spotlight that follows the pointer via the same --mx/--my custom
 * properties, but built to merge into a `style` object instead of a
 * className string so it drops straight into the app's existing
 * inline-style cards without needing them rewritten onto Tailwind. */
export function GlowPanel({ style, className = "", reducedMotion = false, children, onClick }: GlowPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ mx: 50, my: 50 });

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ mx: ((e.clientX - rect.left) / rect.width) * 100, my: ((e.clientY - rect.top) / rect.height) * 100 });
  }
  function onMouseLeave() {
    if (reducedMotion) return;
    setPos({ mx: 50, my: 50 });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      style={{ ...style, ["--mx" as string]: `${pos.mx}%`, ["--my" as string]: `${pos.my}%` }}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{ background: "radial-gradient(320px circle at var(--mx) var(--my), rgba(99,102,241,0.16), transparent 70%)" }}
      />
      {children}
    </div>
  );
}
