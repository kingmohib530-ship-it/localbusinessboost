import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useMountReveal } from "@/hooks/use-mount-reveal";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: pageMeta({
      title: "Refund Policy — Lanavix",
      description: "Lanavix's 30-day money-back guarantee and refund policy.",
      path: "/refund",
    }),
  }),
  component: RefundPage,
});

const SECTIONS = [
  {
    title: "1. 30-Day Money-Back Guarantee",
    body: `If you do not recover at least one job worth more than your monthly fee within 30 days of your first paid month, contact us at moh@lanavix.com for a full refund. This guarantee applies to your first month only and requires that you actively use the platform's core features (Missed Call Text-Back, Reputation Autopilot, or Local Lead Blast) during that period.`,
  },
  {
    title: "2. How to Request a Refund",
    body: `Email moh@lanavix.com with your account email and the reason for your request. We aim to respond within 1 business day. Approved refunds are issued to your original payment method via Stripe and typically appear within 5-10 business days.`,
  },
  {
    title: "3. After the First Month",
    body: `Once you're past your first paid month, we don't provide prorated refunds for unused portions of a billing period. You can cancel anytime from your account settings — cancellation takes effect at the end of your current billing period, and you won't be billed again.`,
  },
  {
    title: "4. Free Trial",
    body: `If your plan includes a free trial period, you will not be charged until the trial ends. Cancel before the trial ends to avoid any charge.`,
  },
  {
    title: "5. Contact",
    body: `Questions about a charge or a refund? Contact us at moh@lanavix.com.`,
  },
];

function RefundPage() {
  const { step, delay } = useMountReveal();

  return (
    <div className="page-dark min-h-screen flex flex-col">
      <SiteNav variant="dark" />
      <div className={`max-w-3xl mx-auto px-6 py-16 flex-1 w-full ${step}`} style={delay(0)}>
        <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2 text-[var(--hd-fg)]">
          Refund Policy
        </h1>
        <p className="text-[var(--hd-muted)] mb-12">Last updated: June 2026</p>

        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-9">
            <h2 className="text-lg font-bold mb-2.5 text-[var(--hd-fg)]">{section.title}</h2>
            <p className="text-[var(--hd-muted)] leading-relaxed text-[15px]">{section.body}</p>
          </div>
        ))}

        <p className="text-sm text-[var(--hd-muted)] mt-4">
          See also our{" "}
          <Link to="/terms" className="text-[var(--hd-primary-2)] hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
      <SiteFooter variant="dark" />
    </div>
  );
}
