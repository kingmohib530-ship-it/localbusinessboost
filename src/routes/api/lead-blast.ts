import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/lead-blast")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { industry, city } = await request.json();

          if (!industry || !city) {
            return Response.json(
              { error: "industry and city are required" },
              { status: 400 }
            );
          }

          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            return Response.json(
              { error: "ANTHROPIC_API_KEY not configured" },
              { status: 500 }
            );
          }

          const prompt = `You are Atlas, a lead generation AI. Generate exactly 15 realistic local businesses in ${city} that need ${industry} services.

Return ONLY valid JSON, no markdown, no code blocks:
{
  "leads": [
    {
      "businessName": "string",
      "contactName": "string",
      "phone": "string",
      "need": "one sentence why they need ${industry} services",
      "openingLine": "personalized 1-sentence outreach that mentions their business name"
    }
  ],
  "revenueEstimate": "$X,000-$X,000/mo",
  "topTip": "one sentence on the best outreach action to take today"
}

Use realistic business names and phone numbers with the correct area code for ${city}. Opening lines must feel personal.`;

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

          if (!res.ok) {
            const err = await res.text();
            return Response.json(
              { error: `Anthropic error: ${err}` },
              { status: 500 }
            );
          }

          const result = await res.json();
          const text = result.content
            ?.map((b: { text?: string }) => b.text || "")
            .join("")
            .trim();

          const match = text.match(/\{[\s\S]*\}/);
          if (!match) {
            return Response.json(
              { error: "Could not parse AI response" },
              { status: 500 }
            );
          }

          const parsed = JSON.parse(match[0]);
          return Response.json(parsed);

        } catch (err) {
          console.error("[api/lead-blast]", err);
          return Response.json(
            { error: String(err) },
            { status: 500 }
          );
        }
      },
    },
  },
});
