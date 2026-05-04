import { createFileRoute } from "@tanstack/react-router";

type GenerateInput = {
  businessType?: string;
  location?: string;
  audience?: string;
  tone?: string;
};

const SYSTEM_PROMPT = `You are LocalBoost AI, an expert local-business marketing copywriter.
Given a business type, location, target audience, and tone, generate ready-to-use marketing content.
Return ONLY valid JSON matching this exact shape (no markdown, no commentary):
{
  "reviews": [string, string, string],
  "captions": [string, string, string],
  "hashtags": [string, string, string, string, string, string, string, string],
  "promos": [{"label": string, "text": string}, {"label": string, "text": string}],
  "sms": [string, string]
}
Rules:
- reviews: authentic-sounding 5-star customer reviews mentioning the business and location.
- captions: short punchy social-media captions for Instagram/TikTok.
- hashtags: each starts with #, no spaces, mix location/business/niche tags.
- promos: each has a short "label" (e.g. "Limited Time") and a "text" with an offer.
- sms: short conversion-focused text messages (<160 chars).
- Match the requested tone consistently across every item.`;

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

          const userPrompt = `Business Type: ${businessType}
Location: ${location}
Target Audience: ${audience}
Tone: ${tone}

Generate the marketing content as specified.`;

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
