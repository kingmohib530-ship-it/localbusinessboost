import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  CalendarCheck,
  RotateCcw,
  Rocket,
  TrendingUp,
  Mail,
  CalendarRange,
  DollarSign,
  Sparkles,
  Briefcase,
  FileText,
  HeartHandshake,
  Megaphone,
  Store,
  type LucideIcon,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// One-Click Campaigns — split by audience
// ─────────────────────────────────────────────────────────────────────────────
export type Audience = "local" | "freelancer";

export type CampaignTemplate = {
  id: string;
  audience: Audience;
  title: string;
  tagline: string;
  outcome: string;
  agents: string[];
  icon: LucideIcon;
  gradient: string;
  prompt: string;
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // ─── Local service businesses ────────────────────────────────────────────
  {
    id: "more-local-leads",
    audience: "local",
    title: "Get More Local Leads",
    tagline: "Atlas finds new local prospects + syncs them straight into your CRM.",
    outcome: "+15-25 ready-to-call leads",
    agents: ["Atlas", "Nexus", "Shield"],
    icon: Users,
    gradient: "from-emerald-500 to-teal-500",
    prompt:
      "Find 20 high-quality local business leads for my business. Include emails, phone numbers, websites, and a quick market read on the top competitors so I know how to position my pitch. Sync everything to Monday.com so I can start calling today.",
  },
  {
    id: "follow-up",
    audience: "local",
    title: "Follow-up & Book More Jobs",
    tagline: "Forge + Pulse build the email/SMS sequence that turns leads into appointments.",
    outcome: "+30-50% booked jobs",
    agents: ["Pulse", "Forge", "Shield"],
    icon: CalendarCheck,
    gradient: "from-sky-500 to-blue-600",
    prompt:
      "Build me a set-and-forget follow-up system for my local service business: instant SMS when a lead comes in, a 5-touch email + SMS nurture over 14 days, and an easy booking link. Give me ready-to-paste templates and a Week 1 action plan I can actually do without hiring a developer.",
  },
  {
    id: "reactivate",
    audience: "local",
    title: "Reactivate Past Customers",
    tagline: "Win-back campaign that turns dead contacts into seasonal revenue.",
    outcome: "+$3k-$10k from past customers",
    agents: ["Pulse", "Forge", "Shield"],
    icon: RotateCcw,
    gradient: "from-amber-500 to-orange-600",
    prompt:
      "Create a reactivation campaign for past customers I haven't talked to in 6+ months. Include a 3-email sequence, 2 SMS touches, a seasonal offer, a Calendly booking link, and an automated Google review request after the job. Make it sound friendly, not salesy.",
  },
  {
    id: "local-full-stack",
    audience: "local",
    title: "Full Automated Sales System",
    tagline: "The whole AI workforce — leads → nurture → booking → reviews → ROI.",
    outcome: "End-to-end revenue engine",
    agents: ["Atlas", "Nexus", "Pulse", "Forge", "Shield"],
    icon: Rocket,
    gradient: "from-violet-600 to-fuchsia-600",
    prompt:
      "Build me a complete end-to-end automated sales system for my local service business: capture leads, nurture with email + SMS, book appointments on Cal.com, and ask for Google reviews after the job. Include exact Resend, Twilio, Cal.com, and Monday.com setup steps, ready-to-paste templates, a Week 1 action plan, and realistic dollar-impact ROI projections.",
  },
  // ─── Freelancers & solopreneurs ──────────────────────────────────────────
  {
    id: "land-clients",
    audience: "freelancer",
    title: "Land More Freelance Clients",
    tagline: "Atlas finds ideal-client companies + Pulse writes the pitch.",
    outcome: "+10-20 warm reply-ready prospects",
    agents: ["Atlas", "Nexus", "Pulse", "Shield"],
    icon: Briefcase,
    gradient: "from-indigo-500 to-purple-600",
    prompt:
      "I'm a freelancer. Find 20 ideal-client companies that typically hire someone in my niche (founders, marketing leads, ops managers). Include emails and websites. Then write a peer-to-peer cold pitch email + 2 follow-ups + a LinkedIn DM variant — consultative, not agency-y. Sync the list to Monday.com.",
  },
  {
    id: "proposal-followup",
    audience: "freelancer",
    title: "Automated Proposal & Follow-up System",
    tagline: "Never let a hot proposal go cold again.",
    outcome: "+25-40% proposal close-rate",
    agents: ["Pulse", "Forge", "Shield"],
    icon: FileText,
    gradient: "from-cyan-500 to-sky-600",
    prompt:
      "Build me a proposal follow-up automation as a freelancer: discovery-call booking on Cal.com → proposal sent → 4-touch follow-up sequence over 10 days (email + optional SMS) → Stripe Payment Link for the deposit → contract signed → onboarding email. Give me ready-to-paste templates and a clear Week 1 setup checklist.",
  },
  {
    id: "onboarding-upsell",
    audience: "freelancer",
    title: "Client Onboarding & Upsell Automation",
    tagline: "Turn one-off projects into recurring retainers on autopilot.",
    outcome: "+1-3 retainer conversions / mo",
    agents: ["Pulse", "Forge", "Shield"],
    icon: HeartHandshake,
    gradient: "from-rose-500 to-pink-600",
    prompt:
      "Design a client onboarding + upsell automation for my freelance business: welcome email, kickoff questionnaire, weekly check-in template, mid-project satisfaction nudge, project-wrap testimonial request, and a 30-day upsell email pitching a monthly retainer with a Stripe Payment Link. Make it feel warm and consultative.",
  },
  {
    id: "lead-magnet",
    audience: "freelancer",
    title: "Content & Lead Magnet Machine",
    tagline: "Build the inbound funnel that brings clients while you sleep.",
    outcome: "Passive inbound pipeline",
    agents: ["Nexus", "Pulse", "Forge", "Shield"],
    icon: Megaphone,
    gradient: "from-fuchsia-500 to-violet-600",
    prompt:
      "Help me build a lead-magnet funnel as a freelancer/solopreneur: pick a high-intent lead magnet idea for my niche, write the landing-page copy, a 5-email nurture sequence that ends in a discovery-call CTA, 3 social posts to promote it, and the Resend + Cal.com + Stripe setup so it runs on autopilot.",
  },
];

const AUDIENCES: { id: Audience; label: string; sub: string; icon: LucideIcon }[] = [
  {
    id: "local",
    label: "For Local Service Businesses",
    sub: "Get Leads → Book Jobs → Automate Follow-ups",
    icon: Store,
  },
  {
    id: "freelancer",
    label: "For Freelancers & Solopreneurs",
    sub: "Get Clients → Send Proposals → Nurture → Passive Income",
    icon: Briefcase,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Templates grid (split into two audience sections)
// ─────────────────────────────────────────────────────────────────────────────
export function AutomationTemplates({
  onLaunch,
  disabled,
  activeId,
}: {
  onLaunch: (template: CampaignTemplate) => void;
  disabled?: boolean;
  activeId?: string;
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          One-Click Campaigns
        </h3>
        <Badge variant="outline" className="ml-1 text-[10px]">
          Your AI employees, ready to go
        </Badge>
      </div>

      {AUDIENCES.map((aud) => {
        const items = CAMPAIGN_TEMPLATES.filter((t) => t.audience === aud.id);
        const AudIcon = aud.icon;
        return (
          <section key={aud.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <AudIcon className="h-4 w-4 text-primary" />
              <div>
                <h4 className="text-base font-semibold">{aud.label}</h4>
                <p className="text-xs text-muted-foreground">{aud.sub}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((t) => {
                const Icon = t.icon;
                const isActive = activeId === t.id;
                return (
                  <Card
                    key={t.id}
                    className={`group relative overflow-hidden border-border/60 bg-card/60 transition hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 ${
                      isActive ? "ring-2 ring-primary/60" : ""
                    }`}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.gradient}`}
                      aria-hidden
                    />
                    <CardContent className="flex h-full flex-col gap-4 p-5">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.gradient} shadow-lg`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-semibold leading-tight">{t.title}</h4>
                          <p className="mt-1 text-xs text-muted-foreground">{t.tagline}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {t.agents.map((a) => (
                          <Badge key={a} variant="secondary" className="text-[10px]">
                            {a}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-auto space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {t.outcome}
                        </div>
                        <Button
                          size="lg"
                          disabled={disabled}
                          onClick={() => onLaunch(t)}
                          className={`w-full bg-gradient-to-r ${t.gradient} text-sm font-semibold text-white hover:opacity-90`}
                        >
                          <Rocket className="mr-2 h-4 w-4" />
                          Launch Campaign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Tracker (estimated impact)
// ─────────────────────────────────────────────────────────────────────────────
export type ResultsMetrics = {
  leadsGenerated: number;
  emailsReady: number;
  estimatedBookings: number;
  projectedRevenueUsd: number;
};

export function ResultsTracker({
  metrics,
  status,
}: {
  metrics: ResultsMetrics;
  status?: "idle" | "active";
}) {
  const stats: { label: string; value: string; icon: LucideIcon; tint: string }[] = [
    {
      label: "Leads / Prospects",
      value: metrics.leadsGenerated.toLocaleString(),
      icon: Users,
      tint: "text-emerald-400",
    },
    {
      label: "Emails / SMS Ready",
      value: metrics.emailsReady.toLocaleString(),
      icon: Mail,
      tint: "text-sky-400",
    },
    {
      label: "Est. Bookings (30d)",
      value: metrics.estimatedBookings.toLocaleString(),
      icon: CalendarRange,
      tint: "text-amber-400",
    },
    {
      label: "Projected Revenue",
      value: `$${metrics.projectedRevenueUsd.toLocaleString()}`,
      icon: DollarSign,
      tint: "text-violet-400",
    },
  ];

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/40">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Results Tracker</h3>
            <p className="text-xs text-muted-foreground">
              Live estimate of what this campaign will deliver.
            </p>
          </div>
          {status === "active" ? (
            <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
              <span className="mr-1.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Campaign Active
            </Badge>
          ) : (
            <Badge variant="outline">Idle</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-xl border border-border/40 bg-background/40 p-3"
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <Icon className={`h-3.5 w-3.5 ${s.tint}`} />
                  {s.label}
                </div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
