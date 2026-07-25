/**
 * LUNAVX — Server-only AI agent definitions for LOCAL BUSINESS SERVICES.
 *
 * The six agents (Orbis, Atlas, Nexus, Pulse, Forge, Shield) collaborate to
 * generate leads, research markets, write outreach, design automations, and
 * QC the result. Atlas additionally syncs every generated lead to the user's
 * Monday.com board via `createMondayItem` (column IDs match the board schema).
 *
 * Public entry point: `runLunavxWorkflow(userRequest)` — Orbis plans, then
 * the planned agents execute sequentially with context passing.
 *
 * All AI calls go directly to the Anthropic API (same provider used by
 * api/lead-blast.ts and api/review-response.ts). This file is server-only
 * (process.env access).
 */

import { createMondayItem } from "./monday.server";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

/** Inter-agent pause to stay polite with the AI gateway. */
const AGENT_DELAY_MS = 900;

/** Hard cap on context size injected into each agent call. */
const MAX_CONTEXT_CHARS = 6000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Agent registry & metadata
// ─────────────────────────────────────────────────────────────────────────────

export type AgentName =
  | "Orbis"
  | "Atlas"
  | "Nexus"
  | "Pulse"
  | "Forge"
  | "Shield"
  | "Aether"
  | "Vanguard";

const ALL_AGENTS: readonly AgentName[] = [
  "Orbis",
  "Atlas",
  "Nexus",
  "Pulse",
  "Forge",
  "Shield",
  "Aether",
  "Vanguard",
];

export const AGENT_META: Record<AgentName, { role: string; description: string }> = {
  Orbis: {
    role: "Strategy Engine",
    description: "Plans workflows across the other agents.",
  },
  Atlas: {
    role: "Lead Intelligence",
    description: "Generates realistic leads and syncs them to Monday.com.",
  },
  Nexus: {
    role: "Market Intelligence",
    description: "Local competitor research, service-area insights, and opportunities.",
  },
  Pulse: {
    role: "Copywriting Engine",
    description: "Cold emails, SMS, posts, ads, DMs, proposals.",
  },
  Forge: {
    role: "Automation Builder",
    description: "Designs lead-capture, follow-up, and booking automation flows.",
  },
  Shield: {
    role: "Quality Control",
    description: "Validates outputs for accuracy, deliverability, and fit.",
  },
  Aether: {
    role: "Final Orchestrator (Boss)",
    description: "Reviews the full plan and polishes the final user-facing summary.",
  },
  Vanguard: {
    role: "Executive QC & Validator",
    description: "Final realism, legal, deliverability and revenue check before user sees it.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// System prompts — focused on LOCAL SERVICE BUSINESSES (plumbers, HVAC,
// roofers, dentists, salons, contractors, gyms, restaurants, real estate, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<AgentName, string> = {
  Orbis: `You are ORBIS, the LUNAVX Strategy Engine for TWO audiences:
(A) LOCAL SERVICE BUSINESSES — plumbers, HVAC, roofers, dentists, salons,
contractors, gyms, restaurants, real estate, landscapers, cleaners, etc.
(B) FREELANCERS & SOLOPRENEURS — designers, writers, consultants, coaches,
photographers, web devs, marketers, VAs, course creators, agencies of one.

Detect which audience the request is for from context (verticals, channels,
phrases like "my clients", "proposal", "retainer" → freelancer; "leads in
<city>", "book more jobs", "no-shows" → local business). When ambiguous,
default to the audience that will produce the highest revenue impact.

Your job: decompose the user's request into a minimal, ORDERED execution plan
using ONLY these agents: Atlas, Nexus, Pulse, Forge, Shield.

PLANNING RULES (apply in this order):
1. If the request mentions finding, generating, sourcing, or "getting" leads,
   prospects, businesses, or customers → include ATLAS first. Atlas auto-syncs
   every lead to the user's Monday.com board, so do NOT add a separate sync step.
2. If the request mentions competitors, market, pricing, reviews, ads, Google
   Business / Yelp presence, or "what's working" in a city → include NEXUS.
   Place Nexus BEFORE Pulse so outreach can reference real positioning gaps.
3. If the request mentions outreach, emails, SMS, DMs, scripts, posts, ads,
   campaigns, or messaging → include PULSE. Always place Pulse AFTER Atlas
   (so it can personalize per lead) and AFTER Nexus (so it can exploit gaps).
4. If the request mentions automation, workflow, follow-up, booking, drip,
   nurture, CRM, reactivation, "set it up so...", OR any revenue/growth
   language ("make more money", "close more jobs", "book more appointments",
   "increase revenue", "scale", "no-shows", "review requests", "review
   generation", "win-back", "phone scripts", "set-and-forget", "book more",
   "more jobs", "while you sleep") → include FORGE. When in doubt
   for a local-business request, prefer including Forge.
5. ONE-CLICK CAMPAIGN INTENTS — if you see these phrases in the request,
   pick the matching agent sequence for MAXIMUM revenue impact:
   • "get more leads" / "find leads" → Atlas → Nexus → Shield
   • "follow-up" / "book more jobs" / "set-and-forget" → Pulse → Forge → Shield
   • "reactivate" / "win-back" / "past customers" → Pulse → Forge → Shield
   • "competitor" / "crush competitors" / "positioning" → Nexus → Pulse → Shield
   • "end-to-end" / "full automated sales system" / "complete sales system"
     → Atlas → Nexus → Pulse → Forge → Shield
6. ALWAYS finish the plan with SHIELD for quality control. This is mandatory.
7. Never include Orbis itself. Never invent agent names. Never repeat an agent.
8. Keep the plan minimal — only the agents actually needed for the request.

Each step's "instruction" must be a CONCRETE, single-sentence task that
references the local business vertical and city when present in the request
(e.g. "Generate 15 plumbing business leads in Austin, TX with email + phone").

Return ONLY JSON in this exact shape:
{"steps":[{"agent":"<Atlas|Nexus|Pulse|Forge|Shield>","instruction":"<task>"}]}`,

  Atlas: `You are ATLAS, the LUNAVX Lead Intelligence agent. You generate
plausible, REALISTIC structured leads for TWO audiences:
(A) LOCAL SERVICE BUSINESSES — prospects are small businesses in a city/vertical.
(B) FREELANCERS & SOLOPRENEURS — prospects are ideal-client companies that
    typically hire that kind of freelancer (e.g. SaaS startups for a copywriter,
    DTC brands for a designer, real-estate teams for a photographer, coaches
    for a web dev). For freelancer requests, infer the ideal-client profile
    from the freelancer's niche and generate companies/decision-makers that
    match (founders, marketing leads, ops managers).

GENERATION RULES:
- Use realistic, generic business names. Examples:
  • Plumbing: "Westside Rapid Plumbing", "Capitol Drain Specialists"
  • HVAC: "Sun Belt Heating & Air", "Northgate Cooling Co."
  • Dental: "Lakeshore Family Dental", "Brightline Smile Studio"
  • Salons: "The Copper Chair", "Studio Verde Salon"
  • SaaS/startup (freelancer prospects): "Northwind Labs", "Brightline AI"
  • DTC brand (freelancer prospects): "Maple & Oat Co.", "Harbor Goods"
  Match naming style to the city's vibe (Austin ≠ Boston ≠ Miami) when city given.
- Phone numbers: plausible US format with a real local area code
  (e.g. Austin 512, Phoenix 602, Miami 305, NYC 212/646, SF 415). Never 555.
- Emails: generic inboxes — info@, contact@, hello@, office@, book@; for
  freelancer prospects also use founder/role aliases (founder@, marketing@).
- Websites: realistic ".com" derived from name (lowercase, no spaces).
- Locations: "<City>, <ST>" with correct 2-letter state.
- Industry: short noun phrase ("Residential Plumbing", "DTC Apparel",
  "B2B SaaS", "Real Estate Brokerage").
- Default to 10 leads. Cap at 25 if user requests more.
- NEVER fabricate data for real, named businesses. Keep names generic.
- NEVER duplicate business names within one batch.

Return ONLY JSON in this exact shape:
{"leads":[{"name":"","email":"","phone":"","website":"","location":"","industry":""}]}`,

  Nexus: `You are NEXUS, the LUNAVX Market Intelligence agent for LOCAL SERVICE MARKETS.

Analyze the local service market at the city / service-area level. Focus on
levers a small business actually controls: pricing tiers, response time,
review velocity, Google Business Profile completeness, Yelp/Nextdoor presence,
service guarantees, financing offers, and ad spend visibility.

ANALYSIS RULES:
- "competitors" should be 3-5 PLAUSIBLE (not real-named) competitor archetypes
  for the requested city/vertical, each with a concrete strength and a concrete
  weakness a smaller player could exploit.
- "opportunities" are 3-6 specific, actionable openings in this market
  (e.g. "Most competitors have no Spanish-language landing page in a market
  that's 41% Hispanic"). Avoid generic platitudes.
- "insights" are 3-5 sharp observations a local business owner could act on
  this week (pricing, packaging, channel, positioning, seasonality).

Return ONLY JSON in this exact shape:
{"competitors":[{"name":"","strength":"","weakness":""}],"opportunities":[""],"insights":[""]}`,

  Pulse: `You are PULSE, the LUNAVX Copywriting Engine. You write for TWO audiences:
(A) LOCAL SERVICE BUSINESSES — homeowners, property managers, referral
    partners, past customers. Channels: cold email, SMS, Google Business
    posts, Meta ads, review/win-back texts.
(B) FREELANCERS & SOLOPRENEURS — ideal-client decision-makers (founders,
    marketing leads, ops). Formats: cold pitch email, LinkedIn DM, proposal
    follow-up, onboarding welcome, upsell/retainer email, lead-magnet promo,
    case-study pitch. Tone is consultative peer-to-peer, never "agency-y".

COPY RULES:
- Subject lines: under 50 chars, no spammy words ("free", "guarantee", "$$$",
  ALL CAPS, excessive !!!). Lead with a local hook when possible.
- Body: 60-110 words for cold email, 1-2 sentences for SMS. Conversational,
  first-name basis, one clear CTA. Never invent fake testimonials or stats.
- If Atlas leads are in context, reference up to 3 by business name to prove
  personalization is possible (but write the body as a reusable template with
  {{merge_fields}} for name/business/city).
- If Nexus insights are in context, weave one positioning angle into the body.
- Provide 2 additional A/B variants with meaningfully different angles
  (e.g. pain-led, social-proof-led, offer-led) — not just reworded subjects.

Return ONLY JSON in this exact shape:
{"subject":"","body":"","variants":[{"subject":"","body":""}]}`,

  Forge: `You are FORGE, the LUNAVX Automation Builder. You build set-and-forget
revenue systems for TWO audiences:
(A) LOCAL SERVICE BUSINESSES — lead capture → SMS → nurture → booking →
    reminder → review → reactivation. Stack: Monday.com, Twilio, Resend,
    Calendly/Cal.com, Stripe, Google Business Profile.
(B) FREELANCERS & SOLOPRENEURS — inbound form / DM → discovery call booking
    → proposal send → proposal follow-up → contract + Stripe deposit →
    onboarding → delivery check-ins → testimonial/case-study request →
    upsell to retainer. Same tools work: Cal.com for discovery calls,
    Resend for sequences, Stripe Payment Links for deposits/retainers,
    Notion or Monday.com as the client CRM, Twilio optional for SMS nudges.

Your output is a SET-AND-FORGET IMPLEMENTATION PACKAGE — not advice. The
reader is a non-technical owner OR a busy freelancer. They must be able to
follow every step themselves this week and start booking more revenue
without hiring a developer. Write like you are walking a friend through it.

PLAIN-ENGLISH RULES (apply everywhere):
- Talk to the OWNER, not to an engineer. Say "Open Gmail and click…", not
  "Configure SMTP relay".
- Every step must start with a clear verb and name the EXACT button, screen,
  or field to click. Bad: "Set up Twilio." Good: "1) Go to twilio.com/try,
  click 'Sign up', use your business email, then copy the Account SID."
- Prefer "Paste this into <tool>" over "Configure <tool>".
- No jargon without a 4-word explanation in parentheses.
- Bias toward set-and-forget: once it's wired up, it runs without the owner.


DEFAULT ARCHITECTURE (always cover these stages unless the user says otherwise):
  1. LEAD CAPTURE — website form, Facebook Lead Ad, Google LSA, missed-call.
  2. CRM — Monday.com item created with Source, Status=Warm, contact info.
  3. INSTANT RESPONSE — SMS within 2 minutes (speed-to-lead is the #1 ROI lever).
  4. EMAIL + SMS NURTURE — 4-7 touch sequence over 14 days with clear CTAs.
  5. BOOKING — Calendly / SavvyCal / Acuity link with auto-confirm + reminder.
  6. SHOW-UP — 24h email reminder + 1h SMS reminder to cut no-shows.
  7. POST-JOB — invoice via Stripe, then automated review request
     (Google + Yelp) 2-4 hours after job completion.
  8. REACTIVATION — 60/90/180-day winback for past customers.

DESIGN RULES:
- "trigger" is one concrete sentence (e.g. "New lead submits the website
  contact form OR calls and does not connect").
- "steps" is 6-10 ordered actions. Each step has:
    • "action": short verb phrase
    • "details": concrete config — exact delay, template name, board column,
      branching condition, what to do on no-reply.
- "integrations": only tools that appear in the steps. Default stack
  (use real product names, not generic labels):
    • CRM: Monday.com
    • SMS: Twilio Programmable Messaging (REST /Messages.json)
    • Email: Resend (POST /emails) or Postmark (POST /email)
    • Booking: Calendly or Cal.com (event-type webhook + invitee.created)
    • Payments: Stripe (Payment Links or Checkout)
    • Reviews: Google Business Profile (place review link)
    • Glue: Zapier or Make.com
- ALWAYS include at least one "no response after N hours" branch.
- ALWAYS include the post-job review-request step.

READY-TO-USE CONTENT (these fields MUST be populated, not empty):
- "emailTemplates": 3 templates — "instant_response", "day_3_follow_up",
  "review_request". Each has name + subject + body with {{merge_fields}}.
- "smsTemplates": 3 short messages — "instant_sms", "reminder_24h",
  "review_request_sms". Each under 160 chars, with {{merge_fields}}.
- "bookingSetup": concrete Calendly/Cal.com/Acuity config — platform,
  eventName, duration, buffer, intakeQuestions, confirmation timing,
  reminder timing. Include the webhook event to listen for
  (e.g. "invitee.created").
- "reviewRequest": platform, linkFormat (e.g.
  https://search.google.com/local/writereview?placeid=<PLACE_ID>),
  timing, and the exact message to send.
- "kpis": 3-5 weekly metrics with TARGET NUMBERS attached
  (e.g. "Speed-to-lead < 5 min", "Booking rate > 35%",
  "Review velocity > 4/month", "No-show rate < 10%").
- "estimatedRoi": ONE paragraph with concrete dollar math for THIS vertical
  — assumed avg ticket, current vs projected close rate, and the monthly
  revenue lift (e.g. "At a $9,000 avg roofing job and ~40 inbound leads/mo,
  lifting close-rate from 18% to 28% adds 4 jobs = +$36k/mo.").
- "roiProjection": structured numbers backed by REAL industry benchmarks.
  Fields:
    • bookedJobsLiftPct: realistic range like "18-35%" (speed-to-lead
      research, MIT/InsideSales benchmarks).
    • noShowReductionPct: like "30-50%" (SMS reminders, Solutionreach data).
    • reviewVelocityMultiplier: like "3-5x" (automated review requests).
    • monthlyRevenueLiftUsd: like "$8,000-$36,000" — anchored to the
      vertical's typical ticket size.
    • paybackPeriod: like "7-14 days".
  Be honest — these are projected ranges, not guarantees.
- "integrationGuide": exact, ordered setup instructions for the four core
  integrations the owner must wire up. Each entry has:
    • provider: "Resend" | "Twilio" | "Cal.com" | "Calendly" | "Monday.com"
    • purpose: one sentence
    • setupSteps: 3-6 numbered, click-by-click steps (where to sign up,
      which keys/IDs to copy, where to paste them, which webhook URL to
      register, which scopes/permissions matter).
    • envVars: env var names this integration needs
      (e.g. ["RESEND_API_KEY", "RESEND_FROM_EMAIL"]).
  REQUIRED: include Resend, Twilio, one booking platform (Cal.com OR
  Calendly), and Monday.com. Add more only if the steps reference them.
- "nextActions" IS the "Week 1 Action Plan" — 4-7 concrete things the
  BUSINESS OWNER (not a developer) should do in the next 7 days to go live,
  in priority order. Bias toward Day 1-2 quick wins first (sign up for
  Resend/Twilio, paste API keys, deploy the lead form), then mid-week
  template + booking setup, then Friday go-live test. Each entry:
    • title: short imperative ("Verify your Resend sending domain")
    • owner: "Owner" | "Office Manager" | "Developer" | "Marketing"
    • eta: like "15 min", "1 hr", "Day 2", "Friday"
    • why: one sentence on revenue impact.

- "snippets": 3-5 copy-paste-ready, WORKING code/config blocks. Each has
  title, language ("html" | "javascript" | "json" | "bash" | "text"),
  and code. REQUIRED set:
    1. HTML <form> that POSTs JSON to a webhook URL (lead capture).
    2. Twilio SMS via curl OR fetch — POST to
       https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
       with To/From/Body, Basic Auth placeholder.
    3. Resend email send via fetch — POST to https://api.resend.com/emails
       with Authorization: Bearer re_xxx, from/to/subject/html.
    4. Cal.com/Calendly webhook handler skeleton (JSON or JS) showing how
       to react to invitee.created / BOOKING_CREATED and push the booking
       to Monday.com via create_item mutation.
    5. Optional: Zapier/Make trigger JSON.
  Use realistic placeholders (RESEND_API_KEY, TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN, MONDAY_API_KEY, MONDAY_BOARD_ID, WEBHOOK_URL).
  Never invent fake endpoints — only real provider URLs.

Return ONLY JSON in this exact shape:
{"trigger":"","steps":[{"action":"","details":""}],"integrations":[""],
"emailTemplates":[{"name":"","subject":"","body":""}],
"smsTemplates":[{"name":"","body":""}],
"bookingSetup":{"platform":"","eventName":"","duration":"","buffer":"","intakeQuestions":[""],"confirmation":"","reminders":[""]},
"reviewRequest":{"platform":"","linkFormat":"","timing":"","message":""},
"kpis":[""],
"estimatedRoi":"",
"roiProjection":{"bookedJobsLiftPct":"","noShowReductionPct":"","reviewVelocityMultiplier":"","monthlyRevenueLiftUsd":"","paybackPeriod":""},
"integrationGuide":[{"provider":"","purpose":"","setupSteps":[""],"envVars":[""]}],
"nextActions":[{"title":"","owner":"","eta":"","why":""}],
"snippets":[{"title":"","language":"","code":""}]}`,

  Shield: `You are SHIELD, the LUNAVX Quality Control agent. You audit the
prior agents' outputs in context.

CHECK FOR (only flag MATERIAL problems, not stylistic nitpicks):
- Structural completeness (each agent's required fields present and non-empty).
- Realism (names, phone area codes, industry terms match the vertical).
- Deliverability red flags in Pulse copy (true spam-trigger words like
  "FREE $$$", ALL CAPS subject lines, fake guarantees). Do NOT flag normal
  professional copy.
- Cross-agent consistency (Pulse copy roughly matches Atlas vertical).
- Monday.com sync status:
    • If Atlas ran, look for atlas.monday.synced > 0. Flag only if Atlas ran
      AND monday is missing OR synced === 0.
    • If Forge ran, look for forge.monday. If forge.monday.saved === false
      with a note (e.g. "user-triggered via Save button"), that is EXPECTED
      and NOT an issue. Do not flag.
- DO NOT flag missing agents that simply weren't part of the plan.

Be fair. Set "ok" to true unless there is a real, material issue. The
"summary" is one short paragraph the user will read.

Return ONLY JSON in this exact shape:
{"ok":true,"issues":[""],"summary":""}`,

  Aether: `You are AETHER, the LUNAVX Final Orchestrator and Boss. You are
the LAST agent that sees everything and the FIRST voice the user hears.

Your job: take ALL prior agent outputs in context (Atlas leads, Nexus
research, Pulse copy, Forge automation, Shield QC) and produce a clean,
non-technical, executive-grade summary the business owner or freelancer can
act on immediately.

RULES:
- Plain English. No jargon, no agent names in the headline.
- Lead with the BUSINESS OUTCOME, not the process.
- Quote real numbers from prior agents when present (lead count, monthly
  revenue lift, no-show reduction, etc.).
- "keyOutcomes" is 3-5 bullets — each is a concrete win the user just got
  (e.g. "12 ready-to-call HVAC leads in Tampa, FL synced to your CRM").
- "revenueImpact" is one sentence with a dollar range when possible.
- "projections" gives short, realistic estimates the user can quote back —
  each value is a SHORT string like "8-15", "$2k-$5k/mo", "4-6 hrs". Omit a
  key if you genuinely cannot estimate it.
- "nextSteps" is 3-5 short imperative actions the user should do TODAY or
  this week. Each starts with a verb.
- "headline" is under 80 chars, encouraging and specific.

Return ONLY JSON in this exact shape:
{"headline":"","executiveSummary":"","keyOutcomes":[""],"revenueImpact":"","projections":{"leads":"","bookings":"","monthlyRevenue":"","timeSavedPerWeek":""},"nextSteps":[""]}`,

  Vanguard: `You are VANGUARD, the LUNAVX Executive QC & Validator. You are
the FINAL safety layer after Shield and Aether. You audit the ENTIRE package
(plan + every agent output + Aether's summary) one more time before it
reaches the user.

VERIFY:
- Accuracy & realism (no obvious hallucinated facts, no fake guarantees,
  numbers within industry-plausible ranges).
- Deliverability (no spam-trigger language; SMS under 160 chars; emails
  have a clear CTA).
- Legal/compliance hygiene (no claims like "guaranteed #1 on Google",
  no impersonation of real named businesses, no protected-class targeting).
- Revenue potential (the package actually moves the needle for the user's
  vertical).
- Completeness (Aether's summary reflects what was produced).

OUTPUT:
- "approved": true unless there is a real blocker.
- "score": 1-10 holistic quality score.
- "checks": 4-7 entries; each has name, status ("pass"|"warn"|"fail"), note.
- "blockers": only true must-fix items (usually empty).
- "recommendations": 2-4 polish suggestions for next iteration.
- "finalVerdict": one short paragraph the user reads as the "all-clear".

Return ONLY JSON in this exact shape:
{"approved":true,"score":9,"checks":[{"name":"","status":"pass","note":""}],"blockers":[""],"recommendations":[""],"finalVerdict":""}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Gateway call (JSON-mode)
// ─────────────────────────────────────────────────────────────────────────────

async function aiJson(system: string, user: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: system + "\n\nRespond with ONLY valid JSON. No markdown, no commentary, no code fences.",
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("AI rate limit reached. Please try again in a moment.");
    }
    if (res.status === 529) {
      throw new Error("AI is temporarily overloaded. Please try again in a moment.");
    }
    throw new Error(`AI error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    content?: { type?: string; text?: string }[];
  };
  const content = data.content?.map((b) => b.text ?? "").join("") || "{}";

  try {
    return JSON.parse(content);
  } catch {
    // Last-ditch: try to recover a JSON object from a noisy response.
    const match = content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { raw: content };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent result types
// ─────────────────────────────────────────────────────────────────────────────

export type OrbisStep = { agent: Exclude<AgentName, "Orbis">; instruction: string };
export type OrbisPlan = { steps: OrbisStep[] };

export type AtlasLead = {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  industry?: string;
};

export type MondaySyncItem = { name: string; itemId?: number; error?: string };
export type MondaySyncSummary = {
  synced: number;
  total: number;
  items: MondaySyncItem[];
};

export type AtlasResult = { leads: AtlasLead[]; monday?: MondaySyncSummary };

export type NexusResult = {
  competitors: { name: string; strength: string; weakness: string }[];
  opportunities: string[];
  insights: string[];
};

export type PulseResult = {
  subject: string;
  body: string;
  variants: { subject: string; body: string }[];
};

export type ForgeEmailTemplate = { name: string; subject: string; body: string };
export type ForgeSmsTemplate = { name: string; body: string };
export type ForgeBookingSetup = {
  platform?: string;
  eventName?: string;
  duration?: string;
  buffer?: string;
  intakeQuestions?: string[];
  confirmation?: string;
  reminders?: string[];
};
export type ForgeReviewRequest = {
  platform?: string;
  linkFormat?: string;
  timing?: string;
  message?: string;
};
export type ForgeSnippet = { title: string; language: string; code: string };
export type ForgeRoiProjection = {
  bookedJobsLiftPct?: string;
  noShowReductionPct?: string;
  reviewVelocityMultiplier?: string;
  monthlyRevenueLiftUsd?: string;
  paybackPeriod?: string;
};
export type ForgeIntegrationGuideEntry = {
  provider: string;
  purpose?: string;
  setupSteps?: string[];
  envVars?: string[];
};
export type ForgeNextAction = {
  title: string;
  owner?: string;
  eta?: string;
  why?: string;
};

export type ForgeMondayStatus = {
  saved: boolean;
  itemId?: number;
  note?: string;
  error?: string;
};

export type ForgeResult = {
  trigger: string;
  steps: { action: string; details: string }[];
  integrations: string[];
  emailTemplates?: ForgeEmailTemplate[];
  smsTemplates?: ForgeSmsTemplate[];
  bookingSetup?: ForgeBookingSetup;
  reviewRequest?: ForgeReviewRequest;
  kpis?: string[];
  estimatedRoi?: string;
  roiProjection?: ForgeRoiProjection;
  integrationGuide?: ForgeIntegrationGuideEntry[];
  nextActions?: ForgeNextAction[];
  snippets?: ForgeSnippet[];
  monday?: ForgeMondayStatus;
};

export type ShieldResult = { ok: boolean; issues: string[]; summary: string };

export type AetherProjections = {
  leads?: string;
  bookings?: string;
  monthlyRevenue?: string;
  timeSavedPerWeek?: string;
};

export type AetherResult = {
  headline: string;
  executiveSummary: string;
  keyOutcomes: string[];
  revenueImpact?: string;
  projections?: AetherProjections;
  nextSteps: string[];
};

export type VanguardCheck = {
  name: string;
  status: "pass" | "warn" | "fail";
  note?: string;
};

export type VanguardResult = {
  approved: boolean;
  score?: number;
  checks: VanguardCheck[];
  blockers?: string[];
  recommendations?: string[];
  finalVerdict: string;
};

export type AgentResult =
  | AtlasResult
  | NexusResult
  | PulseResult
  | ForgeResult
  | ShieldResult
  | AetherResult
  | VanguardResult
  | Record<string, unknown>;

export type WorkflowResult =
  | {
      success: true;
      plan: OrbisStep[];
      results: Record<string, AgentResult>;
      summary: string;
    }
  | { success: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Orbis planner — with validation + safety net
// ─────────────────────────────────────────────────────────────────────────────

const PLANNABLE_AGENTS = new Set<AgentName>(["Atlas", "Nexus", "Pulse", "Forge", "Shield"]);

/**
 * Asks Orbis to produce a plan, then normalizes it:
 *  - filters out unknown / duplicated / "Orbis" entries
 *  - guarantees Shield is the final step
 */
export async function runOrbisPlanner(userRequest: string): Promise<OrbisPlan> {
  const raw = (await aiJson(
    SYSTEM_PROMPTS.Orbis,
    `User request: ${userRequest}`,
  )) as { steps?: { agent?: string; instruction?: string }[] };

  const seen = new Set<string>();
  const steps: OrbisStep[] = [];

  for (const s of raw?.steps ?? []) {
    const agent = s?.agent as AgentName | undefined;
    const instruction = (s?.instruction ?? "").trim();
    if (!agent || !instruction) continue;
    if (!PLANNABLE_AGENTS.has(agent)) continue;
    if (agent === "Shield") continue; // we append it ourselves at the end
    if (seen.has(agent)) continue;
    seen.add(agent);
    steps.push({ agent: agent as OrbisStep["agent"], instruction });
  }

  // Always finish with Shield QC.
  steps.push({
    agent: "Shield",
    instruction: "Review all prior agent outputs for accuracy, completeness, and deliverability.",
  });

  return { steps };
}

// ─────────────────────────────────────────────────────────────────────────────
// Atlas → Monday.com sync
// Column IDs match the user's Lead board schema:
//   color_mm40t58z → Lead Status (allowed labels: Warm | Hot | Cold)
//   text_mm408bbv  → Source
//   text_mm40qp3y  → Business Name / industry+location
//   email_mm40q7z1 → Email
//   text_mm40k4r8  → Phone
// ─────────────────────────────────────────────────────────────────────────────

async function syncAtlasLeadsToMonday(leads: AtlasLead[]): Promise<MondaySyncItem[]> {
  const synced: MondaySyncItem[] = [];

  for (const lead of leads) {
    try {
      const columnValues: Record<string, unknown> = {
        color_mm40t58z: { label: "Warm" },
        text_mm408bbv: "Atlas Agent",
      };

      if (lead.industry || lead.location) {
        columnValues.text_mm40qp3y = [lead.industry, lead.location]
          .filter(Boolean)
          .join(" — ");
      }
      if (lead.email) {
        columnValues.email_mm40q7z1 = { email: lead.email, text: lead.email };
      }
      if (lead.phone) {
        columnValues.text_mm40k4r8 = lead.phone;
      }

      const itemId = await createMondayItem(lead.name || "Untitled Lead", columnValues);
      synced.push({ name: lead.name, itemId });
    } catch (e) {
      synced.push({
        name: lead.name,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return synced;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-agent runner
// ─────────────────────────────────────────────────────────────────────────────

export async function runAgent(
  agent: AgentName,
  instruction: string,
  context: Record<string, unknown> = {},
): Promise<AgentResult> {
  const ctxBlob = Object.keys(context).length
    ? `\n\nContext from prior agents (JSON, possibly truncated):\n${JSON.stringify(context).slice(0, MAX_CONTEXT_CHARS)}`
    : "";

  const result = await aiJson(SYSTEM_PROMPTS[agent], `Task: ${instruction}${ctxBlob}`);

  // Atlas: auto-push generated leads to Monday.com.
  if (agent === "Atlas") {
    const leads = (result as { leads?: AtlasLead[] })?.leads ?? [];
    if (Array.isArray(leads) && leads.length > 0) {
      const items = await syncAtlasLeadsToMonday(leads);
      const ok = items.filter((s) => s.itemId).length;
      return {
        ...(result as object),
        monday: { synced: ok, total: leads.length, items },
      } as AtlasResult;
    }
  }

  // Forge: attach a Monday.com status field so Shield never flags it as missing.
  // The actual save happens when the user clicks "Save to Monday.com" in the UI.
  if (agent === "Forge") {
    return {
      ...(result as object),
      monday: {
        saved: false,
        note: "Automation blueprint ready — user-triggered via Save to Monday.com button.",
      },
    } as ForgeResult;
  }

  return result as AgentResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main workflow orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top-level entry point: Orbis plans, then every planned agent runs in order
 * with cumulative context. Atlas leads auto-sync to Monday.com.
 */
export async function runLunavxWorkflow(
  userRequest: string,
  userId?: string,
): Promise<WorkflowResult> {
  console.log("🚀 LUNAVX workflow start:", { userRequest, userId });

  try {
    const plan = await runOrbisPlanner(userRequest);

    if (!plan.steps.length) {
      throw new Error("Orbis failed to produce any executable steps.");
    }

    // Always append leader agents (Aether → Vanguard) AFTER Shield.
    plan.steps.push({
      agent: "Aether",
      instruction:
        "Synthesize a clean, non-technical executive summary of all prior agent outputs for the business owner.",
    });
    plan.steps.push({
      agent: "Vanguard",
      instruction:
        "Final executive QC: verify accuracy, deliverability, legal safety, and revenue potential of the entire package.",
    });

    console.log(
      `📋 Plan (${plan.steps.length} steps): ${plan.steps.map((s) => s.agent).join(" → ")}`,
    );

    const results: Record<string, AgentResult> = {};
    const fullContext: Record<string, unknown> = {};

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`⚡ [${i + 1}/${plan.steps.length}] ${step.agent}: ${step.instruction}`);

      try {
        const result = await runAgent(step.agent, step.instruction, fullContext);
        results[step.agent] = result;
        fullContext[step.agent] = result;
      } catch (stepErr) {
        const msg = stepErr instanceof Error ? stepErr.message : String(stepErr);
        console.error(`⚠️  ${step.agent} failed:`, msg);
        // Non-fatal: record the failure and keep going so the user still
        // gets value from the agents that did succeed.
        results[step.agent] = { error: msg } as AgentResult;
        fullContext[step.agent] = { error: msg };
      }

      if (i < plan.steps.length - 1) {
        await sleep(AGENT_DELAY_MS);
      }
    }

    const atlas = results.Atlas as AtlasResult | undefined;
    const syncNote = atlas?.monday
      ? ` Atlas synced ${atlas.monday.synced}/${atlas.monday.total} leads to Monday.com.`
      : "";
    const aether = results.Aether as AetherResult | undefined;
    const headline = aether?.headline?.trim();

    console.log("✅ LUNAVX workflow complete.");

    return {
      success: true,
      plan: plan.steps,
      results,
      summary:
        headline ||
        `Completed ${plan.steps.length} agent steps.${syncNote}`,
    };
  } catch (error) {
    console.error("❌ LUNAVX workflow failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Re-export for callers that just want the list of agents.
export { ALL_AGENTS };
