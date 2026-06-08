import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, PhoneMissed, Star, Inbox, Target, CheckCircle2, Clock,
  TrendingUp, ShieldCheck, PlayCircle, Sparkles, Plug, Zap, Trophy,
  MessageSquare, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Local Business Boost — Get More Calls, Bookings & Revenue on Autopilot" },
      { name: "description", content: "The simplest way for cleaning, HVAC, plumbing, roofing and landscaping businesses to generate leads, recover missed calls, and get more 5-star reviews — automatically." },
      { property: "og:title", content: "Local Business Boost — More Calls, Bookings & Revenue, Automatically" },
      { property: "og:description", content: "Generate qualified leads, recover every missed call, and grow your Google reviews — without lifting a finger." },
      { property: "og:url", content: "/" },
      { rel: "canonical", href: "/" } as never,
    ],
  }),
  component: Landing,
});

const PILLARS = [
  { icon: Target,       title: "Smart Lead Generation",   desc: "We find real local customers who need your service — delivered ready to contact with phone, email and context." },
  { icon: PhoneMissed,  title: "Missed Call Recovery",    desc: "Every missed call gets an automatic text within 60 seconds. Turn voicemails into booked jobs." },
  { icon: Star,         title: "Automated Reviews",       desc: "After every job, we send a polite SMS + email asking for a Google review. Your ranking climbs on autopilot." },
  { icon: MessageSquare,title: "Follow-Up on Autopilot",  desc: "Instant replies and follow-up sequences turn inquiries into bookings — and cut no-shows." },
  { icon: Inbox,        title: "One Simple Lead Inbox",   desc: "Website, missed calls, Google, Facebook — all leads in one place. New → Contacted → Booked → Paid." },
  { icon: DollarSign,   title: "Free Business Audit",     desc: "See your Visibility, Reputation, Lead and Conversion scores — and exactly how much money you're leaving on the table." },
];

const INDUSTRIES = ["Cleaning", "HVAC", "Roofing", "Plumbing", "Landscaping"];

const HOW_IT_WORKS = [
  { n: "01", icon: Plug,      title: "Connect in 5 minutes",  desc: "Hook up your phone number and Google profile. No tech skills needed." },
  { n: "02", icon: Zap,       title: "We work in the background", desc: "Missed calls get texted back, reviews get requested, every lead gets captured." },
  { n: "03", icon: Trophy,    title: "You get more booked jobs",  desc: "Open your inbox to new customers, reviews and appointments — every day." },
];

const RESULTS = [
  { metric: "+38%",  label: "more booked jobs in 60 days" },
  { metric: "4.9★",  label: "average Google rating after 90 days" },
  { metric: "<60s",  label: "to text back every missed call" },
  { metric: "$2k–$8k", label: "in recovered revenue per month" },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    role: "Owner, Crystal Clean Co.",
    quote: "We used to miss 4–5 calls a day. Now every one of them turns into a text conversation. We booked 11 extra cleans in the first month.",
  },
  {
    name: "Dana R.",
    role: "Operations, Apex HVAC",
    quote: "Our Google reviews jumped from 47 to 184 in three months. We do nothing — the system asks for them after every job.",
  },
  {
    name: "Luis P.",
    role: "Owner, Peak Roofing",
    quote: "I stopped checking five different inboxes. Every lead — website, Facebook, missed call — shows up in one place. It's a no-brainer.",
  },
];

const PLANS = [
  {
    name: "Free Audit",
    price: "$0",
    cadence: "one-time",
    desc: "See exactly where you're losing customers right now.",
    cta: "Get My Free Audit",
    features: [
      "Visibility, Reputation, Lead & Conversion scores",
      "Plain-English fix list",
      "Competitor comparison",
      "No credit card",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$79",
    cadence: "per month",
    desc: "Everything you need to capture every lead and book more jobs.",
    cta: "Start 14-Day Free Trial",
    features: [
      "Missed Call Recovery (auto SMS)",
      "Review Growth automation",
      "Unified Lead Inbox",
      "AI Receptionist (24/7)",
      "Competitor Intelligence",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "tailored",
    desc: "Multi-location operators and franchises.",
    cta: "Talk to Sales",
    features: [
      "Multi-location + team seats",
      "Custom integrations (CRM, dispatch)",
      "Dedicated success manager",
      "SLA + SSO",
    ],
    highlighted: false,
  },
];

const FAQS = [
  { q: "Do I need to be technical?", a: "No. If you can use a phone, you can use Local Business Boost. We set everything up in about 5 minutes and it runs in the background." },
  { q: "How fast will I see results?", a: "Most owners recover their first missed-call lead within 24 hours and see new Google reviews in the first week." },
  { q: "Does this work for my trade?", a: "Yes — we're built specifically for cleaning, HVAC, roofing, plumbing and landscaping businesses. Industry templates included." },
  { q: "Will it replace my CRM?", a: "It can. Most owners use our Lead Inbox as their CRM. If you have one already (Jobber, Housecall, ServiceTitan), we play nicely with it." },
  { q: "What if I cancel?", a: "No contracts. Cancel anytime in one click. Your data is yours." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SiteNav />
      <Hero />
      <Industries />
      <Pillars />
      <HowItWorks />
      <Results />
      <BeforeAfter />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-20 text-center">
        <Badge variant="secondary" className="mb-6 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow mr-2" />
          Built for cleaning, HVAC, roofing, plumbing & landscaping
        </Badge>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-balance max-w-5xl mx-auto animate-fade-up">
          Get More Calls, More Bookings, and More Revenue — <span className="gradient-text">On Autopilot</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
          The simplest way for local service businesses to generate leads, recover missed calls,
          and get more 5-star reviews. No software to learn.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="glow-primary w-full sm:w-auto">
              Get My Free Business Audit <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <PlayCircle className="h-4 w-4" /> See How It Works
            </Button>
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card · Results in your first week · Cancel anytime
        </p>
      </div>
    </section>
  );
}

function Industries() {
  return (
    <section className="border-y border-border/60 bg-card/20">
      <div className="max-w-6xl mx-auto px-6 py-8 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Made for local service businesses
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-muted-foreground/80 font-display text-lg">
          {INDUSTRIES.map((n) => <span key={n}>{n}</span>)}
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">What you get</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Six tools. One job: make you more money.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Every feature has one purpose — more booked jobs and more revenue. Nothing else.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {PILLARS.map((p) => (
            <Card key={p.title} className="p-6 hover:border-primary/30 transition">
              <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <p.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg mt-4">{p.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{p.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-card/20 border-y border-border/60">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">How it works</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Set it up once. It works forever.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {HOW_IT_WORKS.map((s) => (
            <Card key={s.n} className="p-6 relative">
              <div className="text-xs font-mono text-primary">{s.n}</div>
              <div className="mt-3 h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                <s.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg mt-4">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Results() {
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {RESULTS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold gradient-text tabular-nums">
              {s.metric}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground mt-2">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BeforeAfter() {
  const before = [
    "Missed calls = lost customers",
    "Asking for reviews feels awkward",
    "Leads scattered across 5 inboxes",
    "Phone rings while you're on a job",
  ];
  const after = [
    "Every missed call gets a text back in 60 seconds",
    "Reviews arrive on autopilot after every job",
    "Every lead lands in one simple inbox",
    "AI receptionist books jobs 24/7",
  ];
  return (
    <section className="py-24 bg-card/20 border-y border-border/60">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">Before & after</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Stop losing customers you've already earned
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <Card className="p-6 border-destructive/30">
            <h3 className="font-display font-bold text-lg mb-4 text-destructive">Before</h3>
            <ul className="space-y-3">
              {before.map((b) => (
                <li key={b} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive/60 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6 border-success/30">
            <h3 className="font-display font-bold text-lg mb-4 text-success">After</h3>
            <ul className="space-y-3">
              {after.map((a) => (
                <li key={a} className="flex gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  {a}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">Real operators</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Built for owners, loved by owners
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="p-6">
              <div className="flex gap-1 mb-3">
                {[0,1,2,3,4].map((i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm leading-relaxed">"{t.quote}"</p>
              <div className="mt-4 pt-4 border-t border-border/60">
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-card/20 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">Simple pricing</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            One price. Everything included.
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((p) => (
            <Card key={p.name} className={`p-6 relative ${p.highlighted ? "border-primary/60 shadow-lg ring-1 ring-primary/30" : ""}`}>
              {p.highlighted && (
                <Badge className="absolute -top-2 right-4">Most popular</Badge>
              )}
              <h3 className="font-display font-bold text-xl">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">{p.price}</span>
                <span className="text-sm text-muted-foreground">/ {p.cadence}</span>
              </div>
              <Link to="/auth" className="block mt-5">
                <Button className="w-full" variant={p.highlighted ? "default" : "outline"}>
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section className="py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Questions, answered
          </h2>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} className="border border-border/60 rounded-lg px-4">
              <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24 bg-card/20 border-t border-border/60">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
        <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
          Find out how many customers you're missing — free
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Run a free 60-second audit of your website and Google profile. See your scores and what to fix.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth">
            <Button size="lg" className="glow-primary w-full sm:w-auto">
              Get My Free Business Audit <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              See Pricing
            </Button>
          </Link>
        </div>
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Bank-grade security</span>
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Setup in 5 minutes</span>
          <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Results in week 1</span>
        </div>
      </div>
    </section>
  );
}
