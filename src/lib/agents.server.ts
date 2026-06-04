// Server-only agent definitions and AI calls for LUNAVX
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

export type AgentName = "Orbis" | "Atlas" | "Nexus" | "Pulse" | "Forge" | "Shield";

export const AGENT_META: Record<AgentName, { role: string; description: string }> = {
  Orbis: { role: "Strategy Engine", description: "Decomposes user requests into ordered agent workflows." },
  Atlas: { role: "Lead Intelligence", description: "Generates structured local business leads." },
  Nexus: { role: "Market Intelligence", description: "Competitor research, market insights, opportunities." },
  Pulse: { role: "Copywriting Engine", description: "Cold emails, ads, landing copy, outreach scripts." },
  Forge: { role: "Automation Builder", description: "Designs multi-step workflow automation logic." },
  Shield: { role: "Quality Control", description: "Validates and improves prior agent outputs." },
};

const SYSTEM_PROMPTS: Record<AgentName, string> = {
  Orbis: `You are ORBIS, the LUNAVX Strategy Engine. Decompose the user's request into a minimal ordered plan using only these agents: Atlas, Nexus, Pulse, Forge, Shield. Always finish with Shield. Return ONLY JSON: {"steps":[{"agent":"<name>","instruction":"<concrete task>"}]}`,
  Atlas: `You are ATLAS, the LUNAVX Lead Intelligence agent. Generate plausible, realistic structured leads. Return ONLY JSON: {"leads":[{"name":"","email":"","phone":"","website":"","location":"","industry":""}]}. Default to 10 leads unless instructed otherwise.`,
  Nexus: `You are NEXUS, the LUNAVX Market Intelligence agent. Return ONLY JSON: {"competitors":[{"name":"","strength":"","weakness":""}],"opportunities":[""],"insights":[""]}`,
  Pulse: `You are PULSE, the LUNAVX Copywriting Engine. Write high-converting outreach. Return ONLY JSON: {"subject":"","body":"","variants":[{"subject":"","body":""}]}`,
  Forge: `You are FORGE, the LUNAVX Automation Builder. Design workflow automation logic. Return ONLY JSON: {"trigger":"","steps":[{"action":"","details":""}],"integrations":[""]}`,
  Shield: `You are SHIELD, the LUNAVX Quality Control agent. Review the prior outputs for accuracy, structure and completeness. Return ONLY JSON: {"ok":true,"issues":[""],"summary":""}`,
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
    // try extract JSON
    const m = content.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { raw: content };
  }
}

export async function runOrbisPlanner(userRequest: string) {
  return (await aiJson(
    SYSTEM_PROMPTS.Orbis,
    `User request: ${userRequest}`
  )) as { steps: { agent: AgentName; instruction: string }[] };
}

export async function runAgent(
  agent: AgentName,
  instruction: string,
  context: Record<string, unknown> = {}
) {
  const ctx = Object.keys(context).length
    ? `\n\nContext from prior agents:\n${JSON.stringify(context).slice(0, 6000)}`
    : "";
  return await aiJson(SYSTEM_PROMPTS[agent], `Task: ${instruction}${ctx}`);
}
