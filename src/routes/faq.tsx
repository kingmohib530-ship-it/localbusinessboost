import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: pageMeta({
      title: "FAQ — Lanavix",
      description:
        "Answers to common questions about Lanavix: setup, how the receptionist works, pricing, trial, cancellation, and refunds.",
      path: "/faq",
    }),
  }),
  component: FaqPage,
});

const FAQS: [string, string][] = [
  [
    "What happens when Lanavix handles a call?",
    "When a call is missed, Lanavix texts the caller back within 60 seconds, holds the conversation, and can book an appointment on your calendar — using your real business hours, services, and pricing.",
  ],
  [
    "Can I take over a conversation?",
    "Yes. Every conversation is visible in your Inbox in real time, and you can jump in and reply yourself at any point.",
  ],
  [
    "What does the Receptionist actually know?",
    "Only what you've confirmed: your services, pricing, hours, and service area, set up during onboarding or synced from your Google Business Profile and website. It doesn't invent answers about your business.",
  ],
  [
    "What if it doesn't know an answer?",
    "It says so honestly instead of guessing, and flags the conversation so you can follow up personally.",
  ],
  [
    "Does Lanavix book appointments?",
    "Yes. When a customer is ready, the Receptionist can put the job on your calendar directly.",
  ],
  [
    "How do review responses work?",
    "After a job's marked complete, we text the customer a direct link to leave a Google review. If a review comes in, our AI can draft a response for you to review and send.",
  ],
  [
    "How does the 14-day trial work?",
    "Every plan includes a 14-day free trial. A payment method is collected at checkout, but you're not charged until the trial ends. Cancel before then and there's no charge.",
  ],
  [
    "Is a credit card required?",
    "Yes — a payment method is required to start the trial, even though you won't be charged until it ends.",
  ],
  [
    "How does cancellation work?",
    "Email moh@lanavix.com and we'll cancel your subscription. Access continues through the end of your current billing period, and you won't be billed again after that. Self-serve cancellation isn't available yet.",
  ],
  [
    "Can I upgrade or downgrade?",
    "Not self-serve yet. Email moh@lanavix.com and we'll switch your plan manually — this avoids any risk of being billed for two overlapping plans at once.",
  ],
  [
    "What does the guarantee cover?",
    "Your first paid month: if you don't recover at least one job worth more than your monthly fee while actively using Missed-Call Text-Back, Reputation Autopilot, or Lead Generator, email us for a full refund. See our Refund Policy for the exact terms.",
  ],
  [
    "How long does setup take?",
    "Most businesses are up and running in about five minutes: connect your phone number and Google Business Profile, and Lanavix starts answering missed calls right away.",
  ],
  [
    "Is texting customers with Lanavix TCPA-compliant?",
    "You're responsible for complying with the Telephone Consumer Protection Act (TCPA), CAN-SPAM, and applicable carrier guidelines when using Lanavix's SMS features — see our Terms of Service for details. Lanavix sends transactional, business-initiated replies (missed-call text-backs, review requests you trigger), not marketing blasts.",
  ],
  [
    "Is my data safe?",
    "All data is encrypted at rest and in transit. We never sell your data. Row Level Security ensures other Lanavix customers can never see your leads or conversations — see our Privacy Policy.",
  ],
  ["Who do I contact for support?", "Email moh@lanavix.com, or use the contact form."],
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />

      <section className="py-16 md:py-20 px-6 border-b border-border text-center">
        <p className="lv-label text-primary mb-2">FAQ</p>
        <h1 className="lv-display text-[30px] md:text-[36px] text-foreground mb-3">
          Common questions
        </h1>
        <p className="lv-body text-muted-foreground max-w-xl mx-auto">
          Can't find what you're looking for?{" "}
          <Link to="/chat" className="text-primary underline underline-offset-2">
            Talk to us
          </Link>
          .
        </p>
      </section>

      <section className="py-16 md:py-20 px-6">
        <div className="max-w-2xl mx-auto flex flex-col">
          {FAQS.map(([q, a]) => (
            <details key={q} className="border-b border-border group">
              <summary className="flex justify-between items-center gap-4 py-5 cursor-pointer lv-body font-medium list-none text-foreground min-h-[44px]">
                {q}
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="pb-5 lv-body text-muted-foreground leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
