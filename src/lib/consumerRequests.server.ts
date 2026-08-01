/**
 * Server-side helpers for consumer_requests - the web-based counterpart to
 * the SMS marketplace (consumer-inbound.ts). Same eligibility filter and
 * ranking (verified/pro/elite, accept_consumer_leads, lanavix_score), but
 * fanned out to a handful of matches instead of auto-booking the single
 * best one, since a business has to actively accept here before any
 * contact happens.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendExternalEmail } from "@/lib/email.server";
import {
  SERVICE_TYPE_TO_INDUSTRY,
  SERVICE_TYPE_LABELS,
  type ServiceTypeKey,
} from "@/lib/serviceTypes";

const MAX_MATCHES = 5;

export interface MatchedBusiness {
  id: string;
  business_name: string | null;
  twilio_phone_number: string | null;
}

export async function matchBusinessesForRequest(
  serviceType: ServiceTypeKey,
  city: string,
): Promise<MatchedBusiness[]> {
  const industry = SERVICE_TYPE_TO_INDUSTRY[serviceType];

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, business_name, twilio_phone_number")
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

/**
 * Notifies every matched business at once (email + SMS) that a new request
 * is waiting for them to accept or decline. Best-effort per business - one
 * business's email/SMS failing must never take down the others or the
 * request-creation call that triggered this.
 */
export async function notifyMatchedBusinesses(
  matches: MatchedBusiness[],
  request: { serviceType: ServiceTypeKey; city: string; description: string | null },
): Promise<void> {
  const serviceLabel = SERVICE_TYPE_LABELS[request.serviceType];
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  await Promise.all(
    matches.map(async (business) => {
      const subject = `New Lanavix Network request: ${serviceLabel} in ${request.city}`;
      const detailLine = request.description ? `\n\nDetails: ${request.description}` : "";
      const body = `A consumer near ${request.city} needs ${serviceLabel.toLowerCase()} and you're a match. Sign in to your Network dashboard to review and accept before any contact happens.${detailLine}`;

      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(business.id);
        if (authUser?.user?.email) {
          await sendExternalEmail(authUser.user.email, subject, body);
        }
      } catch (err) {
        console.error("[consumer-requests] failed to email matched business", business.id, err);
      }

      if (business.twilio_phone_number && twilioSid && twilioToken && twilioFrom) {
        try {
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              },
              body: new URLSearchParams({
                From: twilioFrom,
                To: business.twilio_phone_number,
                Body: `New Lanavix Network request: ${serviceLabel} in ${request.city}. Review and accept in your dashboard.`,
              }).toString(),
            },
          );
          if (!res.ok)
            console.error(
              "[consumer-requests] Twilio notify failed",
              business.id,
              await res.text(),
            );
        } catch (err) {
          console.error("[consumer-requests] failed to text matched business", business.id, err);
        }
      }

      try {
        await supabaseAdmin.from("activity_log").insert({
          user_id: business.id,
          type: "consumer_request_match",
          summary: `New Lanavix Network request: ${serviceLabel} in ${request.city}`,
        });
      } catch (err) {
        console.error("[consumer-requests] failed to log activity", business.id, err);
      }
    }),
  );
}
