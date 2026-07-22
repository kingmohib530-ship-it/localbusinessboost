import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
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
  Sparkles as SparklesIcon,
  Leaf,
  Zap,
  Bug,
  Check,
  X,
  ChevronDown,
  ShieldCheck,
  Link2,
  Bot,
  Inbox,
  Quote,
  type LucideIcon,
} from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { Button } from '@/components/ui/button'
import { pageMeta } from '@/lib/seo'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: pageMeta({
      title: 'Lanavix — AI Workforce for Local Contractors',
      description:
        'Lanavix texts back every missed call in 60 seconds, automates 5-star reviews, and finds new local leads — built for HVAC, plumbing, roofing and other trades.',
      path: '/',
    }),
  }),
  component: HomePage,
})

const industries: [LucideIcon, string][] = [
  [Wind, 'HVAC'],
  [Wrench, 'Plumbing'],
  [HomeIcon, 'Roofing'],
  [SparklesIcon, 'Cleaning'],
  [Leaf, 'Landscaping'],
  [Zap, 'Electrical'],
  [Bug, 'Pest Control'],
]

const painPoints = [
  { icon: Phone, title: "Phone rings while you're on a job", stat: 'Avg. missed job: $450' },
  { icon: Star, title: "Customers don't leave reviews even when they love you", stat: 'Losing 30% of potential jobs' },
  { icon: Inbox, title: 'Leads scattered across phone, Facebook, and voicemail', stat: '40% of leads go cold in 24 hrs' },
  { icon: Clock, title: 'Following up with leads eats your whole evening', stat: '3–5 hrs/week of your time' },
  { icon: Search, title: 'Competitors with more reviews rank above you on Google', stat: 'Invisible to new customers' },
  { icon: Wallet, title: "Paying for ads that go to a website that doesn't convert", stat: 'Avg. wasted: $800/month' },
]

const steps = [
  { num: '01', icon: Link2, title: 'Connect in 5 minutes', body: "Add your phone number and Google Business Profile link. That's it. No installs, no code, no tech skills." },
  { num: '02', icon: Bot, title: 'AI works 24/7 for you', body: 'Missed calls get texted back. Reviews get requested. Leads get found. All automatically, day and night.' },
  { num: '03', icon: Wallet, title: 'Open inbox to booked jobs', body: "Wake up to new conversations, confirmed appointments, and fresh 5-star reviews you didn't have to ask for." },
]

const withoutLanavix = ['Missed call = lost $400 job', 'Customers forget to leave reviews', 'Leads scattered across 5 places', 'Evenings spent chasing follow-ups', 'Competitors outrank you on Google', "Paying for ads that don't convert"]
const withLanavix = ['Every missed call texted back in 60s', 'Reviews arrive after every job, automatically', 'All leads in one simple inbox', 'AI books jobs while you sleep', 'More reviews = higher Google rank = more calls', 'Organic leads from the AI, no ad spend']

const earlyAccess = [
  { icon: ShieldCheck, title: 'Founding member pricing', body: 'Lock in your rate today and never pay more — even as we raise prices for new customers.' },
  { icon: Target, title: 'Built for your trade', body: 'Every prompt, every message, every lead search is trained specifically on contractor businesses — not generic small businesses.' },
  { icon: Inbox, title: 'Direct line to the team', body: 'Early members get direct access to the founders. Your feedback shapes the product.' },
]

const faqs = [
  { q: 'Do I need to be tech-savvy to use this?', a: 'Not at all. Setup takes 5 minutes. You give us your phone number and Google Business Profile link — we handle everything else. No apps to install, no code, no training required.' },
  { q: 'How fast will I see results?', a: 'Missed Call Text-Back starts working the moment you connect your number. Most contractors see their first recovered job within the first week. Reviews typically start coming in within 2–3 days of sending your first batch of requests.' },
  { q: 'Does this work for my trade?', a: 'Yes. Lanavix is built for HVAC, plumbing, roofing, electrical, cleaning, landscaping, and pest control. The AI is trained on contractor conversations — not generic business language.' },
  { q: 'Will it replace my current software?', a: 'No. Lanavix runs alongside whatever you already use. It handles the specific jobs that fall through the cracks: missed calls, review follow-ups, and finding new leads nearby.' },
  { q: "What if I don't like it?", a: "You're covered by our 30-day money-back guarantee. If you don't recover at least one job worth more than your monthly fee in the first 30 days, we refund every penny. No questions asked." },
  { q: 'How does the free audit work?', a: "Enter your business name and location. Our AI scans your Google profile, review count, response rate, and online presence in about 60 seconds. You get a report showing exactly what's costing you customers — no signup required." },
]

const pricing = {
  monthly: [
    { name: 'Solo', price: 49, desc: 'One-person operation getting started with automation', features: ['Missed Call Text-Back', 'Review request texts (50/mo)', 'Local Lead Blast (3 runs/mo)', 'Email support'], highlight: false },
    { name: 'Crew', price: 99, desc: 'Growing business that needs consistent leads and reviews', features: ['Everything in Solo', 'Unlimited review requests', 'Unlimited Lead Blast runs', 'AI review response writer', 'Competitor ranking tracker', 'Priority support'], highlight: true },
    { name: 'Agency', price: 199, desc: 'Multi-location operators or contractors managing crews', features: ['Everything in Crew', 'Up to 5 locations', 'Team seat access', 'Custom AI training on your brand voice', 'Dedicated success manager', 'API access + SLA'], highlight: false },
  ],
  annual: [
    { name: 'Solo', price: 39, desc: 'One-person operation getting started with automation', features: ['Missed Call Text-Back', 'Review request texts (50/mo)', 'Local Lead Blast (3 runs/mo)', 'Email support'], highlight: false },
    { name: 'Crew', price: 79, desc: 'Growing business that needs consistent leads and reviews', features: ['Everything in Solo', 'Unlimited review requests', 'Unlimited Lead Blast runs', 'AI review response writer', 'Competitor ranking tracker', 'Priority support'], highlight: true },
    { name: 'Agency', price: 159, desc: 'Multi-location operators or contractors managing crews', features: ['Everything in Crew', 'Up to 5 locations', 'Team seat access', 'Custom AI training on your brand voice', 'Dedicated success manager', 'API access + SLA'], highlight: false },
  ],
}

const stripeLinks: Record<string, string> = {
  'Solo-monthly': 'https://buy.stripe.com/test_3cIbJ291c0Gr3ezaWVa7C00',
  'Solo-annual': 'https://buy.stripe.com/test_aFa6oIa5g3SD3ez8ONa7C01',
  'Crew-monthly': 'https://buy.stripe.com/test_fZu6oI6T488T2av2qpa7C02',
  'Crew-annual': 'https://buy.stripe.com/test_8x24gAdhs2OzdTdfdba7C03',
  'Agency-monthly': 'https://buy.stripe.com/test_3cI7sMb9k0Gr8yTd53a7C04',
  'Agency-annual': 'https://buy.stripe.com/test_3cIbJ2fpAcp902n7KJa7C05',
}

function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Announcement bar */}
      <div className="bg-ink text-ink-foreground text-center text-xs sm:text-sm py-2.5 px-4">
        <span className="text-ink-muted">Now in early access —</span>{' '}
        <span className="font-medium">founding member pricing locked in for life.</span>{' '}
        <Link to="/audit" className="underline decoration-ink-muted underline-offset-4 hover:text-ink-foreground/80">
          Claim your spot
        </Link>
      </div>

      <SiteNav />

      {/* HERO */}
      <section className="section-ink border-b border-ink-border">
        <div className="max-w-4xl mx-auto px-6 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-border px-4 py-1.5 mb-8">
            <span className="text-xs font-medium tracking-wide text-ink-muted">
              Built for HVAC, plumbing, roofing &amp; the trades
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] text-balance">
            Stop losing <span className="text-primary-foreground/90 underline decoration-[var(--accent-2)] decoration-4 underline-offset-8">$2,000 a week</span> to missed calls
          </h1>
          <p className="mt-6 text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
            Lanavix texts back every missed call in <span className="text-ink-foreground font-medium">60 seconds</span>, gets you 5-star reviews after every job, and finds new leads in your area — without you lifting a finger.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/audit">
              <Button size="lg" className="h-12 px-7 text-[15px] font-semibold">
                Get my free business audit <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="h-12 px-7 text-[15px] font-semibold border-ink-border bg-transparent text-ink-foreground hover:bg-white/5">
                See how it works
              </Button>
            </a>
          </div>
          <p className="mt-4 text-xs text-ink-muted">Free audit · No credit card · Takes 60 seconds</p>

          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 max-w-2xl mx-auto border-t border-ink-border pt-10">
            {[
              { val: '<60s', label: 'To text back missed calls' },
              { val: '3 tools', label: 'That pay for themselves fast' },
              { val: '$0', label: 'Setup fee, ever' },
              { val: '30-day', label: 'Money-back guarantee' },
            ].map((s) => (
              <div key={s.val}>
                <div className="text-xl sm:text-2xl font-semibold tracking-tight">{s.val}</div>
                <div className="text-xs text-ink-muted mt-1 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FOR */}
      <section className="border-b border-border py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground mr-1">Built for</span>
          {industries.map(([Icon, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80">
              <Icon className="h-3.5 w-3.5 text-primary" /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* PAIN */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              You're working 12-hour days and still losing customers you've already earned
            </h2>
            <p className="mt-4 text-muted-foreground">Every one of these is costing you hundreds of dollars. Every single week.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPoints.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-6">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <item.icon className="h-4.5 w-4.5 text-foreground/70" />
                </div>
                <p className="font-medium text-sm leading-snug mb-2">{item.title}</p>
                <p className="text-destructive text-xs font-semibold">{item.stat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section id="how-it-works" className="py-24 px-6 bg-secondary/50 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">The solution</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              Three tools that pay for themselves in the first week
            </h2>
            <p className="mt-4 text-muted-foreground">No setup fees. No tech skills. No training. Just more booked jobs.</p>
          </div>

          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center mb-24">
            <div>
              <Phone className="h-7 w-7 text-primary mb-5" />
              <p className="text-primary font-semibold text-xs uppercase tracking-widest mb-3">Never lose a job to voicemail again</p>
              <h3 className="font-display text-2xl font-bold mb-4">Missed Call Text-Back</h3>
              <p className="text-muted-foreground leading-relaxed mb-5">
                When you're on a roof, under a sink, or driving between jobs — Lanavix texts back every missed call within 60 seconds. AI handles the conversation and books the appointment.
              </p>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                62% of calls to small businesses go unanswered. Each one is a $200–$2,000 job walking out the door.
              </div>
            </div>
            <div className="rounded-2xl bg-ink text-ink-foreground p-6">
              <p className="text-ink-muted text-[11px] font-semibold uppercase tracking-widest mb-4">Example</p>
              <div className="rounded-lg bg-destructive/15 border border-destructive/30 px-3 py-2.5 text-sm text-red-200 mb-2">
                Missed call from (571) 555-0182
              </div>
              <p className="text-ink-muted text-xs text-center my-2">Lanavix responds in 47 seconds</p>
              <div className="rounded-lg bg-white/10 px-3 py-2.5 text-sm mb-2">
                "Hi! This is Peak HVAC. Sorry we missed you — we're on a call right now. What do you need help with? Reply and we'll get you booked today!"
              </div>
              <div className="rounded-lg bg-primary/15 border border-primary/30 px-3 py-2.5 text-sm text-emerald-200 mb-3">
                Reply: "AC unit not cooling. Can come tomorrow?"
              </div>
              <p className="text-emerald-300 text-sm font-semibold text-center">Job booked. $380 revenue saved.</p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center mb-24">
            <div className="rounded-2xl bg-ink text-ink-foreground p-6 md:order-1 order-2">
              <p className="text-ink-muted text-[11px] font-semibold uppercase tracking-widest mb-4">Example</p>
              <div className="rounded-lg bg-white/10 px-3 py-2.5 text-sm mb-2">Job completed for Sarah M.</div>
              <p className="text-ink-muted text-xs text-center my-2">Lanavix sends review request 2 hours later</p>
              <div className="rounded-lg bg-white/10 px-3 py-2.5 text-sm mb-2">
                "Hi Sarah! Thanks for choosing us for your AC tune-up. If we did a great job, a quick Google review means the world: [link]"
              </div>
              <div className="rounded-lg bg-primary/15 border border-primary/30 px-3 py-2.5 text-sm text-emerald-200 mb-3">
                ★★★★★ New 5-star review received
              </div>
              <p className="text-emerald-300 text-sm font-semibold text-center">Review #89. Google ranking improved.</p>
            </div>
            <div className="md:order-2 order-1">
              <Star className="h-7 w-7 text-primary mb-5" />
              <p className="text-primary font-semibold text-xs uppercase tracking-widest mb-3">Double your Google reviews in 90 days</p>
              <h3 className="font-display text-2xl font-bold mb-4">Reputation Autopilot</h3>
              <p className="text-muted-foreground leading-relaxed mb-5">
                After every job, we automatically text your customer a direct Google review link. When a bad review hits, we alert you instantly and write a professional response in 30 seconds.
              </p>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Going from 3.8 → 4.5 stars increases calls by 30%. That's the difference between 10 and 13 jobs a week.
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <Target className="h-7 w-7 text-primary mb-5" />
              <p className="text-primary font-semibold text-xs uppercase tracking-widest mb-3">30 new leads in your area — in 60 seconds</p>
              <h3 className="font-display text-2xl font-bold mb-4">Local Lead Blast</h3>
              <p className="text-muted-foreground leading-relaxed mb-5">
                Tell us your trade and city. Our AI finds 30 real local businesses that need your service, with the owner's name, phone number, and a personalized opening line ready to send.
              </p>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                The average Lanavix user closes 2–4 jobs from their first Lead Blast. Average job value: $350–$1,800.
              </div>
            </div>
            <div className="rounded-2xl bg-ink text-ink-foreground p-6">
              <p className="text-ink-muted text-[11px] font-semibold uppercase tracking-widest mb-1">Example</p>
              <p className="text-ink-muted text-xs mb-4">Lead Blast results — Roofing · Atlanta GA</p>
              {[
                { name: 'Piedmont Coffee Roasters', phone: '404-291-0110', opening: 'Hi, we do commercial roofing in Midtown — coffee shops take a beating with foot traffic and HVAC units on the roof. Happy to do a free inspection.' },
                { name: 'Midtown Gym & Fitness', phone: '404-554-0234', opening: "Hey, gyms with flat roofs need resealing every few years — especially with all the rooftop equipment. We're local and could take a look for free." },
                { name: 'Buckhead Medical Spa', phone: '404-887-0891', opening: "Hi, medical offices can't afford a leak during business hours. We specialize in commercial roofing in Buckhead and offer same-week inspections." },
              ].map((lead) => (
                <div key={lead.name} className="rounded-lg bg-white/10 px-3 py-2.5 mb-2">
                  <p className="font-medium text-sm mb-1">{lead.name} · {lead.phone}</p>
                  <p className="text-ink-muted text-xs">"{lead.opening}"</p>
                </div>
              ))}
              <p className="text-emerald-300 text-sm font-semibold text-center mt-3">+27 more leads. Generated in 34 seconds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Setup takes 5 minutes</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Set it up once. It works forever.</h2>
          <p className="mt-4 text-muted-foreground mb-16">No IT team. No training. No ongoing work from you.</p>
          <div className="grid sm:grid-cols-3 gap-6 mb-16 text-left">
            {steps.map((step) => (
              <div key={step.num} className="rounded-xl border border-border bg-card p-7">
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{step.num}</span>
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { val: '<60s', label: 'To reply to missed calls' },
              { val: '$2k–$8k', label: 'Recovered revenue/month' },
              { val: '2–4 jobs', label: 'From first Lead Blast' },
              { val: '30 days', label: 'Money-back guarantee' },
            ].map((s) => (
              <div key={s.val} className="rounded-lg border border-border bg-card py-5 px-3 text-center">
                <div className="text-lg font-semibold text-primary">{s.val}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="results" className="py-24 px-6 bg-secondary/50 border-y border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center mb-14">
            What changes when you use Lanavix
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-7">
              <p className="text-destructive font-semibold text-sm mb-5">Without Lanavix</p>
              {withoutLanavix.map((item) => (
                <div key={item} className="flex items-start gap-2.5 mb-3.5 text-sm">
                  <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-primary/30 bg-card p-7">
              <p className="text-primary font-semibold text-sm mb-5">With Lanavix</p>
              {withLanavix.map((item) => (
                <div key={item} className="flex items-start gap-2.5 mb-3.5 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EARLY ACCESS */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Early access</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            Built for contractors across America — launching now
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto mb-14 leading-relaxed">
            Lanavix is in early access with a small group of local contractors. Founding members lock in current pricing forever and get direct input on what we build next.
          </p>
          <div className="grid sm:grid-cols-3 gap-5 text-left">
            {earlyAccess.map((card) => (
              <div key={card.title} className="rounded-xl border border-border bg-card p-7">
                <card.icon className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-semibold text-base mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — placeholder cards only; Lanavix is in early access
          and has no customer quotes to publish yet. Replace with real
          testimonials as they come in, not before. */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            What contractors are saying
          </h2>
          <p className="text-muted-foreground mb-14">We're in early access — real stories are on their way.</p>
          <div className="grid sm:grid-cols-3 gap-5 text-left">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-7">
                <Quote className="h-6 w-6 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-sm leading-relaxed italic">
                  Customer testimonial coming soon.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 bg-secondary/50 border-y border-border">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-3">Simple pricing. Serious results.</h2>
          <p className="text-muted-foreground mb-10">Every plan includes a 14-day free trial. Cancel any time.</p>

          <div className="inline-flex items-center bg-background border border-border rounded-xl p-1 gap-1 mb-14">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${billingPeriod === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${billingPeriod === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Annual
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${billingPeriod === 'annual' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>Save 20%</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 text-left">
            {pricing[billingPeriod].map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl p-8 flex flex-col bg-card border ${plan.highlight ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl font-bold">$</span>
                  <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                <div className="h-px bg-border mb-6" />
                <div className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                <a href={stripeLinks[`${plan.name}-${billingPeriod}`] || '#'}>
                  <Button className="w-full font-semibold" variant={plan.highlight ? 'default' : 'outline'}>
                    Start free trial <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-border bg-card p-7 max-w-xl mx-auto flex items-start gap-4 text-left">
            <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-sm mb-1">30-Day Money-Back Guarantee</p>
              <p className="text-muted-foreground text-sm leading-relaxed">If you don't recover at least one job worth more than your monthly fee in the first 30 days, we'll refund every penny. No questions asked.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12">Common questions</h2>
          <div className="flex flex-col">
            {faqs.map((faq, i) => (
              <div key={faq.q} className="border-b border-border">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="font-medium text-sm">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section-ink py-24 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-5">
            Find out how many customers you're losing right now — free
          </h2>
          <p className="text-ink-muted leading-relaxed mb-9">
            Run a free 60-second audit of your website and Google profile. Get your scores and 12 specific fixes — no credit card, no signup required.
          </p>
          <Link to="/audit">
            <Button size="lg" className="h-12 px-8 text-[15px] font-semibold">
              Get my free business audit <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-ink-muted text-xs mt-4">No signup required · No credit card · 60 seconds · Keep the report</p>
          <div className="flex flex-wrap gap-6 justify-center mt-12 text-xs text-ink-muted">
            <span>Bank-grade security</span>
            <span>Setup in 5 minutes</span>
            <span>Results in week 1</span>
            <span>No credit card to start</span>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
