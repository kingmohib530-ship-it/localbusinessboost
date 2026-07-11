import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
  city?: string;
  websiteUrl?: string;
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

const SYSTEM_PROMPT = `You are a local business growth analyst working for Lanavix AI. Your job is to audit a local service business and return a JSON report scored across 4 categories.

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
    city: input.city,
    websiteUrl: input.websiteUrl,
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
    // ===== Rate limit by IP: this is a public, unauthenticated marketing =====
    // tool (the free business audit), so there's no signed-in user to key on.
    // 5 audits per hour per IP is generous for a real visitor testing it out,
    // but stops a script from looping and burning the Anthropic key.
    const ip =
      getRequestIP({ xForwardedFor: true }) ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
      "check_anon_rate_limit",
      {
        p_ip_address: ip,
        p_route: "public-audit",
        p_max_requests: 5,
        p_window_seconds: 3600,
      }
    );
    if (rlErr) {
      console.error("[audit] rate limit check failed");
      throw new Error("Service temporarily unavailable. Please try again shortly.");
    }
    if (!allowed) {
      throw new Error(
        "You've reached the limit for free audits right now. Please try again in a bit."
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildUserPrompt(data) },
        ],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Audit API error ${res.status}: ${txt}`);
    }

    const payload = await res.json();
    const content: string = payload?.content?.[0]?.text ?? "";
    const clean = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Audit returned invalid JSON. Please try again.");

    let parsed: RawAudit;
    try {
      parsed = JSON.parse(match[0]) as RawAudit;
    } catch {
      throw new Error("Audit returned invalid JSON. Please try again.");
    }

    return addGrades(parsed, data);
  });

export async function runBusinessAudit(input: AuditInput): Promise<AuditResult> {
  return auditServerFn({ data: input });
}

export interface AuditLeadInput {
  email: string;
  result: AuditResult;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

const saveAuditLeadServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): AuditLeadInput => {
    const d = (data ?? {}) as Partial<AuditLeadInput>;
    if (!d.email || typeof d.email !== "string" || !isValidEmail(d.email)) {
      throw new Error("A valid email address is required");
    }
    if (!d.result || typeof d.result !== "object") {
      throw new Error("Missing audit result");
    }
    return { email: d.email, result: d.result as AuditResult };
  })
  .handler(async ({ data }) => {
    const ip =
      getRequestIP({ xForwardedFor: true }) ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    // Reuse the same anon rate limiter as the audit itself, under its own route key.
    const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
      "check_anon_rate_limit",
      {
        p_ip_address: ip,
        p_route: "audit-lead-capture",
        p_max_requests: 10,
        p_window_seconds: 3600,
      }
    );
    if (rlErr) {
      console.error("[audit-lead] rate limit check failed");
      throw new Error("Service temporarily unavailable. Please try again shortly.");
    }
    if (!allowed) {
      throw new Error("Too many requests. Please wait a bit and try again.");
    }

    const { error: insertErr } = await supabaseAdmin.from("audit_leads").insert({
      email: data.email.trim(),
      business_name: data.result.businessName || null,
      industry: data.result.industry || null,
      city: data.result.city || null,
      website_url: data.result.websiteUrl || null,
      overall_score: data.result.overallScore ?? null,
      revenue_opportunity: data.result.revenueOpportunity || null,
    });

    if (insertErr) {
      console.error("[audit-lead] insert failed", insertErr);
      throw new Error("Couldn't save your email. Please try again.");
    }

    return { success: true as const };
  });

export async function saveAuditLead(input: AuditLeadInput): Promise<{ success: true }> {
  return saveAuditLeadServerFn({ data: input });
}
