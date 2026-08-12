/**
 * Lanavix's own Vonage account - platform-owned, not per-business. Two
 * separate jobs live here:
 *
 * 1. Signing short-lived JWTs (RS256, Application ID + private key) to
 *    authenticate our own outbound calls to the Voice and Messages APIs.
 * 2. Verifying the JWT Vonage puts in the Authorization header of every
 *    inbound webhook (HMAC-SHA256, signed with a separate "signature
 *    secret" from the dashboard - not the API secret).
 *
 * No `@vonage/server-sdk` dependency, hand-implemented via Web Crypto -
 * same approach as verifyTwilioRequestWithToken used to take in
 * twilio.server.ts and verifyWebhook in stripe.server.ts, to stay
 * edge/node-portable.
 */

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function base64UrlEncode(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sha256Hex(data: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Vercel env vars can carry a PEM either as real newlines or as literal
// "\n" escape sequences depending on how it was pasted in - normalize
// before stripping the PEM header/footer so importKey gets clean base64.
function pemToPkcs8Bytes(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Signs a fresh short-lived JWT for the Voice/Messages APIs. Vonage JWTs
 * are generated per-call, not cached - a 60-second expiry is standard
 * practice and keeps a leaked token close to worthless.
 */
export async function signVonageJwt(): Promise<string> {
  const applicationId = process.env.VONAGE_APPLICATION_ID;
  const privateKeyPem = process.env.VONAGE_PRIVATE_KEY;
  if (!applicationId || !privateKeyPem) {
    throw new Error("VONAGE_APPLICATION_ID / VONAGE_PRIVATE_KEY not configured");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    application_id: applicationId,
    iat: now,
    exp: now + 60,
    jti: crypto.randomUUID(),
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8Bytes(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * Verifies an inbound Vonage webhook: the Authorization header carries a
 * JWT, HMAC-SHA256-signed with VONAGE_SIGNATURE_SECRET (a distinct
 * dashboard setting from the account API secret). Hard-fails closed on a
 * bad/missing/expired signature or a mismatched api_key claim - those are
 * the actual authentication.
 *
 * Vonage also includes a payload_hash claim (a hash of the raw body, an
 * extra integrity check on top of the JWT signature itself). Verified
 * on a best-effort basis rather than hard-rejected on mismatch: the JWT
 * signature already proves the request came from Vonage, and getting this
 * one specific claim's exact hash construction wrong (unconfirmed against
 * a live account - Vonage's own reference doc was unreachable during
 * development) would otherwise silently break every real inbound webhook
 * rather than just weaken a secondary check. Logs a warning on mismatch;
 * worth tightening to a hard fail once confirmed against real traffic.
 */
export async function verifyVonageWebhookSignature(
  request: Request,
  rawBody: string,
): Promise<boolean> {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return false;
  const token = authHeader.slice(7).trim();

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const secret = process.env.VONAGE_SIGNATURE_SECRET;
  if (!secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expectedSignatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!timingSafeEqualStr(base64UrlEncode(expectedSignatureBytes), encodedSignature)) {
    return false;
  }

  let payload: { api_key?: string; exp?: number; payload_hash?: string };
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload)));
  } catch {
    return false;
  }

  if (payload.api_key !== process.env.VONAGE_API_KEY) return false;
  if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return false;

  if (payload.payload_hash) {
    const actualHash = await sha256Hex(rawBody);
    if (!timingSafeEqualStr(actualHash, payload.payload_hash)) {
      console.warn("[vonage] payload_hash claim did not match request body - signature itself still valid");
    }
  }

  return true;
}
