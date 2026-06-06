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
 * All AI calls go through the Lovable AI gateway. Never call providers
 * directly. This file is server-only (process.env access).
 */

import { createMondayItem } from "./monday.server";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

/** Inter-agent pause to stay polite with the AI gateway. */
const AGENT_DELAY_MS = 900;

/** Hard cap on context size injected into each agent call. */
const MAX_CONTEXT_CHARS = 6000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Agent registry & metadata
// ─────────────────────────────────────────────────────────────────────────────

export type AgentName = "Orbis" | "Atlas" | "Nexus" | "Pulse" | "Forge" | "Shield";

const ALL_AGENTS: readonly AgentName[] = ["Orbis", "Atlas", "Nexus", "Pulse", "Forge", "Shield"];

export const AGENT_META: Record<AgentName, { role: string; description: string }> = {
  Orbis: {
    role: "Strategy Engine",
    description: "Plans local-business workflows across the other five agents.",
  },
  Atlas: {
    role: "Lead Intelligence",
    description: "Generates realistic local-business leads and syncs them to Monday.com.",
  },
  Nexus: {
    role: "Market Intelligence",
    description: "Local competitor research, service-area insights, and opportunities.",
  },
  Pulse: {
    role: "Copywriting Engine",
    description: "Local outreach: cold emails, SMS, Google Business posts, and ad copy.",
  },
  Forge: {
    role: "Automation Builder",
    description: "Designs lead-capture, follow-up, and booking automation flows.",
  },
  Shield: {
    role: "Quality Control",
    description: "Validates outputs for accuracy, deliverability, and local fit.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// System prompts — focused on LOCAL SERVICE BUSINESSES (plumbers, HVAC,
// roofers, dentists, salons, contractors, gyms, restaurants, real estate, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<AgentName, string> = {
  Orbis: `You are ORBIS, the LUNAVX Strategy Engine for LOCAL BUSINESS SERVICES
(plumbers, HVAC, roofers, dentists, salons, contractors, gyms, restaurants,
real estate, landscapers, electricians, cleaners, mobile detailers, etc.).

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
   nurture, CRM, or "set it up so..." → include FORGE.
5. ALWAYS finish the plan with SHIELD for quality control. This is mandatory.
6. Never include Orbis itself. Never invent agent names. Never repeat an agent.
7. Keep the plan minimal — only the agents actually needed for the request.

Each step's "instruction" must be a CONCRETE, single-sentence task that
references the local business vertical and city when present in the request
(e.g. "Generate 15 plumbing business leads in Austin, TX with email + phone").

Return ONLY JSON in this exact shape:
{"steps":[{"agent":"<Atlas|Nexus|Pulse|Forge|Shield>","instruction":"<task>"}]}`,

  Atlas: `You are ATLAS, the LUNAVX Lead Intelligence agent for LOCAL BUSINESSES.

Generate plausible, REALISTIC structured leads for local service businesses in
the requested city/industry. These represent prospects (small businesses the
user wants to reach), not customers.

GENERATION RULES:
- Use realistic, generic local-sounding business names. Examples by vertical:
  • Plumbing: "Westside Rapid Plumbing", "Capitol Drain Specialists"
  • HVAC: "Sun Belt Heating & Air", "Northgate Cooling Co."
  • Dental: "Lakeshore Family Dental", "Brightline Smile Studio"
  • Roofing: "Summit Ridge Roofing", "Iron Oak Exteriors"
  • Salons: "The Copper Chair", "Studio Verde Salon"
  Match the naming style to the city's vibe (Austin ≠ Boston ≠ Miami).
- Phone numbers: plausible US format with a real local area code for the city
  (e.g. Austin 512, Phoenix 602, Miami 305). Never use 555 prefixes.
- Emails: generic business inboxes — info@, contact@, hello@, office@, book@.
- Websites: realistic ".com" derived from the business name (lowercase, no
  spaces, no special chars).
- Locations: "<City>, <ST>" with the correct 2-letter state abbreviation.
- Industry: short noun phrase (e.g. "Residential Plumbing", "HVAC Service",
  "Family Dentistry").
- Default to 10 leads. If the user specifies a count, honor it (cap at 25).
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

  Pulse: `You are PULSE, the LUNAVX Copywriting Engine for LOCAL BUSINESS OUTREACH.

Write high-converting, locally-relevant outreach. Match the channel to the
audience: B2C homeowners (SMS, Google posts, Meta ads), property managers
(short cold email), referral partners (warm intro email), past customers
(review/SMS reactivation).

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

  Forge: `You are FORGE, the LUNAVX Automation Builder for LOCAL BUSINESSES.

You design COMPLETE, REVENUE-GENERATING automation systems that a non-technical
owner can run TODAY. Think like a senior RevOps consultant who has shipped
hundreds of plumbing, HVAC, roofing, dental, salon, and home-service flows.

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
- "integrations": only tools that appear in the steps. Prefer this stack:
  Monday.com (CRM), Twilio (SMS), Mailgun or Resend (email), Calendly (booking),
  Stripe (payments), Google Business Profile (reviews), Zapier or Make (glue).
- ALWAYS include at least one "no response after N hours" branch.
- ALWAYS include the post-job review-request step.

READY-TO-USE CONTENT (these fields MUST be populated, not empty):
- "emailTemplates": 3 templates — "instant_response", "day_3_follow_up",
  "review_request". Each has name + subject + body with {{merge_fields}}.
- "smsTemplates": 3 short messages — "instant_sms", "reminder_24h",
  "review_request_sms". Each under 160 chars, with {{merge_fields}}.
- "bookingSetup": concrete Calendly/Acuity config — platform, eventName,
  duration, buffer, intakeQuestions, confirmation timing, reminder timing.
- "reviewRequest": platform, linkFormat (e.g. https://g.page/r/<placeId>/review),
  timing, and the exact message to send.
- "kpis": 3-5 weekly metrics (e.g. "Speed-to-lead under 5 min",
  "Booking rate > 35%", "Review velocity > 4/month").
- "estimatedRoi": one short paragraph quantifying upside in plain English.
- "snippets": 1-3 copy-paste-ready code/config blocks. Each has title,
  language ("html" | "javascript" | "json" | "bash" | "text"), and code.
  Good examples: HTML <form> that POSTs to a webhook, Twilio SMS curl,
  Zapier/Make trigger JSON.

Return ONLY JSON in this exact shape:
{"trigger":"","steps":[{"action":"","details":""}],"integrations":[""],
"emailTemplates":[{"name":"","subject":"","body":""}],
"smsTemplates":[{"name":"","body":""}],
"bookingSetup":{"platform":"","eventName":"","duration":"","buffer":"","intakeQuestions":[""],"confirmation":"","reminders":[""]},
"reviewRequest":{"platform":"","linkFormat":"","timing":"","message":""},
"kpis":[""],
"estimatedRoi":"",
"snippets":[{"title":"","language":"","code":""}]}`,

  Shield: `You are SHIELD, the LUNAVX Quality Control agent. You are the final
gate before output reaches the user.

Review the prior agents' outputs in context for:
- Structural completeness (every required field present and non-empty).
- Realism for the local vertical (names, phone area codes, industry terms).
- Deliverability red flags in any Pulse copy (spam-trigger words, fake
  guarantees, ALL CAPS, missing unsubscribe context).
- Whether Atlas reported a Monday.com sync (look for a "monday" field with
  synced > 0). If Atlas ran but sync failed or is missing, flag it.
- Logical consistency between agents (e.g. Pulse copy matches Atlas vertical).

Be honest: set "ok" to false if there are ANY material issues. The "summary"
is a one-paragraph verdict the user will read.

Return ONLY JSON in this exact shape:
{"ok":true,"issues":[""],"summary":""}`,
};

// ─────────────────────────────────────────────────────────────────────────────
// AI Gateway call (JSON-mode)
// ─────────────────────────────────────────────────────────────────────────────

async function aiJson(system: string, user: string): Promise<unknown> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: system + "\n\nRespond with ONLY valid JSON. No markdown, no commentary, no code fences.",
        },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new Error("AI rate limit reached. Please try again in a moment.");
    }
    if (res.status === 402) {
      throw new Error("AI credits exhausted. Add credits in workspace settings.");
    }
    throw new Error(`AI gateway error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? "{}";

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

export type ForgeResult = {
  trigger: string;
  steps: { action: string; details: string }[];
  integrations: string[];
};

export type ShieldResult = { ok: boolean; issues: string[]; summary: string };

export type AgentResult =
  | AtlasResult
  | NexusResult
  | PulseResult
  | ForgeResult
  | ShieldResult
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

    console.log(
      `📋 Plan (${plan.steps.length} steps): ${plan.steps.map((s) => s.agent).join(" → ")}`,
    );

    const results: Record<string, AgentResult> = {};
    const fullContext: Record<string, unknown> = {};

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      console.log(`⚡ [${i + 1}/${plan.steps.length}] ${step.agent}: ${step.instruction}`);

      const result = await runAgent(step.agent, step.instruction, fullContext);
      results[step.agent] = result;
      fullContext[step.agent] = result;

      if (i < plan.steps.length - 1) {
        await sleep(AGENT_DELAY_MS);
      }
    }

    const atlas = results.Atlas as AtlasResult | undefined;
    const syncNote = atlas?.monday
      ? ` Atlas synced ${atlas.monday.synced}/${atlas.monday.total} leads to Monday.com.`
      : "";

    console.log("✅ LUNAVX workflow complete.");

    return {
      success: true,
      plan: plan.steps,
      results,
      summary: `Completed ${plan.steps.length} agent steps.${syncNote}`,
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
