import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Phone,
  Inbox,
  Target,
  Calendar,
  Star,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type Step = {
  icon: LucideIcon;
  label: string;
  title: string;
  body: string;
  panel: ReactNode;
};

function StatusPill({ tone, children }: { tone: "primary" | "muted"; children: ReactNode }) {
  return (
    <span
      className={
        tone === "primary"
          ? "lv-meta rounded-sm bg-accent px-2 py-0.5 font-medium text-primary"
          : "lv-meta rounded-sm border border-border px-2 py-0.5 font-medium text-muted-foreground"
      }
    >
      {children}
    </span>
  );
}

function PanelChrome({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="lv-label text-foreground">{label}</span>
        <span className="lv-meta text-muted-foreground">Illustrative example</span>
      </div>
      {children}
    </div>
  );
}

const STEPS: Step[] = [
  {
    icon: Phone,
    label: "Call comes in",
    title: "A call is missed",
    body: "Whoever's on the tools can't grab the phone. Lanavix answers with a text before the caller hangs up on you for good.",
    panel: (
      <PanelChrome label="Receptionist">
        <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 flex items-center justify-between mb-2">
          <span className="lv-body text-destructive">Missed call · (555) 010-0148</span>
          <span className="lv-meta text-destructive/70">just now</span>
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center lv-meta font-semibold text-primary shrink-0">
            AI
          </div>
          <div className="rounded-md bg-muted px-3 py-2 lv-body text-foreground flex-1">
            "Hi, this is Peak HVAC — sorry we missed you. What do you need help with?"
          </div>
        </div>
      </PanelChrome>
    ),
  },
  {
    icon: Inbox,
    label: "Lead is captured",
    title: "The conversation lands in one inbox",
    body: "No more checking five different places. Every missed call, text, and web-chat message shows up in the same place.",
    panel: (
      <PanelChrome label="Inbox">
        <div className="rounded-sm border border-border px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="lv-body text-foreground font-medium">Unknown caller · (555) 010-0148</p>
            <p className="lv-meta text-muted-foreground">
              "AC not cooling, can you come tomorrow?"
            </p>
          </div>
          <StatusPill tone="primary">New</StatusPill>
        </div>
      </PanelChrome>
    ),
  },
  {
    icon: Target,
    label: "Follow-up stays on track",
    title: "Nothing falls through the cracks",
    body: "The lead moves through contacted, quoted, and follow-up due — automatically, without a sticky note.",
    panel: (
      <PanelChrome label="Leads">
        <div className="flex items-center gap-2">
          {["Contacted", "Quote sent", "Follow-up due"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span
                className={
                  i < 2
                    ? "lv-meta rounded-sm bg-accent px-2 py-1 text-primary font-medium"
                    : "lv-meta rounded-sm border border-border px-2 py-1 text-foreground font-medium"
                }
              >
                {s}
              </span>
              {i < 2 && <span className="text-muted-foreground text-xs">→</span>}
            </div>
          ))}
        </div>
      </PanelChrome>
    ),
  },
  {
    icon: Calendar,
    label: "Appointment gets booked",
    title: "The job goes on the calendar",
    body: "The AI locks in a time that works, so you open your calendar to a booked job instead of a voicemail.",
    panel: (
      <PanelChrome label="Calendar">
        <div className="rounded-sm border border-border px-3 py-2.5 flex items-center justify-between">
          <div>
            <p className="lv-body text-foreground font-medium">Tomorrow, 10:00 AM</p>
            <p className="lv-meta text-muted-foreground">AC repair · 148 Elm St</p>
          </div>
          <StatusPill tone="primary">Confirmed</StatusPill>
        </div>
      </PanelChrome>
    ),
  },
  {
    icon: Star,
    label: "Review gets requested",
    title: "The review request goes out on its own",
    body: "After the job's marked done, the customer gets a direct link to leave a Google review — no reminder needed from you.",
    panel: (
      <PanelChrome label="Reviews">
        <div className="rounded-sm border border-border px-3 py-2.5 flex items-center justify-between mb-2">
          <span className="lv-body text-foreground">Job marked complete</span>
          <StatusPill tone="muted">Review request sent</StatusPill>
        </div>
        <div className="rounded-sm border border-border px-3 py-2.5 flex items-center justify-between">
          <span className="lv-body text-foreground">"Fast, friendly, fixed it right away."</span>
          <div className="flex items-center gap-0.5 text-primary shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current" />
            ))}
          </div>
        </div>
      </PanelChrome>
    ),
  },
  {
    icon: LayoutDashboard,
    label: "You see what needs you",
    title: "You stay in the loop, not in the weeds",
    body: "Everything routine runs on its own. Your Overview surfaces the handful of things that actually need a decision from you.",
    panel: (
      <PanelChrome label="Overview · Needs you">
        <div className="space-y-2">
          <div className="rounded-sm border border-border px-3 py-2 flex items-center justify-between">
            <span className="lv-body text-foreground">1 lead awaiting your reply</span>
            <span className="text-muted-foreground text-xs">→</span>
          </div>
          <div className="rounded-sm border border-border px-3 py-2 flex items-center justify-between">
            <span className="lv-body text-foreground">1 review needs a response</span>
            <span className="text-muted-foreground text-xs">→</span>
          </div>
        </div>
      </PanelChrome>
    ),
  },
];

const STEP_DURATION_MS = 4500;

/** The homepage's one interactive product demonstration: a step-through of
 * a missed call becoming a booked job and a review, built from the same
 * panel/typography classes as the real authenticated app (not a separate
 * "marketing mockup" visual language). Auto-advances on a timer, but stops
 * the moment a visitor interacts with it (click, keyboard, hover) so it
 * never fights someone reading at their own pace, and never auto-advances
 * at all under prefers-reduced-motion. */
export function WorkflowDemo() {
  const reducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (reducedMotion || !autoplay) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % STEPS.length);
    }, STEP_DURATION_MS);
    return () => clearInterval(id);
  }, [reducedMotion, autoplay]);

  function select(index: number) {
    setActive(index);
    setAutoplay(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    let next = active;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (active + 1) % STEPS.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = (active - 1 + STEPS.length) % STEPS.length;
    else return;
    e.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  }

  const current = STEPS[active];

  return (
    <div
      id="workflow"
      className="grid md:grid-cols-[minmax(0,280px)_1fr] gap-6 md:gap-10 items-start"
    >
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Lanavix workflow steps"
        className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible"
        onKeyDown={onKeyDown}
      >
        {STEPS.map((step, i) => {
          const selected = i === active;
          return (
            <button
              key={step.label}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              className={`shrink-0 min-h-[44px] text-left rounded-md px-3 py-2.5 flex items-center gap-3 transition-colors duration-150 ${
                selected
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <step.icon className="h-4 w-4 shrink-0" />
              <span className="lv-body font-medium whitespace-nowrap md:whitespace-normal">
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <div key={active} className={reducedMotion ? "" : "animate-fade-up"}>
          <h3 className="lv-section text-foreground mb-1.5">{current.title}</h3>
          <p className="lv-body text-muted-foreground mb-4 max-w-md">{current.body}</p>
          {current.panel}
        </div>
      </div>
    </div>
  );
}
