import type { CSSProperties, ReactNode } from "react";

interface TicketCardProps {
  children: ReactNode;
  /** Job/ticket number shown on the corner stub, e.g. "JT-4471". */
  ticketNumber: string;
  /** Whatever sits behind this card — the punch-hole notches need to match it. */
  punchBackground?: string;
  className?: string;
}

/**
 * The one signature shape in this design: a card that reads as a real
 * dispatch/job-ticket slip torn off a pad, not a generic rounded
 * rectangle. Used deliberately in a handful of places — see styles.css
 * for how the clip-path and the perforated tear-line actually work.
 */
export function TicketCard({ children, ticketNumber, punchBackground, className = "" }: TicketCardProps) {
  const style = punchBackground
    ? ({ "--ticket-punch-bg": punchBackground } as CSSProperties)
    : undefined;

  return (
    <div className={`ticket-card ${className}`} style={style}>
      <div className="ticket-tear-line" />
      <span className="ticket-stub">#{ticketNumber}</span>
      {children}
    </div>
  );
}
