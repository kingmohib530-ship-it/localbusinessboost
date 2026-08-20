import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Phone,
  Star,
  Target,
  Clock,
  Search,
  Wallet,
  Wind,
  Wrench,
  Home as HomeIcon,
  Sparkles,
  Leaf,
  Zap,
  Bug,
  Check,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { WorkflowDemo } from "@/components/marketing/WorkflowDemo";
import { pageMeta } from "@/lib/seo";
import { PRICING_PLANS, PAID_PLAN_IDS } from "@/lib/pricingPlans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMeta({
      title: "Lanavix — Never Miss a Job Again",
      description:
        "Lanavix answers missed calls within 60 seconds, keeps leads and follow-ups on track, books appointments, requests reviews, and shows you exactly what needs your attention each day — built for HVAC, plumbing, roofing, and other local trades.",
      path: "/",
    }),
  }),
  component: HomePage,
});

const industries: [LucideIcon, string][] = [
  [Wind, "HVAC"],
  [Wrench, "Plumbing"],
  [HomeIcon, "Roofing"],
  [Sparkles, "Cleaning"],
  [Leaf, "Landscaping"],
  [Zap, "Electrical"],
  [Bug, "Pest control"],
];

const painPoints: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Phone,
    title: "The phone rings while you're on a job",
    body: "It goes to voicemail, and the job goes to whoever answers next.",
  },
  {
    icon: Star,
    title: "Happy customers don't leave reviews",
    body: "They meant to. Silence reads as indifference to the next person searching.",
  },
  {
    icon: Search,
    title: "Leads come in from five different places",
    body: "Phone, Facebook, a form on your site — easy for one to get missed.",
  },
  {
    icon: Clock,
    title: "Following up eats your evening",
    body: "Texting leads back after a full day on the tools isn't sustainable.",
  },
  {
    icon: Target,
    title: "Competitors with more reviews outrank you",
    body: "A stronger review count wins the click before you're even considered.",
  },
  {
    icon: Wallet,
    title: "Ad spend doesn't turn into booked jobs",
    body: "Traffic arrives, calls get missed, and the spend doesn't convert.",
  },
];

const trustPoints = [
  {
    title: "14-day free trial",
    body: "A payment method is collected at signup, but you're not charged until the trial ends. Cancel before then and you won't be billed.",
  },
  {
    title: "30-day money-back guarantee",
    body: "If Lanavix doesn't help you recover at least one job worth more than your monthly fee in your first paid month, email us for a full refund.",
  },
  {
    title: "A real person, not a support queue",
    body: "Email the founder directly and get an answer from a person who's actively building this.",
  },
];

const faqTeaser: [string, string][] = [
  [
    "Is a credit card required for the trial?",
    "Yes. A payment method is collected at checkout, but you won't be charged until the 14-day trial ends. Cancel before then and there's no charge.",
  ],
  [
    "What happens if the AI doesn't know an answer?",
    "It tells the customer honestly and flags the conversation for you, instead of guessing or inventing an answer.",
  ],
  [
    "Can I cancel?",
    "Yes — email us and we'll cancel it. Access continues through the end of your current billing period, and you won't be billed again.",
  ],
  [
    "What does the guarantee actually cover?",
    "Your first paid month, if you don't recover at least one job worth more than your monthly fee while actively using the product. Full conditions are on the refund policy page.",
  ],
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-1 mb-6">
              <span className="lv-meta font-medium text-primary">
                Early access · Founding member pricing
              </span>
            </div>
            <h1 className="lv-display text-[34px] sm:text-[40px] lg:text-[46px] leading-[1.1] text-foreground">
              Never lose a job to a missed call again
            </h1>
            <p className="mt-5 lv-body text-[16px] text-muted-foreground max-w-lg leading-relaxed">
              Lanavix texts back every missed call within 60 seconds, keeps leads and follow-ups on
              track, books the appointment, and asks for a review after the job's done — all running
              in the background while you're on the tools.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 px-6">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6">
                <a href="#workflow">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 lv-meta text-muted-foreground">
              14-day free trial. A card is required at signup — you're not charged until the trial
              ends.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="lv-label text-foreground">Receptionist</span>
              <span className="lv-meta text-muted-foreground">Illustrative example</span>
            </div>
            <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 flex items-center justify-between mb-2">
              <span className="lv-body text-destructive">Missed call · (555) 010-0148</span>
              <span className="lv-meta text-destructive/70">just now</span>
            </div>
            <div className="flex gap-2 mb-2">
              <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center lv-meta font-semibold text-primary shrink-0">
                AI
              </div>
              <div className="rounded-md bg-muted px-3 py-2 lv-body text-foreground flex-1">
                "Hi, this is Peak HVAC — sorry we missed you. What do you need help with?"
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="rounded-md bg-accent px-3 py-2 lv-body text-foreground max-w-[85%]">
                "AC's not cooling, can you come tomorrow?"
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BUILT FOR */}
      <section className="border-b border-border py-5 px-4 md:px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-2">
          <span className="lv-meta font-medium uppercase tracking-wide text-muted-foreground mr-1">
            Built for
          </span>
          {industries.map(([Icon, label]) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 lv-meta font-medium text-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary" /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="lv-display text-[26px] sm:text-[30px] text-foreground">
              You're already earning these customers. You're still losing them.
            </h2>
            <p className="mt-3 lv-body text-muted-foreground">
              Every one of these is a job that should have been booked.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPoints.map((item) => (
              <div key={item.title} className="rounded-md border border-border bg-card p-5">
                <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center mb-3">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="lv-body text-foreground font-medium mb-1">{item.title}</p>
                <p className="lv-meta text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WORKFLOW DEMO */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-surface border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="lv-label text-primary mb-2">One operating system, not five tools</p>
            <h2 className="lv-display text-[26px] sm:text-[30px] text-foreground">
              From missed call to booked job to five-star review
            </h2>
            <p className="mt-3 lv-body text-muted-foreground">
              Step through what actually happens after a call comes in.
            </p>
          </div>
          <WorkflowDemo />
        </div>
      </section>

      {/* TRUST */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="lv-label text-primary mb-2">Why trust us</p>
            <h2 className="lv-display text-[26px] sm:text-[30px] text-foreground">
              We're early. Here's what we can honestly promise.
            </h2>
            <p className="mt-3 lv-body text-muted-foreground">
              No wall of logos or manufactured testimonials — just real terms, and a product built
              to earn the rest.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {trustPoints.map((t) => (
              <div key={t.title} className="rounded-md border border-border bg-card p-5">
                <ShieldCheck className="h-5 w-5 text-primary mb-3" />
                <p className="lv-body text-foreground font-medium mb-1.5">{t.title}</p>
                <p className="lv-meta text-muted-foreground leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-border bg-card p-6 flex flex-col sm:flex-row gap-5 items-center sm:items-start text-left max-w-2xl mx-auto">
            <img
              src="/mohib-founder-photo.jpg"
              alt="Mohib Ahmadzai, founder of Lanavix"
              className="h-16 w-16 rounded-full object-cover shrink-0"
            />
            <div>
              <p className="lv-body text-foreground font-medium mb-1">Mohib Ahmadzai, founder</p>
              <p className="lv-body text-muted-foreground leading-relaxed">
                I built Lanavix because too many contractors lose real business to a missed call or
                a review that never got a response. Early members can email or text me directly, and
                their feedback shapes what gets built next.
              </p>
            </div>
          </div>
          <p className="text-center lv-meta text-muted-foreground mt-8">
            Not ready to sign up?{" "}
            <Link to="/audit" className="text-primary underline underline-offset-2">
              Run a free audit of your business
            </Link>{" "}
            first.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-surface border-y border-border">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="lv-display text-[26px] sm:text-[30px] text-foreground mb-2">
            Simple pricing
          </h2>
          <p className="lv-body text-muted-foreground mb-10">
            Every plan includes a 14-day free trial. See the full feature comparison and the
            money-back guarantee on the{" "}
            <Link to="/pricing" className="text-primary underline underline-offset-2">
              pricing page
            </Link>
            .
          </p>
          <div className="grid sm:grid-cols-3 gap-5 text-left">
            {PAID_PLAN_IDS.map((id) => {
              const plan = PRICING_PLANS[id];
              return (
                <div
                  key={id}
                  className={`relative rounded-md border p-6 flex flex-col ${
                    plan.featured ? "border-primary bg-accent/40" : "border-border bg-card"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 lv-meta font-semibold bg-primary text-primary-foreground rounded-full px-3 py-1">
                      {plan.badge}
                    </span>
                  )}
                  <p className="lv-label text-muted-foreground mb-2">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="lv-display text-[30px] text-foreground">${plan.price}</span>
                    <span className="lv-meta text-muted-foreground">/mo</span>
                  </div>
                  <p className="lv-meta text-muted-foreground mb-5">{plan.tagline}</p>
                  <ul className="flex flex-col gap-2 mb-6 flex-1">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-2 lv-meta text-foreground">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    variant={plan.featured ? "default" : "outline"}
                    className="min-h-[44px]"
                  >
                    <Link to="/pricing">Start free trial</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ TEASER */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="lv-display text-[26px] sm:text-[30px] text-foreground text-center mb-10">
            Common questions
          </h2>
          <div className="flex flex-col">
            {faqTeaser.map(([q, a]) => (
              <div key={q} className="border-b border-border py-5">
                <p className="lv-body text-foreground font-medium mb-1.5">{q}</p>
                <p className="lv-body text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <p className="text-center lv-meta text-muted-foreground mt-6">
            <Link to="/faq" className="text-primary underline underline-offset-2">
              See all questions
            </Link>
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-surface border-t border-border py-16 md:py-24 px-4 md:px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="lv-display text-[26px] sm:text-[30px] text-foreground mb-4">
            Stop losing jobs to a phone that rang once
          </h2>
          <p className="lv-body text-muted-foreground mb-8 leading-relaxed">
            Set up takes about five minutes. Start your 14-day free trial today.
          </p>
          <Button asChild size="lg" className="h-12 px-8">
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-4 lv-meta text-muted-foreground">
            14-day free trial · Card required at signup · Not charged until the trial ends
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
