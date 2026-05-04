import { createFileRoute } from "@tanstack/react-router";

type GenerateInput = {
  businessType?: string;
  location?: string;
  audience?: string;
  tone?: string;
  mode?: string;
  section?: string;
};

const ALLOWED_SECTIONS = ["reviews", "captions", "hooks", "hashtags", "promos", "sms"] as const;
type SectionKey = (typeof ALLOWED_SECTIONS)[number];

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
          const sectionRaw = (body.section || "").toString().trim().toLowerCase();
          const section: SectionKey | null =
            (ALLOWED_SECTIONS as readonly string[]).includes(sectionRaw)
              ? (sectionRaw as SectionKey)
              : null;

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

TONE BLENDING RULE — tone influences style, it does NOT fully control it. Apply this gradient across sections:
- REVIEWS: stay the MOST human and LEAST stylized. Tone barely shows here — these are real customers, not the brand. Even in luxury or funny tone, reviews stay plain-spoken.
- SMS: always practical and conversational, regardless of tone. Even luxury SMS stays short, direct, and texting-natural — no poetry, no manifesto, no jokes that obscure the action.
- HOOKS: lightly tone-flavored but still spoken-out-loud natural.
- CAPTIONS: tone CAN come through more strongly here, but still social-first (see luxury exception above).
- PROMOS: tone shapes the DESCRIPTION only. The promo NAME stays plain and operational regardless of tone — never stylized, never branded, never poetic. A café owner writing on a chalkboard, not a marketing agency.

ABSOLUTE RULES:
1. Same invented business name appears in EVERY section. Same vibe and voice across all sections.
2. No filler ("amazing team", "we pride ourselves", "second to none", "passionate about quality"). Show specifics instead.
3. Local references should feel natural — a neighborhood, a season, a local habit. Skip it if it would feel forced. Never name-drop landmarks you can't be sure exist.
4. Vary sentence length and rhythm. Avoid the polished "AI cadence" where every sentence is the same length and structure.
5. Light imperfection is good: contractions, sentence fragments, a stray "honestly" or "tbh" where it fits the tone.

SECTION PERSONALITY SEPARATION (CRITICAL — do not let tone bleed between sections):
Each field in the JSON must read like it was written by a DIFFERENT person inside the business. Different role, different vocabulary, different rhythm. If two sections sound interchangeable, you've failed this rule.
- reviews → REAL CUSTOMERS. Imperfect, emotional, slightly inconsistent in tone across the 3. Phone-typed, not edited. Never sounds like the brand.
- captions → SOCIAL MEDIA MANAGER. Scroll-stopping, varied formats across the 5 (a one-liner, a fragment, a quick observation, a soft CTA, etc.). Never repeats its own structure twice in a row.
- hooks → VIRAL CONTENT STRATEGIST. Spoken-out-loud, short, punchy, curiosity-driven. Built to stop a thumb in the first 1.5 seconds. No full sentences when a fragment is sharper.
- hashtags → SEO / DATA ASSISTANT. Structured, deliberate, not creative writing. No puns, no inside jokes, no "creative" tags. Pure discoverability.
- promos → REAL ${biz} OWNER scribbling offers on a chalkboard. Plain, operational, practical. Zero branding language. Zero poetry.
- sms → BUSINESS OWNER directly texting a customer they know. Short, urgent, natural — like a real text, not a marketing blast.

ANTI-BLEED ENFORCEMENT:
- A phrase that fits in captions must NOT appear in reviews. A phrase that fits in promos must NOT appear in hooks. Etc.
- Vary phrasing across sections — no repeated openers, no repeated adjectives, no repeated sentence shapes between sections.
- Within each array, vary sentence structure too — don't ship 3 reviews that all start with the same beat, or 5 captions that all use the same rhythm.
- Avoid generic AI filler ("we pride ourselves", "second to none", "experience the difference", "elevate your", "discover", "unlock"). If you catch yourself writing it, rewrite.

SECTION RULES:

CUSTOMER REVIEWS (3) — written BY real customers, like actual Google/Yelp reviews (NOT owner replies, NOT staff voice):
- Each review has a DIFFERENT personality, intensity, and writing style: e.g. (a) short, casual, almost lazy ("went here last weekend, was actually really good"), (b) longer, detailed, slightly rambling regular who lists 2–3 specific things they liked, (c) a slightly mixed but mostly positive review where they note one tiny gripe and still recommend it.
- HUMAN VARIATION RULE (mandatory): the 3 reviews must NOT all sound equally calm/neutral. At least ONE review must carry stronger emotion — genuine love ("okay I'm officially obsessed"), mild frustration ("waited way too long but…"), or low-key obsession ("third time this month, send help"). At least ONE review must be extremely casual and slightly unstructured — lowercase start, run-on sentence, a typo or missing punctuation, a thought that jumps. Real customers are inconsistent in tone and intensity; lean into that.
- Sound like real people typing on their phone: contractions, sentence fragments, occasional "tbh", "ngl", "fwiw", a stray comma splice, a missing apostrophe is fine. NOT every review — just natural sprinkles.
- Slight repetition is okay ("really really liked it", "good good vibes"). Casual phrasing welcome.
- Reference a believable specific detail (a drink, a stylist's name, the window seat, the Saturday rush). Mention the locked business name in at least 2 of the 3.
- Avoid corporate hospitality tone, marketing adjectives ("exquisite", "second to none", "phenomenal experience"), and anything that sounds like the owner wrote it. Star ratings, names, and dates are NOT included — just the review text.
- No emojis unless it genuinely fits how a real person would write that review.
- LUXURY-TONE EXCEPTION: even when the tone is "luxury", reviews must still sound like a normal customer typing — NOT poetic, NOT influencer-style, NOT a brand essay. Luxury comes through in PERCEPTION (what they noticed, the quiet details, restraint), not in fancy vocabulary. Real people speak simply even when impressed. BANNED phrases in any review: "next level", "an experience", "blown my mind", "blew me away", "elevated", "a journey", "unmatched", "10/10", "obsessed". Replace them with subtle, understated praise tied to a specific small detail (the lighting, the timing, how quiet it was, how the chair felt, how the espresso was poured).

INSTAGRAM CAPTIONS (5) — must read like real posts a small business would actually publish:
- Write like real Instagram users posting from their phone — NOT like marketers writing campaign copy.
- AT MOST 1–2 of the 5 captions may use a "structured" format (list, "POV:", "Quick guide", numbered breakdown, line-break breakdown). The other 3+ MUST feel spontaneous and conversational — a passing thought, a small moment, an opinion, a quick aside.
- Banned overused openers (do not use more than once across all 5, ideally zero): "POV:", "Quick guide to", "Here's why", "Stop scrolling", "Let me tell you".
- Some captions should feel slightly imperfect on purpose: a sentence fragment, an "anyway", a "honestly", a lowercase start, a thought that trails off. Not all of them — just enough to feel human.
- 0–2 emojis per caption max. No emoji walls. No hashtag dumps inside the caption.
- Soft CTA only when it fits naturally. Don't force "Link in bio" or "DM us" on every post.
- Mention the locked business name in at least 2 of the 5 captions.
- LUXURY-TONE EXCEPTION: when the tone is "luxury", captions must still feel SOCIAL — not poetic, not a brand manifesto, not magazine prose. Luxury = restraint, not complexity. Prefer short, understated, confident lines. A few words can carry more than a paragraph. At least 2 of the 5 captions should feel like spontaneous real posts (a quiet observation, a single image described in one line, a one-word reaction), not crafted marketing copy. BANNED in luxury captions: flowery metaphors, "in a world where…", "where time slows", "an ode to", "crafted for those who", "redefining", and similar manifesto language.
- REAL-LIFE ANCHOR RULE (mandatory for ALL captions, including luxury): every caption must be anchored in something observable and concrete — a coffee order, the time of day, the weather, a small action, a sound, a price, a name on a cup, a song playing, the line out the door, a Tuesday at 3pm. NO abstract phrasing like "quiet contemplation", "elevated moments", "moments that matter", "the art of…", "a feeling you can't describe". If a sentence could be printed on a generic candle, rewrite it. Luxury still follows this rule — subtlety lives in real, specific details (the second espresso, the rain on the window, the chair by the door), NOT in philosophical abstraction.

HOOKS (5) — first lines for Reels/TikToks, meant to be SPOKEN:
- Conversational, punchy, curiosity-driven. The kind of opener a real person would say to camera.
- Specific to ${biz}. A hook that could fit any business is a fail.
- Mix types: a bold claim, a confession, a question, a "POV:", a "nobody talks about…".

HASHTAGS (10):
- 3 hyper-local (city/neighborhood/region tied to ${loc})
- 4 industry-specific to ${biz}
- 3 broader discovery tags (e.g. #SmallBusiness, #SupportLocal)
- All start with #, no spaces, no punctuation inside the tag.

PROMOS (3) — must feel like a busy ${biz} owner writing quick offers for customers, NOT a branding agency:
- NAME RULE (strict): promo names must be simple, everyday language — the kind of thing the owner would write on a chalkboard or say out loud to a regular. Good: "Morning coffee deal", "Bring a friend offer", "Free pastry Friday", "Buy 5 get 1 free", "Weekend special", "Early bird cuts", "Punch card", "Neighbor discount", "$5 lunch special". Bad (NEVER use): "The Connoisseur's Card", "Refinement Card", "Experience Pass", "Curated Connections", "The Morning Ritual", "The Artisan Collective", "An Ode to…", or anything that reads like a campaign, agency tagline, or poetic title. No "The ___" framing. No abstract nouns. No invented brand language. Sentence case is fine — these are not titles.
- DESCRIPTION RULE: the "text" must sound operational and practical, not marketing-heavy. Natural, human, slightly informal, still clear. Structure: simple offer → clear benefit → simple condition. Do NOT exaggerate luxury language in promos, even for a luxury brand — keep it grounded and useful.
- Each "text" explains HOW it works, WHAT the customer gets, and the simple condition (when, where, how to claim).
- Across the three, cover at least: ONE urgency/scarcity play (this weekend only, first 20 customers, today), ONE referral/sharing mechanic, and ONE repeat-visit/loyalty mechanic.
- No generic "10% off everything." Mechanics must be specific to ${biz}.

SMS (3) — texts FROM the business owner TO a customer who already knows the place:
- Each strictly under 160 characters. Count.
- Sounds like a human texting, not an automated blast. Light contractions, no all-caps shouting, no "Dear customer".
- Each MUST include a real action trigger word: today, tonight, this weekend, now, last 5 spots, ends Sunday, etc.
- End with a clear, real action — "reply YES", "show this text", "tap to grab one", "first come first served". Never "[LINK]".
- Use the invented business name in at least one of the three.

${section ? `SECTION-ONLY MODE: regenerate ONLY the "${section}" field with FRESH variations (do not repeat any phrasing the user may have seen before). Apply ALL rules above for that section. Return ONLY this JSON shape — every other field MUST be an empty array:
{
  "reviews": ${section === "reviews" ? `["string", "string", "string"]` : "[]"},
  "captions": ${section === "captions" ? `["string", "string", "string", "string", "string"]` : "[]"},
  "hooks": ${section === "hooks" ? `["string", "string", "string", "string", "string"]` : "[]"},
  "hashtags": ${section === "hashtags" ? `["#tag", "#tag", "#tag", "#tag", "#tag", "#tag", "#tag", "#tag", "#tag", "#tag"]` : "[]"},
  "promos": ${section === "promos" ? `[{ "label": "string", "text": "string" }, { "label": "string", "text": "string" }, { "label": "string", "text": "string" }]` : "[]"},
  "sms": ${section === "sms" ? `["string", "string", "string"]` : "[]"}
}` : `OUTPUT — return ONLY this raw JSON. No markdown, no code fences, no commentary:
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
}`}`;

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
