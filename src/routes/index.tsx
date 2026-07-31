import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  ChevronDown,
  ShieldCheck,
  Link2,
  Bot,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { Button } from '@/components/ui/button'
import { TicketCard } from '@/components/TicketCard'
import { pageMeta } from '@/lib/seo'
import { PRICING_PLANS, PAID_PLAN_IDS } from '@/lib/pricingPlans'

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
  { icon: Phone, title: "Phone rings while you're on a job", stat: '62% of calls go unanswered' },
  { icon: Star, title: "Customers don't leave reviews even when they love you", stat: 'Silence looks like indifference to the next customer' },
  { icon: Inbox, title: 'Leads scattered across phone, Facebook, and voicemail', stat: 'Somebody else answers first' },
  { icon: Clock, title: 'Following up with leads eats your whole evening', stat: 'Time you should be off the clock' },
  { icon: Search, title: 'Competitors with more reviews rank above you on Google', stat: 'Invisible to new customers' },
  { icon: Wallet, title: "Paying for ads that go to a website that doesn't convert", stat: 'Money spent, no job booked' },
]

const steps = [
  { num: '01', icon: Link2, title: 'Connect in 5 minutes', body: "Add your phone number and your Google Business Profile link. That's the whole setup." },
  { num: '02', icon: Bot, title: 'AI works 24/7 for you', body: 'Missed calls get texted back. Reviews get requested. Leads get found. All automatically, day and night.' },
  { num: '03', icon: Wallet, title: 'Open inbox to booked jobs', body: "Wake up to new conversations, confirmed appointments, and fresh 5-star reviews you didn't have to ask for." },
]

const beforeAfter = [
  { before: 'A missed call is a job that goes to whoever answers next', after: 'Every missed call texted back in 60s' },
  { before: 'Customers forget to leave reviews', after: 'Reviews arrive after every job, automatically' },
  { before: 'Leads scattered across 5 places', after: 'All leads in one simple inbox' },
  { before: 'Evenings spent chasing follow-ups', after: 'AI books jobs while you sleep' },
  { before: 'Competitors outrank you on Google', after: 'More reviews means a higher Google rank means more calls' },
  { before: "Paying for ads that don't convert", after: 'Organic leads from the AI, no ad spend' },
]

const earlyAccess = [
  { icon: ShieldCheck, title: 'Founding member pricing', body: 'Lock in your rate today and never pay more — even as we raise prices for new customers.' },
  { icon: Target, title: 'Built for your trade', body: 'Every prompt, every message, every lead search is trained specifically on contractor businesses — not generic small businesses.' },
  { icon: Inbox, title: 'Talk to Mohib, not a bot', body: 'Early members get a direct line to the founder — real answers, not a support queue.' },
]

const faqs = [
  { q: 'Do I need to be tech-savvy to use this?', a: "Not at all. Setup takes about five minutes: give us your phone number and your Google Business Profile link, and we take it from there." },
  { q: 'How fast will I see results?', a: "Missed Call Text-Back starts working the second you connect your number — every missed call gets a reply within 60 seconds from day one. We're in early access, so we don't have enough customers yet to promise a typical timeline for reviews or leads, but the AI is working for you immediately." },
  { q: 'Does this work for my trade?', a: 'Yes. Lanavix is built for HVAC, plumbing, roofing, electrical, cleaning, landscaping, and pest control. The AI is trained on contractor conversations — not generic business language.' },
  { q: 'Will it replace my current software?', a: 'No. Lanavix runs alongside whatever you already use. It handles the specific jobs that fall through the cracks: missed calls, review follow-ups, and finding new leads nearby.' },
  { q: "What if I don't like it?", a: "You're covered by our 30-day money-back guarantee. If you don't recover at least one job worth more than your monthly fee in the first 30 days, we refund every penny. No questions asked." },
  { q: 'How does the free audit work?', a: "Enter your business name and location. Our AI scans your Google profile, review count, response rate, and online presence in about 60 seconds. You get a report showing exactly what's costing you customers — no signup required." },
]

const pricing = {
  monthly: PAID_PLAN_IDS.map((id) => {
    const p = PRICING_PLANS[id]
    return { name: p.name, price: p.price, desc: p.tagline, features: p.features, highlight: p.featured }
  }),
  annual: PAID_PLAN_IDS.map((id) => {
    const p = PRICING_PLANS[id]
    return { name: p.name, price: p.annualPrice, desc: p.tagline, features: p.features, highlight: p.featured }
  }),
}

const stripeLinks: Record<string, string> = {
  'Solo-monthly': 'https://buy.stripe.com/test_3cIbJ291c0Gr3ezaWVa7C00',
  'Solo-annual': 'https://buy.stripe.com/test_aFa6oIa5g3SD3ez8ONa7C01',
  'Crew-monthly': 'https://buy.stripe.com/test_fZu6oI6T488T2av2qpa7C02',
  'Crew-annual': 'https://buy.stripe.com/test_8x24gAdhs2OzdTdfdba7C03',
  'Agency-monthly': 'https://buy.stripe.com/test_3cI7sMb9k0Gr8yTd53a7C04',
  'Agency-annual': 'https://buy.stripe.com/test_3cIbJ2fpAcp902n7KJa7C05',
}

// Fades a section up into view the first time it scrolls into the
// viewport, using the animate-fade-up keyframe already defined in
// styles.css. Starts fully visible (no opacity-0) until after mount, so a
// visitor without JS, or a crawler that doesn't run it, still sees
// everything immediately - the reveal is a bonus for real browsers, not
// something content depends on to appear at all.
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const waitingToReveal = mounted && !visible
  return (
    <div ref={ref} className={`${waitingToReveal ? 'opacity-0' : ''} ${visible ? 'animate-fade-up' : ''} ${className}`}>
      {children}
    </div>
  )
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
        <Link to="/audit" className="text-accent-2 underline decoration-accent-2/50 underline-offset-4 hover:decoration-accent-2">
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
            Small service businesses lose <span className="text-primary-foreground/90 underline decoration-[var(--accent-2)] decoration-4 underline-offset-8">$126,000 a year</span> to missed calls
          </h1>
          <p className="mt-3 text-xs text-ink-muted/70">Source: ServiceTitan analysis of 50,000+ contractor phone lines</p>
          <p className="mt-6 text-lg text-ink-muted max-w-xl mx-auto leading-relaxed">
            Lanavix texts back every missed call in <span className="text-ink-foreground font-medium">60 seconds</span>, gets you 5-star reviews after every job, and finds new leads in your area — running in the background while you're on the job.
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
                <div className="text-xl sm:text-2xl font-mono font-semibold tracking-tight">{s.val}</div>
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
        <Reveal className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              You're working 12-hour days and still losing customers you've already earned
            </h2>
            <p className="mt-4 text-muted-foreground">Every one of these is costing you hundreds of dollars. Every single week.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPoints.map((item) => (
              <div key={item.title} className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center mb-4">
                  <item.icon className="h-4.5 w-4.5 text-foreground/70" />
                </div>
                <p className="font-medium text-sm leading-snug mb-2">{item.title}</p>
                <p className="text-destructive text-xs font-semibold">{item.stat}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground/60">62% stat: 411 Locals, also cited by ServiceTitan</p>
        </Reveal>
      </section>

      {/* SOLUTION */}
      <section id="how-it-works" className="py-24 px-6 bg-secondary/50 border-y border-border">
        <Reveal className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">The solution</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance">
              Three tools that pay for themselves in the first week
            </h2>
            <p className="mt-4 text-muted-foreground">You don't need to be technical to run this. You need about five minutes.</p>
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
                62% of calls to small businesses go unanswered, and missed calls cost small service businesses an average of $126,000 a year.
                <span className="block mt-1.5 text-xs text-muted-foreground/60">Sources: 411 Locals; ServiceTitan analysis of 50,000+ contractor phone lines</span>
              </div>
            </div>
            <TicketCard
              ticketNumber="JT-4471"
              punchBackground="color-mix(in oklab, var(--secondary) 50%, var(--background))"
              className="bg-ink text-ink-foreground p-6 pt-9"
            >
              <p className="text-ink-muted text-[11px] font-semibold uppercase tracking-widest mb-4">Example</p>
              <div className="rounded-sm bg-destructive/15 border border-destructive/30 px-3 py-2.5 text-sm text-[#F0BEB4] mb-2">
                Missed call from (571) 555-0182
              </div>
              <p className="text-ink-muted text-xs text-center my-2 font-mono">Lanavix responds in 00:47</p>
              <div className="rounded-sm bg-white/10 px-3 py-2.5 text-sm mb-2">
                "Hi! This is Peak HVAC. Sorry we missed you — we're on a call right now. What do you need help with? Reply and we'll get you booked today!"
              </div>
              <div className="rounded-sm bg-white/10 px-3 py-2.5 text-sm mb-3">
                Reply: "AC unit not cooling. Can come tomorrow?"
              </div>
              <p className="text-accent-2 text-sm font-semibold text-center">Job booked. $380 revenue saved.</p>
            </TicketCard>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center mb-24">
            <div className="rounded-sm bg-ink text-ink-foreground p-6 md:order-1 order-2">
              <p className="text-ink-muted text-[11px] font-semibold uppercase tracking-widest mb-4">Example</p>
              <div className="rounded-sm bg-white/10 px-3 py-2.5 text-sm mb-2">Job completed for Sarah M.</div>
              <p className="text-ink-muted text-xs text-center my-2 font-mono">2h later</p>
              <div className="rounded-sm bg-white/10 px-3 py-2.5 text-sm mb-2">
                "Hi Sarah! Thanks for choosing us for your AC tune-up. If we did a great job, a quick Google review means the world: [link]"
              </div>
              <div className="rounded-sm bg-white/10 px-3 py-2.5 text-sm mb-3">
                ★★★★★ New 5-star review received
              </div>
              <p className="text-accent-2 text-sm font-semibold text-center">Review #89. Google ranking improved.</p>
            </div>
            <div className="md:order-2 order-1">
              <Star className="h-7 w-7 text-primary mb-5" />
              <p className="text-primary font-semibold text-xs uppercase tracking-widest mb-3">More 5-star reviews, without asking twice</p>
              <h3 className="font-display text-2xl font-bold mb-4">Reputation Autopilot</h3>
              <p className="text-muted-foreground leading-relaxed mb-5">
                After every job, we automatically text your customer a direct Google review link. When a bad review hits, we alert you instantly and write a professional response in 30 seconds.
              </p>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Most people check your reviews before they ever call. Recent 5-star reviews, and a fast reply to a bad one, are what they see first.
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <Target className="h-7 w-7 text-primary mb-5" />
              <p className="text-primary font-semibold text-xs uppercase tracking-widest mb-3">New leads in your area, in under a minute</p>
              <h3 className="font-display text-2xl font-bold mb-4">Local Lead Blast</h3>
              <p className="text-muted-foreground leading-relaxed mb-5">
                Tell us your trade and city. Our AI finds 30 real local businesses that need your service, with the owner's name, phone number, and a personalized opening line ready to send.
              </p>
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Every lead comes from a real Google Places search in your trade and city — never invented, never recycled from someone else's list.
              </div>
            </div>
            <div className="rounded-sm bg-ink text-ink-foreground p-6">
              <p className="text-ink-muted text-[11px] font-semibold uppercase tracking-widest mb-1">Illustrative example — not real businesses</p>
              <p className="text-ink-muted text-xs mb-4">What a Lead Blast looks like — Roofing · Atlanta GA</p>
              {[
                { name: 'Sample: local coffee shop', phone: '404-555-0110', opening: 'Hi, we do commercial roofing in Midtown — coffee shops take a beating with foot traffic and HVAC units on the roof. Happy to do a free inspection.' },
                { name: 'Sample: local gym', phone: '404-555-0234', opening: "Hey, gyms with flat roofs need resealing every few years — especially with all the rooftop equipment. We're local and could take a look for free." },
                { name: 'Sample: local medical office', phone: '404-555-0891', opening: "Hi, medical offices can't afford a leak during business hours. We specialize in commercial roofing in Buckhead and offer same-week inspections." },
              ].map((lead) => (
                <div key={lead.name} className="rounded-sm bg-white/10 px-3 py-2.5 mb-2">
                  <p className="font-medium text-sm mb-1">{lead.name} · <span className="font-mono">{lead.phone}</span></p>
                  <p className="text-ink-muted text-xs">"{lead.opening}"</p>
                </div>
              ))}
              <p className="text-accent-2 text-sm font-semibold text-center mt-3">+27 more leads in a real run. Generated in 34 seconds.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6">
        <Reveal className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Setup takes 5 minutes</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Set it up once. It works forever.</h2>
          <p className="mt-4 text-muted-foreground mb-16">There's no IT team to hire and nothing to maintain — connect it once and it keeps working.</p>
          <div className="flex flex-col sm:flex-row rounded-xl border border-border bg-card text-left mb-16 overflow-hidden">
            {steps.map((step, i) => (
              <div key={step.num} className={`flex-1 p-7 transition-colors hover:bg-accent/30 ${i > 0 ? 'sm:border-l border-border' : ''}`}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-7 w-7 rounded-sm bg-primary text-primary-foreground text-xs font-mono font-bold flex items-center justify-center">{step.num}</span>
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {[
              { val: '<60s', label: 'To reply to missed calls' },
              { val: '5 min', label: 'To connect, no code' },
              { val: 'Founding', label: 'Member pricing, locked in' },
              { val: '30 days', label: 'Money-back guarantee' },
            ].map((s) => (
              <span key={s.val} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground/80">
                <span className="font-semibold text-primary">{s.val}</span> {s.label}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* COMPARISON */}
      <section id="results" className="py-24 px-6 bg-secondary/50 border-y border-border">
        <Reveal className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center mb-14">
            What changes when you use Lanavix
          </h2>
          <div className="space-y-3">
            {beforeAfter.map((row) => (
              <div key={row.before} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <span className="text-sm text-muted-foreground line-through decoration-destructive/40 flex-1">{row.before}</span>
                <ArrowRight className="h-4 w-4 text-accent-2 shrink-0 hidden sm:block" />
                <span className="text-sm text-foreground font-medium flex-1">{row.after}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* EARLY ACCESS */}
      <section className="py-24 px-6">
        <Reveal className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Early access</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance">
            Built for contractors across America — launching now
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto mb-14 leading-relaxed">
            Lanavix is in early access with a small group of local contractors. Founding members lock in current pricing forever and get direct input on what we build next.
          </p>
          <div className="grid sm:grid-cols-3 gap-5 text-left">
            {earlyAccess.map((card) => (
              <div key={card.title} className="rounded-xl border border-border bg-card p-7 transition-colors hover:border-primary/40">
                <card.icon className="h-6 w-6 text-primary mb-4" />
                <h3 className="font-semibold text-base mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-7 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-left max-w-2xl mx-auto">
            <img
              src="/mohib-founder-photo.jpg"
              alt="Mohib Ahmadzai, founder of Lanavix"
              className="h-20 w-20 rounded-full object-cover shrink-0"
            />
            <div>
              <p className="font-semibold text-sm mb-1">Mohib Ahmadzai, founder</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                I built Lanavix because too many contractors lose real business to a missed call or a review that never got a response. Early members can email or text me directly — your feedback shapes exactly what gets built next.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 bg-secondary/50 border-y border-border">
        <Reveal className="max-w-5xl mx-auto text-center">
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
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${billingPeriod === 'annual' ? 'bg-accent-2 text-foreground' : 'bg-accent-2/15 text-accent-2'}`}>Save 20%</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 text-left">
            {pricing[billingPeriod].map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl p-8 flex flex-col bg-card border transition-colors ${plan.highlight ? 'border-primary ring-1 ring-primary/20' : 'border-border hover:border-primary/40'}`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent-2 text-foreground text-xs font-bold px-4 py-1 rounded-full">
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
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6">
        <Reveal className="max-w-2xl mx-auto">
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
                <div className={`grid transition-all duration-300 ease-in-out ${openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section className="section-ink py-24 px-6 text-center">
        <Reveal className="max-w-xl mx-auto">
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
            <span>Setup in 5 minutes</span>
            <span>Founding member pricing</span>
            <span>30-day money-back guarantee</span>
            <span>No credit card to start</span>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
