import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logActivity } from "@/lib/activityLog.server";
import {
  searchGooglePlacesLeads,
  assessWebsite,
  detectPainSignals,
  computeLeadScore,
  priorityFromScore,
  buildSequenceTemplates,
  synthesizeLeadCopy,
  syncLeadToMonday,
} from "@/lib/leadGenerator.server";

const AUTH_ERROR = "Authentication required. Please sign in.";
const RATE_LIMIT_ERROR = "Too many requests. Please wait a bit and try again.";

// Bounded independently of the UI's 10-50 slider — each lead costs a
// billable Google Places Details lookup plus an Anthropic call, so this
// caps real spend regardless of what the client sends.
const MIN_COUNT = 5;
const MAX_COUNT = 50;

export const Route = createFileRoute("/api/lead-generator/research")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.toLowerCase().startsWith("bearer ")) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const token = authHeader.slice(7).trim();
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error: AUTH_ERROR }, { status: 401 });
          }
          const user = userData.user;

          // Lowered from 10/hour: a 50-lead request now costs up to 50
          // billable Google Places Details lookups + 50 Anthropic calls,
          // well above what the original 10/hour cap was sized for.
          const { data: allowed, error: rlErr } = await supabaseAdmin.rpc("check_rate_limit", {
            p_user_id: user.id,
            p_route: "lead-generator-research",
            p_max_requests: 5,
            p_window_seconds: 3600,
          });
          if (rlErr) {
            console.error("[lead-generator/research] rate limit check failed");
            return Response.json({ error: "Service temporarily unavailable" }, { status: 503 });
          }
          if (!allowed) {
            return Response.json({ error: RATE_LIMIT_ERROR }, { status: 429 });
          }

          const body = await request.json();
          const industry = typeof body.industry === "string" ? body.industry.trim() : "";
          const city = typeof body.city === "string" ? body.city.trim() : "";
          const requestedCount = typeof body.count === "number" ? body.count : 30;
          const count = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(requestedCount)));

          if (!industry || !city) {
            return Response.json({ error: "industry and city are required" }, { status: 400 });
          }

          const googleKey = process.env.GOOGLE_PLACES_API_KEY;
          const anthropicKey = process.env.ANTHROPIC_API_KEY;
          if (!googleKey) {
            return Response.json({ error: "GOOGLE_PLACES_API_KEY not configured" }, { status: 500 });
          }
          if (!anthropicKey) {
            return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
          }

          const places = await searchGooglePlacesLeads(googleKey, industry, city, count);
          if (places.length === 0) {
            return Response.json(
              { error: "No businesses with public phone numbers found in that area. Try a different city." },
              { status: 404 },
            );
          }

          const enriched = await Promise.all(
            places.map(async (place) => {
              const website = await assessWebsite(place.website);
              const painSignals = detectPainSignals(place, website);
              const leadScore = computeLeadScore(painSignals, place.googleRating);
              const priority = priorityFromScore(leadScore);

              let summary = "";
              let openingLine = "";
              try {
                const copy = await synthesizeLeadCopy(anthropicKey, industry, place, painSignals);
                summary = copy.summary;
                openingLine = copy.openingLine;
              } catch (e) {
                console.error("[lead-generator/research] AI copy synthesis failed", e);
                summary = `${place.businessName} was found via Google Places search for ${industry} in ${city}.`;
                openingLine = `Hi! I noticed ${place.businessName} and wanted to reach out about helping you capture more business.`;
              }

              return {
                user_id: user.id,
                business_name: place.businessName,
                owner_name: null,
                phone: place.phone,
                email: null,
                website: place.website,
                address: place.address,
                city: place.city,
                state: place.state,
                zip: place.zip,
                industry,
                company_size: null,
                annual_revenue_estimate: null,
                google_rating: place.googleRating,
                google_review_count: place.googleReviewCount,
                has_website: website.hasWebsite,
                website_quality: website.quality,
                has_google_business: true,
                last_google_post: null,
                social_media: website.socialMedia,
                pain_signals: painSignals,
                data_source: "google_maps",
                lead_score: leadScore,
                status: "new" as const,
                priority,
                ai_research_summary: summary,
                personalized_opening_line: openingLine,
                outreach_history: [],
              };
            }),
          );

          const { data: inserted, error: insertErr } = await supabaseAdmin
            .from("lead_profiles")
            .insert(enriched)
            .select();

          if (insertErr || !inserted) {
            console.error("[lead-generator/research] insert failed", insertErr);
            return Response.json({ error: "Failed to save leads" }, { status: 500 });
          }

          const sequenceRows = inserted.flatMap((lead) =>
            buildSequenceTemplates(lead.personalized_opening_line || "", lead.business_name).map((step) => ({
              lead_id: lead.id,
              step_number: step.stepNumber,
              channel: step.channel,
              delay_hours: step.delayHours,
              message_template: step.messageTemplate,
              status: "pending" as const,
            })),
          );

          const { error: seqErr } = await supabaseAdmin.from("lead_sequences").insert(sequenceRows);
          if (seqErr) {
            console.error("[lead-generator/research] sequence insert failed", seqErr);
          }

          // Non-blocking best-effort Monday.com sync per lead.
          await Promise.all(
            inserted.map(async (lead) => {
              const itemId = await syncLeadToMonday({
                business_name: lead.business_name,
                owner_name: lead.owner_name,
                phone: lead.phone,
                email: lead.email,
                lead_score: lead.lead_score ?? 0,
                priority: lead.priority ?? "warm",
                pain_signals: (lead.pain_signals as string[] | null) ?? null,
                ai_research_summary: lead.ai_research_summary,
                status: lead.status ?? "new",
              });
              if (itemId) {
                await supabaseAdmin.from("lead_profiles").update({ monday_item_id: itemId }).eq("id", lead.id);
              }
            }),
          );

          await logActivity(
            user.id,
            "lead_generator_research",
            `Researched ${inserted.length} leads in ${city} (${industry})`,
            { industry, city, leadCount: inserted.length },
          );

          return Response.json({ leads: inserted, count: inserted.length });
        } catch (err) {
          console.error("[lead-generator/research]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
