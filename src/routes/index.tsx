import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Bot, Compass, Globe, Search, PenTool, Workflow, Shield, Activity,
  Cpu, CheckCircle2, Zap, Layers, Star, Clock, TrendingUp, Users,
  Briefcase, Calendar, Mail, MessageSquare, Target, PlayCircle, HelpCircle, Sparkles,
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
      { title: "LUNAVX — Your 8-Agent AI Digital Workforce for Local Lead Generation" },
      { name: "description", content: "LUNAVX is an 8-agent AI workforce that finds local leads, writes outreach, books jobs, and follows up — built for HVAC, plumbing, cleaning, roofing, restaurants, and freelancers." },
      { property: "og:title", content: "LUNAVX — 8-Agent AI Digital Workforce for Local Businesses" },
      { property: "og:description", content: "An 8-agent AI team that gets you more customers while you sleep. Start a free 14-day trial." },
      { property: "og:url", content: "https://localbusinessboost.lovable.app/" },
    ],
  }),
  component: Landing,
});

const AGENTS = [
  { name: "Orbis",    role: "Strategy Engine",     icon: Compass,    color: "from-violet-500 to-fuchsia-500", desc: "Plans the perfect workflow for every customer request." },
  { name: "Atlas",    role: "Lead Intelligence",   icon: Globe,      color: "from-cyan-400 to-teal-500",      desc: "Finds and qualifies new local leads on autopilot." },
  { name: "Nexus",    role: "Market Intelligence", icon: Search,     color: "from-sky-400 to-blue-600",       desc: "Tracks competitors and uncovers revenue opportunities." },
  { name: "Pulse",    role: "Copywriting Engine",  icon: PenTool,    color: "from-pink-500 to-rose-500",      desc: "Writes outreach, ads, and follow-ups that book jobs." },
  { name: "Forge",    role: "Automation Builder",  icon: Workflow,   color: "from-amber-400 to-orange-500",   desc: "Builds the workflows that run your business in the background." },
  { name: "Shield",   role: "Quality Control",     icon: Shield,     color: "from-emerald-400 to-green-600",  desc: "Reviews every output so only your best work goes out." },
  { name: "Aether",   role: "Revenue Strategist",  icon: TrendingUp, color: "from-yellow-400 to-orange-500",  desc: "Turns AI output into a projected revenue plan." },
  { name: "Vanguard", role: "Execution Leader",    icon: Target,     color: "from-indigo-500 to-purple-600",  desc: "Hands you a clear, actionable next-step checklist." },
];

const CAMPAIGNS = [
  { icon: Globe,         title: "Local Lead Blast",  desc: "Find 50 qualified local leads + ready-to-send outreach in minutes.", audience: "Local business" },
  { icon: Calendar,      title: "Booking Booster",   desc: "Win back no-shows and fill your calendar with automated follow-ups.", audience: "Local business" },
  { icon: Mail,          title: "Cold Email Sprint", desc: "5-day personalized email sequence for your dream client list.",       audience: "Freelancer" },
  { icon: Briefcase,     title: "Proposal in 60s",   desc: "Turn a discovery call into a high-converting proposal instantly.",    audience: "Freelancer" },
  { icon: MessageSquare, title: "Review Recovery",   desc: "Win back unhappy customers and earn more 5-star reviews.",            audience: "Local business" },
  { icon: TrendingUp,    title: "Offer Optimizer",   desc: "Test new offers and pricing with AI-driven recommendations.",         audience: "Freelancer" },
];

const HOW_IT_WORKS = [
  { n: "01", icon: Sparkles, title: "Tell us what you do", desc: "60-second setup. Your trade, your city, your offer. That's it." },
  { n: "02", icon: PlayCircle, title: "Pick a campaign",   desc: "Choose a one-click playbook like Local Lead Blast or Review Recovery." },
  { n: "03", icon: Cpu,      title: "Your 8 agents run it", desc: "Strategy, leads, copy, QA, forecasting — coordinated end-to-end." },
  { n: "04", icon: CheckCircle2, title: "You get paying customers", desc: "Finished work, revenue projections, and a clear next-step checklist." },
];

const PLANS = [
  {
    name: "Free Beta",
    price: "$0",
    cadence: "for 14 days",
    desc: "Test-drive the full 8-agent workforce. No credit card.",
    cta: "Start Free Beta",
    features: [
      "Full 8-agent workforce",
      "3 campaigns per month",
      "50 lead lookups",
      "Email support",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$79",
    cadence: "per month",
    desc: "For local service businesses ready to grow on autopilot.",
    cta: "Start Pro Trial",
    features: [
      "Unlimited campaigns",
      "1,000 lead lookups / mo",
      "All one-click playbooks",
      "Automated follow-up sequences",
      "Revenue projections",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "tailored",
    desc: "For multi-location operators and agencies.",
    cta: "Talk to Sales",
    features: [
      "Unlimited everything",
      "Multi-location & team seats",
      "Custom integrations",
      "Dedicated success manager",
      "SLA + SSO",
    ],
    highlighted: false,
  },
];

const FAQS = [
  { q: "Do I need to be technical to use LUNAVX?", a: "No. LUNAVX is built for plumbers, HVAC pros, cleaners, roofers, restaurants, and freelancers — not engineers. You pick a campaign in plain English and the 8-agent team does the rest." },
  { q: "How fast will I see results?", a: "Most operators launch their first campaign in under 60 seconds and book new jobs in the first week. Revenue projections are shown before you send anything out." },
  { q: "Will it actually work for my trade?", a: "Yes. LUNAVX ships with proven playbooks for HVAC, plumbing, cleaning, roofing, restaurants, salons, coaches, and freelancers. The agents adapt the copy and lead sourcing to your service and city." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts, no setup fees, no credit card to start your free 14-day beta. Cancel in one click." },
  { q: "Is my customer data safe?", a: "Yes. All data is encrypted in transit and at rest, scoped per business, and never sold or shared. Enterprise plans include SSO and custom data-residency options." },
  { q: "Do you really have 8 agents?", a: "Yes — Orbis, Atlas, Nexus, Pulse, Forge, Shield, Aether, and Vanguard. Each one specializes in a part of your growth pipeline, and they coordinate automatically." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SiteNav />
      <Hero />
      <Logos />
      <Stats />
      <HowItWorks />
      <Campaigns />
      <Features />
      <AgentsSection />
      <OrchestratorSection />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <Badge variant="secondary" className="mb-6 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow mr-2" />
          8 AI agents · Built for local service businesses
        </Badge>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight text-balance max-w-5xl mx-auto animate-fade-up">
          LUNAVX — Your <span className="gradient-text">8-Agent AI Digital Workforce</span> for Local Lead Generation
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
          Built for HVAC, plumbing, cleaning, roofing, and restaurants. One click runs a full
          campaign — leads, outreach, bookings, and follow-ups — while you stay in the field.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="glow-primary w-full sm:w-auto">
              Start Free 14-Day Trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <PlayCircle className="h-4 w-4" /> See Live Demo
            </Button>
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card required · Cancel anytime · Setup in 60 seconds
        </p>

        <div className="mt-20 relative">
          <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-to-r from-primary/10 via-accent-2/10 to-primary/10 blur-3xl" />
          <Card className="relative glass p-6 max-w-5xl mx-auto text-left">
            <div className="flex items-center gap-2 pb-4 border-b border-border/60">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
              </div>
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                LUNAVX · Running campaign: "Get me 25 new HVAC clients in Atlanta"
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              {[
                { agent: "Atlas",    action: "Found 25 qualified leads",   state: "done" },
                { agent: "Pulse",    action: "Drafted personalized outreach", state: "done" },
                { agent: "Aether",   action: "Projected: $8k–$15k/mo",     state: "done" },
                { agent: "Vanguard", action: "Next steps ready",           state: "running" },
              ].map((s) => (
                <div key={s.agent} className="rounded-lg border border-border/60 p-4 bg-card/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-primary">{s.agent}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.state === "running" ? "bg-success animate-pulse-glow" : "bg-success"}`} />
                  </div>
                  <div className="text-sm mt-2">{s.action}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Logos() {
  return (
    <section className="border-y border-border/60 bg-card/20">
      <div className="max-w-6xl mx-auto px-6 py-10 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">
          Trusted by operators in
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-muted-foreground/70 font-display text-lg">
          {["HVAC", "Plumbing", "Cleaning", "Roofing", "Restaurants", "Salons", "Coaches"].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { value: "10x",     label: "More leads per week" },
    { value: "4–6 hrs", label: "Saved every week" },
    { value: "$2k–$8k", label: "New revenue/month avg" },
    { value: "60 sec",  label: "To launch a campaign" },
  ];
  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl md:text-4xl font-display font-bold gradient-text tabular-nums">
              {s.value}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground mt-2 uppercase tracking-wider">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-card/20 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">How it works</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            From "what does your business do?" to paying customers in 4 steps
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
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

function Campaigns() {
  return (
    <section id="campaigns" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">One-click campaigns</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Click once. Get a complete revenue campaign.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Pre-built playbooks for the most common growth jobs. Pick one, hit Run, and your AI team
            delivers leads, copy, projections, and next steps.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {CAMPAIGNS.map((c) => (
            <Card key={c.title} className="p-6 group hover:border-primary/30 transition">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                  <c.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <Badge variant="outline" className="text-xs">{c.audience}</Badge>
              </div>
              <h3 className="mt-4 font-display font-bold text-lg">{c.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{c.desc}</p>
              <Link to="/auth" className="mt-4 inline-flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
                Run this campaign <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { i: Zap,           t: "60-second setup",           d: "Tell us what you do. Your AI team is ready to work the same minute." },
    { i: Clock,         t: "Always on",                 d: "Your AI workforce runs 24/7 — even when you're on a job site or asleep." },
    { i: CheckCircle2,  t: "Built-in quality control",  d: "Shield reviews every output, so your brand always looks sharp." },
    { i: TrendingUp,    t: "Revenue projections",       d: "Aether forecasts new leads, bookings, and revenue from every campaign." },
    { i: Target,        t: "Clear next steps",          d: "Vanguard hands you a friendly checklist of exactly what to do next." },
    { i: Users,         t: "Built for non-tech users",  d: "No prompts. No setup wizards. Plain-English campaigns that just work." },
  ];
  return (
    <section id="features" className="py-24 bg-card/20 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">Why LUNAVX</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Built for growth — not for technical work
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {items.map(({ i: I, t, d }) => (
            <Card key={t} className="p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <I className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold mt-4">{t}</h3>
              <p className="text-sm text-muted-foreground mt-2">{d}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentsSection() {
  return (
    <section id="agents" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">The Workforce</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Meet your 8 AI employees
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Each one has a specialty. Together, they run your growth like a high-end agency — minus
            the invoice.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {AGENTS.map((a) => (
            <Card key={a.name} className="p-6 relative overflow-hidden group hover:border-primary/30 transition">
              <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${a.color} opacity-20 blur-2xl group-hover:opacity-40 transition`} />
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-lg`}>
                <a.icon className="h-5 w-5 text-white" />
              </div>
              <div className="mt-4 font-display font-bold text-lg">{a.name}</div>
              <div className="text-xs text-primary">{a.role}</div>
              <p className="text-sm text-muted-foreground mt-3">{a.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function OrchestratorSection() {
  return (
    <section id="orchestrator" className="py-24 bg-card/20 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Badge variant="secondary" className="mb-4">Live demo</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            One request. A full campaign.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Type a goal in plain English — or pick a one-click campaign. Your 8 agents handle the
            strategy, research, writing, quality control, and forecasting. You get a finished
            deliverable plus a checklist of what to do next.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              { i: Cpu,      t: "Plain-English goals — no prompt engineering" },
              { i: Layers,   t: "Multi-agent execution — every step coordinated" },
              { i: Shield,   t: "Quality-controlled outputs — Shield reviews everything" },
              { i: Activity, t: "Revenue projection + next-step checklist on every run" },
            ].map(({ i: Icon, t }) => (
              <li key={t} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm">{t}</span>
              </li>
            ))}
          </ul>
          <Link to="/auth" className="inline-block mt-8">
            <Button size="lg" className="glow-primary">
              Try it free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <Card className="p-6 font-mono text-xs">
          <div className="text-muted-foreground mb-3">$ campaign</div>
          <div className="text-foreground">"Get me 50 cleaning companies in Virginia and write outreach"</div>
          <div className="my-4 border-t border-border/60" />
          <div className="space-y-2">
            {[
              ["Orbis",    "Plans workflow → 5 steps"],
              ["Atlas",    "Extracts 50 cleaning companies"],
              ["Nexus",    "Enriches with market context"],
              ["Pulse",    "Drafts personalized cold emails"],
              ["Forge",    "Wires up follow-up automation"],
              ["Shield",   "Validates & finalizes output"],
              ["Aether",   "Projects: 8–15 leads · $3k–$8k/mo"],
              ["Vanguard", "Next steps: send today, follow up Thu"],
            ].map(([a, t]) => (
              <div key={a} className="flex gap-3">
                <span className="text-primary w-16">{a}</span>
                <span className="text-muted-foreground">→</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div className="my-4 border-t border-border/60" />
          <div className="text-success flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Campaign delivered in 47 seconds
          </div>
        </Card>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Simple pricing. Built to pay for itself in week one.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Start free. Upgrade when you're booking jobs. Cancel anytime.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {PLANS.map((p) => (
            <Card
              key={p.name}
              className={`p-6 relative flex flex-col ${
                p.highlighted ? "border-primary/60 shadow-lg shadow-primary/10" : ""
              }`}
            >
              {p.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
              )}
              <div className="font-display font-bold text-lg">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">{p.price}</span>
                <span className="text-muted-foreground text-sm">{p.cadence}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{p.desc}</p>
              <ul className="mt-6 space-y-2 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="mt-6 block">
                <Button
                  className={`w-full ${p.highlighted ? "glow-primary" : ""}`}
                  variant={p.highlighted ? "default" : "outline"}
                  size="lg"
                >
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </Card>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          All plans include the full 8-agent workforce. No setup fees. No hidden charges.
        </p>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { quote: "I booked 6 new jobs in my first week. The follow-up sequence alone paid for the whole year.", name: "Marcus T.", role: "HVAC owner, Atlanta" },
    { quote: "Closed two retainers in my first month. The proposal generator is unreal.",                    name: "Priya S.",  role: "Freelance brand designer" },
    { quote: "Replaced a $2,000/mo marketing agency. Honestly does more, faster.",                           name: "Daniel R.", role: "Roofing company owner" },
  ];
  return (
    <section className="py-24 bg-card/20 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">Loved by operators</Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Real revenue. Real fast.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {items.map((t) => (
            <Card key={t.name} className="p-6">
              <div className="flex gap-1 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary" />
                ))}
              </div>
              <p className="mt-4 text-sm text-foreground/90 leading-relaxed">"{t.quote}"</p>
              <div className="mt-4 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">{t.name}</div>
                {t.role}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-24">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            <HelpCircle className="h-3 w-3 mr-1" /> FAQ
          </Badge>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">
            Questions, answered.
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="h-14 w-14 rounded-2xl gradient-primary mx-auto flex items-center justify-center mb-6 glow-primary">
          <Bot className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-balance">
          Your 8-agent workforce is one click away
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Start your free 14-day trial. No credit card. Cancel anytime.
        </p>
        <Link to="/auth" className="inline-block mt-8">
          <Button size="lg" className="glow-primary">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> 14 days free</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> No credit card</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}
