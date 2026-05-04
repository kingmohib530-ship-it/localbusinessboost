import { createFileRoute } from "@tanstack/react-router";

type GenerateInput = {
  businessType?: string;
  location?: string;
  audience?: string;
  tone?: string;
};

const SYSTEM_PROMPT = `Return ONLY a valid JSON object. No markdown. No code fences. No commentary.`;

export const Route = createFileRoute("/api/generate-content")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        const cors = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        };
        try {
          const body = (await request.json()) as GenerateInput;
          const businessType = (body.businessType || "").toString().slice(0, 200).trim();
          const location = (body.location || "").toString().slice(0, 200).trim();
          const audience = (body.audience || "locals").toString().slice(0, 200).trim();
          const tone = (body.tone || "friendly").toString().slice(0, 50).trim();

          if (!businessType || !location) {
            return new Response(
              JSON.stringify({ error: "businessType and location are required" }),
              { status: 400, headers: cors },
            );
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI not configured" }), {
              status: 500,
              headers: cors,
            });
          }

          const biz = businessType;
          const loc = location;
          const aud = audience;
          const safeTone = tone;
          const userPrompt = `You are a top-tier local marketing copywriter who writes for real small businesses — not templates, not demos. Your work sounds human, lived-in, and unmistakably local.

BUSINESS DETAILS:
- Type: ${biz}
- City/Location: ${loc}
${aud ? `- Target Audience: ${aud}` : ""}
- Tone: ${safeTone}

STEP 0 — CRITICAL IDENTITY RULE (DO THIS FIRST, BEFORE ANY OTHER OUTPUT):
- Generate ONE consistent business name for this entire response. Derive it directly from the business type (${biz}) and city (${loc}) — it must feel like it could only belong to this business in this place.
- It should sound like a real local spot a regular would name-drop (e.g. "Rosewood Cuts", "Crown & Bean", "Elm Street Wash"). Avoid clichés like "The [Adjective] [Noun] Co." unless it genuinely fits.
- LOCK THAT NAME IN. You MUST reuse the EXACT same name — same spelling, same casing, same wording — in every review reply, caption, hook, promo, and SMS where a name appears.
- NEVER invent a new name mid-response. NEVER use multiple brand names in the same session. If you catch a second name slipping in, stop and replace it with the locked name.
- Never output [Business Name], [Your City], [LINK], [CTA], "your business", or any placeholder. Always use the locked name or rewrite the sentence.

TONE GUIDE — apply consistently across every output:
- friendly: warm, neighbor-next-door, contractions, slight casualness.
- professional: confident, polished, human, no jargon, no fluff.
- funny: dry, witty, specific observations — never random emoji spam.
- luxury: unhurried, sensory, aspirational, never desperate.

ABSOLUTE RULES:
1. Same invented business name appears in EVERY section. Same vibe and voice across all sections.
2. No filler ("amazing team", "we pride ourselves", "second to none", "passionate about quality"). Show specifics instead.
3. Local references should feel natural — a neighborhood, a season, a local habit. Skip it if it would feel forced. Never name-drop landmarks you can't be sure exist.
4. Vary sentence length and rhythm. Avoid the polished "AI cadence" where every sentence is the same length and structure.
5. Light imperfection is good: contractions, sentence fragments, a stray "honestly" or "tbh" where it fits the tone.

SECTION RULES:

GOOGLE REVIEW REPLIES (3) — replies FROM the owner TO imagined customers:
- Each reply has a DIFFERENT personality: e.g. (a) short, warm, off-the-cuff; (b) longer, detailed, references something specific the customer might have mentioned; (c) friendly nudge to come back, mentions something new or upcoming.
- Reference a believable detail (a drink, a stylist's name, a window seat, the Saturday rush). Use the invented business name at least once across the set.
- Only ONE reply may start with "Thank you". Do not sound like a support bot. No emojis unless the tone calls for it.

INSTAGRAM CAPTIONS (5) — must read like real posts a small business would actually publish:
- Vary the structures across the five: (1) short story / moment, (2) bold one-liner opinion, (3) question to the audience, (4) short list or breakdown using line breaks, (5) behind-the-scenes / POV.
- Sound like a human running the account, not a brand manual. 0–2 emojis per caption max. No emoji walls.
- Soft CTA at the end only when it fits — a question or a casual nudge. Don't force "Link in bio" or "DM us" every time.
- Mention the invented business name in at least 2 of the 5 captions.

HOOKS (5) — first lines for Reels/TikToks, meant to be SPOKEN:
- Conversational, punchy, curiosity-driven. The kind of opener a real person would say to camera.
- Specific to ${biz}. A hook that could fit any business is a fail.
- Mix types: a bold claim, a confession, a question, a "POV:", a "nobody talks about…".

HASHTAGS (10):
- 3 hyper-local (city/neighborhood/region tied to ${loc})
- 4 industry-specific to ${biz}
- 3 broader discovery tags (e.g. #SmallBusiness, #SupportLocal)
- All start with #, no spaces, no punctuation inside the tag.

PROMOS (3) — must feel like real local campaigns a small business would actually run:
- Each has a real campaign-style label (e.g. "The Morning Ritual Pass", "Bring-a-Neighbor Friday", "First-Timer Flight").
- Each "text" describes HOW it works, WHAT the customer gets, and WHY it makes them act.
- Across the three, cover at least: ONE urgency/scarcity play (this weekend only, first 20 customers, today), ONE referral/sharing/social mechanic, and ONE repeat-visit/loyalty mechanic.
- No generic "10% off everything." Mechanics must be specific to ${biz}.

SMS (3) — texts FROM the business owner TO a customer who already knows the place:
- Each strictly under 160 characters. Count.
- Sounds like a human texting, not an automated blast. Light contractions, no all-caps shouting, no "Dear customer".
- Each MUST include a real action trigger word: today, tonight, this weekend, now, last 5 spots, ends Sunday, etc.
- End with a clear, real action — "reply YES", "show this text", "tap to grab one", "first come first served". Never "[LINK]".
- Use the invented business name in at least one of the three.

OUTPUT — return ONLY this raw JSON. No markdown, no code fences, no commentary:
{
  "reviews": ["string", "string", "string"],
  "captions": ["string", "string", "string", "string", "string"],
  "hooks": ["string", "string", "string", "string", "string"],
  "hashtags": ["#tag", "#tag", "#tag", "#tag", "#tag", "#tag", "#tag", "#tag", "#tag", "#tag"],
  "promos": [
    { "label": "string", "text": "string" },
    { "label": "string", "text": "string" },
    { "label": "string", "text": "string" }
  ],
  "sms": ["string", "string", "string"]
}`;

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
              return new Response(
                JSON.stringify({ error: "Rate limit reached. Please try again shortly." }),
                { status: 429, headers: cors },
              );
            }
            if (aiRes.status === 402) {
              return new Response(
                JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }),
                { status: 402, headers: cors },
              );
            }
            return new Response(JSON.stringify({ error: "AI request failed" }), {
              status: 500,
              headers: cors,
            });
          }

          const aiJson = await aiRes.json();
          const content: string = aiJson?.choices?.[0]?.message?.content ?? "{}";
          let parsed: unknown;
          try {
            parsed = JSON.parse(content);
          } catch {
            console.error("Failed to parse AI JSON:", content);
            return new Response(JSON.stringify({ error: "Invalid AI response" }), {
              status: 502,
              headers: cors,
            });
          }

          return new Response(JSON.stringify(parsed), { status: 200, headers: cors });
        } catch (err) {
          console.error("generate-content error", err);
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: cors,
          });
        }
      },
    },
  },
});
