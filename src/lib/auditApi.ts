import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkWebsite, describeTechnicalCheck, type WebsiteTechnicalCheck } from "@/lib/websiteChecks.server";
import { sendExternalEmail } from "@/lib/email.server";

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
  technicalCheck: WebsiteTechnicalCheck;
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
- A real technical scan of the business's website is provided below (if a website was given). These are measured facts, not your judgment — you MUST NOT contradict them. If SSL is invalid, missing meta tags, or the site is unreachable, that MUST show up as a concrete, specific fix in "visibility" or "conversion" (whichever fits best) referencing the actual finding (e.g. "Your site has no SSL certificate, which Chrome flags as 'Not Secure' and both scares off visitors and hurts your Google ranking."). If no website was provided at all, the visibility/leadCapture scores should reflect that as a serious gap.
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

function buildUserPrompt(input: AuditInput, technicalCheck: WebsiteTechnicalCheck): string {
  const parts = [
    `Business name: ${input.businessName}`,
    `Industry: ${input.industry}`,
    input.websiteUrl ? `Website: ${input.websiteUrl}` : "Website: none provided",
    input.city ? `City: ${input.city}` : "",
    describeTechnicalCheck(technicalCheck),
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

function addGrades(raw: RawAudit, input: AuditInput, technicalCheck: WebsiteTechnicalCheck): AuditResult {
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
    technicalCheck,
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

    // Real, measured facts (SSL, load time, meta tags) — not AI-fabricated —
    // fed into the prompt below as ground truth the model can't contradict.
    const technicalCheck = await checkWebsite(data.websiteUrl);

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
          { role: "user", content: buildUserPrompt(data, technicalCheck) },
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

    return addGrades(parsed, data, technicalCheck);
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

function renderAuditReportEmail(result: AuditResult): { subject: string; text: string; html: string } {
  const cats = Object.entries(result.categories) as Array<[string, AuditCategory]>;
  const catLabel: Record<string, string> = {
    visibility: "Visibility",
    reputation: "Reputation",
    leadCapture: "Lead Capture",
    conversion: "Conversion",
  };

  const textSections = cats.map(([key, cat]) => {
    const fixes = cat.fixes.map((f, i) => `  ${i + 1}. ${f.text}`).join("\n");
    return `${catLabel[key] || key} — ${cat.score}/100 (${cat.grade})\n${cat.headline}\n${fixes}`;
  }).join("\n\n");

  const text = `Your Lanavix Business Audit — ${result.businessName}

Overall score: ${result.overallScore}/100 (${result.overallGrade})
${result.executiveSummary}

Revenue opportunity: ${result.revenueOpportunity}
${result.revenueOpportunityDetail}

Top win: ${result.topWin}

${textSections}

— Lanavix (https://www.lanavix.com)`;

  const htmlSections = cats.map(([key, cat]) => {
    const fixes = cat.fixes.map((f) => `<li style="margin-bottom:8px;">${f.text}</li>`).join("");
    return `<h3 style="margin:24px 0 4px;color:#0F172A;">${catLabel[key] || key} — ${cat.score}/100 (${cat.grade})</h3>
<p style="color:#475569;font-style:italic;margin:0 0 8px;">${cat.headline}</p>
<ol style="color:#0F172A;padding-left:20px;margin:0;">${fixes}</ol>`;
  }).join("");

  const html = `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#0F172A;">
<h1 style="font-size:22px;margin-bottom:4px;">Your Lanavix Business Audit</h1>
<p style="color:#475569;margin-top:0;">${result.businessName}</p>
<p style="font-size:32px;font-weight:800;margin:16px 0 0;">${result.overallScore}/100 <span style="font-size:16px;font-weight:600;color:#475569;">(${result.overallGrade})</span></p>
<p style="color:#475569;">${result.executiveSummary}</p>
<div style="background:#ECFDF5;border:1px solid rgba(16,185,129,.25);border-radius:12px;padding:16px;margin:16px 0;">
  <strong>Revenue opportunity: ${result.revenueOpportunity}</strong>
  <p style="margin:4px 0 0;color:#047857;">${result.revenueOpportunityDetail}</p>
</div>
<div style="background:#EEF2FF;border-radius:12px;padding:16px;margin:16px 0;">
  <strong>Top win:</strong> ${result.topWin}
</div>
${htmlSections}
<p style="margin-top:32px;color:#94A3B8;font-size:13px;">— Lanavix · <a href="https://www.lanavix.com">lanavix.com</a></p>
</div>`;

  return { subject: `Your Lanavix Business Audit for ${result.businessName} — ${result.overallScore}/100`, text, html };
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

    // Best-effort — sendExternalEmail never throws, and a failed send must
    // never block the unlock the user is waiting on.
    const { subject, text, html } = renderAuditReportEmail(data.result);
    await sendExternalEmail(data.email.trim(), subject, text, html);

    return { success: true as const };
  });

export async function saveAuditLead(input: AuditLeadInput): Promise<{ success: true }> {
  return saveAuditLeadServerFn({ data: input });
}
