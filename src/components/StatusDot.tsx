import { cn } from "@/lib/utils";

/**
 * Approved status vocabulary (Lanavix Foundations, Slice 1). Status is
 * always dot + text, never color alone - keep this list closed rather
 * than inventing new labels per feature.
 */
export type LvStatus =
  | "waiting_on_you"
  | "no_reply"
  | "new"
  | "booked"
  | "done"
  | "stale"
  | "failed"
  | "automated"
  | "draft"
  | "automation_on"
  | "human_takeover";

const STATUS_META: Record<LvStatus, { label: string; dotClassName: string }> = {
  waiting_on_you: { label: "Waiting on you", dotClassName: "bg-[var(--warning)]" },
  no_reply: { label: "No reply", dotClassName: "bg-muted-foreground" },
  new: { label: "New", dotClassName: "bg-primary" },
  booked: { label: "Booked", dotClassName: "bg-primary" },
  done: { label: "Done", dotClassName: "bg-muted-foreground" },
  stale: { label: "Stale", dotClassName: "bg-[var(--warning)]" },
  failed: { label: "Failed", dotClassName: "bg-destructive" },
  automated: { label: "Automated", dotClassName: "bg-muted-foreground" },
  draft: { label: "Draft", dotClassName: "bg-muted-foreground" },
  automation_on: { label: "Automation on", dotClassName: "bg-primary" },
  human_takeover: { label: "Human takeover", dotClassName: "bg-[var(--warning)]" },
};

export function StatusDot({ status, className }: { status: LvStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 lv-label text-foreground whitespace-nowrap",
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dotClassName)}
        aria-hidden="true"
      />
      {meta.label}
    </span>
  );
}
