import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useMountReveal } from "@/hooks/use-mount-reveal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: pageMeta({
      title: "Privacy Policy — Lanavix",
      description: "How Lanavix collects, uses, and protects your data.",
      path: "/privacy",
    }),
  }),
  component: PrivacyPage,
});

const SECTIONS = [
  {
    title: "1. Who We Are",
    body: `Lanavix is an AI workforce platform for local service businesses and contractors. We are operated by Mohib Ahmadzai, based in Manassas, Virginia, USA. You can reach us at moh@lanavix.com.`,
  },
  {
    title: "2. Information We Collect",
    body: `We collect information you provide directly when you create an account (name, email address, business name, industry, and phone number), when you use our services (business audit inputs, campaign data, lead information), and automatically through your use of the platform (usage data, IP address, browser type).`,
  },
  {
    title: "3. How We Use Your Information",
    body: `We use your information to provide and improve the Lanavix platform, send automated SMS messages on your behalf (Missed Call Text-Back, Review Requests), generate AI-powered leads and audit reports, communicate with you about your account, and comply with legal obligations.`,
  },
  {
    title: "4. SMS Messaging",
    body: `When you use Lanavix's Missed Call Text-Back or Reputation Autopilot features, our platform sends SMS messages on your behalf to your customers. You are responsible for ensuring you have appropriate consent from your customers to receive these messages. Standard message and data rates may apply.`,
  },
  {
    title: "5. Data Sharing",
    body: `We do not sell your personal data. We share data only with service providers that help us operate the platform (Supabase for database, Telnyx for SMS, Anthropic for AI, Stripe for payments). All providers are contractually required to protect your data.`,
  },
  {
    title: "6. Data Retention",
    body: `We retain your account data for as long as your account is active. If you cancel your account, we will delete your personal data within 30 days upon request, except where we are required to retain it by law.`,
  },
  {
    title: "7. Your Rights",
    body: `You have the right to access, correct, or delete your personal data at any time. To exercise these rights, contact us at moh@lanavix.com. We will respond within 30 days.`,
  },
  {
    title: "8. Security",
    body: `Your account data is protected by database-level Row Level Security policies, so an account can only ever query its own data - this is enforced by the database itself, not just the application. Data is encrypted in transit (HTTPS) and at rest. We never handle your customers' card details directly: all payments are processed by Stripe, which is PCI DSS certified. No system is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    title: "9. Cookies",
    body: `We use essential cookies to keep you logged in and remember your preferences. We do not use advertising or tracking cookies.`,
  },
  {
    title: "10. Changes to This Policy",
    body: `We may update this policy from time to time. We will notify you of significant changes by email or by displaying a notice in the app. Your continued use of Lanavix after changes constitutes your acceptance of the updated policy.`,
  },
  {
    title: "11. Contact",
    body: `For privacy-related questions, contact us at moh@lanavix.com or write to: Lanavix, Manassas, Virginia, USA.`,
  },
];

function PrivacyPage() {
  const { step, delay } = useMountReveal();

  return (
    <div className="page-dark min-h-screen flex flex-col">
      <SiteNav variant="dark" />
      <div className={`max-w-3xl mx-auto px-6 py-16 flex-1 w-full ${step}`} style={delay(0)}>
        <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2 text-[var(--hd-fg)]">
          Privacy Policy
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
