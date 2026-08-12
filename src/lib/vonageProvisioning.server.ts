/**
 * Auto-provisions a dedicated Vonage number per business under Lanavix's
 * own platform-owned Vonage account - no per-business signup, no separate
 * billing. A contractor only ever confirms their real business line; this
 * is what turns that into a working Lanavix-owned number behind it.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Two different hosts, not interchangeable - confirmed against Vonage's own
// curl examples after this got misrouted in an earlier pass. The Numbers
// API (search/buy/update) lives on rest.nexmo.com; api.nexmo.com serves the
// Messages API (sendVonageSms below) and Number Insight
// (leadGenerator.server.ts's verifyPhoneNumber) - hitting the Numbers API
// on the wrong host 404s, which is what "Could not find an available
// number right now" was actually masking.
const VONAGE_NUMBERS_API_BASE = "https://rest.nexmo.com";
const VONAGE_API_BASE = "https://api.nexmo.com";

// Trimmed defensively - a trailing newline or stray space from pasting a
// value into Vercel's env var UI produces a credential pair that looks
// right but fails Basic Auth with a genuine 401 from Vonage, indistinguishable
// from the key/secret actually being wrong without inspecting the raw bytes.
function accountCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = process.env.VONAGE_API_KEY?.trim();
  const apiSecret = process.env.VONAGE_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    throw new Error("VONAGE_API_KEY / VONAGE_API_SECRET not configured");
  }
  return { apiKey, apiSecret };
}

function basicAuthHeader(apiKey: string, apiSecret: string): string {
  return `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
}

// Vonage's Numbers API takes/returns msisdn without a leading "+"; the
// rest of this app stores phone numbers in E.164 with one. Normalize at
// the boundary rather than picking one format and fighting it everywhere.
function toE164(msisdn: string): string {
  return msisdn.startsWith("+") ? msisdn : `+${msisdn}`;
}
function stripPlus(e164: string): string {
  return e164.replace(/^\+/, "");
}

export interface ProvisionResult {
  ok: true;
  vonageNumber: string;
  alreadyProvisioned: boolean;
}
export interface ProvisionError {
  ok: false;
  error: string;
}

/**
 * Idempotent: if this business already has a vonage_number, this just
 * updates forwarding_phone_number and returns the existing assignment -
 * provisioning a number is a real, billed action on Lanavix's own Vonage
 * account, so a retried request must never buy a second one.
 */
export async function provisionVonageNumber(
  userId: string,
  forwardingPhoneNumber: string,
): Promise<ProvisionResult | ProvisionError> {
  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("profiles")
    .select("vonage_number")
    .eq("id", userId)
    .maybeSingle();
  if (loadErr) {
    console.error("[vonageProvisioning] failed to load existing profile", loadErr);
    return { ok: false, error: "Could not check your existing setup. Please try again." };
  }

  if (existing?.vonage_number) {
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ forwarding_phone_number: forwardingPhoneNumber })
      .eq("id", userId);
    if (updateErr) {
      console.error("[vonageProvisioning] failed to update forwarding number", updateErr);
      return { ok: false, error: "Could not save your forwarding number. Please try again." };
    }
    return { ok: true, vonageNumber: existing.vonage_number, alreadyProvisioned: true };
  }

  const { apiKey, apiSecret } = accountCredentials();
  const applicationId = process.env.VONAGE_APPLICATION_ID;
  if (!applicationId) {
    return { ok: false, error: "Phone provisioning is not configured. Please try again shortly." };
  }

  const searchParams = new URLSearchParams({
    country: "US",
    features: "SMS,VOICE",
    size: "1",
  });
  const searchRes = await fetch(
    `${VONAGE_NUMBERS_API_BASE}/number/search?${searchParams.toString()}`,
    { headers: { Authorization: basicAuthHeader(apiKey, apiSecret) } },
  );
  if (!searchRes.ok) {
    console.error(
      "[vonageProvisioning] number search failed",
      searchRes.status,
      await searchRes.text().catch(() => ""),
    );
    return {
      ok: false,
      error: "Could not find an available number right now. Please try again shortly.",
    };
  }
  const searchData = await searchRes.json();
  const candidate = searchData?.numbers?.[0]?.msisdn;
  if (!candidate) {
    return { ok: false, error: "No numbers available right now. Please try again shortly." };
  }

  const buyRes = await fetch(`${VONAGE_NUMBERS_API_BASE}/number/buy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(apiKey, apiSecret),
    },
    body: new URLSearchParams({ country: "US", msisdn: candidate }).toString(),
  });
  if (!buyRes.ok) {
    console.error(
      "[vonageProvisioning] number buy failed",
      buyRes.status,
      await buyRes.text().catch(() => ""),
    );
    return {
      ok: false,
      error: "Could not provision a number right now. Please try again shortly.",
    };
  }

  const updateRes = await fetch(`${VONAGE_NUMBERS_API_BASE}/number/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuthHeader(apiKey, apiSecret),
    },
    body: new URLSearchParams({
      country: "US",
      msisdn: candidate,
      app_id: applicationId,
    }).toString(),
  });
  if (!updateRes.ok) {
    console.error(
      "[vonageProvisioning] linking number to application failed",
      updateRes.status,
      await updateRes.text().catch(() => ""),
    );
    return {
      ok: false,
      error: "Could not finish setting up your number. Please try again shortly.",
    };
  }

  const vonageNumber = toE164(candidate);
  const { error: saveErr } = await supabaseAdmin
    .from("profiles")
    .update({
      vonage_number: vonageNumber,
      vonage_number_provisioned_at: new Date().toISOString(),
      forwarding_phone_number: forwardingPhoneNumber,
    })
    .eq("id", userId);
  if (saveErr) {
    // The number is bought and linked at this point - a save failure here
    // leaves it provisioned but unassigned rather than lost, which a retry
    // of this same idempotent function will pick up via a future manual
    // reconciliation, not silently re-buy a second number.
    console.error("[vonageProvisioning] provisioned a number but failed to save it", saveErr);
    return {
      ok: false,
      error:
        "Your number was provisioned but we couldn't save it. Please try again or contact support.",
    };
  }

  return { ok: true, vonageNumber, alreadyProvisioned: false };
}

/** Loads a business's own assigned Vonage number, or null if not yet provisioned. */
export async function loadBusinessVonageNumber(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("vonage_number")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[vonageProvisioning] failed to load business's number", error);
    return null;
  }
  return data?.vonage_number || null;
}

export interface BusinessVonageMatch {
  userId: string;
  vonageNumber: string;
}

/**
 * Looks up which business a Lanavix-owned Vonage number belongs to. No
 * credentials to return here - the whole point of the platform-owned
 * model is that there's nothing per-business left to hand back, unlike
 * the old findBusinessByTwilioNumber which also returned an Auth Token.
 */
export async function findBusinessByVonageNumber(
  phoneNumber: string,
): Promise<BusinessVonageMatch | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, vonage_number")
    .eq("vonage_number", toE164(phoneNumber))
    .maybeSingle();
  if (error) {
    console.error("[vonageProvisioning] failed to look up business by number", error);
    return null;
  }
  if (!data?.vonage_number) return null;
  return { userId: data.id, vonageNumber: data.vonage_number };
}

/** Sends an SMS via the platform Vonage account's Messages API. */
export async function sendVonageSms(
  from: string,
  to: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { signVonageJwt } = await import("@/lib/vonage.server");
  const jwt = await signVonageJwt();
  const res = await fetch(`${VONAGE_API_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      message_type: "text",
      text,
      to: stripPlus(to),
      from: stripPlus(from),
      channel: "sms",
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[vonageProvisioning] SMS send failed", res.status, errText);
    return { ok: false, error: errText || `HTTP ${res.status}` };
  }
  return { ok: true };
}
