import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Weekly cap per plan. -1 = unlimited.
// FREE BETA: payments temporarily disabled — generous caps for all plans.
const PLAN_WEEKLY_CAP: Record<string, number> = {
  free: -1,
  starter: -1,
  pro: -1,
  agency: -1,
};

type WeeklyInput = {
  businessName?: string;
  businessType?: string;
  location?: string;
  audience?: string;
  tone?: string;
  snapshot?: { vibe?: string; angle?: string; style?: string };
  // Regenerate a single day (1-7). When provided, does not consume weekly cap.
  regenerateDay?: number;
};

const DAYS = [
  { n: 1, name: "Monday",    focus: "Instagram caption + hook + image idea + hashtags (intro the week — set the tone)" },
  { n: 2, name: "Tuesday",   focus: "Instagram caption + hook + a small promo idea (light commercial)" },
  { n: 3, name: "Wednesday", focus: "Customer engagement post — a question or poll that invites replies" },
  { n: 4, name: "Thursday",  focus: "Promotional post — a clearer offer with a real action" },
  { n: 5, name: "Friday",    focus: "Story or Reel idea — short-form video concept (shot list, 1 line VO)" },
  { n: 6, name: "Saturday",  focus: "Review-style content — a real-customer-voice snippet to share/repost" },
  { n: 7, name: "Sunday",    focus: "Community / local vibe post — neighborhood, weekend, slower energy" },
];

const SYSTEM_PROMPT = `Return ONLY a valid JSON object. No markdown. No code fences. No commentary.`;

function dayJsonShape(dayNum: number) {
  return `{
  "day": ${dayNum},
  "name": "Monday|Tuesday|...",
  "theme": "short label e.g. 'Soft launch the week'",
  "caption": "Instagram caption (1-3 short paragraphs)",
  "hook": "spoken-out-loud opener for a Reel/TikTok",
  "imageIdea": "concrete image / shot description",
  "hashtags": ["#tag", "#tag", "#tag", "#tag", "#tag"],
  "promo": "promo idea — plain, operational. empty string if not applicable",
  "engagement": "engagement prompt (poll/question). empty string if not applicable",
  "story": "story or reel concept (1-3 lines). empty string if not applicable",
  "review": "real-customer-voice snippet. empty string if not applicable",
  "community": "community / local vibe note. empty string if not applicable",
  "cta": "single short CTA the business should use that day"
}`;
}

function buildWeeklyPrompt(opts: {
  businessName: string;
  businessType: string;
  location: string;
  audience: string;
  tone: string;
  snap: { vibe: string; angle: string; style: string };
  onlyDay: number | null;
}) {
  const { businessName, businessType, location, audience, tone, snap, onlyDay } = opts;
  const daysToWrite = onlyDay
    ? DAYS.filter((d) => d.n === onlyDay)
    : DAYS;

  const dayList = daysToWrite
    .map((d) => `- Day ${d.n} (${d.name}): ${d.focus}`)
    .join("\n");

  const shapeArray = daysToWrite.map((d) => dayJsonShape(d.n)).join(",\n    ");

  return `You are a senior local-marketing strategist building a 7-day content plan for a real small business. The plan must read like a real marketing system — not random AI text.

BUSINESS DETAILS:
${businessName ? `- Business Name: ${businessName}` : ""}
- Type: ${businessType}
- City/Location: ${location}
${audience ? `- Target Audience: ${audience}` : ""}
- Tone: ${tone}
${snap.vibe ? `\nBRAND PERSONALITY SNAPSHOT (use silently — do NOT quote it back):\n- Vibe: ${snap.vibe}\n- Angle: ${snap.angle}\n- Voice/style: ${snap.style}\n` : ""}
CRITICAL IDENTITY RULE:
${businessName
  ? `- The business name is "${businessName}". Use this EXACT name — same spelling, same casing — every time a brand name appears. Never alter it, abbreviate it, or invent a variant.`
  : `- Invent ONE realistic local business name (derived from the type and city). LOCK IT IN. Reuse the EXACT same name across every day.`}
- Never output [Business Name], [Your City], [LINK], [CTA], or any placeholder.

WEEKLY STRATEGY RULES:
1. The 7 days must feel like a real CONTENT CALENDAR, not 7 disconnected posts. There should be a soft narrative arc across the week (e.g. set the tone Mon, build engagement mid-week, push offer Thu, lean community Sun).
2. Each day has a DIFFERENT format and energy — no two days should sound the same. Vary sentence length, opening style, and emotional tone.
3. Every output is rooted in concrete real-life details (a specific drink, a chair, a Tuesday afternoon, the rain, a regular's name, a local street) — never abstract "moments that matter" filler.
4. Match the tone consistently across the week, but let it BREATHE — friendly stays warm, professional stays clear, funny stays specifically witty (no random emoji), luxury stays understated and grounded (NOT poetic, NOT manifesto).
5. Local references should feel natural — a neighborhood vibe, a season, a local habit. Skip if forced.
6. Promos and CTAs are practical and operational — what a real owner would actually run, not agency campaign names.

DAYS TO WRITE:
${dayList}

DAY-BY-DAY GUIDANCE:
- Monday — set the tone for the week. Caption is welcoming/intro, image idea is bright/inviting. Hashtags are a balanced mix.
- Tuesday — keep building. Caption + hook + a small, light promo (e.g. "first 10 today get…"). Don't go heavy on selling yet.
- Wednesday — engagement. The "engagement" field carries the post (a real question, "this or that", a poll). Caption supports it.
- Thursday — promotional. A clearer offer with a real action ("show this post", "reply YES", "tap to claim"). Operational language only.
- Friday — story/reel. The "story" field carries a 1-3 line concept: shot list, what the camera sees, 1 line of voiceover.
- Saturday — review-style. The "review" field is a short, real-sounding customer-voice snippet (NOT owner voice). Caption introduces or contextualizes it.
- Sunday — community/local. The "community" field is the heart of the post — neighborhood, weekend, slower energy. No selling.

FIELD RULES:
- caption: always populated, IG-ready (1-3 short paragraphs, max ~80 words, 0-2 emojis).
- hook: always populated, spoken-out-loud, < 14 words.
- imageIdea: always populated, concrete and shootable on a phone.
- hashtags: always 5 tags — 2 hyper-local (city/neighborhood for ${location}), 2 industry (${businessType}), 1 broader.
- promo, engagement, story, review, community: only populate the ones relevant to that day's focus. Use "" for the rest.
- cta: always a short, real action ("show this post", "reply YES", "save this", "tap to claim", etc.).

OUTPUT — return ONLY this raw JSON. No markdown, no code fences, no commentary:
{
  "days": [
    ${shapeArray}
  ]
}`;
}

export const Route = createFileRoute("/api/generate-weekly-plan")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        };
        try {
          const body = (await request.json()) as WeeklyInput;
          const businessName = (body.businessName || "").toString().slice(0, 120).trim();
          const businessType = (body.businessType || "").toString().slice(0, 200).trim();
          const location = (body.location || "").toString().slice(0, 200).trim();
          const audience = (body.audience || "locals").toString().slice(0, 200).trim();
          const tone = (body.tone || "friendly").toString().slice(0, 50).trim();
          const snap = body.snapshot || {};
          const snapshot = {
            vibe: (snap.vibe || "").toString().slice(0, 240).trim(),
            angle: (snap.angle || "").toString().slice(0, 240).trim(),
            style: (snap.style || "").toString().slice(0, 240).trim(),
          };
          const regenerateDayRaw = Number(body.regenerateDay);
          const onlyDay =
            Number.isInteger(regenerateDayRaw) && regenerateDayRaw >= 1 && regenerateDayRaw <= 7
              ? regenerateDayRaw
              : null;

          if (!businessType || !location) {
            return new Response(
              JSON.stringify({ error: "businessType and location are required" }),
              { status: 400, headers: cors },
            );
          }

          // Auth
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Sign in required" }), { status: 401, headers: cors });
          }
          const token = authHeader.slice("Bearer ".length).trim();
          if (!token) {
            return new Response(JSON.stringify({ error: "Sign in required" }), { status: 401, headers: cors });
          }
          // Verify JWT signature server-side via Supabase Auth (not just base64 decode).
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          const userId = userData?.user?.id;
          if (userErr || !userId) {
            return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: cors });
          }

          // ===== Rate limit: 10 requests per hour per user =====
          const { data: rlAllowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_rate_limit",
            {
              p_user_id: userId,
              p_route: "generate-weekly-plan",
              p_max_requests: 10,
              p_window_seconds: 3600,
            },
          );
          if (rlErr) {
            console.error("[generate-weekly-plan] rate limit check failed");
            return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), { status: 503, headers: cors });
          }
          if (!rlAllowed) {
            return new Response(JSON.stringify({ error: "Too many requests. Please wait a bit and try again." }), { status: 429, headers: cors });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("plan")
            .eq("user_id", userId)
            .maybeSingle();
          const planRaw = (profile?.plan as string | undefined) || "free";
          const weeklyCap = PLAN_WEEKLY_CAP[planRaw] ?? 1;
          const isUnlimited = weeklyCap < 0;

          // Single-day regeneration is a Pro+ feature
          if (onlyDay && !isUnlimited) {
            return new Response(
              JSON.stringify({
                error: "Regenerating a single day is a Pro feature. Upgrade for unlimited weekly plans and per-day refresh.",
                code: "upgrade_required",
                suggestedPlan: "pro",
              }),
              { status: 403, headers: cors },
            );
          }

          // Consume weekly cap only for full-plan generation
          if (!onlyDay) {
            const { data: consumeRows, error: consumeErr } = await (supabaseAdmin as any).rpc(
              "try_consume_weekly_plan",
              { user_uuid: userId, weekly_cap: weeklyCap },
            );
            if (consumeErr) {
              console.error("weekly usage rpc error", consumeErr);
              return new Response(JSON.stringify({ error: "Usage check failed" }), { status: 500, headers: cors });
            }
            const row = Array.isArray(consumeRows) ? consumeRows[0] : consumeRows;
            if (row && row.allowed === false) {
              return new Response(
                JSON.stringify({
                  error: `You've used your weekly plan on the Starter plan. Upgrade to Pro for unlimited weekly plans.`,
                  code: "limit_reached",
                  used: row.used,
                  cap: row.cap,
                  suggestedPlan: "pro",
                }),
                { status: 402, headers: cors },
              );
            }
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: cors });
          }

          const userPrompt = buildWeeklyPrompt({
            businessName,
            businessType,
            location,
            audience,
            tone,
            snap: snapshot,
            onlyDay,
          });

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (!aiRes.ok) {
            const text = await aiRes.text();
            console.error("AI gateway error", aiRes.status, text);
            if (aiRes.status === 429) {
              return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: cors });
            }
            if (aiRes.status === 402) {
              return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }), { status: 402, headers: cors });
            }
            return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: cors });
          }

          const aiJson = await aiRes.json();
          const content: string = aiJson?.choices?.[0]?.message?.content ?? "{}";
          let parsed: any;
          try {
            parsed = JSON.parse(content);
          } catch {
            console.error("Failed to parse weekly plan JSON:", content);
            return new Response(JSON.stringify({ error: "Invalid AI response" }), { status: 502, headers: cors });
          }

          // Normalize: ensure days are sorted and named
          const days = Array.isArray(parsed?.days) ? parsed.days : [];
          const normalized = days
            .map((d: any) => {
              const nRaw = Number(d?.day);
              const n = Number.isInteger(nRaw) && nRaw >= 1 && nRaw <= 7 ? nRaw : 0;
              const meta = DAYS.find((x) => x.n === n);
              return {
                day: n,
                name: meta?.name || d?.name || "",
                theme: d?.theme || "",
                caption: d?.caption || "",
                hook: d?.hook || "",
                imageIdea: d?.imageIdea || "",
                hashtags: Array.isArray(d?.hashtags) ? d.hashtags.slice(0, 8) : [],
                promo: d?.promo || "",
                engagement: d?.engagement || "",
                story: d?.story || "",
                review: d?.review || "",
                community: d?.community || "",
                cta: d?.cta || "",
              };
            })
            .filter((d: any) => d.day >= 1 && d.day <= 7)
            .sort((a: any, b: any) => a.day - b.day);

          return new Response(JSON.stringify({ days: normalized }), { status: 200, headers: cors });
        } catch (err) {
          console.error("generate-weekly-plan error", err);
          return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: cors });
        }
      },
    },
  },
});
