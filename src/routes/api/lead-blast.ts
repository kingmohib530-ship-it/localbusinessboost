import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logActivity } from "@/lib/activityLog.server";
import { isPlausibleTradeMatch } from "@/lib/leadGenerator.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

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
          const user = userData.user;

          // ===== Rate limit: 10 requests per hour per user =====
          // (lower limit than review-response since each call can trigger
          // up to 15 billable Google Places Details lookups)
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc(
            "check_rate_limit",
            {
              p_user_id: user.id,
              p_route: "lead-blast",
              p_max_requests: 10,
              p_window_seconds: 3600,
            }
          );
          if (rlErr) {
            console.error("[api/lead-blast] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          // Daily ceiling on top of the hourly one above — bounds total
          // spend/day regardless of how the hourly window is spread.
          const { data: dailyAllowed, error: dailyRlErr } = await supabaseAdmin.rpc(
            "check_rate_limit",
            {
              p_user_id: user.id,
              p_route: "lead-blast-daily",
              p_max_requests: 100,
              p_window_seconds: 86400,
            }
          );
          if (dailyRlErr) {
            console.error("[api/lead-blast] daily rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!dailyAllowed) {
            return Response.json({ error: "Daily limit reached. Please try again tomorrow." }, { status: 429 });
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

          // Step 1: Get real businesses from Google Places. The query MUST
          // include the industry — a bare "businesses in {city}" search
          // returns whatever's popular nearby (restaurants, retail, etc.),
          // which was the root cause of leads showing up in the wrong trade.
          const searchQuery = encodeURIComponent(`${industry} in ${city}`);
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

          // Filter out businesses without phone numbers, and anything Google's
          // own category data says definitely isn't a home-service business
          // (a restaurant or a school showing up for a trade search) — the
          // main source of "wrong trade" complaints.
          const businessesWithPhones = detailedBusinesses
            .filter((b) => b.phone !== "Phone not listed")
            .filter((b) => isPlausibleTradeMatch(b.types));

          if (businessesWithPhones.length === 0) {
            return Response.json(
              { error: "Could not find businesses with phone numbers in that area. Try a more specific city." },
              { status: 404 }
            );
          }

          // Step 3: Use Claude to write personalized opening lines only
          const businessList = businessesWithPhones
            .map((b, i) => {
              const category = (b.types as string[])
                .filter((t) => !["point_of_interest", "establishment"].includes(t))
                .slice(0, 2)
                .map((t) => t.replace(/_/g, " "))
                .join(", ");
              return `${i + 1}. ${b.businessName} — ${b.address}${category ? ` (Google category: ${category})` : ""}`;
            })
            .join("\n");

          const prompt = `You are texting on behalf of a real ${industry} contractor reaching out to local businesses about their services.

Here are real local businesses in ${city}:
${businessList}

For each business, write ONE opening line for a first-touch SMS. Rules:
- Write like a real contractor texting another local business owner — plainspoken, specific, a little informal. Not a marketer, not a chatbot.
- Ground it in their actual Google category if one is listed above, or their name/address if not. Never a generic compliment.
- Never use these banned phrases or anything like them: "I noticed", "I came across", "I wanted to reach out", "hope this finds you well", "capture more business", "take your business to the next level".
- Keep each line under 20 words.

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
            openingLine: parsed.openingLines?.[i] || `Hey, this is a ${industry} contractor local to the area — got a few minutes to talk about your place sometime this week?`,
          }));

          await logActivity(
            user.id,
            "lead_blast",
            `Found ${leads.length} leads in ${city} (${industry})`,
            { industry, city, leadCount: leads.length }
          );

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
