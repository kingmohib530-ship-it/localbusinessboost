import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const industries = ['HVAC', 'Plumbing', 'Roofing', 'Cleaning', 'Landscaping', 'Electrical', 'Pest Control']
  const [currentIndustry, setCurrentIndustry] = useState(0)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndustry(i => (i + 1) % industries.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const pricing = {
    monthly: [
      {
        name: 'Solo',
        price: 49,
        desc: 'One-person operation getting started with automation',
        features: [
          'Missed Call Text-Back',
          'Review request texts (50/mo)',
          'Local Lead Blast (3 runs/mo)',
          'Email support',
        ],
        cta: 'Start Free Trial',
        highlight: false,
      },
      {
        name: 'Crew',
        price: 99,
        desc: 'Growing business that needs consistent leads and reviews',
        features: [
          'Everything in Solo',
          'Unlimited review requests',
          'Unlimited Lead Blast runs',
          'AI review response writer',
          'Competitor ranking tracker',
          'Priority support',
        ],
        cta: 'Start Free Trial',
        highlight: true,
      },
      {
        name: 'Agency',
        price: 199,
        desc: 'Multi-location operators or contractors managing crews',
        features: [
          'Everything in Crew',
          'Up to 5 locations',
          'Team seat access',
          'Custom AI training on your brand voice',
          'Dedicated success manager',
          'API access + SLA',
        ],
        cta: 'Start Free Trial',
        highlight: false,
      },
    ],
    annual: [
      { name: 'Solo', price: 39, desc: 'One-person operation getting started with automation', features: ['Missed Call Text-Back', 'Review request texts (50/mo)', 'Local Lead Blast (3 runs/mo)', 'Email support'], cta: 'Start Free Trial', highlight: false },
      { name: 'Crew', price: 79, desc: 'Growing business that needs consistent leads and reviews', features: ['Everything in Solo', 'Unlimited review requests', 'Unlimited Lead Blast runs', 'AI review response writer', 'Competitor ranking tracker', 'Priority support'], cta: 'Start Free Trial', highlight: true },
      { name: 'Agency', price: 159, desc: 'Multi-location operators or contractors managing crews', features: ['Everything in Crew', 'Up to 5 locations', 'Team seat access', 'Custom AI training on your brand voice', 'Dedicated success manager', 'API access + SLA'], cta: 'Start Free Trial', highlight: false },
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

  const faqs = [
    {
      q: 'Do I need to be tech-savvy to use this?',
      a: 'Not at all. Setup takes 5 minutes. You give us your phone number and Google Business Profile link — we handle everything else. No apps to install, no code, no training required.',
    },
    {
      q: 'How fast will I see results?',
      a: 'Missed Call Text-Back starts working the moment you connect your number. Most contractors see their first recovered job within the first week. Reviews typically start coming in within 2–3 days of sending your first batch of requests.',
    },
    {
      q: 'Does this work for my trade?',
      a: 'Yes. Lanavix is built for HVAC, plumbing, roofing, electrical, cleaning, landscaping, and pest control. The AI is trained on contractor conversations — not generic business language.',
    },
    {
      q: 'Will it replace my current software?',
      a: 'No. Lanavix runs alongside whatever you already use. It handles the specific jobs that fall through the cracks: missed calls, review follow-ups, and finding new leads nearby.',
    },
    {
      q: "What if I don't like it?",
      a: "You're covered by our 30-day money-back guarantee. If you don't recover at least one job worth more than your monthly fee in the first 30 days, we refund every penny. No questions asked.",
    },
    {
      q: 'How does the free audit work?',
      a: 'Enter your business name and location. Our AI scans your Google profile, review count, response rate, and online presence in about 60 seconds. You get a report showing exactly what\'s costing you customers — no signup required.',
    },
  ]

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#0f0f1a', overflowX: 'hidden', maxWidth: '100vw' }}>

      {/* ANNOUNCEMENT BAR */}
      <div style={{ background: '#1a1a3e', color: '#fff', textAlign: 'center', padding: '10px 16px', fontSize: '13px' }}>
        🚀 <strong>Now in early access</strong> — founding member pricing locked in for life.{' '}
        <Link to="/audit" style={{ color: '#818cf8', textDecoration: 'underline' }}>Claim your spot →</Link>
      </div>

      {/* NAVBAR */}
      <style>{`
        @media (max-width: 860px) {
          .lnvx-nav-links, .lnvx-nav-right { display: none !important; }
          .lnvx-hamburger { display: flex !important; }
          .lnvx-footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: '16px' }}>⚡</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: '18px', color: '#0f0f1a' }}>Lanavix</span>
          </Link>
          <div className="lnvx-nav-links" style={{ display: 'flex', gap: '24px' }}>
            {['Features', 'How It Works', 'Results', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} style={{ color: '#4b5563', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>{item}</a>
            ))}
          </div>
        </div>
        <div className="lnvx-nav-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/auth" style={{ color: '#4b5563', textDecoration: 'none', fontSize: '14px' }}>Sign in</Link>
          <Link to="/audit" style={{ background: '#6366f1', color: '#fff', padding: '8px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>Get Free Audit →</Link>
        </div>
        <button
          className="lnvx-hamburger"
          onClick={() => setMobileMenuOpen(o => !o)}
          aria-label="Toggle menu"
          style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          {mobileMenuOpen ? (
            <span style={{ fontSize: '22px', color: '#0f0f1a' }}>✕</span>
          ) : (
            <span style={{ fontSize: '22px', color: '#0f0f1a' }}>☰</span>
          )}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '64px', zIndex: 99 }}>
          {['Features', 'How It Works', 'Results', 'Pricing'].map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/ /g, '-')}`}
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#374151', textDecoration: 'none', fontSize: '15px', fontWeight: 500, padding: '10px 4px' }}
            >
              {item}
            </a>
          ))}
          <Link to="/auth" onClick={() => setMobileMenuOpen(false)} style={{ color: '#374151', textDecoration: 'none', fontSize: '15px', padding: '10px 4px' }}>
            Sign in
          </Link>
          <Link
            to="/audit"
            onClick={() => setMobileMenuOpen(false)}
            style={{ background: '#6366f1', color: '#fff', padding: '10px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '15px', fontWeight: 600, textAlign: 'center', marginTop: '8px' }}
          >
            Get Free Audit →
          </Link>
        </div>
      )}

      {/* HERO */}
      <section style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1e1b4b 50%, #0f172a 100%)', color: '#fff', padding: '100px 32px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '100px', padding: '6px 16px', marginBottom: '24px' }}>
          <span style={{ width: '8px', height: '8px', background: '#6366f1', borderRadius: '50%', display: 'inline-block' }}></span>
          <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Built for {industries[currentIndustry]}</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, margin: '0 0 24px', maxWidth: '860px', marginLeft: 'auto', marginRight: 'auto' }}>
          Stop Losing <span style={{ color: '#818cf8' }}>$2,000/Week</span><br />to Missed Calls
        </h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.7 }}>
          Lanavix texts back every missed call in <strong style={{ color: '#fff' }}>60 seconds</strong>, gets you 5-star reviews after every job, and finds 30 new leads in your area — all without you lifting a finger.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/audit" style={{ background: '#6366f1', color: '#fff', padding: '16px 32px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '16px' }}>
            Get My Free Business Audit →
          </Link>
          <a href="#how-it-works" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '16px 32px', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '16px', border: '1px solid rgba(255,255,255,0.15)' }}>
            ▶ See How It Works
          </a>
        </div>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '16px' }}>Free audit · No credit card · Takes 60 seconds</p>

        {/* EARLY TRACTION BAR */}
        <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '64px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '28px 40px', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
          {[
            { val: '<60s', label: 'To text back missed calls' },
            { val: '3 tools', label: 'That pay for themselves fast' },
            { val: '$0', label: 'Setup fee, ever' },
            { val: '30-day', label: 'Money-back guarantee' },
          ].map(s => (
            <div key={s.val} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#818cf8' }}>{s.val}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TRUSTED BY */}
      <section style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb', padding: '20px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Built for</span>
          {[['❄️', 'HVAC'], ['🔧', 'Plumbing'], ['🏠', 'Roofing'], ['✨', 'Cleaning'], ['🌿', 'Landscaping'], ['⚡', 'Electrical'], ['🐛', 'Pest Control']].map(([icon, label]) => (
            <span key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '100px', padding: '6px 14px', fontSize: '13px', fontWeight: 500, color: '#374151' }}>{icon} {label}</span>
          ))}
        </div>
      </section>

      {/* PAIN SECTION */}
      <section id="features" style={{ padding: '100px 32px', background: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, maxWidth: '700px', margin: '0 auto 16px' }}>
          You're working 12-hour days and still losing customers you've already earned
        </h2>
        <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '56px' }}>Every one of these is costing you hundreds of dollars. Every single week.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
          {[
            { icon: '🚫', title: "Phone rings while you're on a job", stat: 'Avg. missed job: $450' },
            { icon: '😶', title: "Customers don't leave reviews even when they love you", stat: 'Losing 30% of potential jobs' },
            { icon: '📋', title: 'Leads scattered across phone, Facebook, and voicemail', stat: '40% of leads go cold in 24 hrs' },
            { icon: '⏰', title: 'Following up with leads eats your whole evening', stat: '3–5 hrs/week of your time' },
            { icon: '🔍', title: 'Competitors with more reviews rank above you on Google', stat: 'Invisible to new customers' },
            { icon: '💸', title: "Paying for ads that go to a website that doesn't convert", stat: 'Avg. wasted: $800/month' },
          ].map(item => (
            <div key={item.title} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{item.icon}</div>
              <p style={{ fontWeight: 600, color: '#111827', marginBottom: '8px', fontSize: '15px' }}>{item.title}</p>
              <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>{item.stat}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOLUTION */}
      <section id="how-it-works" style={{ padding: '100px 32px', background: '#f8fafc', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#ede9fe', color: '#6366f1', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '24px' }}>The Solution</div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, maxWidth: '700px', margin: '0 auto 16px' }}>
          Three tools that pay for themselves in the first week
        </h2>
        <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '72px' }}>No setup fees. No tech skills. No training. Just more booked jobs.</p>

        {/* Feature 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', maxWidth: '960px', margin: '0 auto 80px', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>📞</div>
            <p style={{ color: '#6366f1', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Never lose a job to voicemail again</p>
            <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px' }}>Missed Call Text-Back</h3>
            <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: '20px' }}>
              When you're on a roof, under a sink, or driving between jobs — Lanavix texts back every missed call within 60 seconds. AI handles the conversation and books the appointment.
            </p>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', color: '#92400e' }}>
              💡 62% of calls to small businesses go unanswered. Each one is a $200–$2,000 job walking out the door.
            </div>
          </div>
          <div style={{ background: '#1e1b4b', borderRadius: '16px', padding: '24px', textAlign: 'left' }}>
            <p style={{ color: '#818cf8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Example</p>
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '8px', fontSize: '14px', color: '#fca5a5' }}>
              🔴 Missed call from (571) 555-0182
            </div>
            <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>Lanavix responds in 47 seconds</p>
            <div style={{ background: '#6366f1', borderRadius: '8px', padding: '12px', marginBottom: '8px', fontSize: '14px', color: '#fff' }}>
              💬 "Hi! This is Peak HVAC. Sorry we missed you — we're on a call right now. What do you need help with? Reply and we'll get you booked today!"
            </div>
            <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px', fontSize: '14px', color: '#86efac' }}>
              ✅ Reply: "AC unit not cooling. Can come tomorrow?"
            </div>
            <p style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>Job booked. $380 revenue saved.</p>
          </div>
        </div>

        {/* Feature 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', maxWidth: '960px', margin: '0 auto 80px', alignItems: 'center' }}>
          <div style={{ background: '#1e1b4b', borderRadius: '16px', padding: '24px', textAlign: 'left' }}>
            <p style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Example</p>
            <div style={{ background: 'rgba(99,102,241,0.15)', borderRadius: '8px', padding: '12px', marginBottom: '8px', fontSize: '14px', color: '#a5b4fc' }}>
              ✅ Job completed for Sarah M.
            </div>
            <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginBottom: '8px' }}>Lanavix sends review request 2 hours later</p>
            <div style={{ background: '#f59e0b', borderRadius: '8px', padding: '12px', marginBottom: '8px', fontSize: '14px', color: '#fff' }}>
              ⭐ "Hi Sarah! Thanks for choosing us for your AC tune-up. If we did a great job, a quick Google review means the world: [link] 🙏"
            </div>
            <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px', fontSize: '14px', color: '#86efac' }}>
              ★★★★★ New 5-star review received
            </div>
            <p style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>Review #89. Google ranking improved.</p>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>⭐</div>
            <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Double your Google reviews in 90 days</p>
            <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px' }}>Reputation Autopilot</h3>
            <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: '20px' }}>
              After every job, we automatically text your customer a direct Google review link. When a bad review hits, we alert you instantly and write a professional response in 30 seconds.
            </p>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', color: '#92400e' }}>
              💡 Going from 3.8 → 4.5 stars increases calls by 30%. That's the difference between 10 and 13 jobs a week.
            </div>
          </div>
        </div>

        {/* Feature 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', maxWidth: '960px', margin: '0 auto', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>🎯</div>
            <p style={{ color: '#10b981', fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>30 new leads in your area — in 60 seconds</p>
            <h3 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px' }}>Local Lead Blast</h3>
            <p style={{ color: '#6b7280', lineHeight: 1.7, marginBottom: '20px' }}>
              Tell us your trade and city. Our AI finds 30 real local businesses that need your service, with the owner's name, phone number, and a personalized opening line ready to send.
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', color: '#166534' }}>
              💡 The average Lanavix user closes 2–4 jobs from their first Lead Blast. Average job value: $350–$1,800.
            </div>
          </div>
          <div style={{ background: '#1e1b4b', borderRadius: '16px', padding: '24px', textAlign: 'left' }}>
            <p style={{ color: '#10b981', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Example</p>
            <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '16px' }}>Lead Blast results — Roofing · Atlanta GA</p>
            {[
              { name: 'Piedmont Coffee Roasters', phone: '404-291-0110', opening: "Hi, we do commercial roofing in Midtown — coffee shops take a beating with foot traffic and HVAC units on the roof. Happy to do a free inspection." },
              { name: 'Midtown Gym & Fitness', phone: '404-554-0234', opening: "Hey, gyms with flat roofs need resealing every few years — especially with all the rooftop equipment. We're local and could take a look for free." },
              { name: 'Buckhead Medical Spa', phone: '404-887-0891', opening: "Hi, medical offices can't afford a leak during business hours. We specialize in commercial roofing in Buckhead and offer same-week inspections." },
            ].map(lead => (
              <div key={lead.name} style={{ background: 'rgba(99,102,241,0.15)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                <p style={{ color: '#818cf8', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{lead.name} · {lead.phone}</p>
                <p style={{ color: '#64748b', fontSize: '12px' }}>"{lead.opening}"</p>
              </div>
            ))}
            <p style={{ color: '#10b981', fontSize: '13px', fontWeight: 600, textAlign: 'center', marginTop: '12px' }}>+27 more leads. Generated in 34 seconds.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '100px 32px', background: '#fff', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#ede9fe', color: '#6366f1', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '24px' }}>Setup takes 5 minutes</div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, maxWidth: '600px', margin: '0 auto 16px' }}>Set it up once. It works forever.</h2>
        <p style={{ color: '#6b7280', marginBottom: '64px' }}>No IT team. No training. No ongoing work from you.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px', maxWidth: '860px', margin: '0 auto 64px' }}>
          {[
            { num: '01', icon: '🔗', title: 'Connect in 5 minutes', body: 'Add your phone number and Google Business Profile link. That\'s it. No installs, no code, no tech skills.' },
            { num: '02', icon: '🤖', title: 'AI works 24/7 for you', body: 'Missed calls get texted back. Reviews get requested. Leads get found. All automatically, day and night.' },
            { num: '03', icon: '💰', title: 'Open inbox to booked jobs', body: 'Wake up to new conversations, confirmed appointments, and fresh 5-star reviews you didn\'t have to ask for.' },
          ].map(step => (
            <div key={step.num} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#fff', fontWeight: 800, fontSize: '13px' }}>{step.num}</div>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{step.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '12px' }}>{step.title}</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.7 }}>{step.body}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', maxWidth: '700px', margin: '0 auto' }}>
          {[
            { val: '<60s', label: 'To reply to missed calls' },
            { val: '$2k–$8k', label: 'Recovered revenue/month' },
            { val: '2–4 jobs', label: 'From first Lead Blast' },
            { val: '30 days', label: 'Money-back guarantee' },
          ].map(s => (
            <div key={s.val} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#6366f1' }}>{s.val}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section id="results" style={{ padding: '100px 32px', background: '#f8fafc', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, maxWidth: '600px', margin: '0 auto 56px' }}>What changes when you use Lanavix</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ background: '#fff', border: '2px solid #fecaca', borderRadius: '16px', padding: '32px' }}>
            <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '16px', marginBottom: '24px' }}>✗ Without Lanavix</p>
            {['Missed call = lost $400 job', 'Customers forget to leave reviews', 'Leads scattered across 5 places', 'Evenings spent chasing follow-ups', 'Competitors outrank you on Google', "Paying for ads that don't convert"].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', textAlign: 'left' }}>
                <span style={{ color: '#ef4444', fontWeight: 700, flexShrink: 0 }}>✗</span>
                <span style={{ color: '#374151', fontSize: '14px' }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: '2px solid #bbf7d0', borderRadius: '16px', padding: '32px' }}>
            <p style={{ color: '#10b981', fontWeight: 700, fontSize: '16px', marginBottom: '24px' }}>✓ With Lanavix</p>
            {['Every missed call texted back in 60s', 'Reviews arrive after every job, automatically', 'All leads in one simple inbox', 'AI books jobs while you sleep', 'More reviews = higher Google rank = more calls', 'Organic leads from the AI, no ad spend'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', textAlign: 'left' }}>
                <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ color: '#374151', fontSize: '14px' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EARLY ACCESS / SOCIAL PROOF — honest version */}
      <section style={{ padding: '100px 32px', background: '#fff', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#ede9fe', color: '#6366f1', borderRadius: '100px', padding: '6px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '24px' }}>Early Access</div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, maxWidth: '700px', margin: '0 auto 16px' }}>
          Built for contractors in the DMV — launching now
        </h2>
        <p style={{ color: '#6b7280', fontSize: '16px', maxWidth: '560px', margin: '0 auto 56px', lineHeight: 1.7 }}>
          Lanavix is in early access with a small group of local contractors. Founding members lock in current pricing forever and get direct input on what we build next.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', maxWidth: '860px', margin: '0 auto' }}>
          {[
            { icon: '🔒', title: 'Founding member pricing', body: 'Lock in your rate today and never pay more — even as we raise prices for new customers.' },
            { icon: '🎯', title: 'Built for your trade', body: 'Every prompt, every message, every lead search is trained specifically on contractor businesses — not generic small businesses.' },
            { icon: '💬', title: 'Direct line to the team', body: 'Early members get direct access to the founders. Your feedback shapes the product.' },
          ].map(card => (
            <div key={card.title} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px 24px', textAlign: 'left' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{card.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '17px', marginBottom: '10px' }}>{card.title}</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.7 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '100px 32px', background: '#f8fafc', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, margin: '0 0 16px' }}>Simple pricing. Serious results.</h2>
        <p style={{ color: '#6b7280', marginBottom: '40px' }}>Every plan includes a 14-day free trial. Cancel any time.</p>
        <div style={{ display: 'flex', gap: '4px', background: '#e5e7eb', borderRadius: '10px', padding: '4px', width: 'fit-content', margin: '0 auto 56px' }}>
          {(['monthly', 'annual'] as const).map(p => (
            <button key={p} onClick={() => setBillingPeriod(p)} style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px', background: billingPeriod === p ? '#6366f1' : 'transparent', color: billingPeriod === p ? '#fff' : '#6b7280', transition: 'all 0.2s' }}>
              {p === 'monthly' ? 'Monthly' : 'Annual'}{p === 'annual' ? <span style={{ marginLeft: '8px', background: '#10b981', color: '#fff', borderRadius: '100px', padding: '2px 8px', fontSize: '11px' }}>Save 20%</span> : ''}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '960px', margin: '0 auto 48px' }}>
          {pricing[billingPeriod].map(plan => (
            <div key={plan.name} style={{ background: '#fff', border: plan.highlight ? '2px solid #6366f1' : '1px solid #e5e7eb', borderRadius: '16px', padding: '32px', position: 'relative' }}>
              {plan.highlight && <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#fff', borderRadius: '100px', padding: '4px 16px', fontSize: '12px', fontWeight: 700 }}>Most popular</div>}
              <p style={{ fontWeight: 700, fontSize: '13px', color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{plan.name}</p>
              <div style={{ fontSize: '48px', fontWeight: 900, color: '#0f0f1a', marginBottom: '4px' }}><sup style={{ fontSize: '24px' }}>$</sup>{plan.price}<sub style={{ fontSize: '16px', fontWeight: 500, color: '#6b7280' }}>/mo</sub></div>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>{plan.desc}</p>
              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', marginBottom: '24px' }} />
              {plan.features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', textAlign: 'left' }}>
                  <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span>
                  <span style={{ color: '#374151', fontSize: '14px' }}>{f}</span>
                </div>
              ))}
              <a href={stripeLinks[`${plan.name}-${billingPeriod}`] || '#'} style={{ display: 'block', marginTop: '24px', background: plan.highlight ? '#6366f1' : 'transparent', color: plan.highlight ? '#fff' : '#6366f1', border: '2px solid #6366f1', borderRadius: '10px', padding: '14px', fontWeight: 700, fontSize: '15px', textDecoration: 'none', textAlign: 'center' }}>
                Start Free Trial →
              </a>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '32px', maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '40px', flexShrink: 0 }}>🛡️</div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>30-Day Money-Back Guarantee</p>
            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.6 }}>If you don't recover at least one job worth more than your monthly fee in the first 30 days, we'll refund every penny. No questions asked.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '100px 32px', background: '#fff' }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, textAlign: 'center', marginBottom: '56px' }}>Common questions</h2>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', textAlign: 'left', gap: '16px' }}>
                <span style={{ fontWeight: 600, fontSize: '16px', color: '#111827' }}>{faq.q}</span>
                <span style={{ color: '#6366f1', fontSize: '20px', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
              {openFaq === i && (
                <div style={{ paddingBottom: '20px', color: '#6b7280', lineHeight: 1.7, fontSize: '15px' }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1e1b4b 100%)', color: '#fff', padding: '100px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>🚀</div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, maxWidth: '700px', margin: '0 auto 24px', lineHeight: 1.1 }}>
          Find out how many customers you're losing right now — free
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '480px', margin: '0 auto 40px', lineHeight: 1.7 }}>
          Run a free 60-second audit of your website and Google profile. Get your scores and 12 specific fixes — no credit card, no signup required.
        </p>
        <Link to="/audit" style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '18px 40px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '18px' }}>
          Get My Free Business Audit →
        </Link>
        <p style={{ color: '#475569', fontSize: '13px', marginTop: '16px' }}>No signup required · No credit card · 60 seconds · Keep the report</p>
        <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '48px' }}>
          {['🔒 Bank-grade security', '⚡ Setup in 5 minutes', '📋 Results in week 1', '💳 No credit card to start'].map(item => (
            <span key={item} style={{ color: '#64748b', fontSize: '13px' }}>{item}</span>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0f0f1a', color: '#64748b', padding: '64px 32px 32px' }}>
        <div className="lnvx-footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '48px', maxWidth: '960px', margin: '0 auto 48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '14px' }}>⚡</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>Lanavix</span>
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.7, maxWidth: '240px' }}>Your 24/7 AI business team. Built for local service businesses who want more customers without more hours.</p>
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>Product</p>
            {[{ label: 'Features', href: '/#features' }, { label: 'Pricing', href: '/#pricing' }, { label: 'Free Audit', href: '/audit' }, { label: 'Sign In', href: '/auth' }].map(item => (
              <a key={item.label} href={item.href} style={{ display: 'block', color: '#64748b', textDecoration: 'none', fontSize: '14px', marginBottom: '10px' }}>{item.label}</a>
            ))}
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>Company</p>
            {[{ label: 'Contact', href: 'mailto:moh@lanavix.com' }].map(item => (
              <a key={item.label} href={item.href} style={{ display: 'block', color: '#64748b', textDecoration: 'none', fontSize: '14px', marginBottom: '10px' }}>{item.label}</a>
            ))}
          </div>
          <div>
            <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>Legal</p>
            {[{ label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Service', href: '/terms' }].map(item => (
              <a key={item.label} href={item.href} style={{ display: 'block', color: '#64748b', textDecoration: 'none', fontSize: '14px', marginBottom: '10px' }}>{item.label}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '960px', margin: '0 auto', flexWrap: 'wrap', gap: '16px' }}>
          <p style={{ fontSize: '13px' }}>© 2026 Lanavix. All rights reserved.</p>
          <p style={{ fontSize: '13px' }}>Built for the trades. Powered by AI.</p>
        </div>
      </footer>
    </div>
  )
}
