import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  industry: z.string().min(1),
  city: z.string().min(1),
});

export const runLeadBlast = createServerFn({ method: "POST" })
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { industry, city } = data;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const prompt = `You are Atlas, a local business lead generation AI. Generate exactly 15 realistic local businesses in ${city} that likely need ${industry} services.

Return ONLY valid JSON, no markdown, no explanation:
{
  "leads": [
    {
      "businessName": "Example Business",
      "contactName": "John Smith",
      "phone": "404-555-0100",
      "need": "One sentence explaining why they need ${industry} services",
      "openingLine": "Personalized 1-sentence outreach opener mentioning their business name"
    }
  ],
  "revenueEstimate": "$3,000-$8,000/mo",
  "topTip": "One sentence on the highest-leverage outreach action to take today"
}

Use realistic business names for ${city}. Use realistic phone area codes for ${city}. Opening lines must feel personal and mention the specific business.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const result = await response.json();
    const text = result.content
      ?.map((b: { type: string; text?: string }) => b.text || "")
      .join("")
      .trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    return JSON.parse(jsonMatch[0]);
  });
