import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import {
  Wrench,
  Briefcase,
  Building2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Rocket,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { saveOnboardingProfile } from "@/lib/onboarding.functions";
import { toast } from "sonner";

// ─── Config ──────────────────────────────────────────────────────────────────

type BusinessType = "local" | "freelancer" | "agency";

const BUSINESS_TYPES: {
  id: BusinessType;
  title: string;
  blurb: string;
  emoji: string;
  Icon: typeof Wrench;
  industrySuggestions: string[];
}[] = [
  {
    id: "local",
    title: "Local Service Business",
    blurb: "Plumber, HVAC, Roofer, Dentist, Salon, Contractor, Restaurant…",
    emoji: "🛠️",
    Icon: Wrench,
    industrySuggestions: [
      "HVAC",
      "Plumbing",
      "Roofing",
      "Dental",
      "Salon / Spa",
      "Auto Repair",
      "Landscaping",
      "Cleaning Services",
    ],
  },
  {
    id: "freelancer",
    title: "Freelancer / Solopreneur",
    blurb: "Designer, Writer, Consultant, Coach, Photographer, Developer…",
    emoji: "💼",
    Icon: Briefcase,
    industrySuggestions: [
      "Graphic Design",
      "Copywriting",
      "Consulting",
      "Coaching",
      "Photography",
      "Web Development",
      "Marketing",
      "Video Editing",
    ],
  },
  {
    id: "agency",
    title: "Small Agency or Other",
    blurb: "Boutique agency, studio, or anything else.",
    emoji: "🏢",
    Icon: Building2,
    industrySuggestions: [
      "Marketing Agency",
      "Creative Studio",
      "PR Firm",
      "Other",
    ],
  },
];

type Goal =
  | "more_leads"
  | "more_bookings"
  | "reactivate"
  | "land_projects"
  | "automate_ops"
  | "other";

const GOALS: { id: Goal; label: string; blurb: string; emoji: string }[] = [
  { id: "more_leads", label: "Get More New Leads / Customers", blurb: "Fill the top of your funnel.", emoji: "🎯" },
  { id: "more_bookings", label: "Book More Appointments / Jobs", blurb: "Turn interest into income.", emoji: "📅" },
  { id: "reactivate", label: "Reactivate Past Customers / Clients", blurb: "Win-back the easy wins.", emoji: "🔁" },
  { id: "land_projects", label: "Land More Freelance Projects", blurb: "Pipeline + proposals + follow-up.", emoji: "🤝" },
  { id: "automate_ops", label: "Automate Daily Operations", blurb: "Set-and-forget the busywork.", emoji: "⚙️" },
  { id: "other", label: "Something Else", blurb: "Describe it in your own words.", emoji: "✏️" },
];

// ─── Smart prompt builder ────────────────────────────────────────────────────

function buildFirstCampaignPrompt(params: {
  businessType: BusinessType;
  goal: Goal;
  goalCustom?: string;
  businessName: string;
  serviceArea: string;
  industry: string;
}) {
  const audience =
    params.businessType === "freelancer"
      ? `a freelance ${params.industry || "service provider"}`
      : params.businessType === "agency"
        ? `a small ${params.industry || "agency"}`
        : `a local ${params.industry || "service"} business`;

  const goalText: Record<Goal, string> = {
    more_leads: `find and qualify NEW ideal-fit leads in ${params.serviceArea || "their service area"}, then prep a first-touch email + SMS sequence`,
    more_bookings: `convert existing leads into BOOKED appointments via follow-up email + SMS and a Cal.com / Calendly booking flow`,
    reactivate: `re-engage past customers/clients with a personalized win-back email + SMS sequence and an irresistible offer`,
    land_projects: `build a freelance client-acquisition system: ideal-client list, outbound DMs/emails, proposal follow-up, and discovery-call booking`,
    automate_ops: `set up "set-and-forget" automations for daily operations: new-lead intake, instant reply, booking, review request`,
    other: params.goalCustom ||
      "design the highest-leverage revenue automation for this business right now",
  };

  return [
    `I run ${audience}${params.businessName ? ` called "${params.businessName}"` : ""}${params.serviceArea ? ` in ${params.serviceArea}` : ""}.`,
    `Build me a complete, ready-to-deploy automation that will ${goalText[params.goal]}.`,
    `Include exact Resend (email), Twilio (SMS), Cal.com/Calendly (booking) and Monday.com (CRM) setup steps in plain English, ready-to-paste templates, a clear Week 1 action plan I can do myself, and a realistic dollar-impact ROI projection.`,
  ].join(" ");
}

// ─── Component ───────────────────────────────────────────────────────────────

export type OnboardingWizardProps = {
  open: boolean;
  onClose: () => void;
  onComplete: (firstCampaignPrompt: string) => void;
};

export function OnboardingWizard({ open, onClose, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalCustom, setGoalCustom] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [industry, setIndustry] = useState("");

  const saveFn = useServerFn(saveOnboardingProfile);
  const saveMut = useMutation({ mutationFn: saveFn });

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const typeMeta = useMemo(
    () => BUSINESS_TYPES.find((b) => b.id === businessType),
    [businessType],
  );

  const canAdvance = (() => {
    if (step === 0) return !!businessType;
    if (step === 1) return !!goal && (goal !== "other" || goalCustom.trim().length > 3);
    if (step === 2)
      return (
        businessName.trim().length > 0 &&
        serviceArea.trim().length > 0 &&
        industry.trim().length > 0
      );
    return true;
  })();

  const reset = () => {
    setStep(0);
    setBusinessType(null);
    setGoal(null);
    setGoalCustom("");
    setBusinessName("");
    setServiceArea("");
    setIndustry("");
  };

  const handleClose = () => {
    onClose();
  };

  const persist = async () => {
    if (!businessType || !goal) return;
    await saveMut.mutateAsync({
      data: {
        business_type: businessType,
        primary_goal: goal === "other" ? `other:${goalCustom}` : goal,
        business_name: businessName,
        service_area: serviceArea,
        industry,
      },
    });
    try {
      localStorage.setItem("lunavx:onboarded", "1");
    } catch {
      // ignore
    }
  };

  const handleSaveForLater = async () => {
    try {
      await persist();
      toast.success("Saved! You can launch your first campaign anytime.");
      reset();
      handleClose();
    } catch {
      toast.error("Couldn't save — please try again.");
    }
  };

  const handleLaunch = async () => {
    if (!businessType || !goal) return;
    try {
      await persist();
      const prompt = buildFirstCampaignPrompt({
        businessType,
        goal,
        goalCustom,
        businessName,
        serviceArea,
        industry,
      });
      toast.success("Your first campaign is launching!");
      reset();
      onComplete(prompt);
    } catch {
      toast.error("Couldn't launch — please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Welcome to LUNAVX</DialogTitle>
              <DialogDescription>
                A quick 30-second setup so your AI team knows how to help you make money.
              </DialogDescription>
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </p>
          </div>
        </DialogHeader>

        {/* ── Step 1 ─────────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold">Who are you?</h3>
            <p className="text-sm text-muted-foreground">
              We'll tune every agent for your world.
            </p>
            <div className="grid gap-3 sm:grid-cols-1">
              {BUSINESS_TYPES.map((b) => {
                const selected = businessType === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBusinessType(b.id)}
                    className={`text-left rounded-xl border p-4 transition ${
                      selected
                        ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30"
                        : "border-border/60 hover:border-border hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{b.emoji}</div>
                      <div className="flex-1">
                        <div className="font-medium">{b.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {b.blurb}
                        </div>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-5 w-5 text-violet-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2 ─────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold">
              What's your biggest goal right now?
            </h3>
            <p className="text-sm text-muted-foreground">
              Pick one — we'll build the perfect first campaign around it.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GOALS.map((g) => {
                const selected = goal === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGoal(g.id)}
                    className={`text-left rounded-lg border p-3 transition ${
                      selected
                        ? "border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30"
                        : "border-border/60 hover:border-border hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg leading-none">{g.emoji}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{g.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {g.blurb}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {goal === "other" && (
              <Textarea
                placeholder="Briefly describe what you want to accomplish…"
                value={goalCustom}
                onChange={(e) => setGoalCustom(e.target.value)}
                rows={3}
              />
            )}
          </div>
        )}

        {/* ── Step 3 ─────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Quick business info</h3>
              <p className="text-sm text-muted-foreground">
                Used to personalize every output. Takes 15 seconds.
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="biz-name">Business / Freelance name</Label>
                <Input
                  id="biz-name"
                  placeholder={
                    businessType === "freelancer"
                      ? "e.g. Jamie Doe Studio"
                      : "e.g. Sunshine HVAC"
                  }
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-area">
                  {businessType === "freelancer"
                    ? "Where are you based / who do you serve?"
                    : "City + State (or main service area)"}
                </Label>
                <Input
                  id="biz-area"
                  placeholder={
                    businessType === "freelancer"
                      ? "Remote — US-based SaaS startups"
                      : "Tampa, FL"
                  }
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-industry">Industry / Main service</Label>
                <Input
                  id="biz-industry"
                  placeholder={typeMeta?.industrySuggestions[0] ?? "e.g. HVAC"}
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  list="industry-suggestions"
                />
                {typeMeta && (
                  <>
                    <datalist id="industry-suggestions">
                      {typeMeta.industrySuggestions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {typeMeta.industrySuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setIndustry(s)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition ${
                            industry === s
                              ? "border-violet-500 bg-violet-500/10 text-violet-200"
                              : "border-border/60 text-muted-foreground hover:bg-accent/30"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4 ─────────────────────────────────────────────────────── */}
        {step === 3 && businessType && goal && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">
                Your first campaign is ready 🎉
              </h3>
              <p className="text-sm text-muted-foreground">
                Your AI workforce will assemble a complete, ready-to-deploy package — leads, copy, automation, and a Week 1 action plan.
              </p>
            </div>
            <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-card/60 to-sky-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Rocket className="h-4 w-4 text-violet-300" />
                Recommended for {businessName || "your business"}
              </div>
              <p className="text-sm text-muted-foreground">
                Goal:{" "}
                <span className="text-foreground font-medium">
                  {GOALS.find((g) => g.id === goal)?.label}
                </span>
              </p>
              {industry && (
                <p className="text-xs text-muted-foreground">
                  Tuned for {industry}
                  {serviceArea ? ` · ${serviceArea}` : ""}
                </p>
              )}
              <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                <li>• Atlas finds ideal-fit leads</li>
                <li>• Pulse writes the outreach (email + SMS)</li>
                <li>• Forge builds the automation in plain English</li>
                <li>• Aether + Vanguard validate & summarize revenue impact</li>
              </ul>
            </Card>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saveMut.isPending}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {step === totalSteps - 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveForLater}
                  disabled={saveMut.isPending}
                >
                  Save for later
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleLaunch}
                  disabled={saveMut.isPending}
                  className="bg-gradient-to-r from-violet-500 to-sky-500 hover:opacity-90"
                >
                  {saveMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4 mr-1.5" />
                  )}
                  Run My First Campaign Now
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                disabled={!canAdvance}
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingWizard;
