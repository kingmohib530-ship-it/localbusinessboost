import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GlowPanel } from "@/components/GlowPanel";
import { MapPin, Mail } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useMountReveal } from "@/hooks/use-mount-reveal";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

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
  const reducedMotion = usePrefersReducedMotion();
  const { step, delay } = useMountReveal();

  return (
    <div className="page-dark min-h-screen flex flex-col">
      <SiteNav variant="dark" />

      <section className="relative overflow-hidden py-24 px-6 border-b border-[var(--hd-border)] bg-[var(--hd-surface)] text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="hd-mesh-blob hd-mesh-blob-a"
            style={{
              top: "-20%",
              left: "10%",
              width: 420,
              height: 420,
              background: "var(--hd-primary)",
              opacity: 0.22,
            }}
          />
          <div
            className="hd-mesh-blob hd-mesh-blob-b"
            style={{
              top: "-10%",
              right: "5%",
              width: 380,
              height: 380,
              background: "var(--hd-primary-2)",
              opacity: 0.18,
            }}
          />
        </div>
        <div className={`relative z-10 ${step}`} style={delay(0)}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--hd-primary-2)] mb-3">
            About
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[var(--hd-fg)]">
            Built for local service businesses
          </h1>
          <p className="text-lg text-[var(--hd-muted)] max-w-xl mx-auto">
            Lanavix exists so a missed call never costs a contractor a job.
          </p>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto space-y-14">
          <div className={step} style={delay(1)}>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-4 text-[var(--hd-fg)]">
              Our mission
            </h2>
            <p className="text-[var(--hd-muted)] leading-relaxed">
              Most local service businesses — HVAC, plumbing, roofing, cleaning, and more — lose
              real revenue every week to missed calls, slow follow-up, and reviews that never get
              requested. Lanavix builds an AI receptionist and growth toolkit that answers
              instantly, keeps the conversation going, and helps a small team compete with
              businesses ten times their size — without hiring anyone new.
            </p>
          </div>

          <div className={step} style={delay(2)}>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-4 text-[var(--hd-fg)]">
              Founder
            </h2>
            <GlowPanel
              reducedMotion={reducedMotion}
              className="hover-lift-dark glass-dark backdrop-blur-md rounded-xl p-7 flex gap-6 items-start"
            >
              <img
                src="/mohib-founder-photo.jpg"
                alt="Mohib Ahmadzai, founder of Lanavix"
                className="h-20 w-20 rounded-full object-cover shrink-0"
              />
              <p className="text-[var(--hd-muted)] leading-relaxed">
                I'm Mohib Ahmadzai, founder of Lanavix. I built this because too many contractors
                lose real business to a missed call or a review that never got a response — problems
                that are completely solvable with the right automation. Lanavix exists to give every
                local service business AI tools that used to only be available to big companies with
                big budgets.
              </p>
            </GlowPanel>
          </div>

          <div className={step} style={delay(3)}>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-4 text-[var(--hd-fg)]">
              Where we're based
            </h2>
            <div className="flex items-center gap-2.5 text-[var(--hd-muted)] mb-3">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Prince William County, Virginia</span>
            </div>
            <div className="flex items-center gap-2.5 text-[var(--hd-muted)]">
              <Mail className="h-4 w-4 shrink-0" />
              <a
                href="mailto:moh@lanavix.com"
                className="hover:text-[var(--hd-fg)] transition-colors"
              >
                moh@lanavix.com
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter variant="dark" />
    </div>
  );
}
