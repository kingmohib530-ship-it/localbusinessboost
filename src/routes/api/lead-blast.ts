import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AUTH_ERROR = "Authentication required. Please sign in.";

export const Route = createFileRoute("/api/lead-blast")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // ===== Auth: verify Supabase JWT (same pattern as /api/workflow) =====
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          const { data: userData, error: userErr } =
            await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }

          const { industry, city } = await request.json();

          if (!industry || !city) {
            return Response.json(
              { error: "industry and city are required" },
              { status: 400 }
            );
          }

          const googleKey = process.env.GOOGLE_PLACES_API_KEY;
          const anthropicKey = process.env.ANTHROPIC_API_KEY;

          if (!googleKey) {
            return Response.json(
              { error: "GOOGLE_PLACES_API_KEY not configured" },
              { status: 500 }
            );
          }

          if (!anthropicKey) {
            return Response.json(
              { error: "ANTHROPIC_API_KEY not configured" },
              { status: 500 }
            );
          }

          // Step 1: Get real businesses from Google Places
          const searchQuery = encodeURIComponent(`businesses in ${city}`);
          const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${googleKey}`;

          const placesRes = await fetch(placesUrl);
          const placesData = await placesRes.json();

          if (!placesData.results || placesData.results.length === 0) {
            return Response.json(
              { error: "No businesses found in that area. Try a different city." },
              { status: 404 }
            );
          }

          // Step 2: Get details (phone numbers) for each business
          const businesses = placesData.results.slice(0, 15);

          const detailedBusinesses = await Promise.all(
            businesses.map(async (place: any) => {
              try {
                const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,formatted_address,types&key=${googleKey}`;
                const detailRes = await fetch(detailUrl);
                const detailData = await detailRes.json();
                const detail = detailData.result;

                return {
                  businessName: detail.name || place.name,
                  phone: detail.formatted_phone_number || "Phone not listed",
                  address: detail.formatted_address || place.formatted_address,
                  types: detail.types || [],
                };
              } catch {
                return {
                  businessName: place.name,
                  phone: "Phone not listed",
                  address: place.formatted_address,
                  types: [],
                };
              }
            })
          );

          // Filter out businesses without phone numbers
          const businessesWithPhones = detailedBusinesses.filter(
            (b) => b.phone !== "Phone not listed"
          );

          if (businessesWithPhones.length === 0) {
            return Response.json(
              { error: "Could not find businesses with phone numbers in that area. Try a more specific city." },
              { status: 404 }
            );
          }

          // Step 3: Use Claude to write personalized opening lines only
          const businessList = businessesWithPhones
            .map((b, i) => `${i + 1}. ${b.businessName} — ${b.address}`)
            .join("\n");

          const prompt = `You are a sales expert helping a ${industry} contractor reach out to local businesses.

Here are real local businesses in ${city}:
${businessList}

For each business, write ONE personalized opening line explaining why they might need ${industry} services. Be specific to their business type. Keep each line under 20 words.

Return ONLY valid JSON, no markdown:
{
  "openingLines": ["line1", "line2", ...],
  "revenueEstimate": "$X,000-$X,000/mo",
  "topTip": "one sentence on best outreach timing or approach for ${industry} contractors"
}`;

          const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 2000,
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (!aiRes.ok) {
            const err = await aiRes.text();
            return Response.json(
              { error: `Anthropic error: ${err}` },
              { status: 500 }
            );
          }

          const aiResult = await aiRes.json();
          const text = aiResult.content
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

          // Step 4: Combine real data with AI opening lines
          const leads = businessesWithPhones.map((b, i) => ({
            businessName: b.businessName,
            contactName: "Business Owner",
            phone: b.phone,
            address: b.address,
            need: `${b.businessName} is a local business that could benefit from ${industry} services.`,
            openingLine: parsed.openingLines?.[i] || `Hi, I noticed ${b.businessName} and wanted to reach out about our ${industry} services.`,
          }));

          return Response.json({
            leads,
            revenueEstimate: parsed.revenueEstimate || "$2,000-$8,000/mo",
            topTip: parsed.topTip || "Call between 9-11am for best response rates.",
          });

        } catch (err) {
          console.error("[api/lead-blast] error");
          return Response.json(
            { error: "Internal server error" },
            { status: 500 }
          );
        }
      },
    },
  },
});
