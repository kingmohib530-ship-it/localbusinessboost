import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type MouseEvent } from 'react'
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
import { pageMeta } from '@/lib/seo'
import { PRICING_PLANS, PAID_PLAN_IDS } from '@/lib/pricingPlans'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: pageMeta({
      title: 'Lanavix, AI Workforce for Local Contractors',
      description:
        'Lanavix texts back every missed call in 60 seconds, automates 5-star reviews, and finds new local leads, built for HVAC, plumbing, roofing and other trades.',
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
  { icon: ShieldCheck, title: 'Founding member pricing', body: 'Lock in your rate today and never pay more, even as we raise prices for new customers.' },
  { icon: Target, title: 'Built for your trade', body: 'Every prompt, every message, and every lead search is trained specifically on contractor businesses, not generic small businesses.' },
  { icon: Inbox, title: 'Talk to Mohib, not a bot', body: 'Early members get a direct line to the founder: real answers, not a support queue.' },
]

const faqs = [
  { q: 'Do I need to be tech-savvy to use this?', a: "Not at all. Setup takes about five minutes: give us your phone number and your Google Business Profile link, and we take it from there." },
  { q: 'How fast will I see results?', a: "Missed Call Text-Back starts working the second you connect your number. Every missed call gets a reply within 60 seconds from day one. We're in early access, so we don't have enough customers yet to promise a typical timeline for reviews or leads, but the AI is working for you immediately." },
  { q: 'Does this work for my trade?', a: 'Yes. Lanavix is built for HVAC, plumbing, roofing, electrical, cleaning, landscaping, and pest control. The AI is trained on contractor conversations, not generic business language.' },
  { q: 'Will it replace my current software?', a: 'No. Lanavix runs alongside whatever you already use. It handles the specific jobs that fall through the cracks: missed calls, review follow-ups, and finding new leads nearby.' },
  { q: "What if I don't like it?", a: "You're covered by our 30-day money-back guarantee. If you don't recover at least one job worth more than your monthly fee in the first 30 days, we refund every penny. No questions asked." },
  { q: 'How does the free audit work?', a: "Enter your business name and location. Our AI scans your Google profile, review count, response rate, and online presence in about 60 seconds. You get a report showing exactly what's costing you customers. No signup required." },
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

/**
 * Fades a section up into view the first time it scrolls into the
 * viewport, using the hd-blur-in keyframe defined in styles.css. Starts
 * fully visible (no opacity-0) until after mount, so a visitor without JS,
 * or a crawler that doesn't run it, still sees everything immediately. The
 * reveal is a bonus for real browsers, not something content depends on to
 * appear at all.
 */
function useReveal(threshold = 0.15) {
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
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible, waiting: mounted && !visible }
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { ref, visible, waiting } = useReveal()
  return (
    <div ref={ref} className={`${waiting ? 'opacity-0' : ''} ${visible ? 'hd-blur-in' : ''} ${className}`}>
      {children}
    </div>
  )
}

/** A grid item that joins its siblings' scroll-reveal but fades in with a
 * slight incremental delay per index, so a row of cards cascades in rather
 * than appearing as one flat block. */
function StaggerItem({ visible, index, className = '', style, children }: { visible: boolean; index: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div
      className={`${visible ? 'hd-blur-in' : 'opacity-0'} ${className}`}
      style={{ ...(visible ? { animationDelay: `${index * 70}ms` } : {}), ...style }}
    >
      {children}
    </div>
  )
}

/** Tracks the user's OS-level motion preference at runtime, not just via
 * CSS. Needed because the parallax/tilt/magnetic effects below move
 * elements by writing inline transform styles directly from JS on every
 * scroll or pointer event; the CSS reduced-motion overrides in styles.css
 * only catch actual CSS transitions/animations, they can't stop a script
 * from setting style.transform each frame. So every effect that does that
 * checks this flag itself before touching anything. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

/** Drives the hero mockup panel's three pointer/scroll-linked effects at
 * once, since they all end up writing the same element's transform: a
 * scroll-linked parallax drift, a cursor-follow 3D tilt, and the CSS
 * variables a radial-gradient spotlight reads to follow the cursor.
 * Reports a fixed neutral state and skips both listeners entirely under
 * reduced motion, rather than just toning the movement down. Reserved for
 * the hero mockup specifically, kept exclusive so the page reads as alive
 * rather than busy: every other card gets the lighter useCardGlow below. */
function useHeroMockup(reducedMotion: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50 })
  const [parallax, setParallax] = useState(0)

  useEffect(() => {
    if (reducedMotion) {
      setParallax(0)
      return
    }
    let raf = 0
    function onScroll() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2
        setParallax(centerOffset * -0.06)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reducedMotion])

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reducedMotion) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    setTilt({ rx: (0.5 - py) * 8, ry: (px - 0.5) * 8, mx: px * 100, my: py * 100 })
  }
  function onMouseLeave() {
    if (reducedMotion) return
    setTilt({ rx: 0, ry: 0, mx: 50, my: 50 })
  }

  const style: CSSProperties & Record<string, string> = {
    transform: `translateY(${parallax}px) perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
    transition: 'transform 0.15s ease-out',
    '--mx': `${tilt.mx}%`,
    '--my': `${tilt.my}%`,
  }

  return { ref, style, onMouseMove, onMouseLeave }
}

/** A lighter-weight parallax for small decorative elements floating near
 * the hero mockup: each one takes its own speed, so they drift at
 * different rates from both the mockup and each other, real layered
 * depth rather than one element moving on its own. */
function useSimpleParallax(speed: number, reducedMotion: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    if (reducedMotion) {
      setOffset(0)
      return
    }
    let raf = 0
    function onScroll() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2
        setOffset(centerOffset * speed)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [speed, reducedMotion])
  return { ref, offset }
}

/** A button that pulls slightly toward the cursor within its own bounds
 * on hover. Inert under reduced motion: no listener runs at all, so a
 * motion-sensitive visitor never gets pointer-tracked movement regardless
 * of how subtle it is. */
function useMagnetic(reducedMotion: boolean, strength = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reducedMotion) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const relX = e.clientX - (rect.left + rect.width / 2)
    const relY = e.clientY - (rect.top + rect.height / 2)
    setOffset({ x: relX * strength, y: relY * strength })
  }
  function onMouseLeave() {
    if (reducedMotion) return
    setOffset({ x: 0, y: 0 })
  }

  const style: CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }

  return { ref, style, onMouseMove, onMouseLeave }
}

/** A lighter cursor-follow spotlight for regular glass cards: only updates
 * the --mx/--my custom properties a radial-gradient reads, no 3D tilt or
 * parallax. Keeps the hero mockup's fuller effect exclusive to the hero
 * while still giving every other card on the page a subtle, cursor-aware
 * glow rather than a static surface. */
function useCardGlow(reducedMotion: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ mx: 50, my: 50 })

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reducedMotion) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({ mx: ((e.clientX - rect.left) / rect.width) * 100, my: ((e.clientY - rect.top) / rect.height) * 100 })
  }
  function onMouseLeave() {
    if (reducedMotion) return
    setPos({ mx: 50, my: 50 })
  }

  const style: CSSProperties & Record<string, string> = { '--mx': `${pos.mx}%`, '--my': `${pos.my}%` }
  return { ref, style, onMouseMove, onMouseLeave }
}

/** Wraps any card content in the cursor-glow spotlight. The glow overlay
 * sits at a negative z-index so it paints behind the passed-in children
 * without needing an extra positioned wrapper around them, which keeps
 * whatever layout classes the caller passes (flex row, grid, block) acting
 * directly on the real children instead of on a wrapper div. */
function GlowCard({ reducedMotion, className = '', children }: { reducedMotion: boolean; className?: string; children: ReactNode }) {
  const glow = useCardGlow(reducedMotion)
  return (
    <div ref={glow.ref} onMouseMove={glow.onMouseMove} onMouseLeave={glow.onMouseLeave} style={glow.style} className={`relative overflow-hidden ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{ background: 'radial-gradient(320px circle at var(--mx) var(--my), rgba(99,102,241,0.14), transparent 70%)' }}
      />
      {children}
    </div>
  )
}

/** The dense product-mockup shell shared by all three feature walkthroughs:
 * window chrome, a live badge, and a row of stat tiles, with whatever
 * feature-specific content passed as children below. Pulled out once so
 * the three features read as the same real product photographed three
 * times, not three different card styles glued together. */
function FeatureMockup({
  reducedMotion,
  label,
  stats,
  children,
}: {
  reducedMotion: boolean
  label: string
  stats: { label: string; val: string }[]
  children: ReactNode
}) {
  const glow = useCardGlow(reducedMotion)
  return (
    <div
      ref={glow.ref}
      onMouseMove={glow.onMouseMove}
      onMouseLeave={glow.onMouseLeave}
      style={glow.style}
      className="relative rounded-2xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-2xl shadow-2xl shadow-black/30 p-5 overflow-hidden hover-lift-dark"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: 'radial-gradient(400px circle at var(--mx) var(--my), rgba(99,102,241,0.16), transparent 70%)' }}
      />
      <div className="relative">
        <div className="flex items-center gap-1.5 mb-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-[11px] text-[var(--hd-muted)] font-medium">{label}</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-[var(--hd-border)] bg-white/[0.03] px-3 py-2.5">
              <div className="text-sm font-bold text-[var(--hd-fg)]">{s.val}</div>
              <div className="text-[10px] text-[var(--hd-muted)] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        {children}
      </div>
    </div>
  )
}

function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [heroLoaded, setHeroLoaded] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setHeroLoaded(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const industriesReveal = useReveal()
  const painReveal = useReveal()
  const stepsReveal = useReveal()
  const beforeAfterReveal = useReveal()
  const earlyAccessReveal = useReveal()
  const pricingReveal = useReveal()

  const reducedMotion = usePrefersReducedMotion()
  const mockup = useHeroMockup(reducedMotion)
  const chipFar = useSimpleParallax(0.1, reducedMotion)
  const chipNear = useSimpleParallax(-0.05, reducedMotion)
  const magneticPrimary = useMagnetic(reducedMotion, 0.25)
  const magneticSecondary = useMagnetic(reducedMotion, 0.2)

  // Blur-to-focus stagger for the hero's own page-load sequence: each
  // element goes from blurred/faded/offset to sharp on its own animation
  // delay, using the spring/overshoot easing baked into hd-blur-in. Stays
  // at opacity-0 (no animation) until mount so a visitor without JS still
  // sees everything immediately once hydration would normally kick in.
  const heroStep = heroLoaded ? 'hd-blur-in' : 'opacity-0'
  const heroDelay = (i: number) => (heroLoaded ? { animationDelay: `${i * 100}ms` } : undefined)

  return (
    <div className="page-dark min-h-screen">
      {/* Announcement bar */}
      <div className="relative z-10 border-b border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md text-center text-xs sm:text-sm py-2.5 px-4">
        <span className="text-[var(--hd-muted)]">Now in early access.</span>{' '}
        <span className="font-medium text-[var(--hd-fg)]">Founding member pricing locked in for life.</span>{' '}
        <Link to="/audit" className="text-[var(--hd-primary-2)] font-medium underline decoration-[var(--hd-primary-2)]/40 underline-offset-4 hover:decoration-[var(--hd-primary-2)]">
          Claim your spot
        </Link>
      </div>

      <SiteNav variant="dark" />

      {/* HERO — approved dark/glass system, now rolled out to the whole
          page. Background/color come from .page-dark on the outer wrapper;
          this section only adds its own mesh blobs and mockup content. */}
      <section className="relative overflow-hidden">
        {/* Animated gradient mesh: three independently-drifting blurred
            blobs. Frozen entirely under reduced motion (see styles.css). */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="hd-mesh-blob hd-mesh-blob-a" style={{ top: '-10%', left: '-5%', width: 560, height: 560, background: 'var(--hd-primary)', opacity: 0.35 }} />
          <div className="hd-mesh-blob hd-mesh-blob-b" style={{ top: '10%', right: '-10%', width: 480, height: 480, background: 'var(--hd-primary-2)', opacity: 0.28 }} />
          <div className="hd-mesh-blob hd-mesh-blob-c" style={{ bottom: '-15%', left: '30%', width: 520, height: 520, background: '#a855f7', opacity: 0.2 }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 sm:py-28 lg:py-32 grid lg:grid-cols-2 gap-16 items-center">
          {/* Text column */}
          <div className="text-center lg:text-left">
            <div
              className={`inline-flex items-center gap-2 rounded-full border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md px-4 py-1.5 mb-8 ${heroStep}`}
              style={heroDelay(0)}
            >
              <span className="text-xs font-medium tracking-wide text-[var(--hd-muted)]">
                Built for HVAC, plumbing, roofing &amp; the trades
              </span>
            </div>
            <h1
              className={`font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-balance text-[var(--hd-fg)] ${heroStep}`}
              style={heroDelay(1)}
            >
              Small service businesses lose{' '}
              <span className="bg-gradient-to-r from-[var(--hd-primary)] to-[var(--hd-primary-2)] bg-clip-text text-transparent">
                $126,000 a year
              </span>{' '}
              to missed calls
            </h1>
            <p className={`mt-3 text-xs text-[var(--hd-muted)]/70 ${heroStep}`} style={heroDelay(2)}>
              Source: ServiceTitan analysis of 50,000+ contractor phone lines
            </p>
            <p className={`mt-6 text-lg text-[var(--hd-muted)] max-w-xl mx-auto lg:mx-0 leading-relaxed ${heroStep}`} style={heroDelay(3)}>
              Lanavix texts back every missed call in <span className="text-[var(--hd-fg)] font-medium">60 seconds</span>, gets you 5-star reviews after every job, and finds new leads in your area. All running in the background while you're on the job.
            </p>
            <div className={`mt-9 flex flex-wrap items-center justify-center lg:justify-start gap-3 ${heroStep}`} style={heroDelay(4)}>
              <div ref={magneticPrimary.ref} style={magneticPrimary.style} onMouseMove={magneticPrimary.onMouseMove} onMouseLeave={magneticPrimary.onMouseLeave}>
                <Link to="/audit">
                  <Button size="lg" className="h-12 px-7 text-[15px] font-semibold bg-[var(--hd-primary)] hover:bg-[var(--hd-primary)]/90 text-white shadow-lg shadow-[var(--hd-primary)]/25">
                    Get my free business audit <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div ref={magneticSecondary.ref} style={magneticSecondary.style} onMouseMove={magneticSecondary.onMouseMove} onMouseLeave={magneticSecondary.onMouseLeave}>
                <a href="#how-it-works">
                  <Button size="lg" variant="outline" className="h-12 px-7 text-[15px] font-semibold bg-[var(--hd-glass)] backdrop-blur-md border-[var(--hd-border)] text-[var(--hd-fg)] hover:bg-[var(--hd-glass-strong)]">
                    See how it works
                  </Button>
                </a>
              </div>
            </div>
            <p className={`mt-4 text-xs text-[var(--hd-muted)] ${heroStep}`} style={heroDelay(5)}>Free audit &middot; No credit card &middot; Takes 60 seconds</p>

            <div className={`mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto lg:mx-0 ${heroStep}`} style={heroDelay(6)}>
              {[
                { val: '<60s', label: 'To text back missed calls' },
                { val: '3 tools', label: 'That pay for themselves fast' },
                { val: '$0', label: 'Setup fee, ever' },
                { val: '30-day', label: 'Money-back guarantee' },
              ].map((s) => (
                <div key={s.val} className="rounded-lg border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md px-3 py-2.5">
                  <div className="text-lg font-semibold tracking-tight text-[var(--hd-fg)]">{s.val}</div>
                  <div className="text-[11px] text-[var(--hd-muted)] mt-0.5 leading-snug">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup column — dense product screenshot, cursor tilt + glow,
              scroll parallax at a different rate than the text column. */}
          <div className={`relative ${heroStep}`} style={heroDelay(2)}>
            <div
              ref={chipFar.ref}
              className="hidden sm:flex absolute -top-6 -left-6 z-20 items-center gap-2 rounded-full border border-[var(--hd-border)] bg-[var(--hd-glass-strong)] backdrop-blur-md px-3.5 py-2 shadow-lg shadow-black/20"
              style={{ transform: `translateY(${chipFar.offset}px)` }}
            >
              <Star className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              <span className="text-xs font-medium text-[var(--hd-fg)]">4.9 from 200+ jobs</span>
            </div>
            <div
              ref={chipNear.ref}
              className="hidden sm:flex absolute -bottom-5 -right-4 z-20 items-center gap-2 rounded-full border border-[var(--hd-border)] bg-[var(--hd-glass-strong)] backdrop-blur-md px-3.5 py-2 shadow-lg shadow-black/20"
              style={{ transform: `translateY(${chipNear.offset}px)` }}
            >
              <Clock className="h-3.5 w-3.5 text-[var(--hd-primary-2)]" />
              <span className="text-xs font-medium text-[var(--hd-fg)]">47s avg response</span>
            </div>

            <div
              ref={mockup.ref}
              onMouseMove={mockup.onMouseMove}
              onMouseLeave={mockup.onMouseLeave}
              style={mockup.style}
              className="relative rounded-2xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-2xl shadow-2xl shadow-black/40 p-5 overflow-hidden"
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={{ background: 'radial-gradient(400px circle at var(--mx) var(--my), rgba(99,102,241,0.18), transparent 70%)' }}
              />
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 text-[11px] text-[var(--hd-muted)] font-medium">Missed Call Text-Back</span>
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Response time', val: '47s' },
                    { label: 'Booked today', val: '6' },
                    { label: 'Recovered', val: '$2,340' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-[var(--hd-border)] bg-white/[0.03] px-3 py-2.5">
                      <div className="text-sm font-bold text-[var(--hd-fg)]">{s.val}</div>
                      <div className="text-[10px] text-[var(--hd-muted)] mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300 mb-2 flex items-center justify-between">
                  <span>Missed call &middot; (571) 555-0182</span>
                  <span className="text-[10px] text-red-300/70">0:00</span>
                </div>
                <div className="flex gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-[var(--hd-primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--hd-primary-2)] shrink-0">AI</div>
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-[var(--hd-fg)]/90 flex-1">
                    "Hi! This is Peak HVAC, sorry we missed you. What do you need help with?"
                  </div>
                </div>
                <div className="flex gap-2 mb-3 justify-end">
                  <div className="rounded-lg bg-[var(--hd-primary)]/15 border border-[var(--hd-primary)]/25 px-3 py-2 text-xs text-[var(--hd-fg)]/90 max-w-[85%]">
                    "AC not cooling, can you come tomorrow?"
                  </div>
                  <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--hd-muted)] shrink-0">S</div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                  <span className="text-xs font-semibold text-emerald-400">Job booked</span>
                  <span className="text-xs font-bold text-emerald-400">$380</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BUILT FOR */}
      <section ref={industriesReveal.ref} className="border-b border-[var(--hd-border)] py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--hd-muted)] mr-1">Built for</span>
          {industries.map(([Icon, label], i) => (
            <StaggerItem key={label} visible={industriesReveal.visible} index={i} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md px-3 py-1.5 text-xs font-medium text-[var(--hd-fg)]/80 hover-lift-dark">
              <Icon className="h-3.5 w-3.5 text-[var(--hd-primary-2)]" /> {label}
            </StaggerItem>
          ))}
        </div>
      </section>

      {/* PAIN */}
      <section id="features" className="py-24 px-6">
        <Reveal className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance text-[var(--hd-fg)]">
              You're working 12-hour days and still{' '}
              <span className="bg-gradient-to-r from-[var(--hd-primary)] to-[var(--hd-primary-2)] bg-clip-text text-transparent">losing customers</span> you've already earned
            </h2>
            <p className="mt-4 text-[var(--hd-muted)]">Every one of these is costing you hundreds of dollars, every single week.</p>
          </div>
          <div ref={painReveal.ref} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPoints.map((item, i) => (
              <StaggerItem key={item.title} visible={painReveal.visible} index={i}>
                <GlowCard reducedMotion={reducedMotion} className="rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md p-6 hover-lift-dark h-full">
                  <div className="h-9 w-9 rounded-lg bg-white/[0.05] border border-[var(--hd-border)] flex items-center justify-center mb-4">
                    <item.icon className="h-4.5 w-4.5 text-[var(--hd-primary-2)]" />
                  </div>
                  <p className="font-medium text-sm leading-snug mb-2 text-[var(--hd-fg)]">{item.title}</p>
                  <p className="text-red-400 text-xs font-semibold">{item.stat}</p>
                </GlowCard>
              </StaggerItem>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-[var(--hd-muted)]/60">62% stat: 411 Locals, also cited by ServiceTitan</p>
        </Reveal>
      </section>

      {/* SOLUTION */}
      <section id="how-it-works" className="py-24 px-6 bg-[var(--hd-surface)] border-y border-[var(--hd-border)]">
        <Reveal className="max-w-5xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-20">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--hd-primary-2)] mb-3">The solution</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance text-[var(--hd-fg)]">
              Three tools that{' '}
              <span className="bg-gradient-to-r from-[var(--hd-primary)] to-[var(--hd-primary-2)] bg-clip-text text-transparent">pay for themselves</span> in the first week
            </h2>
            <p className="mt-4 text-[var(--hd-muted)]">You don't need to be technical to run this. You need about five minutes.</p>
          </div>

          {/* Feature 1 — Missed Call Text-Back */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center mb-24">
            <div>
              <Phone className="h-7 w-7 text-[var(--hd-primary-2)] mb-5" />
              <p className="text-[var(--hd-primary-2)] font-semibold text-xs uppercase tracking-widest mb-3">Never lose a job to voicemail again</p>
              <h3 className="font-display text-2xl font-bold mb-4 text-[var(--hd-fg)]">Missed Call Text-Back</h3>
              <p className="text-[var(--hd-muted)] leading-relaxed mb-5">
                Whether you're on a roof, under a sink, or driving between jobs, Lanavix texts back every missed call within 60 seconds. AI handles the conversation and books the appointment.
              </p>
              <div className="rounded-lg border border-[var(--hd-border)] bg-[var(--hd-glass)] px-4 py-3 text-sm text-[var(--hd-muted)]">
                62% of calls to small businesses go unanswered, and missed calls cost small service businesses an average of $126,000 a year.
                <span className="block mt-1.5 text-xs text-[var(--hd-muted)]/60">Sources: 411 Locals; ServiceTitan analysis of 50,000+ contractor phone lines</span>
              </div>
            </div>
            <FeatureMockup
              reducedMotion={reducedMotion}
              label="Missed Call Text-Back"
              stats={[
                { label: 'Response time', val: '47s' },
                { label: 'Booked today', val: '6' },
                { label: 'Recovered', val: '$2,340' },
              ]}
            >
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-300 mb-2 flex items-center justify-between">
                <span>Missed call &middot; (571) 555-0182</span>
                <span className="text-[10px] text-red-300/70">0:00</span>
              </div>
              <div className="flex gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-[var(--hd-primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--hd-primary-2)] shrink-0">AI</div>
                <div className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-[var(--hd-fg)]/90 flex-1">
                  "Hi! This is Peak HVAC, sorry we missed you. What do you need help with?"
                </div>
              </div>
              <div className="flex gap-2 mb-3 justify-end">
                <div className="rounded-lg bg-[var(--hd-primary)]/15 border border-[var(--hd-primary)]/25 px-3 py-2 text-xs text-[var(--hd-fg)]/90 max-w-[85%]">
                  "AC not cooling, can you come tomorrow?"
                </div>
                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-[var(--hd-muted)] shrink-0">S</div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                <span className="text-xs font-semibold text-emerald-400">Job booked</span>
                <span className="text-xs font-bold text-emerald-400">$380</span>
              </div>
            </FeatureMockup>
          </div>

          {/* Feature 2 — Reputation Autopilot */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center mb-24">
            <div className="md:order-1 order-2">
              <FeatureMockup
                reducedMotion={reducedMotion}
                label="Reputation Autopilot"
                stats={[
                  { label: 'Avg rating', val: '4.9' },
                  { label: 'Reviews this wk', val: '7' },
                  { label: 'Response rate', val: '98%' },
                ]}
              >
                <div className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-[var(--hd-fg)]/90 mb-2">Job completed for Sarah M.</div>
                <p className="text-[var(--hd-muted)] text-[11px] text-center my-2">Review request sent 2 hours later</p>
                <div className="flex gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-[var(--hd-primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--hd-primary-2)] shrink-0">AI</div>
                  <div className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-[var(--hd-fg)]/90 flex-1">
                    "Hi Sarah! Thanks for choosing us for your AC tune-up. A quick Google review means the world: [link]"
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 mb-2">
                  <span className="text-xs font-semibold text-emerald-400">&#9733;&#9733;&#9733;&#9733;&#9733; New review</span>
                  <span className="text-xs font-bold text-emerald-400">5.0</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-[var(--hd-border)] px-3 py-2">
                  <span className="text-xs text-[var(--hd-muted)]">Review #89</span>
                  <span className="text-xs font-semibold text-[var(--hd-primary-2)]">Ranking improved</span>
                </div>
              </FeatureMockup>
            </div>
            <div className="md:order-2 order-1">
              <Star className="h-7 w-7 text-[var(--hd-primary-2)] mb-5" />
              <p className="text-[var(--hd-primary-2)] font-semibold text-xs uppercase tracking-widest mb-3">More 5-star reviews, without asking twice</p>
              <h3 className="font-display text-2xl font-bold mb-4 text-[var(--hd-fg)]">Reputation Autopilot</h3>
              <p className="text-[var(--hd-muted)] leading-relaxed mb-5">
                After every job, we automatically text your customer a direct Google review link. When a bad review hits, we alert you instantly and write a professional response in 30 seconds.
              </p>
              <div className="rounded-lg border border-[var(--hd-border)] bg-[var(--hd-glass)] px-4 py-3 text-sm text-[var(--hd-muted)]">
                Most people check your reviews before they ever call. Recent 5-star reviews, and a fast reply to a bad one, are what they see first.
              </div>
            </div>
          </div>

          {/* Feature 3 — Local Lead Blast */}
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <Target className="h-7 w-7 text-[var(--hd-primary-2)] mb-5" />
              <p className="text-[var(--hd-primary-2)] font-semibold text-xs uppercase tracking-widest mb-3">New leads in your area, in under a minute</p>
              <h3 className="font-display text-2xl font-bold mb-4 text-[var(--hd-fg)]">Local Lead Blast</h3>
              <p className="text-[var(--hd-muted)] leading-relaxed mb-5">
                Tell us your trade and city. Our AI finds 30 real local businesses that need your service, with the owner's name, phone number, and a personalized opening line ready to send.
              </p>
              <div className="rounded-lg border border-[var(--hd-border)] bg-[var(--hd-glass)] px-4 py-3 text-sm text-[var(--hd-muted)]">
                Every lead comes from a real Google Places search in your trade and city. Never invented, never recycled from someone else's list.
              </div>
            </div>
            <FeatureMockup
              reducedMotion={reducedMotion}
              label="Local Lead Blast"
              stats={[
                { label: 'Leads found', val: '30' },
                { label: 'Verified numbers', val: '30/30' },
                { label: 'Generated in', val: '34s' },
              ]}
            >
              <p className="text-[var(--hd-muted)] text-[10px] mb-2">Illustrative example, not real businesses &middot; Roofing &middot; Atlanta GA</p>
              {[
                { name: 'Sample: local coffee shop', phone: '404-555-0110', opening: 'Coffee shops take a beating with foot traffic and rooftop HVAC units, so I wanted to offer a free inspection.' },
                { name: 'Sample: local gym', phone: '404-555-0234', opening: 'Gyms with flat roofs need resealing every few years, especially with rooftop equipment. We could take a look for free.' },
              ].map((lead) => (
                <div key={lead.name} className="rounded-lg bg-white/[0.04] border border-[var(--hd-border)] px-3 py-2 mb-2">
                  <p className="font-medium text-xs mb-0.5 text-[var(--hd-fg)]/90">{lead.name} &middot; {lead.phone}</p>
                  <p className="text-[var(--hd-muted)] text-[11px]">"{lead.opening}"</p>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 mt-2">
                <span className="text-xs font-semibold text-emerald-400">+27 more leads in a real run</span>
              </div>
            </FeatureMockup>
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6">
        <Reveal className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--hd-primary-2)] mb-3">Setup takes 5 minutes</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--hd-fg)]">Set it up once. It works forever.</h2>
          <p className="mt-4 text-[var(--hd-muted)] mb-16">There's no IT team to hire and nothing to maintain. Connect it once and it keeps working.</p>
          <div ref={stepsReveal.ref} className="flex flex-col sm:flex-row rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md text-left mb-16 overflow-hidden">
            {steps.map((step, i) => (
              <StaggerItem key={step.num} visible={stepsReveal.visible} index={i} className={`flex-1 p-7 transition-colors hover:bg-white/[0.03] ${i > 0 ? 'sm:border-l border-[var(--hd-border)]' : ''}`}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-7 w-7 rounded-lg bg-[var(--hd-primary)] text-white text-xs font-bold flex items-center justify-center">{step.num}</span>
                  <step.icon className="h-5 w-5 text-[var(--hd-primary-2)]" />
                </div>
                <h3 className="font-semibold text-base mb-2 text-[var(--hd-fg)]">{step.title}</h3>
                <p className="text-[var(--hd-muted)] text-sm leading-relaxed">{step.body}</p>
              </StaggerItem>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {[
              { val: '<60s', label: 'To reply to missed calls' },
              { val: '5 min', label: 'To connect, no code' },
              { val: 'Founding', label: 'Member pricing, locked in' },
              { val: '30 days', label: 'Money-back guarantee' },
            ].map((s) => (
              <span key={s.val} className="inline-flex items-center gap-2 rounded-full border border-[var(--hd-border)] bg-[var(--hd-glass)] px-4 py-2 text-xs font-medium text-[var(--hd-fg)]/80">
                <span className="font-semibold text-[var(--hd-primary-2)]">{s.val}</span> {s.label}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* COMPARISON */}
      <section id="results" className="py-24 px-6 bg-[var(--hd-surface)] border-y border-[var(--hd-border)]">
        <Reveal className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-center mb-14 text-[var(--hd-fg)]">
            What changes when you use{' '}
            <span className="bg-gradient-to-r from-[var(--hd-primary)] to-[var(--hd-primary-2)] bg-clip-text text-transparent">Lanavix</span>
          </h2>
          <div ref={beforeAfterReveal.ref} className="space-y-3">
            {beforeAfter.map((row, i) => (
              <StaggerItem key={row.before} visible={beforeAfterReveal.visible} index={i}>
                <GlowCard reducedMotion={reducedMotion} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md p-5 hover-lift-dark">
                  <span className="text-sm text-[var(--hd-muted)] line-through decoration-red-400/40 flex-1">{row.before}</span>
                  <ArrowRight className="h-4 w-4 text-[var(--hd-primary-2)] shrink-0 hidden sm:block" />
                  <span className="text-sm text-[var(--hd-fg)] font-medium flex-1">{row.after}</span>
                </GlowCard>
              </StaggerItem>
            ))}
          </div>
        </Reveal>
      </section>

      {/* EARLY ACCESS */}
      <section className="py-24 px-6">
        <Reveal className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--hd-primary-2)] mb-3">Early access</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance text-[var(--hd-fg)]">
            Built for contractors across America, launching now
          </h2>
          <p className="mt-4 text-[var(--hd-muted)] max-w-lg mx-auto mb-14 leading-relaxed">
            Lanavix is in early access with a small group of local contractors. Founding members lock in current pricing forever and get direct input on what we build next.
          </p>
          <div ref={earlyAccessReveal.ref} className="grid sm:grid-cols-3 gap-5 text-left">
            {earlyAccess.map((card, i) => (
              <StaggerItem key={card.title} visible={earlyAccessReveal.visible} index={i}>
                <GlowCard reducedMotion={reducedMotion} className="rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md p-7 hover-lift-dark h-full">
                  <card.icon className="h-6 w-6 text-[var(--hd-primary-2)] mb-4" />
                  <h3 className="font-semibold text-base mb-2 text-[var(--hd-fg)]">{card.title}</h3>
                  <p className="text-[var(--hd-muted)] text-sm leading-relaxed">{card.body}</p>
                </GlowCard>
              </StaggerItem>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md p-7 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-left max-w-2xl mx-auto">
            <img
              src="/mohib-founder-photo.jpg"
              alt="Mohib Ahmadzai, founder of Lanavix"
              className="h-20 w-20 rounded-full object-cover shrink-0"
            />
            <div>
              <p className="font-semibold text-sm mb-1 text-[var(--hd-fg)]">Mohib Ahmadzai, founder</p>
              <p className="text-[var(--hd-muted)] text-sm leading-relaxed">
                I built Lanavix because too many contractors lose real business to a missed call or a review that never got a response. Early members can email or text me directly, and their feedback shapes exactly what gets built next.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 bg-[var(--hd-surface)] border-y border-[var(--hd-border)]">
        <Reveal className="max-w-5xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-3 text-[var(--hd-fg)]">Simple pricing. Serious results.</h2>
          <p className="text-[var(--hd-muted)] mb-10">Every plan includes a 14-day free trial. Cancel any time.</p>

          <div className="inline-flex items-center bg-[var(--hd-glass)] border border-[var(--hd-border)] backdrop-blur-md rounded-xl p-1 gap-1 mb-14">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${billingPeriod === 'monthly' ? 'bg-[var(--hd-primary)] text-white shadow-sm' : 'text-[var(--hd-muted)] hover:text-[var(--hd-fg)]'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${billingPeriod === 'annual' ? 'bg-[var(--hd-primary)] text-white shadow-sm' : 'text-[var(--hd-muted)] hover:text-[var(--hd-fg)]'}`}
            >
              Annual
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${billingPeriod === 'annual' ? 'bg-white/20' : 'bg-[var(--hd-primary)]/15 text-[var(--hd-primary-2)]'}`}>Save 20%</span>
            </button>
          </div>

          <div ref={pricingReveal.ref} className="grid sm:grid-cols-3 gap-5 text-left">
            {pricing[billingPeriod].map((plan, i) => (
              <StaggerItem key={plan.name} visible={pricingReveal.visible} index={i} className="relative h-full">
                {/* Rendered as a sibling of GlowCard, not inside it: GlowCard
                    needs overflow-hidden to keep its cursor-glow gradient
                    clipped to the rounded corners, which would also clip
                    this badge's intentional overhang above the top edge. */}
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 bg-gradient-to-r from-[var(--hd-primary)] to-[var(--hd-primary-2)] text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-[var(--hd-primary)]/40">
                    Most popular
                  </div>
                )}
                <GlowCard
                  reducedMotion={reducedMotion}
                  className={`rounded-2xl p-8 flex flex-col backdrop-blur-md hover-lift-dark h-full ${
                    plan.highlight
                      ? 'border border-[var(--hd-primary)]/50 bg-gradient-to-b from-[var(--hd-primary)]/[0.14] to-[var(--hd-glass)] shadow-2xl shadow-[var(--hd-primary)]/20 ring-1 ring-[var(--hd-primary)]/30'
                      : 'border border-[var(--hd-border)] bg-[var(--hd-glass)]'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--hd-muted)] mb-2">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-xl font-bold text-[var(--hd-fg)]">$</span>
                    <span className="text-4xl font-extrabold tracking-tight text-[var(--hd-fg)]">{plan.price}</span>
                    <span className="text-[var(--hd-muted)] text-sm">/mo</span>
                  </div>
                  <p className="text-sm text-[var(--hd-muted)] mb-6">{plan.desc}</p>
                  <div className="h-px bg-[var(--hd-border)] mb-6" />
                  <div className="flex flex-col gap-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-[var(--hd-primary-2)] shrink-0 mt-0.5" />
                        <span className="text-[var(--hd-muted)]">{f}</span>
                      </div>
                    ))}
                  </div>
                  <a href={stripeLinks[`${plan.name}-${billingPeriod}`] || '#'}>
                    <Button
                      className={`w-full font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        plan.highlight
                          ? 'bg-[var(--hd-primary)] hover:bg-[var(--hd-primary)]/90 text-white'
                          : 'bg-[var(--hd-glass)] hover:bg-[var(--hd-glass-strong)] border border-[var(--hd-border)] text-[var(--hd-fg)]'
                      }`}
                    >
                      Start free trial <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                </GlowCard>
              </StaggerItem>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-[var(--hd-border)] bg-[var(--hd-glass)] backdrop-blur-md p-7 max-w-xl mx-auto flex items-start gap-4 text-left">
            <ShieldCheck className="h-8 w-8 text-[var(--hd-primary-2)] shrink-0" />
            <div>
              <p className="font-semibold text-sm mb-1 text-[var(--hd-fg)]">30-Day Money-Back Guarantee</p>
              <p className="text-[var(--hd-muted)] text-sm leading-relaxed">If you don't recover at least one job worth more than your monthly fee in the first 30 days, we'll refund every penny. No questions asked.</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6">
        <Reveal className="max-w-2xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12 text-[var(--hd-fg)]">Common questions</h2>
          <div className="flex flex-col">
            {faqs.map((faq, i) => (
              <div key={faq.q} className="border-b border-[var(--hd-border)]">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left rounded-lg px-2 -mx-2 transition-colors hover:bg-white/[0.03]"
                >
                  <span className="font-medium text-sm text-[var(--hd-fg)]">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-[var(--hd-muted)] shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ease-in-out ${openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="pb-5 px-2 text-sm text-[var(--hd-muted)] leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[var(--hd-surface)] border-t border-[var(--hd-border)] py-24 px-6 text-center">
        <Reveal className="max-w-xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance mb-5 text-[var(--hd-fg)]">
            Find out how many customers you're{' '}
            <span className="bg-gradient-to-r from-[var(--hd-primary)] to-[var(--hd-primary-2)] bg-clip-text text-transparent">losing</span> right now. It's free.
          </h2>
          <p className="text-[var(--hd-muted)] leading-relaxed mb-9">
            Run a free 60-second audit of your website and Google profile. Get your scores and 12 specific fixes. No credit card, no signup required.
          </p>
          <Link to="/audit">
            <Button size="lg" className="h-12 px-8 text-[15px] font-semibold bg-[var(--hd-primary)] hover:bg-[var(--hd-primary)]/90 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--hd-primary)]/30">
              Get my free business audit <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-[var(--hd-muted)] text-xs mt-4">No signup required &middot; No credit card &middot; 60 seconds &middot; Keep the report</p>
          <div className="flex flex-wrap gap-6 justify-center mt-12 text-xs text-[var(--hd-muted)]">
            <span>Setup in 5 minutes</span>
            <span>Founding member pricing</span>
            <span>30-day money-back guarantee</span>
            <span>No credit card to start</span>
          </div>
        </Reveal>
      </section>

      <SiteFooter variant="dark" />
    </div>
  )
}
