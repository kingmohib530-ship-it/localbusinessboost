import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/seo";
import { useMountReveal } from "@/hooks/use-mount-reveal";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: pageMeta({
      title: "FAQ — Lanavix",
      description:
        "Answers to common questions about Lanavix: setup, pricing, SMS compliance, cancellation, and refunds.",
      path: "/faq",
    }),
  }),
  component: FaqPage,
});

const FAQS: [string, string][] = [
  [
    "Is there really a free trial?",
    "Yes — 14 days free on every plan (Solo, Crew, Agency). No credit card required to start.",
  ],
  [
    "How long does setup take?",
    "Most businesses are up and running in about 5 minutes: connect your phone number and Google Business Profile, and Lanavix starts answering missed calls right away.",
  ],
  [
    "Can I customize how Lanavix talks to my customers?",
    "Yes. You can set your business hours, greeting message, and escalation rules from the Receptionist settings in your dashboard.",
  ],
  [
    "Is texting customers back with Lanavix TCPA-compliant?",
    "You're responsible for complying with the Telephone Consumer Protection Act (TCPA), CAN-SPAM, and applicable carrier guidelines when using Lanavix's SMS features — see our Terms of Service for details. Lanavix sends transactional, business-initiated replies (missed-call text-backs, review requests you trigger), not marketing blasts.",
  ],
  [
    "Can I switch plans?",
    "Yes, any time from your account settings. Upgrades take effect immediately; downgrades take effect at the end of your current billing period.",
  ],
  [
    "Can I cancel?",
    "Yes, any time from your account settings. Cancellation takes effect at the end of your current billing period — no long-term contract.",
  ],
  [
    "Do you offer refunds?",
    "Yes — a 30-day money-back guarantee on your first paid month if you don't recover at least one job worth more than your monthly fee. See our Refund Policy for details.",
  ],
  [
    "Is my data safe?",
    "All data is encrypted at rest and in transit. We never sell your data. Your information belongs to you — see our Privacy Policy.",
  ],
  [
    "What happens to leads I generate?",
    "Leads you research or capture are stored under your account only — Row Level Security ensures other Lanavix customers can never see your leads or conversations.",
  ],
  ["Who do I contact for support?", "Email moh@lanavix.com, or use the contact form."],
];

function FaqPage() {
  const { step, delay } = useMountReveal();

  return (
    <div className="page-dark min-h-screen flex flex-col">
      <SiteNav variant="dark" />

      <section className="relative overflow-hidden py-24 px-6 border-b border-[var(--hd-border)] bg-[var(--hd-surface)] text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="hd-mesh-blob hd-mesh-blob-a"
            style={{
              top: "-20%",
              left: "10%",
              width: 420,
              height: 420,
              background: "var(--hd-primary)",
              opacity: 0.22,
            }}
          />
          <div
            className="hd-mesh-blob hd-mesh-blob-b"
            style={{
              top: "-10%",
              right: "5%",
              width: 380,
              height: 380,
              background: "var(--hd-primary-2)",
              opacity: 0.18,
            }}
          />
        </div>
        <div className={`relative z-10 ${step}`} style={delay(0)}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--hd-primary-2)] mb-3">
            FAQ
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[var(--hd-fg)]">
            Common questions
          </h1>
          <p className="text-lg text-[var(--hd-muted)] max-w-xl mx-auto">
            Can't find what you're looking for?{" "}
            <Link to="/chat" className="text-[var(--hd-primary-2)] underline hover:no-underline">
              Talk to us
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto flex flex-col">
          {FAQS.map(([q, a], i) => (
            <details key={i} className="border-b border-[var(--hd-border)] group">
              <summary className="flex justify-between items-center gap-4 py-5 cursor-pointer font-medium text-sm list-none text-[var(--hd-fg)]">
                {q}
                <ChevronDown className="h-4 w-4 text-[var(--hd-muted)] shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="pb-5 text-sm text-[var(--hd-muted)] leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter variant="dark" />
    </div>
  );
}
