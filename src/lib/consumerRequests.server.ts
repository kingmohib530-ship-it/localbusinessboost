/**
 * Server-side helpers for consumer_requests - the web-based counterpart to
 * the SMS marketplace (consumer-inbound.ts). Same eligibility filter and
 * ranking (verified/pro/elite, accept_consumer_leads, lanavix_score), but
 * fanned out to a handful of matches instead of auto-booking the single
 * best one, since a business has to actively accept here before any
 * contact happens.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SERVICE_TYPE_TO_INDUSTRY, type ServiceTypeKey } from "@/lib/serviceTypes";

const MAX_MATCHES = 5;

export interface MatchedBusiness {
  id: string;
  business_name: string | null;
}

export async function matchBusinessesForRequest(
  serviceType: ServiceTypeKey,
  city: string,
): Promise<MatchedBusiness[]> {
  const industry = SERVICE_TYPE_TO_INDUSTRY[serviceType];

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, business_name")
    .ilike("city", `%${city}%`)
    .ilike("industry", `%${industry}%`)
    .in("subscription_status", ["active", "trialing"])
    .in("verification_status", ["verified", "pro", "elite"])
    .eq("accept_consumer_leads", true)
    .order("lanavix_score", { ascending: false })
    .limit(MAX_MATCHES);

  if (error) throw new Error(`Failed to match businesses: ${error.message}`);
  return data ?? [];
}
