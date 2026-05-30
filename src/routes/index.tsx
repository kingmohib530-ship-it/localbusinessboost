import { createFileRoute } from "@tanstack/react-router";
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
  Calendar,
  Inbox,
  Target,
  Activity,
  Briefcase,
  Palette,
  Building2,
  UserCircle,
  Globe,
  Play,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zyvora — Turn Attention Into Customers, Automatically" },
      {
        name: "description",
        content:
          "Zyvora is an AI Growth & Automation System that captures leads, starts conversations, and converts visitors into paying customers across your entire business.",
      },
      { property: "og:title", content: "Zyvora — AI Growth & Automation OS" },
      {
        property: "og:description",
        content:
          "Capture leads, automate follow-ups, manage conversations, and turn traffic into revenue — in one premium AI platform.",
      },
    ],
  }),
  component: Landing,
});

/* ------------------------------ Shell ------------------------------ */

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased font-sans">
      <Nav />
      <Hero />
      <LogoStrip />
      <FlowSection />
      <Ecosystem />
      <Dashboard />
      <Industries />
      <Automations />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

/* ------------------------------ Nav ------------------------------ */

function Nav() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <a href="#" className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-lg font-semibold tracking-tight">
              Zyvora
            </span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {[
              ["Platform", "#platform"],
              ["Automations", "#automations"],
              ["Industries", "#industries"],
              ["Pricing", "#pricing"],
            ].map(([l, h]) => (
              <a
                key={l}
                href={h}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Sign in
            </a>
            <a
              href="#"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] glow-primary"
            >
              Start free trial
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="relative h-8 w-8 rounded-lg gradient-primary glow-primary">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-sm font-bold text-primary-foreground">
          Z
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ Hero ------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-radial-glow absolute inset-0" />
      <div className="bg-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 lg:pt-28">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            AI Growth & Automation OS · v3 launching
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Turn attention into{" "}
            <span className="gradient-text">customers</span> — automatically.
          </h1>
          <p className="mt-6 text-base text-muted-foreground sm:text-lg">
            Zyvora is an AI Growth & Automation System that captures leads,
            starts conversations, and converts visitors into paying customers
            across your entire business.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] glow-primary sm:w-auto"
            >
              Start free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a
              href="#"
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-elevated sm:w-auto"
            >
              <Play className="mr-2 h-4 w-4" />
              Watch demo
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card · 14-day trial · Cancel anytime
          </p>
        </div>

        <div className="mt-16 animate-fade-up">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-primary/10 via-accent-2/10 to-transparent blur-2xl" />
      <div className="glass rounded-2xl p-3 shadow-2xl">
        <div className="grid gap-3 rounded-xl bg-background/60 p-4 lg:grid-cols-12">
          {/* Left: chat capture */}
          <div className="lg:col-span-4 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Zyvora AI Chat</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                Live
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <Bubble side="ai">
                Hi 👋 Looking to book a service or get a quote?
              </Bubble>
              <Bubble side="user">A quote for a kitchen redesign.</Bubble>
              <Bubble side="ai">
                Perfect. What's the best number to text the estimate to?
              </Bubble>
              <div className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-2 text-[11px] text-primary">
                ✓ Lead captured · routed to Inbox
              </div>
            </div>
          </div>

          {/* Middle: workflow */}
          <div className="lg:col-span-4 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Automation</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                Active
              </span>
            </div>
            <FlowNodes />
          </div>

          {/* Right: analytics */}
          <div className="lg:col-span-4 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Conversions</span>
              <span className="ml-auto text-[10px] text-success">+34%</span>
            </div>
            <Spark />
            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
              <Stat label="Visitors" value="12.4k" />
              <Stat label="Leads" value="1,284" />
              <Stat label="Booked" value="392" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "ai" | "user"; children: React.ReactNode }) {
  return (
    <div className={side === "user" ? "flex justify-end" : "flex"}>
      <div
        className={
          side === "user"
            ? "rounded-lg bg-elevated px-2.5 py-1.5 text-foreground max-w-[85%]"
            : "rounded-lg bg-primary/15 border border-primary/30 px-2.5 py-1.5 text-foreground max-w-[85%]"
        }
      >
        {children}
      </div>
    </div>
  );
}

function FlowNodes() {
  const nodes = [
    { icon: MessageSquare, label: "New chat" },
    { icon: Target, label: "Qualify lead" },
    { icon: Calendar, label: "Book call" },
    { icon: Zap, label: "Send SMS + email" },
  ];
  return (
    <ol className="space-y-1.5">
      {nodes.map((n, i) => (
        <li
          key={n.label}
          className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-2 py-1.5 text-[11px]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
            <n.icon className="h-3 w-3" />
          </span>
          <span className="text-foreground">{n.label}</span>
          <span className="ml-auto text-muted-foreground">
            {i === nodes.length - 1 ? "" : "→"}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Spark() {
  return (
    <svg viewBox="0 0 200 60" className="h-16 w-full">
      <defs>
        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00E7C4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00E7C4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0,45 L20,40 L40,42 L60,30 L80,33 L100,22 L120,26 L140,15 L160,18 L180,8 L200,12 L200,60 L0,60 Z"
        fill="url(#g)"
      />
      <path
        d="M0,45 L20,40 L40,42 L60,30 L80,33 L100,22 L120,26 L140,15 L160,18 L180,8 L200,12"
        fill="none"
        stroke="#00E7C4"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-2 py-1.5">
      <div className="font-display text-sm font-semibold">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
}

/* ------------------------------ Logos ------------------------------ */

function LogoStrip() {
  const names = ["Northwind", "Acme", "Lumen", "Vertex", "Helios", "Quanta"];
  return (
    <section className="border-y border-border/60 bg-surface/40">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Powering growth at modern teams
        </p>
        <div className="mt-6 grid grid-cols-2 items-center gap-6 sm:grid-cols-3 md:grid-cols-6">
          {names.map((n) => (
            <div
              key={n}
              className="text-center font-display text-base font-medium text-muted-foreground/80"
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Flow ----------------------------- */

function FlowSection() {
  const steps = [
    { label: "Traffic", icon: Globe },
    { label: "Conversations", icon: MessageSquare },
    { label: "Leads", icon: Target },
    { label: "Customers", icon: Users },
    { label: "Revenue", icon: TrendingUp },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          One system. The entire growth loop.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Zyvora connects every step from first visit to closed revenue — so
          nothing leaks, nothing is manual.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-5">
        {steps.map((s, i) => (
          <div
            key={s.label}
            className="relative rounded-xl border border-border bg-card p-5 text-center"
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="font-display text-sm font-medium">{s.label}</div>
            {i < steps.length - 1 && (
              <ArrowRight className="absolute -right-4 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground md:block" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Ecosystem --------------------------- */

function TrendingUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function Ecosystem() {
  const products = [
    {
      icon: Bot,
      name: "Zyvora AI Chat",
      tag: "Conversations",
      desc: "AI agents that talk to every visitor and capture intent 24/7.",
    },
    {
      icon: Target,
      name: "Zyvora Leads",
      tag: "Qualification",
      desc: "Score, route, and enrich prospects in real time.",
    },
    {
      icon: Workflow,
      name: "Zyvora Automations",
      tag: "Workflows",
      desc: "Trigger-based SMS, email, and internal follow-ups.",
    },
    {
      icon: Calendar,
      name: "Zyvora Booking",
      tag: "Appointments",
      desc: "Let AI book qualified calls straight into your calendar.",
    },
    {
      icon: Inbox,
      name: "Zyvora Inbox",
      tag: "Unified hub",
      desc: "Every channel, every conversation, one shared workspace.",
    },
    {
      icon: Activity,
      name: "Zyvora Analytics",
      tag: "Conversion",
      desc: "Track traffic → revenue with attribution baked in.",
    },
  ];
  return (
    <section id="platform" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Platform
        </div>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          A complete AI growth stack — not another point tool.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Six tightly integrated systems that replace chatbots, CRMs, schedulers,
          and follow-up tools.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div
            key={p.name}
            className="group relative rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <p.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {p.tag}
              </span>
            </div>
            <h3 className="font-display text-lg font-semibold">{p.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Dashboard --------------------------- */

function Dashboard() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Activity className="h-3 w-3 text-primary" />
            Operator dashboard
          </div>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            The control room for your growth engine.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Watch conversations, leads, and revenue update in real time. Every
            automation, every conversion — measurable.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Real-time pipeline from visit → booked call",
              "AI-suggested next actions per lead",
              "Attribution across every channel",
              "SOC 2-ready audit trail",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground/90">{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-2xl p-3">
          <div className="rounded-xl bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">This week</div>
                <div className="font-display text-2xl font-semibold">
                  $48,210 <span className="text-sm text-success">+22%</span>
                </div>
              </div>
              <div className="flex gap-1">
                {["7D", "30D", "90D"].map((t, i) => (
                  <span
                    key={t}
                    className={
                      "rounded-md px-2 py-1 text-[11px] " +
                      (i === 0
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground")
                    }
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <Spark />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Conversations" value="3,481" />
              <Stat label="Qualified" value="1,102" />
              <Stat label="Booked" value="392" />
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["New lead · Sarah K.", "Booked discovery call", "2m"],
                ["Workflow · No-show recovery", "Sent SMS to 14 leads", "11m"],
                ["AI Chat · Pricing inquiry", "Routed to Sales inbox", "18m"],
              ].map(([a, b, c]) => (
                <div
                  key={a}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-medium">{a}</div>
                    <div className="text-muted-foreground">{b}</div>
                  </div>
                  <span className="text-muted-foreground">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Industries --------------------------- */

function Industries() {
  const items = [
    { icon: Building2, name: "Businesses", desc: "Local & online businesses scaling customer acquisition." },
    { icon: UserCircle, name: "Freelancers", desc: "Solo operators turning inbound traffic into clients." },
    { icon: Briefcase, name: "Agencies", desc: "Deploy growth systems for every client portfolio." },
    { icon: Palette, name: "Creators", desc: "Monetize attention with conversations that convert." },
    { icon: Globe, name: "Online services", desc: "SaaS, coaching, and digital products — automated." },
  ];
  return (
    <section id="industries" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Built for anyone selling anything.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Zyvora flexes to your business model — not the other way around.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((i) => (
          <div
            key={i.name}
            className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-2/15 text-[color:var(--accent-2)]">
              <i.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-base font-semibold">
              {i.name}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{i.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --------------------------- Automations --------------------------- */

function Automations() {
  const flows = [
    {
      title: "Instant lead response",
      desc: "AI replies within seconds, qualifies intent, and books a call.",
      steps: ["New chat", "Qualify", "Book"],
    },
    {
      title: "No-show recovery",
      desc: "Auto SMS + email sequence brings back missed appointments.",
      steps: ["Missed", "SMS", "Reschedule"],
    },
    {
      title: "Pipeline nurture",
      desc: "Stay top-of-mind with personalized AI follow-ups for weeks.",
      steps: ["Stalled", "AI nudge", "Reopen"],
    },
  ];
  return (
    <section id="automations" className="border-y border-border/60 bg-surface/40">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Automations that move revenue, not noise.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pre-built playbooks proven across thousands of businesses — live in
            minutes.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {flows.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              <div className="mt-5 flex items-center gap-2 text-[11px]">
                {f.steps.map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    <span className="rounded-md border border-border bg-background/60 px-2 py-1">
                      {s}
                    </span>
                    {i < f.steps.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Testimonials --------------------------- */

function Testimonials() {
  const quotes = [
    {
      q: "Zyvora replaced three tools and doubled our booked calls in 6 weeks.",
      n: "Maya R.",
      t: "Founder, Helios Studio",
    },
    {
      q: "It's the first automation platform that actually feels like a product, not a hack.",
      n: "Jordan T.",
      t: "Head of Growth, Vertex",
    },
    {
      q: "We treat Zyvora as our growth operating system. It's that core.",
      n: "Priya M.",
      t: "CEO, Northwind",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-4 md:grid-cols-3">
        {quotes.map((q) => (
          <figure
            key={q.n}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <blockquote className="text-sm leading-relaxed text-foreground">
              "{q.q}"
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4 text-xs">
              <div className="h-8 w-8 rounded-full gradient-primary" />
              <div>
                <div className="font-medium text-foreground">{q.n}</div>
                <div className="text-muted-foreground">{q.t}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- Pricing ----------------------------- */

function Pricing() {
  const tiers = [
    {
      name: "Starter",
      price: "$0",
      cadence: "free 14 days",
      desc: "For solos testing Zyvora's growth engine.",
      features: ["AI Chat on 1 site", "500 conversations", "Email follow-ups", "Basic analytics"],
      cta: "Start free",
    },
    {
      name: "Growth",
      price: "$79",
      cadence: "/ month",
      desc: "For businesses turning traffic into revenue.",
      features: [
        "Unlimited conversations",
        "Leads + Booking + Inbox",
        "SMS + email automations",
        "Conversion analytics",
      ],
      cta: "Start free trial",
      featured: true,
    },
    {
      name: "Scale",
      price: "Custom",
      cadence: "talk to sales",
      desc: "For agencies and teams running many brands.",
      features: ["Multi-brand workspaces", "Role-based access", "Priority AI capacity", "Onboarding & SLAs"],
      cta: "Contact sales",
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Pricing that scales with revenue, not seats.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade when Zyvora is paying for itself.
        </p>
      </div>
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={
              "relative rounded-2xl border p-6 " +
              (t.featured
                ? "border-primary/50 bg-card glow-primary"
                : "border-border bg-card")
            }
          >
            {t.featured && (
              <span className="absolute -top-2 right-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Most popular
              </span>
            )}
            <h3 className="font-display text-lg font-semibold">{t.name}</h3>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-semibold">{t.price}</span>
              <span className="text-xs text-muted-foreground">{t.cadence}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <a
              href="#"
              className={
                "mt-6 inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium transition-transform hover:scale-[1.01] " +
                (t.featured
                  ? "bg-primary text-primary-foreground glow-primary"
                  : "border border-border bg-elevated text-foreground")
              }
            >
              {t.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ CTA ------------------------------ */

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center">
        <div className="bg-radial-glow absolute inset-0 opacity-70" />
        <div className="relative">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your next customer is already on your site.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Let Zyvora talk to them, qualify them, and book them — automatically.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground glow-primary"
            >
              Start free trial <ArrowRight className="ml-2 h-4 w-4" />
            </a>
            <a
              href="#"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-elevated px-6 text-sm font-medium"
            >
              Book a demo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- Footer ----------------------------- */

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-base font-semibold">Zyvora</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            The AI Growth & Automation OS. Turn attention into customers —
            automatically.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            SOC 2 Type II · GDPR · 99.99% uptime
          </div>
        </div>
        {[
          { h: "Platform", links: ["AI Chat", "Leads", "Automations", "Booking", "Inbox", "Analytics"] },
          { h: "Company", links: ["About", "Customers", "Careers", "Press"] },
          { h: "Resources", links: ["Docs", "Guides", "Status", "Security"] },
        ].map((c) => (
          <div key={c.h}>
            <div className="text-xs font-semibold uppercase tracking-widest text-foreground">
              {c.h}
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Zyvora, Inc.</span>
          <span>Built for teams who move on revenue, not vanity.</span>
        </div>
      </div>
    </footer>
  );
}
