import { createServerFn } from "@tanstack/react-start";

export const runLeadBlast = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const { industry, city } = ctx.data as { industry: string; city: string };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set in environment");

    const prompt = `You are Atlas, a lead generation AI. Generate exactly 15 realistic local businesses in ${city} that need ${industry} services.

Return ONLY valid JSON, no markdown:
{
  "leads": [
    {
      "businessName": "string",
      "contactName": "string",
      "phone": "string",
      "need": "one sentence why they need ${industry}",
      "openingLine": "personalized 1-sentence outreach mentioning their business name"
    }
  ],
  "revenueEstimate": "$X,000-$X,000/mo",
  "topTip": "one sentence on the best outreach action"
}

Use realistic business names and phone numbers for ${city}.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status} ${await res.text()}`);

    const result = await res.json();
    const text = result.content?.map((b: { text?: string }) => b.text || "").join("").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    return JSON.parse(match[0]);
  });
