import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Bot,
  LineChart,
  Workflow,
  ShieldCheck,
  Zap,
  MessageSquare,
  Users,
  Check,
  Star,
  TrendingUp,
  Activity,
  Globe,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zyvora — AI That Turns Conversations Into Customers" },
      {
        name: "description",
        content:
          "Zyvora is the enterprise AI platform for automating customer engagement, lead generation and business growth. Built for modern teams.",
      },
      { property: "og:title", content: "Zyvora — Enterprise AI for Growth" },
      {
        property: "og:description",
        content:
          "AI automation, intelligent lead generation and customer engagement — in one premium platform.",
      },
    ],
  }),
  component: Landing,
});

/* ------------------------------ Layout ------------------------------ */

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
      />
      <Nav />
      <main>
        <Hero />
        <LogoStrip />
        <Features />
        <DashboardPreview />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

/* -------------------------------- Nav ------------------------------- */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5 group">
          <Logo />
          <span className="font-display text-[17px] font-semibold tracking-tight">Zyvora</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Platform</a>
          <a href="#dashboard" className="hover:text-foreground transition-colors">Product</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#customers" className="hover:text-foreground transition-colors">Customers</a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="#pricing"
            className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
          >
            Sign in
          </a>
          <PrimaryButton href="#pricing" small>
            Start free
          </PrimaryButton>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-[10px] gradient-primary glow-primary">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary-foreground" fill="none">
        <path d="M4 6h16L8 18h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* ------------------------------- Hero ------------------------------- */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-glow pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10 pt-24 pb-28 lg:pt-32 lg:pb-36">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-pulse-glow" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Introducing Zyvora 2.0 — AI Workflows
            <ArrowRight className="h-3 w-3" />
          </div>

          <h1 className="font-display mt-6 text-balance text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1.02]">
            AI that turns conversations
            <br className="hidden sm:block" />{" "}
            into <span className="gradient-text">customers</span>.
          </h1>

          <p className="mt-6 text-balance text-lg leading-relaxed text-muted-foreground max-w-xl mx-auto">
            Zyvora automates engagement, qualifies leads and grows revenue — a single intelligent
            platform for the operations behind modern businesses.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <PrimaryButton href="#pricing">
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
            <SecondaryButton href="#dashboard">Book a demo</SecondaryButton>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> No credit card</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> SOC 2 Type II</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> 14-day trial</span>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto mt-20 max-w-5xl animate-fade-up">
      <div className="absolute -inset-x-10 -top-10 -bottom-10 gradient-primary opacity-20 blur-3xl rounded-full pointer-events-none" />
      <div className="relative rounded-2xl border border-border glass p-2 shadow-2xl">
        <div className="rounded-xl bg-[color:var(--surface)] border border-border overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--border)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--border)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--border)]" />
            <span className="ml-3 text-xs text-muted-foreground font-mono">zyvora.app / workspace</span>
          </div>
          <MockDashboard compact />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Logo Strip ---------------------------- */

function LogoStrip() {
  const logos = ["acme", "lumen", "northwind", "vertex", "halcyon", "monolith"];
  return (
    <section className="border-y border-border/60 bg-[color:var(--surface)]/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10">
        <p className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground mb-6">
          Trusted by teams at innovative companies
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-6 gap-y-4 items-center">
          {logos.map((l) => (
            <div
              key={l}
              className="font-display text-center text-lg font-semibold tracking-tight text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Features ----------------------------- */

function Features() {
  const items = [
    { icon: Bot, title: "Intelligent Agents", desc: "Autonomous AI that handles inquiries, books meetings and qualifies leads in real time — across every channel." },
    { icon: Workflow, title: "Workflow Automation", desc: "Compose multi-step automations that connect your CRM, inbox, calendar and data warehouse without code." },
    { icon: LineChart, title: "Predictive Analytics", desc: "Surface revenue signals before they happen. Models trained on your data, your customers, your funnel." },
    { icon: MessageSquare, title: "Omnichannel Engagement", desc: "Unified inbox for web, email, SMS and voice — each conversation enriched with intent and context." },
    { icon: ShieldCheck, title: "Enterprise Security", desc: "SOC 2 Type II, SSO/SAML, data residency, granular RBAC. Built for procurement teams." },
    { icon: Zap, title: "Instant Deployment", desc: "From signup to first automation in under five minutes. Native integrations, transparent pricing." },
  ];
  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading
          eyebrow="Platform"
          title="One platform. Every automation surface."
          subtitle="Zyvora unifies the systems behind growth — engagement, workflows, analytics, and AI — into a single calm interface."
        />
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: typeof Bot; title: string; desc: string }) {
  return (
    <div className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-[0_8px_40px_-12px_color-mix(in_oklab,var(--primary)_25%,transparent)]">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--elevated)] border border-border text-primary transition-colors group-hover:gradient-primary group-hover:text-primary-foreground group-hover:border-transparent">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display mt-5 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

/* ------------------------- Dashboard Preview ------------------------ */

function DashboardPreview() {
  return (
    <section id="dashboard" className="relative py-24 lg:py-32 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading
          eyebrow="Product"
          title="A workspace built for clarity."
          subtitle="Every signal, every conversation, every automation — in one place. Designed for operators who care about craft."
        />
        <div className="mt-16 rounded-3xl border border-border glass p-2 shadow-2xl">
          <div className="rounded-[20px] bg-[color:var(--surface)] border border-border overflow-hidden">
            <MockDashboard />
          </div>
        </div>
      </div>
    </section>
  );
}

function MockDashboard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid grid-cols-12">
      {/* Sidebar */}
      <aside className="hidden sm:flex col-span-3 lg:col-span-2 flex-col gap-1 p-3 border-r border-border bg-[color:var(--background)]/40">
        {[
          { i: Activity, l: "Overview", a: true },
          { i: Users, l: "Contacts" },
          { i: MessageSquare, l: "Inbox" },
          { i: Workflow, l: "Workflows" },
          { i: LineChart, l: "Analytics" },
          { i: ShieldCheck, l: "Security" },
        ].map((it, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] ${
              it.a
                ? "bg-[color:var(--elevated)] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <it.i className="h-3.5 w-3.5" /> {it.l}
          </div>
        ))}
      </aside>

      {/* Main */}
      <div className="col-span-12 sm:col-span-9 lg:col-span-10 p-5 lg:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Workspace overview</p>
            <h4 className="font-display text-lg sm:text-xl font-semibold tracking-tight">Good morning, Avery</h4>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[color:var(--elevated)] border border-border px-3 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--success)]" /> All systems normal
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Active conversations" value="12,847" delta="+18.2%" />
          <Metric label="Qualified leads" value="3,294" delta="+9.4%" />
          <Metric label="Avg. response" value="1.8s" delta="-22%" good />
          <Metric label="Revenue impact" value="$284k" delta="+31.5%" />
        </div>

        {!compact && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Engagement</p>
                  <p className="font-display text-base font-semibold">Conversations this week</p>
                </div>
                <span className="text-xs text-primary inline-flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> +24% WoW
                </span>
              </div>
              <SparkChart />
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Live agents</p>
              <p className="font-display text-base font-semibold">Top performers</p>
              <ul className="mt-4 space-y-3">
                {[
                  { n: "Atlas", t: "Sales qualification", v: "98%" },
                  { n: "Iris", t: "Customer support", v: "94%" },
                  { n: "Onyx", t: "Booking flow", v: "91%" },
                ].map((a) => (
                  <li key={a.n} className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-lg gradient-primary grid place-items-center text-[11px] font-semibold text-primary-foreground">
                      {a.n[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{a.n}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{a.t}</p>
                    </div>
                    <span className="text-xs text-primary">{a.v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, delta, good }: { label: string; value: string; delta: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display mt-1 text-xl sm:text-2xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-1 text-[11px] ${good || delta.startsWith("+") ? "text-[color:var(--success)]" : "text-primary"}`}>
        {delta} vs last week
      </p>
    </div>
  );
}

function SparkChart() {
  // Static SVG sparkline — purely decorative.
  const pts = [8, 22, 14, 30, 26, 42, 36, 54, 48, 62, 58, 78, 70, 86, 80];
  const w = 600, h = 120, max = 100;
  const step = w / (pts.length - 1);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * h}`).join(" ");
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="none">
      <defs>
        <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00E7C4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#00E7C4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grad)" />
      <path d={d} fill="none" stroke="#00E7C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ----------------------------- How it works ----------------------------- */

function HowItWorks() {
  const steps = [
    { n: "01", t: "Connect your stack", d: "Plug Zyvora into your CRM, inbox, calendar and data sources in minutes." },
    { n: "02", t: "Train your agents", d: "Bring your brand voice, knowledge base and policies. Agents calibrate instantly." },
    { n: "03", t: "Launch and scale", d: "Deploy across channels. Watch engagement, qualified leads and revenue compound." },
  ];
  return (
    <section className="py-24 lg:py-32 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading eyebrow="How it works" title="From signup to revenue, in three steps." />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-card p-7">
              <span className="font-display text-sm text-primary">{s.n}</span>
              <h3 className="font-display mt-3 text-xl font-semibold tracking-tight">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- Testimonials -------------------------- */

function Testimonials() {
  const items = [
    {
      q: "Zyvora replaced four tools and a contractor. Our pipeline grew 3x in the first quarter without growing headcount.",
      a: "Maya Okonkwo",
      r: "VP Operations, Halcyon Labs",
    },
    {
      q: "It's the first AI platform our security and revenue teams both championed. That alone says everything.",
      a: "Daniel Reyes",
      r: "Chief Revenue Officer, Vertex",
    },
    {
      q: "We measure ROI in days, not quarters. Zyvora paid for itself before the trial ended.",
      a: "Priya Shah",
      r: "Head of Growth, Northwind",
    },
  ];
  return (
    <section id="customers" className="py-24 lg:py-32 border-t border-border/60 bg-[color:var(--surface)]/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading
          eyebrow="Customers"
          title="Trusted by teams who measure outcomes."
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((t) => (
            <figure key={t.a} className="rounded-2xl border border-border bg-card p-7 flex flex-col">
              <div className="flex gap-0.5 text-primary mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="text-[15px] leading-relaxed text-foreground/90 flex-1">
                "{t.q}"
              </blockquote>
              <figcaption className="mt-6 pt-5 border-t border-border">
                <p className="text-sm font-medium">{t.a}</p>
                <p className="text-xs text-muted-foreground">{t.r}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Pricing ----------------------------- */

function Pricing() {
  const tiers = [
    {
      name: "Starter",
      price: "$0",
      period: "/mo",
      desc: "For teams exploring AI automation.",
      features: ["1 workspace", "500 AI conversations / mo", "Email support", "Core integrations"],
      cta: "Start free",
      featured: false,
    },
    {
      name: "Growth",
      price: "$249",
      period: "/mo",
      desc: "For growing teams running real pipelines.",
      features: [
        "Unlimited workspaces",
        "25,000 conversations / mo",
        "Workflow automations",
        "Priority support",
        "SSO (Google, Microsoft)",
      ],
      cta: "Start 14-day trial",
      featured: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      desc: "For organizations with security & scale needs.",
      features: [
        "Volume conversations",
        "SAML SSO, SCIM, audit logs",
        "Data residency & DPAs",
        "Dedicated success manager",
        "99.99% SLA",
      ],
      cta: "Contact sales",
      featured: false,
    },
  ];
  return (
    <section id="pricing" className="py-24 lg:py-32 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <SectionHeading
          eyebrow="Pricing"
          title="Transparent pricing. Enterprise-ready."
          subtitle="Start free. Scale on your terms. No surprises."
        />
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl p-7 flex flex-col ${
                t.featured
                  ? "border border-primary/40 bg-card glow-primary"
                  : "border border-border bg-card"
              }`}
            >
              {t.featured && (
                <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full gradient-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                  <Sparkles className="h-3 w-3" /> Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-semibold tracking-tight">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.period}</span>
              </div>
              <ul className="mt-6 space-y-2.5 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/90">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                {t.featured ? (
                  <PrimaryButton href="#" full>
                    {t.cta}
                  </PrimaryButton>
                ) : (
                  <SecondaryButton href="#" full>
                    {t.cta}
                  </SecondaryButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ CTA --------------------------------- */

function CTASection() {
  return (
    <section className="py-24 lg:py-32 border-t border-border/60">
      <div className="mx-auto max-w-5xl px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 lg:p-16 text-center">
          <div className="absolute inset-0 bg-radial-glow opacity-80 pointer-events-none" />
          <div className="relative">
            <h2 className="font-display text-balance text-3xl sm:text-5xl font-semibold tracking-tight leading-tight">
              Operate at the speed of <span className="gradient-text">intelligence</span>.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Join the teams using Zyvora to automate engagement, win more customers and reclaim their week.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <PrimaryButton href="#pricing">
                Start free trial <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
              <SecondaryButton href="#dashboard">Talk to sales</SecondaryButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Footer ------------------------------ */

function Footer() {
  const cols: { h: string; links: string[] }[] = [
    { h: "Platform", links: ["Agents", "Workflows", "Analytics", "Inbox", "Integrations"] },
    { h: "Solutions", links: ["Sales", "Support", "Marketing", "Operations", "Enterprise"] },
    { h: "Resources", links: ["Docs", "Changelog", "Blog", "Customers", "Security"] },
    { h: "Company", links: ["About", "Careers", "Press", "Contact", "Legal"] },
  ];
  return (
    <footer className="border-t border-border/60 bg-[color:var(--surface)]/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          <div className="col-span-2">
            <a href="#" className="flex items-center gap-2.5">
              <Logo />
              <span className="font-display text-[17px] font-semibold tracking-tight">Zyvora</span>
            </a>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              The enterprise AI platform for automating customer engagement and growth.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" /> Global • SOC 2 Type II
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/80">{c.h}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-foreground/80 hover:text-foreground transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Zyvora, Inc. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---------------------------- Primitives ---------------------------- */

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h2 className="font-display mt-3 text-balance text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.08]">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-muted-foreground text-balance">{subtitle}</p>}
    </div>
  );
}

function PrimaryButton({
  children,
  href,
  small,
  full,
}: {
  children: React.ReactNode;
  href: string;
  small?: boolean;
  full?: boolean;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-xl gradient-primary text-primary-foreground font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-10px_color-mix(in_oklab,var(--primary)_60%,transparent)] ${
        small ? "px-4 py-2 text-sm" : "px-5 py-3 text-sm"
      } ${full ? "w-full" : ""}`}
    >
      {children}
    </a>
  );
}

function SecondaryButton({
  children,
  href,
  full,
}: {
  children: React.ReactNode;
  href: string;
  full?: boolean;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-primary/50 text-primary font-semibold px-5 py-3 text-sm bg-transparent transition-all hover:bg-primary/10 hover:border-primary ${
        full ? "w-full" : ""
      }`}
    >
      {children}
    </a>
  );
}
