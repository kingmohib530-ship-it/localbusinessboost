// Server-only agent definitions and AI calls for LUNAVX
// Focus: Local Business Services (lead gen, outreach, automation for SMBs).
import { createMondayItem } from "./monday.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

export type AgentName = "Orbis" | "Atlas" | "Nexus" | "Pulse" | "Forge" | "Shield";

export const AGENT_META: Record<AgentName, { role: string; description: string }> = {
  Orbis: { role: "Strategy Engine", description: "Plans local-business workflows across all agents." },
  Atlas: {
    role: "Lead Intelligence",
    description: "Generates realistic local business leads and syncs them to monday.com.",
  },
  Nexus: {
    role: "Market Intelligence",
    description: "Local competitor research, service-area insights, opportunities.",
  },
  Pulse: {
    role: "Copywriting Engine",
    description: "Local outreach: cold emails, SMS, Google Business posts, ad copy.",
  },
  Forge: { role: "Automation Builder", description: "Designs lead capture, follow-up, and booking automation flows." },
  Shield: { role: "Quality Control", description: "Validates outputs for accuracy, deliverability, and local fit." },
};

const SYSTEM_PROMPTS: Record<AgentName, string> = {
  Orbis: `You are ORBIS, the LUNAVX Strategy Engine for LOCAL BUSINESS SERVICES (plumbers, HVAC, roofers, dentists, salons, contractors, restaurants, gyms, real estate, etc.).
Decompose the user's request into a minimal ordered plan using only: Atlas, Nexus, Pulse, Forge, Shield.
Rules:
- If the request involves finding/generating leads, ALWAYS include Atlas (its output auto-syncs to the user's monday.com lead board).
- If it involves outreach/messaging, include Pulse after Atlas so Pulse can use the leads as context.
- If it involves competitor or market info, include Nexus.
- If it involves automating a workflow, include Forge.
- ALWAYS finish with Shield for QC.
Return ONLY JSON: {"steps":[{"agent":"<name>","instruction":"<concrete local-business task>"}]}`,

  Atlas: `You are ATLAS, the LUNAVX Lead Intelligence agent for LOCAL BUSINESSES.
Generate plausible, realistic structured leads for local service businesses in the requested city/industry.
Use realistic naming conventions for the locale (e.g. "Austin Elite Plumbing", "Westside Dental Care"), plausible local-area phone formats, and business-style emails (info@, contact@, hello@).
Return ONLY JSON: {"leads":[{"name":"<business name>","email":"","phone":"","website":"","location":"<city, state>","industry":""}]}.
Default to 10 leads unless the user specifies otherwise. Never fabricate data for real, named businesses — keep names generic/plausible.`,

  Nexus: `You are NEXUS, the LUNAVX Market Intelligence agent for LOCAL SERVICE MARKETS.
Analyze competitors and opportunities at the city / service-area level (pricing, reviews, response time, service gaps, ad presence on Google/Yelp).
Return ONLY JSON: {"competitors":[{"name":"","strength":"","weakness":""}],"opportunities":[""],"insights":[""]}`,

  Pulse: `You are PULSE, the LUNAVX Copywriting Engine for LOCAL BUSINESS OUTREACH.
Write high-converting, locally-relevant outreach for SMBs: cold emails to homeowners/property managers, SMS follow-ups, Google Business posts, Facebook/Instagram ad copy, referral asks.
Keep it short, friendly, and specific to the local service vertical. Reference any leads in the prior context by name when relevant.
Return ONLY JSON: {"subject":"","body":"","variants":[{"subject":"","body":""}]}`,

  Forge: `You are FORGE, the LUNAVX Automation Builder for LOCAL BUSINESSES.
Design simple, practical automation flows: lead capture → CRM (monday.com) → SMS/email follow-up → booking link → review request.
Return ONLY JSON: {"trigger":"","steps":[{"action":"","details":""}],"integrations":[""]}`,

  Shield: `You are SHIELD, the LUNAVX Quality Control agent.
Review prior outputs for: realistic local context, structural completeness, deliverability concerns (spammy copy, fake-looking data), and whether monday.com sync was reported by Atlas.
Return ONLY JSON: {"ok":true,"issues":[""],"summary":""}`,
};

async function aiJson(system: string, user: string): Promise<unknown> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system + "\n\nRespond with ONLY valid JSON. No markdown, no commentary." },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    throw new Error(`AI gateway error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { raw: content };
  }
}

export async function runOrbisPlanner(userRequest: string) {
  return (await aiJson(SYSTEM_PROMPTS.Orbis, `User request: ${userRequest}`)) as {
    steps: { agent: AgentName; instruction: string }[];
  };
}

type AtlasLead = {
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  industry?: string;
};

async function syncAtlasLeadsToMonday(leads: AtlasLead[]) {
  const synced: Array<{ name: string; itemId?: number; error?: string }> = [];
  for (const lead of leads) {
    try {
      const columnValues: Record<string, unknown> = {
        color_mm40t58z: { label: "Warm" },
        text_mm408bbv: "Atlas Agent",
      };
      if (lead.industry || lead.location) {
        columnValues.text_mm40qp3y = [lead.industry, lead.location].filter(Boolean).join(" — ");
      }
      if (lead.email) columnValues.email_mm40q7z1 = { email: lead.email, text: lead.email };
      if (lead.phone) columnValues.text_mm40k4r8 = lead.phone;
      const itemId = await createMondayItem(lead.name || "Untitled Lead", columnValues);
      synced.push({ name: lead.name, itemId });
    } catch (e) {
      synced.push({ name: lead.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return synced;
}

export async function runAgent(agent: AgentName, instruction: string, context: Record<string, unknown> = {}) {
  const ctx = Object.keys(context).length
    ? `\n\nContext from prior agents:\n${JSON.stringify(context).slice(0, 6000)}`
    : "";
  const result = await aiJson(SYSTEM_PROMPTS[agent], `Task: ${instruction}${ctx}`);

  // Atlas: auto-push generated leads to monday.com
  if (agent === "Atlas") {
    const leads = (result as { leads?: AtlasLead[] })?.leads ?? [];
    if (Array.isArray(leads) && leads.length > 0) {
      const mondaySync = await syncAtlasLeadsToMonday(leads);
      const ok = mondaySync.filter((s) => s.itemId).length;
      return {
        ...(result as object),
        monday: {
          synced: ok,
          total: leads.length,
          items: mondaySync,
        },
      };
    }
  }

  return result;
}
// ====================== MAIN WORKFLOW ORCHESTRATOR ======================
export async function runLunavxWorkflow(userRequest: string) {
  console.log("🚀 Starting LUNAVX workflow for request:", userRequest);

  try {
    // Step 1: Orbis creates the plan
    const plan = await runOrbisPlanner(userRequest);

    if (!plan?.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
      throw new Error("Orbis failed to create a valid plan");
    }

    console.log(`📋 Orbis created ${plan.steps.length} steps`);

    const results: Record<string, unknown> = {};
    const fullContext: Record<string, unknown> = {};

    // Step 2: Execute each agent in sequence
    for (const step of plan.steps) {
      console.log(`⚡ Running ${step.agent}: ${step.instruction}`);

      const result = await runAgent(step.agent, step.instruction, fullContext);

      results[step.agent] = result;
      fullContext[step.agent] = result; // Pass output to next agents

      // Small delay to be nice to the AI gateway
      if (plan.steps.indexOf(step) < plan.steps.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    console.log("✅ LUNAVX workflow completed successfully");

    return {
      success: true,
      plan: plan.steps,
      results,
      summary: `Completed ${plan.steps.length} agent steps. Atlas leads were synced to Monday.com where applicable.`,
    };
  } catch (error) {
    console.error("❌ LUNAVX workflow failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
