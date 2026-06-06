import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, ArrowRight, Bot, Compass, Globe, Search, PenTool, Workflow, Shield, Activity,
  Cpu, CheckCircle2, Zap, Layers, GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LUNAVX — AI Workforce OS for Local Businesses & Freelancers" },
      { name: "description", content: "Your AI team that gets you more clients & bookings — whether you run a local business or freelance. One-click campaigns for leads, follow-ups, proposals, and revenue automations." },
      { property: "og:title", content: "LUNAVX — AI Workforce OS" },
      { property: "og:description", content: "Your AI team that gets you more clients & bookings — whether you run a local business or freelance." },
    ],
  }),
  component: Landing,
});

const AGENTS = [
  { name: "Orbis", role: "Strategy Engine", icon: Compass, color: "from-violet-500 to-fuchsia-500", desc: "Decomposes any request into a coordinated multi-agent workflow." },
  { name: "Atlas", role: "Lead Intelligence", icon: Globe, color: "from-cyan-400 to-teal-500", desc: "Generates structured local business leads on demand." },
  { name: "Nexus", role: "Market Intelligence", icon: Search, color: "from-sky-400 to-blue-600", desc: "Competitor research, opportunities and market insights." },
  { name: "Pulse", role: "Copywriting Engine", icon: PenTool, color: "from-pink-500 to-rose-500", desc: "Cold emails, ads and outreach scripts that convert." },
  { name: "Forge", role: "Automation Builder", icon: Workflow, color: "from-amber-400 to-orange-500", desc: "Designs Zapier-style workflow logic for any operation." },
  { name: "Shield", role: "Quality Control", icon: Shield, color: "from-emerald-400 to-green-600", desc: "Validates and improves every agent output before delivery." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Nav />
      <Hero />
      <Logos />
      <AgentsSection />
      <OrchestratorSection />
      <UseCases />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold tracking-tight">LUNAVX</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#agents" className="hover:text-foreground">Agents</a>
          <a href="#orchestrator" className="hover:text-foreground">Orchestrator</a>
          <a href="#usecases" className="hover:text-foreground">Use cases</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Login</Button></Link>
          <Link to="/auth"><Button size="sm">Get Started <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
        <Badge variant="secondary" className="mb-6 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-glow mr-2" />
          Now in open beta · Free access
        </Badge>
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-balance max-w-4xl mx-auto animate-fade-up">
          Your <span className="gradient-text">AI Team</span> that gets you more clients &amp; bookings
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
          Whether you run a local business or freelance, LUNAVX deploys AI employees that find leads,
          write outreach, book jobs, and follow up — while you sleep.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/auth"><Button size="lg" className="glow-primary">Get Started <ArrowRight className="h-4 w-4" /></Button></Link>
          <a href="#agents"><Button size="lg" variant="outline">See the agents</Button></a>
        </div>

        <div className="mt-20 relative">
          <div className="absolute -inset-x-20 -inset-y-10 bg-gradient-to-r from-primary/10 via-accent-2/10 to-primary/10 blur-3xl" />
          <Card className="relative glass p-6 max-w-5xl mx-auto text-left">
            <div className="flex items-center gap-2 pb-4 border-b border-border/60">
              <div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-destructive/60" /><div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" /><div className="h-2.5 w-2.5 rounded-full bg-success/60" /></div>
              <span className="text-xs text-muted-foreground ml-2">LUNAVX Control · Orchestrator running</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {[
                { agent: "Orbis", action: "Planning · 4 steps", state: "running" },
                { agent: "Atlas", action: "Extracting 25 leads", state: "done" },
                { agent: "Pulse", action: "Drafting outreach", state: "queued" },
              ].map((s, i) => (
                <div key={i} className="rounded-lg border border-border/60 p-4 bg-card/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-primary">{s.agent}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.state === "running" ? "bg-success animate-pulse-glow" : s.state === "done" ? "bg-success" : "bg-muted-foreground/40"}`} />
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
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-6">Trusted by modern teams</p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-muted-foreground/70 font-display text-lg">
          {["Northwind", "Helix Labs", "Atlas Co", "Lumen", "Vertex", "Quanta"].map((n) => (
            <span key={n}>{n}</span>
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
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-4">The Workforce</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Six specialized AI agents. One orchestrator.</h2>
          <p className="mt-4 text-muted-foreground text-lg">Every LUNAVX agent has a clear role. The orchestrator decides who does what, and in what order.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
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
          <Badge variant="secondary" className="mb-4">The Brain</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">The LUNAVX Orchestrator</h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Every request flows through a single intelligent router. It analyzes intent, breaks the
            request into subtasks, assigns the right agents in the right order, and aggregates the
            result into a structured, traceable output.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              { i: Cpu, t: "Intent analysis · breaks down what you actually need" },
              { i: Layers, t: "Multi-agent planning · ordered execution graph" },
              { i: Shield, t: "Quality control · Shield validates every output" },
              { i: Activity, t: "Full traceability · every step logged" },
            ].map(({ i: Icon, t }) => (
              <li key={t} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="h-3.5 w-3.5" /></div>
                <span className="text-sm">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <Card className="p-6 font-mono text-xs">
          <div className="text-muted-foreground mb-3">$ user_request</div>
          <div className="text-foreground">"Get me 50 cleaning companies in Virginia and write outreach emails"</div>
          <div className="my-4 border-t border-border/60" />
          <div className="space-y-2">
            {[
              ["Orbis", "Plans workflow → 4 steps"],
              ["Atlas", "Extracts 50 cleaning companies"],
              ["Nexus", "Enriches with market context"],
              ["Pulse", "Drafts personalised cold emails"],
              ["Shield", "Validates & finalises output"],
            ].map(([a, t]) => (
              <div key={a} className="flex gap-3">
                <span className="text-primary w-14">{a}</span>
                <span className="text-muted-foreground">→</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div className="my-4 border-t border-border/60" />
          <div className="text-success flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> 50 leads + 50 personalised emails delivered</div>
        </Card>
      </div>
    </section>
  );
}

function UseCases() {
  const items = [
    { i: Globe, t: "AI Lead Generation", d: "Automatically discover and structure local business leads at scale." },
    { i: PenTool, t: "Automated Outreach", d: "Multi-channel cold outreach with personalised, on-brand copy." },
    { i: Zap, t: "Marketing Copy Engine", d: "Ads, landing pages and email campaigns produced on demand." },
    { i: GitBranch, t: "Workflow Automation", d: "Design Zapier-style logic across your business systems." },
  ];
  return (
    <section id="usecases" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">What it does</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">A digital workforce, not a chatbot.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {items.map(({ i: I, t, d }) => (
            <Card key={t} className="p-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><I className="h-5 w-5" /></div>
              <h3 className="font-display font-bold mt-4">{t}</h3>
              <p className="text-sm text-muted-foreground mt-2">{d}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Starter", price: "Free", note: "Beta access", features: ["6 AI agents", "Orchestrator", "100 tasks / month"] },
    { name: "Growth", price: "$49", note: "/ month", features: ["Unlimited tasks", "Priority execution", "Workflow saving"], featured: true },
    { name: "Scale", price: "Contact", note: "Enterprise", features: ["SSO + audit logs", "Dedicated agents", "Custom integrations"] },
  ];
  return (
    <section id="pricing" className="py-24 bg-card/20 border-y border-border/60">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <Badge variant="secondary" className="mb-4">Pricing</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Start free. Scale as you grow.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {tiers.map((t) => (
            <Card key={t.name} className={`p-8 ${t.featured ? "border-primary/40 glow-primary" : ""}`}>
              <div className="text-sm text-muted-foreground">{t.name}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.note}</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />{f}</li>
                ))}
              </ul>
              <Link to="/auth" className="block mt-6">
                <Button className="w-full" variant={t.featured ? "default" : "outline"}>Get started</Button>
              </Link>
            </Card>
          ))}
        </div>
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
        <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-balance">Your AI workforce is one click away.</h2>
        <p className="mt-4 text-muted-foreground text-lg">Spin up LUNAVX in seconds. No credit card required during beta.</p>
        <Link to="/auth" className="inline-block mt-8">
          <Button size="lg" className="glow-primary">Launch LUNAVX <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold">LUNAVX</span>
          <span className="text-xs text-muted-foreground ml-2">AI Workforce Orchestration System</span>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} LUNAVX. All rights reserved.</p>
      </div>
    </footer>
  );
}
