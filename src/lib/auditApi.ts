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
  score: number; // 0–100
  grade: "Excellent" | "Good" | "Fair" | "Needs work" | "Critical";
  headline: string; // one sentence summary
  fixes: [AuditFix, AuditFix, AuditFix]; // always exactly 3
}

export interface AuditResult {
  businessName: string;
  industry: string;
  generatedAt: string;
  overallScore: number;
  overallGrade: string;
  executiveSummary: string;
  revenueOpportunity: string; // e.g. "$2,000–$6,000/mo"
  revenueOpportunityDetail: string;
  categories: {
    visibility: AuditCategory;
    reputation: AuditCategory;
    leadCapture: AuditCategory;
    conversion: AuditCategory;
  };
  topWin: string; // the single highest-leverage action
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
    "visibility": {
      "score": <number>,
      "headline": "<1 sentence>",
      "fixes": [
        { "text": "<fix 1>", "effort": "quick", "impact": "high" },
        { "text": "<fix 2>", "effort": "medium", "impact": "high" },
        { "text": "<fix 3>", "effort": "strategic", "impact": "medium" }
      ]
    },
    "reputation": {
      "score": <number>,
      "headline": "<1 sentence>",
      "fixes": [
        { "text": "<fix 1>", "effort": "quick", "impact": "high" },
        { "text": "<fix 2>", "effort": "medium", "impact": "high" },
        { "text": "<fix 3>", "effort": "strategic", "impact": "medium" }
      ]
    },
    "leadCapture": {
      "score": <number>,
      "headline": "<1 sentence>",
      "fixes": [
        { "text": "<fix 1>", "effort": "quick", "impact": "high" },
        { "text": "<fix 2>", "effort": "medium", "impact": "high" },
        { "text": "<fix 3>", "effort": "strategic", "impact": "medium" }
      ]
    },
    "conversion": {
      "score": <number>,
      "headline": "<1 sentence>",
      "fixes": [
        { "text": "<fix 1>", "effort": "quick", "impact": "high" },
        { "text": "<fix 2>", "effort": "medium", "impact": "high" },
        { "text": "<fix 3>", "effort": "strategic", "impact": "medium" }
      ]
    }
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

function addGrades(raw: Omit<AuditResult, "businessName" | "industry" | "generatedAt" | "overallGrade" | "agentsUsed"> & { categories: Record<string, Omit<AuditCategory, "grade">> }, input: AuditInput): AuditResult {
  const cats = raw.categories as Record<string, AuditCategory>;
  (Object.keys(cats) as Array<keyof typeof cats>).forEach((k) => {
    cats[k].grade = GRADE(cats[k].score);
  });

  return {
    ...raw,
    categories: cats as AuditResult["categories"],
    businessName: input.businessName,
    industry: input.industry,
    generatedAt: new Date().toISOString(),
    overallGrade: GRADE(raw.overallScore),
    agentsUsed: ["Atlas", "Nexus", "Pulse", "Shield", "Aether"],
  };
}

export async function runBusinessAudit(input: AuditInput): Promise<AuditResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Audit API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const rawText: string = data.content
    .map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();

  // Strip any accidental markdown fences
  const clean = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let parsed: ReturnType<typeof JSON.parse>;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("Audit returned invalid JSON. Please try again.");
  }

  return addGrades(parsed, input);
}
