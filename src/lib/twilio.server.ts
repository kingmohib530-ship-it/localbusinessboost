/**
 * Twilio request signature verification (X-Twilio-Signature).
 *
 * Twilio signs each webhook POST with HMAC-SHA1 over the full request URL
 * followed by every POST param's key+value, sorted by key, concatenated
 * with no delimiter — then base64-encodes the digest. There's no `twilio`
 * npm package in this repo, so this is hand-implemented via Web Crypto to
 * stay edge/node-portable (same approach as verifyWebhook in stripe.server.ts).
 *
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function computeTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): Promise<string> {
  let data = url;
  for (const key of Object.keys(params).sort()) {
    data += key + params[key];
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signed)));
}

/**
 * Verifies a Twilio webhook request. `rawBody` must be the exact
 * `application/x-www-form-urlencoded` body Twilio sent (parsed once,
 * passed in here to avoid re-reading the request stream).
 */
export async function verifyTwilioRequest(
  request: Request,
  rawBody: string,
): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  if (!authToken || !signature) return false;

  const params: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(rawBody)) {
    params[key] = value;
  }

  const expected = await computeTwilioSignature(authToken, request.url, params);
  return timingSafeEqualStr(expected, signature);
}
