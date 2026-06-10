import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/review-response")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { reviewText, reviewerName, starRating } = await request.json();

          if (!reviewText) {
            return Response.json({ error: "Review text is required" }, { status: 400 });
          }

          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
          }

          const isNegative = starRating <= 2;
          const isMixed = starRating === 3;

          const prompt = `You are writing a professional Google review response for a local service business owner.

Review details:
- Reviewer: ${reviewerName || "a customer"}
- Star rating: ${starRating}/5
- Review text: "${reviewText}"

Write a ${isNegative ? "empathetic and professional response to this negative review" : isMixed ? "gracious and constructive response to this mixed review" : "warm and genuine response to this positive review"}.

Requirements:
- 2-4 sentences maximum
- Address the reviewer by name if provided
- ${isNegative ? "Apologize sincerely, acknowledge the issue, offer to make it right with contact info placeholder [PHONE]" : "Thank them genuinely, mention a specific detail from their review"}
- Sound human and personal, not corporate
- End with something that invites future business (for positive) or resolution (for negative)
- Do NOT use hashtags, emojis, or generic phrases like "We value your feedback"

Write only the response text, nothing else.`;

          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 300,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (!res.ok) {
            return Response.json({ error: `API error: ${res.status}` }, { status: 500 });
          }

          const data = await res.json();
          const response = data.content?.[0]?.text?.trim();

          if (!response) {
            return Response.json({ error: "No response generated" }, { status: 500 });
          }

          // Save to database
          const supabase = createClient(
            process.env.VITE_SUPABASE_URL || "",
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
          );

          const { data: users } = await supabase.auth.admin.listUsers();
          const firstUser = users?.users?.[0];

          if (firstUser) {
            await supabase.from("review_responses").insert({
              user_id: firstUser.id,
              review_text: reviewText,
              reviewer_name: reviewerName || null,
              star_rating: starRating,
              ai_response: response,
            });
          }

          return Response.json({ success: true, response });
        } catch (err) {
          console.error("[review-response]", err);
          return Response.json({ error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
