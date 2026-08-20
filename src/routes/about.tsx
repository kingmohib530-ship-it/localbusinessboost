import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MapPin, Mail } from "lucide-react";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: pageMeta({
      title: "About — Lanavix",
      description:
        "About Lanavix — the AI receptionist and growth platform for local service businesses.",
      path: "/about",
    }),
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <section className="py-16 md:py-20 px-6 border-b border-border text-center">
        <p className="lv-label text-primary mb-2">About</p>
        <h1 className="lv-display text-[30px] md:text-[36px] text-foreground mb-3">
          Built for local service businesses
        </h1>
        <p className="lv-body text-muted-foreground max-w-xl mx-auto">
          Lanavix exists so a missed call never costs a contractor a job.
        </p>
      </section>

      <section className="py-16 md:py-20 px-6">
        <div className="max-w-2xl mx-auto space-y-12">
          <div>
            <h2 className="lv-section text-foreground mb-3">Our mission</h2>
            <p className="lv-body text-muted-foreground leading-relaxed">
              Most local service businesses — HVAC, plumbing, roofing, cleaning, and more — lose
              real revenue every week to missed calls, slow follow-up, and reviews that never get
              requested. Lanavix builds an AI receptionist and growth toolkit that answers
              instantly, keeps the conversation going, and helps a small team compete with
              businesses ten times their size — without hiring anyone new.
            </p>
          </div>

          <div>
            <h2 className="lv-section text-foreground mb-3">Founder</h2>
            <div className="rounded-md border border-border bg-card p-6 flex gap-5 items-start">
              <img
                src="/mohib-founder-photo.jpg"
                alt="Mohib Ahmadzai, founder of Lanavix"
                className="h-16 w-16 rounded-full object-cover shrink-0"
              />
              <p className="lv-body text-muted-foreground leading-relaxed">
                I'm Mohib Ahmadzai, founder of Lanavix. I built this because too many contractors
                lose real business to a missed call or a review that never got a response — problems
                that are completely solvable with the right automation. Lanavix exists to give every
                local service business AI tools that used to only be available to big companies with
                big budgets.
              </p>
            </div>
          </div>

          <div>
            <h2 className="lv-section text-foreground mb-3">Where we're based</h2>
            <div className="flex items-center gap-2.5 lv-body text-muted-foreground mb-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Prince William County, Virginia</span>
            </div>
            <div className="flex items-center gap-2.5 lv-body text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <a href="mailto:moh@lanavix.com" className="hover:text-foreground transition-colors">
                moh@lanavix.com
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
