import { createServerFn } from "@tanstack/react-start";

export type Industry =
  | "HVAC"
  | "Plumbing"
  | "Roofing"
  | "Cleaning"
  | "Landscaping"
  | "Salon"
  | "Electrician"
  | "Pest Control"
  | "Painting"
  | "Other";

export interface AuditInput {
  businessName: string;
  industry: Industry | string;
  websiteUrl?: string;
  city?: string;
}

export interface AuditFix {
  text: string;
  effort: "quick" | "medium" | "strategic";
  impact: "high" | "medium" | "low";
}

export interface AuditCategory {
  score: number;
  grade: "Excellent" | "Good" | "Fair" | "Needs work" | "Critical";
  headline: string;
  fixes: [AuditFix, AuditFix, AuditFix];
}

export interface AuditResult {
  businessName: string;
  industry: string;
  generatedAt: string;
  overallScore: number;
  overallGrade: string;
  executiveSummary: string;
  revenueOpportunity: string;
  revenueOpportunityDetail: string;
  categories: {
    visibility: AuditCategory;
    reputation: AuditCategory;
    leadCapture: AuditCategory;
    conversion: AuditCategory;
  };
  topWin: string;
  agentsUsed: string[];
}

const GRADE = (score: number): AuditCategory["grade"] => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 35) return "Needs work";
  return "Critical";
};

const SYSTEM_PROMPT = `You are a local business growth analyst working for Lunavex AI. Your job is to audit a local service business and return a JSON report scored across 4 categories.

RULES:
- Return ONLY valid JSON. No markdown, no preamble, no explanation.
- All fixes must be specific to the business's industry — never generic. Mention the industry by name.
- Fix text should be 1–2 sentences, actionable, plain English. Write as if explaining to the business owner in person.
- Scores must vary realistically — most local businesses score 35–75. Perfect scores (90+) are rare.
- revenueOpportunity must be a dollar range string like "$1,500–$4,000/mo".
- executiveSummary is 2–3 sentences, friendly but direct, mentions the business name.

RETURN THIS EXACT JSON SHAPE:
{
  "overallScore": <number 0-100>,
  "executiveSummary": "<string>",
  "revenueOpportunity": "<string like $X–$Y/mo>",
  "revenueOpportunityDetail": "<1 sentence explaining how>",
  "topWin": "<single most impactful action, 1 sentence>",
  "categories": {
    "visibility":  { "score": <number>, "headline": "<1 sentence>", "fixes": [ { "text": "<fix>", "effort": "quick", "impact": "high" }, { "text": "<fix>", "effort": "medium", "impact": "high" }, { "text": "<fix>", "effort": "strategic", "impact": "medium" } ] },
    "reputation":  { "score": <number>, "headline": "<1 sentence>", "fixes": [ { "text": "<fix>", "effort": "quick", "impact": "high" }, { "text": "<fix>", "effort": "medium", "impact": "high" }, { "text": "<fix>", "effort": "strategic", "impact": "medium" } ] },
    "leadCapture": { "score": <number>, "headline": "<1 sentence>", "fixes": [ { "text": "<fix>", "effort": "quick", "impact": "high" }, { "text": "<fix>", "effort": "medium", "impact": "high" }, { "text": "<fix>", "effort": "strategic", "impact": "medium" } ] },
    "conversion":  { "score": <number>, "headline": "<1 sentence>", "fixes": [ { "text": "<fix>", "effort": "quick", "impact": "high" }, { "text": "<fix>", "effort": "medium", "impact": "high" }, { "text": "<fix>", "effort": "strategic", "impact": "medium" } ] }
  }
}`;

function buildUserPrompt(input: AuditInput): string {
  const parts = [
    `Business name: ${input.businessName}`,
    `Industry: ${input.industry}`,
    input.websiteUrl ? `Website: ${input.websiteUrl}` : "Website: none provided",
    input.city ? `City: ${input.city}` : "",
  ].filter(Boolean);
  return `Audit this local service business and return the JSON report:\n\n${parts.join("\n")}`;
}

type RawCategory = Omit<AuditCategory, "grade">;
interface RawAudit {
  overallScore: number;
  executiveSummary: string;
  revenueOpportunity: string;
  revenueOpportunityDetail: string;
  topWin: string;
  categories: {
    visibility: RawCategory;
    reputation: RawCategory;
    leadCapture: RawCategory;
    conversion: RawCategory;
  };
}

function addGrades(raw: RawAudit, input: AuditInput): AuditResult {
  const withGrade = (c: RawCategory): AuditCategory => ({ ...c, grade: GRADE(c.score) });
  return {
    businessName: input.businessName,
    industry: input.industry,
    generatedAt: new Date().toISOString(),
    overallScore: raw.overallScore,
    overallGrade: GRADE(raw.overallScore),
    executiveSummary: raw.executiveSummary,
    revenueOpportunity: raw.revenueOpportunity,
    revenueOpportunityDetail: raw.revenueOpportunityDetail,
    topWin: raw.topWin,
    categories: {
      visibility: withGrade(raw.categories.visibility),
      reputation: withGrade(raw.categories.reputation),
      leadCapture: withGrade(raw.categories.leadCapture),
      conversion: withGrade(raw.categories.conversion),
    },
    agentsUsed: ["Atlas", "Nexus", "Pulse", "Shield", "Aether"],
  };
}

const auditServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): AuditInput => {
    const d = (data ?? {}) as Partial<AuditInput>;
    if (!d.businessName || typeof d.businessName !== "string") throw new Error("businessName required");
    if (!d.industry || typeof d.industry !== "string") throw new Error("industry required");
    return {
      businessName: d.businessName,
      industry: d.industry,
      websiteUrl: typeof d.websiteUrl === "string" ? d.websiteUrl : undefined,
      city: typeof d.city === "string" ? d.city : undefined,
    };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(data) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Audit API error ${res.status}: ${txt}`);
    }

    const payload = await res.json();
    const content: string = payload?.choices?.[0]?.message?.content ?? "";
    const clean = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: RawAudit;
    try {
      parsed = JSON.parse(clean) as RawAudit;
    } catch {
      throw new Error("Audit returned invalid JSON. Please try again.");
    }

    return addGrades(parsed, data);
  });

export async function runBusinessAudit(input: AuditInput): Promise<AuditResult> {
  return auditServerFn({ data: input });
}
