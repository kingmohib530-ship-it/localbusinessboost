import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: pageMeta({
      title: "FAQ — Lanavix",
      description: "Answers to common questions about Lanavix: setup, pricing, SMS compliance, cancellation, and refunds.",
      path: "/faq",
    }),
  }),
  component: FaqPage,
});

const FAQS: [string, string][] = [
  ["Is there really a free trial?", "Yes — 14 days free on every plan (Solo, Crew, Agency). No credit card required to start."],
  ["How long does setup take?", "Most businesses are up and running in about 5 minutes: connect your phone number and Google Business Profile, and Lanavix starts answering missed calls right away."],
  ["Can I customize how Lanavix talks to my customers?", "Yes. You can set your business hours, greeting message, and escalation rules from the Receptionist settings in your dashboard."],
  ["Is texting customers back with Lanavix TCPA-compliant?", "You're responsible for complying with the Telephone Consumer Protection Act (TCPA), CAN-SPAM, and applicable carrier guidelines when using Lanavix's SMS features — see our Terms of Service for details. Lanavix sends transactional, business-initiated replies (missed-call text-backs, review requests you trigger), not marketing blasts."],
  ["Can I switch plans?", "Yes, any time from your account settings. Upgrades take effect immediately; downgrades take effect at the end of your current billing period."],
  ["Can I cancel?", "Yes, any time from your account settings. Cancellation takes effect at the end of your current billing period — no long-term contract."],
  ["Do you offer refunds?", "Yes — a 30-day money-back guarantee on your first paid month if you don't recover at least one job worth more than your monthly fee. See our Refund Policy for details."],
  ["Is my data safe?", "All data is encrypted at rest and in transit. We never sell your data. Your information belongs to you — see our Privacy Policy."],
  ["What happens to leads I generate?", "Leads you research or capture are stored under your account only — Row Level Security ensures other Lanavix customers can never see your leads or conversations."],
  ["Who do I contact for support?", "Email moh@lanavix.com, or use the contact form."],
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <section className="py-24 px-6 border-b border-border bg-secondary/50 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">FAQ</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Common questions
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Can't find what you're looking for?{" "}
          <Link to="/chat" className="text-primary underline hover:no-underline">Talk to us</Link>.
        </p>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto flex flex-col">
          {FAQS.map(([q, a], i) => (
            <details key={i} className="border-b border-border group">
              <summary className="flex justify-between items-center gap-4 py-5 cursor-pointer font-medium text-sm list-none">
                {q}
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
