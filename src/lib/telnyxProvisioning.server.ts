/**
 * Auto-provisions a dedicated Telnyx number per business under Lanavix's
 * own platform-owned Telnyx account - no per-business signup, no separate
 * billing. A contractor only ever confirms their real business line; this
 * is what turns that into a working Lanavix-owned number behind it.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TELNYX_API_BASE = "https://api.telnyx.com/v2";

function authHeader(): string {
  const apiKey = process.env.TELNYX_API_KEY?.trim();
  if (!apiKey) throw new Error("TELNYX_API_KEY not configured");
  return `Bearer ${apiKey}`;
}

export interface ProvisionResult {
  ok: true;
  telnyxNumber: string;
  alreadyProvisioned: boolean;
}
export interface ProvisionError {
  ok: false;
  error: string;
}

// A plain US local number with no special regulatory requirements usually
// completes fast, but Telnyx models ordering as an async object (a
// number_order.complete webhook exists for the general case) rather than
// guaranteeing the active number back in the buy response the way
// Vonage's /number/buy did. No background-job infrastructure exists in
// this app, so this polls with a short bounded wait instead of assuming
// synchronicity or building a webhook-driven completion path.
const ORDER_POLL_ATTEMPTS = 5;
const ORDER_POLL_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Idempotent: if this business already has a telnyx_number, this just
 * updates forwarding_phone_number and returns the existing assignment -
 * provisioning a number is a real, billed action on Lanavix's own Telnyx
 * account, so a retried request must never buy a second one.
 */
export async function provisionTelnyxNumber(
  userId: string,
  forwardingPhoneNumber: string,
): Promise<ProvisionResult | ProvisionError> {
  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("profiles")
    .select("telnyx_number")
    .eq("id", userId)
    .maybeSingle();
  if (loadErr) {
    console.error("[telnyxProvisioning] failed to load existing profile", loadErr);
    return { ok: false, error: "Could not check your existing setup. Please try again." };
  }

  if (existing?.telnyx_number) {
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ forwarding_phone_number: forwardingPhoneNumber })
      .eq("id", userId);
    if (updateErr) {
      console.error("[telnyxProvisioning] failed to update forwarding number", updateErr);
      return { ok: false, error: "Could not save your forwarding number. Please try again." };
    }
    return { ok: true, telnyxNumber: existing.telnyx_number, alreadyProvisioned: true };
  }

  const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID;
  const connectionId = process.env.TELNYX_CONNECTION_ID;
  if (!messagingProfileId || !connectionId) {
    return { ok: false, error: "Phone provisioning is not configured. Please try again shortly." };
  }

  // 1. Search for an available number. Exact filter param names beyond
  // country_code aren't confirmed against a real search response yet -
  // kept minimal (any available US number) rather than guessing at a
  // features filter syntax that could silently break the search.
  const searchParams = new URLSearchParams({
    "filter[country_code]": "US",
    "filter[limit]": "1",
  });
  const searchRes = await fetch(
    `${TELNYX_API_BASE}/available_phone_numbers?${searchParams.toString()}`,
    {
      headers: { Authorization: authHeader() },
    },
  );
  if (!searchRes.ok) {
    console.error(
      "[telnyxProvisioning] number search failed",
      searchRes.status,
      await searchRes.text().catch(() => ""),
    );
    return {
      ok: false,
      error: "Could not find an available number right now. Please try again shortly.",
    };
  }
  const searchData = await searchRes.json();
  const candidate: string | undefined = searchData?.data?.[0]?.phone_number;
  if (!candidate) {
    return { ok: false, error: "No numbers available right now. Please try again shortly." };
  }

  // 2. Order it - numbers ordered must have appeared in a recent search,
  // which the fetch above just did.
  const orderRes = await fetch(`${TELNYX_API_BASE}/number_orders`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ phone_numbers: [{ phone_number: candidate }] }),
  });
  if (!orderRes.ok) {
    console.error(
      "[telnyxProvisioning] number order failed",
      orderRes.status,
      await orderRes.text().catch(() => ""),
    );
    return {
      ok: false,
      error: "Could not provision a number right now. Please try again shortly.",
    };
  }
  const orderData = await orderRes.json();
  const orderId: string | undefined = orderData?.data?.id;
  let orderStatus: string | undefined = orderData?.data?.status;

  // 3. Poll for order completion, bounded - see the comment on
  // ORDER_POLL_ATTEMPTS above for why this isn't webhook-driven.
  for (
    let attempt = 0;
    attempt < ORDER_POLL_ATTEMPTS && orderStatus !== "success" && orderId;
    attempt++
  ) {
    await sleep(ORDER_POLL_DELAY_MS);
    const pollRes = await fetch(`${TELNYX_API_BASE}/number_orders/${orderId}`, {
      headers: { Authorization: authHeader() },
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    orderStatus = pollData?.data?.status;
  }

  if (orderStatus !== "success") {
    return {
      ok: false,
      error: "Your number is still being set up. Please check back in a minute and try again.",
    };
  }

  // 4. Look up the actual owned-number resource by its E.164 number. The
  // `id` on a number order's phone_numbers[] entries is a
  // number_order_phone_number resource - a different Telnyx resource from
  // the /v2/phone_numbers/{id} one this PATCH needs. Using that order-item
  // id here is what previously produced a 404 (code 10005) on this PATCH:
  // number search/order/poll all succeeded, but that id was never valid
  // against the /phone_numbers endpoint. The phone_numbers resource is
  // only guaranteed to exist once the order status is "success", which the
  // poll above just confirmed.
  const lookupParams = new URLSearchParams({ "filter[phone_number]": candidate });
  const lookupRes = await fetch(`${TELNYX_API_BASE}/phone_numbers?${lookupParams.toString()}`, {
    headers: { Authorization: authHeader() },
  });
  if (!lookupRes.ok) {
    console.error(
      "[telnyxProvisioning] looking up owned number resource failed",
      lookupRes.status,
      await lookupRes.text().catch(() => ""),
    );
    return {
      ok: false,
      error: "Your number is still being set up. Please check back in a minute and try again.",
    };
  }
  const lookupData = await lookupRes.json();
  const phoneNumberResourceId: string | undefined = lookupData?.data?.[0]?.id;
  if (!phoneNumberResourceId) {
    return {
      ok: false,
      error: "Your number is still being set up. Please check back in a minute and try again.",
    };
  }

  // 5. Assign the messaging profile and voice connection. These are two
  // separate sub-resources on the number, each with its own dedicated PATCH
  // endpoint - the general PATCH /v2/phone_numbers/{id} rejects
  // messaging_profile_id with a 422 ("not reachable here"), pointing at
  // Number-Configurations#updatePhoneNumberWithMessagingSettings instead.
  const messagingRes = await fetch(
    `${TELNYX_API_BASE}/phone_numbers/${phoneNumberResourceId}/messaging`,
    {
      method: "PATCH",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_profile_id: messagingProfileId }),
    },
  );
  if (!messagingRes.ok) {
    console.error(
      "[telnyxProvisioning] linking number to messaging profile failed",
      messagingRes.status,
      await messagingRes.text().catch(() => ""),
    );
    return {
      ok: false,
      error: "Could not finish setting up your number. Please try again shortly.",
    };
  }

  const voiceRes = await fetch(`${TELNYX_API_BASE}/phone_numbers/${phoneNumberResourceId}/voice`, {
    method: "PATCH",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ connection_id: connectionId }),
  });
  if (!voiceRes.ok) {
    console.error(
      "[telnyxProvisioning] linking number to voice connection failed",
      voiceRes.status,
      await voiceRes.text().catch(() => ""),
    );
    return {
      ok: false,
      error: "Could not finish setting up your number. Please try again shortly.",
    };
  }

  const { error: saveErr } = await supabaseAdmin
    .from("profiles")
    .update({
      telnyx_number: candidate,
      telnyx_number_provisioned_at: new Date().toISOString(),
      forwarding_phone_number: forwardingPhoneNumber,
    })
    .eq("id", userId);
  if (saveErr) {
    // The number is bought and linked at this point - a save failure here
    // leaves it provisioned but unassigned rather than lost, which a retry
    // of this same idempotent function will pick up via a future manual
    // reconciliation, not silently re-buy a second number.
    console.error("[telnyxProvisioning] provisioned a number but failed to save it", saveErr);
    return {
      ok: false,
      error:
        "Your number was provisioned but we couldn't save it. Please try again or contact support.",
    };
  }

  return { ok: true, telnyxNumber: candidate, alreadyProvisioned: false };
}

/** Loads a business's own assigned Telnyx number, or null if not yet provisioned. */
export async function loadBusinessTelnyxNumber(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("telnyx_number")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[telnyxProvisioning] failed to load business's number", error);
    return null;
  }
  return data?.telnyx_number || null;
}

export interface BusinessTelnyxMatch {
  userId: string;
  telnyxNumber: string;
}

/**
 * Looks up which business a Lanavix-owned Telnyx number belongs to. No
 * credentials to return here - the whole point of the platform-owned
 * model is that there's nothing per-business left to hand back.
 */
export async function findBusinessByTelnyxNumber(
  phoneNumber: string,
): Promise<BusinessTelnyxMatch | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, telnyx_number")
    .eq("telnyx_number", phoneNumber)
    .maybeSingle();
  if (error) {
    console.error("[telnyxProvisioning] failed to look up business by number", error);
    return null;
  }
  if (!data?.telnyx_number) return null;
  return { userId: data.id, telnyxNumber: data.telnyx_number };
}

/** Sends an SMS via the platform Telnyx account's Messages API. */
export async function sendTelnyxSms(
  from: string,
  to: string,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${TELNYX_API_BASE}/messages`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, text }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[telnyxProvisioning] SMS send failed", res.status, errText);
    return { ok: false, error: errText || `HTTP ${res.status}` };
  }
  return { ok: true };
}

/**
 * Hangs up a call after the missed-call text-back fires - see
 * api/telnyx/voice.ts for why this is a deliberate, explicit command
 * rather than just not answering (Telnyx's Call Control is
 * command-driven, not synchronous-markup-in-response like Vonage's NCCO).
 */
export async function hangupTelnyxCall(callControlId: string): Promise<void> {
  const res = await fetch(`${TELNYX_API_BASE}/calls/${callControlId}/actions/hangup`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    console.error(
      "[telnyxProvisioning] hangup command failed",
      res.status,
      await res.text().catch(() => ""),
    );
  }
}

/**
 * PHASE 0 SPIKE - answers a call and hands it straight to a Telnyx AI
 * Assistant in one command, instead of the text-back flow's answer-less
 * hangup. Confirmed against Telnyx's own API reference: assigning a
 * number to an Assistant in the dashboard does not override an existing
 * Call Control Connection's webhook, so this has to be triggered
 * explicitly from inside call.initiated - see voice.ts.
 */
export async function answerCallWithAiAssistant(
  callControlId: string,
  assistantId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${TELNYX_API_BASE}/calls/${callControlId}/actions/answer`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ assistant: { id: assistantId } }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[telnyxProvisioning] answering with AI assistant failed", res.status, errText);
    return { ok: false, error: errText || `HTTP ${res.status}` };
  }
  return { ok: true };
}
