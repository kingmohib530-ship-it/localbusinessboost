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
          const userPrompt = `You are an elite local business marketing copywriter with 15 years of experience writing for real small businesses. Your copy has been featured in campaigns that drove foot traffic, viral social posts, and loyal repeat customers.

You are writing content for a REAL business. Not a template. Not a demo. A real place with real customers.

BUSINESS DETAILS:
- Type: ${biz}
- City/Location: ${loc}
${aud ? `- Target Audience: ${aud}` : ""}
- Tone: ${safeTone}

TONE GUIDE — apply this consistently across every single output:
- friendly: casual, warm, neighbor-next-door energy. Feels like a text from a friend. Contractions, first names, light humor.
- professional: polished but human. Confident, clear, trustworthy. No jargon. No fluff. Earns respect.
- funny: genuinely witty. Specific observations, not random emoji spam. Dry humor, self-aware, the kind of copy that gets screenshotted and shared.
- luxury: unhurried, elevated, aspirational. Never desperate. Uses sensory language. Implies exclusivity without saying "exclusive."

ABSOLUTE RULES — violating any of these is a failure:
1. NEVER write [Business Name], [Your City], [LINK], [CTA], or any placeholder of any kind. If you need a business name, invent one that sounds real for that business type and location (e.g., "Rosewood Cuts", "Crown & Bean", "Elm Street Wash"). Use it consistently throughout.
2. NEVER write generic filler like "our amazing team" or "we pride ourselves on quality." Show, don't tell.
3. Every piece of content must feel like it was written for THIS specific business in THIS specific city — not a copy-paste template.
4. Weave in local context naturally: reference the city's vibe, neighborhood energy, seasons, local culture, or nearby landmarks where it strengthens the copy. Don't force it.
5. All SMS messages must be 160 characters or fewer, complete, and ready to send right now.
6. Hashtags must include a mix: 3 hyper-local (city/neighborhood), 4 industry-specific, 3 trending/broad reach.

SECTION-BY-SECTION INSTRUCTIONS:

GOOGLE REVIEW REPLIES (3 replies):
- Reply as the real business owner would — grateful, specific, and personal.
- Reference something from the imagined review context (e.g., "So glad the window seat was open for you!").
- Vary the length and style: one short and punchy, one warm and detailed, one that gently promotes return visits.
- Never start more than one reply with "Thank you."
- Do NOT sound like an automated customer service bot.

INSTAGRAM CAPTIONS (5 captions):
- Each caption should stop the scroll. Open with a hook — a question, a bold statement, or a relatable moment.
- Describe the atmosphere, sensory experience, or a specific moment a customer might have at this business.
- Include 1–3 relevant emojis per caption. Not more.
- End with a soft CTA: a question to drive comments, or a nudge to visit/book/order.
- Vary structure: one storytelling-style, one one-liner, one question-led, one list-style, one behind-the-scenes angle.

HOOKS (5 hooks):
- These are standalone first lines for Reels, TikToks, or carousel posts.
- They must create immediate curiosity, FOMO, or a strong emotional reaction.
- Each one should work as a spoken line in a video — conversational, not written.
- Make them specific to the business type. Avoid hooks that could apply to any business.

HASHTAGS (10 tags):
- 3 hyper-local: city name, neighborhood, or regional reference (e.g., #ManassasVA, #NorthernVirginia, #PWClocal)
- 4 industry-specific: what this business does (e.g., #SpecialtyCoffee, #ThirdWaveCoffee, #CafeLife)
- 3 broad reach/trending: higher volume discovery tags (e.g., #SmallBusiness, #SupportLocal, #LocalLove)
- No spaces, no punctuation inside tags, all correctly formatted.

PROMOTION IDEAS (3 promos, each with a label and description):
- Think beyond "10% off." Use creative campaign mechanics tied to the business type.
- Each promo should have a name that sounds like a real campaign (e.g., "The Morning Ritual Pass", "Bring Your Block Deal", "The First Timer's Experience").
- Describe HOW it works, WHAT the customer gets, and WHY it drives action.
- At least one promo should leverage social sharing or referral. At least one should create urgency or scarcity.

SMS MESSAGES (3 messages):
- Write as if texting a customer who already knows the business.
- Natural, brief, direct. No corporate speak.
- Each must include a reason to act NOW (limited time, low availability, today only, etc.).
- End with a real-feeling action signal — not "[LINK]" but something like "reply YES to grab your spot" or "show this text when you arrive."
- Maximum 160 characters. Count carefully.

Return ONLY a valid JSON object. No markdown. No code fences. No explanation before or after. No commentary. Just the raw JSON.

Use this exact structure:
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
