/**
 * Per-business Twilio credentials, encrypted at rest via Supabase Vault.
 * The Auth Token never lives in a plaintext column - these RPC wrappers
 * (SECURITY DEFINER, service_role only - see the migration that adds
 * set_business_twilio_credentials / get_business_twilio_credentials /
 * get_business_twilio_by_number) are the only way to read or write it.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface BusinessTwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface BusinessTwilioMatch {
  userId: string;
  accountSid: string;
  authToken: string;
}

/** Loads a business's own Twilio credentials, or null if not configured. */
export async function loadBusinessTwilioCredentials(
  userId: string,
): Promise<BusinessTwilioCredentials | null> {
  const { data, error } = await supabaseAdmin.rpc("get_business_twilio_credentials", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[twilioCredentials] failed to load credentials", error);
    return null;
  }
  const row = data?.[0];
  if (!row?.account_sid || !row?.auth_token || !row?.phone_number) return null;
  return { accountSid: row.account_sid, authToken: row.auth_token, phoneNumber: row.phone_number };
}

/**
 * Finds which business owns a Twilio phone number and returns its
 * credentials in one round trip. Used by inbound webhook routing to look
 * up the right business's Auth Token before verifying the request
 * signature with it - the number itself is untrusted input at this point,
 * only used as a lookup key, never as proof of anything on its own.
 */
export async function findBusinessByTwilioNumber(
  phoneNumber: string,
): Promise<BusinessTwilioMatch | null> {
  const { data, error } = await supabaseAdmin.rpc("get_business_twilio_by_number", {
    p_phone_number: phoneNumber,
  });
  if (error) {
    console.error("[twilioCredentials] failed to look up business by number", error);
    return null;
  }
  const row = data?.[0];
  if (!row?.user_id || !row?.account_sid || !row?.auth_token) return null;
  return { userId: row.user_id, accountSid: row.account_sid, authToken: row.auth_token };
}

/**
 * Saves a business's Twilio credentials. Caller must have already
 * confirmed they actually work via verifyTwilioAccount() - this function
 * does not re-check, it only stores.
 */
export async function saveBusinessTwilioCredentials(
  userId: string,
  credentials: BusinessTwilioCredentials,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.rpc("set_business_twilio_credentials", {
    p_user_id: userId,
    p_account_sid: credentials.accountSid,
    p_auth_token: credentials.authToken,
    p_phone_number: credentials.phoneNumber,
  });
  if (error) {
    console.error("[twilioCredentials] failed to save credentials", error);
    return { ok: false, error: "Could not save your Twilio credentials. Please try again." };
  }
  return { ok: true };
}

/**
 * Confirms a Twilio Account SID + Auth Token pair actually authenticates,
 * via a live call to Twilio's own API. Never trust the format alone - a
 * well-formed SID/token pair can still be wrong, revoked, or mistyped.
 */
export async function verifyTwilioAccount(
  accountSid: string,
  authToken: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}` },
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 404) {
      return {
        ok: false,
        reason: "That Account SID and Auth Token don't match. Please check them and try again.",
      };
    }
    return { ok: false, reason: "Couldn't reach Twilio right now. Please try again shortly." };
  } catch (err) {
    console.error("[twilioCredentials] Twilio verification call failed", err);
    return { ok: false, reason: "Couldn't reach Twilio right now. Please try again shortly." };
  }
}
