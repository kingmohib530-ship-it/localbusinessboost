import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: pageMeta({
      title: "Cookie Policy — Lanavix",
      description: "How Lanavix uses cookies and local storage.",
      path: "/cookies",
    }),
  }),
  component: CookiesPage,
});

const SECTIONS = [
  {
    title: "1. We Don't Use Tracking or Advertising Cookies",
    body: `Lanavix does not use third-party advertising or analytics cookies to track you across the web. We don't sell your data, and we don't run retargeting ads.`,
  },
  {
    title: "2. What We Actually Use",
    body: `To keep you signed in, Lanavix stores your authentication session in your browser's local storage (not a tracking cookie) via Supabase Auth. This is strictly necessary for the service to function — without it, you'd have to sign in again on every page load.`,
  },
  {
    title: "3. Third-Party Services",
    body: `Payment processing (Stripe) and SMS delivery (Telnyx) may set their own cookies or local storage when you interact directly with their embedded checkout or hosted pages. These are governed by Stripe's and Telnyx's own privacy policies, not this one.`,
  },
  {
    title: "4. Your Choices",
    body: `Because Lanavix only stores what's strictly necessary to keep you signed in, you'll see a one-time notice on your first visit rather than a settings panel — there's nothing to configure, since we don't set optional or tracking cookies. Clearing your browser's local storage will simply sign you out.`,
  },
  {
    title: "5. Contact",
    body: `Questions about this policy? Contact us at moh@lanavix.com.`,
  },
];

function CookiesPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteNav />
      <div className="max-w-3xl mx-auto px-6 py-16 flex-1 w-full">
        <h1 className="lv-display text-[28px] text-foreground mb-1">Cookie Policy</h1>
        <p className="lv-meta text-muted-foreground mb-10">Last updated: June 2026</p>

        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-8">
            <h2 className="lv-section text-foreground mb-2">{section.title}</h2>
            <p className="lv-body text-muted-foreground leading-relaxed">{section.body}</p>
          </div>
        ))}

        <p className="lv-meta text-muted-foreground mt-4">
          See also our{" "}
          <Link to="/privacy" className="text-primary underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
