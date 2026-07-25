import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: pageMeta({
      title: "Terms of Service — Lanavix",
      description: "Lanavix's terms of service: eligibility, SMS compliance, payment terms, and cancellation policy.",
      path: "/terms",
    }),
  }),
  component: TermsPage,
});

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By creating a Lanavix account or using our platform, you agree to these Terms of Service. If you do not agree, do not use the platform. These terms apply to all users of lanavix.com.`,
  },
  {
    title: "2. Description of Service",
    body: `Lanavix provides an AI-powered business automation platform for local service businesses. Features include Missed Call Text-Back (automated SMS replies to missed calls), Reputation Autopilot (automated review request SMS), Local Lead Blast (AI-generated local business leads), and a Free Business Audit tool.`,
  },
  {
    title: "3. Eligibility",
    body: `You must be at least 18 years old to use Lanavix. By using our service, you represent that you are 18 or older and have the authority to enter into this agreement on behalf of your business.`,
  },
  {
    title: "4. Your Responsibilities",
    body: `You are responsible for maintaining the security of your account credentials, ensuring you have appropriate consent from your customers before sending them SMS messages via Lanavix, using the platform in compliance with all applicable laws, and the accuracy of the business information you provide.`,
  },
  {
    title: "5. SMS Messaging Compliance",
    body: `When using Lanavix's SMS features, you must comply with the Telephone Consumer Protection Act (TCPA), CAN-SPAM Act, and all applicable carrier guidelines. You must have prior express consent from recipients before sending marketing messages. Lanavix is not responsible for legal violations resulting from your use of our SMS features.`,
  },
  {
    title: "6. Payment Terms",
    body: `Paid plans are billed monthly or annually in advance. All payments are processed by Stripe. You authorize us to charge your payment method on a recurring basis. Prices may change with 30 days notice to existing subscribers.`,
  },
  {
    title: "7. 30-Day Money-Back Guarantee",
    body: `If you do not recover at least one job worth more than your monthly fee within 30 days of your first paid month, contact us at moh@lanavix.com for a full refund. This guarantee applies to your first month only and requires that you actively use the platform's core features during that period.`,
  },
  {
    title: "8. Cancellation",
    body: `You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period. We do not provide prorated refunds for unused portions of a billing period except under our 30-day guarantee.`,
  },
  {
    title: "9. Intellectual Property",
    body: `Lanavix and its content, features, and functionality are owned by Mohib Ahmadzai and protected by copyright law. You may not copy, modify, or distribute our platform without written permission.`,
  },
  {
    title: "10. Limitation of Liability",
    body: `Lanavix is provided "as is." We do not guarantee that the service will be uninterrupted or error-free. To the maximum extent permitted by law, Lanavix shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.`,
  },
  {
    title: "11. Termination",
    body: `We reserve the right to suspend or terminate your account if you violate these terms, engage in fraudulent activity, or use the platform in a way that harms other users or third parties.`,
  },
  {
    title: "12. Governing Law",
    body: `These terms are governed by the laws of the Commonwealth of Virginia, USA. Any disputes shall be resolved in the courts of Prince William County, Virginia.`,
  },
  {
    title: "13. Contact",
    body: `For questions about these terms, contact us at moh@lanavix.com.`,
  },
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-6 py-16 flex-1 w-full">
        <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-12">Last updated: June 2026</p>

        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-9">
            <h2 className="text-lg font-bold mb-2.5">{section.title}</h2>
            <p className="text-foreground/80 leading-relaxed text-[15px]">{section.body}</p>
          </div>
        ))}

        <p className="text-sm text-muted-foreground mt-4">
          See also our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
