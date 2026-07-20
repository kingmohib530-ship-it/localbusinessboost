import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { authenticateAdmin } from "@/lib/admin-auth.server";

// Same service-type -> industry mapping used by consumer-inbound.ts's
// matching query, needed here to estimate supply_score.
const SERVICE_TYPE_TO_INDUSTRY: Record<string, string> = {
  hvac_tuneup: "HVAC",
  hvac_repair: "HVAC",
  hvac_install: "HVAC",
  plumbing: "Plumbing",
  plumbing_emergency: "Plumbing",
  roofing: "Roofing",
  electrical: "Electrician",
  cleaning: "Cleaning",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
};

interface IntelRow {
  service_type: string | null;
  location_zip: string | null;
  price_mentioned: number | null;
}

export const Route = createFileRoute("/api/admin/update-pricing-index")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateAdmin(request);
        if ("error" in auth) return auth.error;

        try {
          // Only rows with both a service type and a ZIP can contribute to
          // a (service_type, zip_code) pricing bucket. Nothing in this app
          // currently captures a ZIP code anywhere (profiles.city and the
          // consumer-marketplace flow both only ever collect free-text
          // city), so conversation_intelligence.location_zip is null on
          // every row inserted so far — this endpoint will correctly find
          // zero groups to upsert until that's addressed, rather than
          // fabricate pricing data.
          const { data: rows, error } = await supabaseAdmin
            .from("conversation_intelligence")
            .select("service_type, location_zip, price_mentioned")
            .not("service_type", "is", null)
            .not("location_zip", "is", null);

          if (error) {
            console.error("[update-pricing-index] failed to load conversation_intelligence", error);
            return Response.json({ error: "Failed to load conversation data" }, { status: 500 });
          }

          const groups = new Map<string, { serviceType: string; zip: string; prices: number[] }>();
          for (const row of (rows ?? []) as IntelRow[]) {
            if (!row.service_type || !row.location_zip) continue;
            const key = `${row.service_type}|${row.location_zip}`;
            if (!groups.has(key)) groups.set(key, { serviceType: row.service_type, zip: row.location_zip, prices: [] });
            if (typeof row.price_mentioned === "number") groups.get(key)!.prices.push(row.price_mentioned);
          }

          let updated = 0;
          for (const { serviceType, zip, prices } of groups.values()) {
            const demandScore = prices.length; // requests seen for this bucket
            const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
            const priceRangeLow = prices.length ? Math.min(...prices) : null;
            const priceRangeHigh = prices.length ? Math.max(...prices) : null;

            const industry = SERVICE_TYPE_TO_INDUSTRY[serviceType] ?? null;
            let supplyScore = 0;
            if (industry) {
              const { count } = await supabaseAdmin
                .from("profiles")
                .select("id", { count: "exact", head: true })
                .ilike("industry", `%${industry}%`)
                .ilike("city", `%${zip}%`)
                .eq("subscription_status", "active");
              supplyScore = count ?? 0;
            }

            const { error: upsertErr } = await supabaseAdmin
              .from("market_pricing_index")
              .upsert(
                {
                  service_type: serviceType,
                  zip_code: zip,
                  avg_price: avgPrice,
                  price_range_low: priceRangeLow,
                  price_range_high: priceRangeHigh,
                  demand_score: demandScore,
                  supply_score: supplyScore,
                  last_updated: new Date().toISOString(),
                },
                { onConflict: "service_type,zip_code" },
              );

            if (upsertErr) {
              console.error("[update-pricing-index] upsert failed", serviceType, zip, upsertErr);
            } else {
              updated++;
            }
          }

          return Response.json({ success: true, groupsFound: groups.size, updated });
        } catch (err) {
          console.error("[update-pricing-index]", err);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});
