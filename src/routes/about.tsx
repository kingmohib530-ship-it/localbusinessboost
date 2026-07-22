import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MapPin, Mail } from "lucide-react";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: pageMeta({
      title: "About — Lanavix",
      description: "About Lanavix — the AI receptionist and growth platform for local service businesses.",
      path: "/about",
    }),
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <section className="py-24 px-6 border-b border-border bg-secondary/50 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">About</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Built for local service businesses
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Lanavix exists so a missed call never costs a contractor a job.
        </p>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto space-y-14">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-4">Our mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              Most local service businesses — HVAC, plumbing, roofing, cleaning, and more — lose real revenue every
              week to missed calls, slow follow-up, and reviews that never get requested. Lanavix builds an AI
              receptionist and growth toolkit that answers instantly, keeps the conversation going, and helps a small
              team compete with businesses ten times their size — without hiring anyone new.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-4">Founder</h2>
            <div className="rounded-xl border border-border bg-card p-7 flex gap-6 items-start">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0 text-center px-2">
                [Photo to be added]
              </div>
              <p className="text-muted-foreground leading-relaxed italic">
                [Founder name and bio to be added]
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-4">Where we're based</h2>
            <div className="flex items-center gap-2.5 text-muted-foreground mb-3">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Prince William County, Virginia</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <a href="mailto:moh@lanavix.com" className="hover:text-foreground transition-colors">moh@lanavix.com</a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
