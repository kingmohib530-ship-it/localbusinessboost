/**
 * Lanavix's own Telnyx account - platform-owned, not per-business. Just
 * one job here: verifying the Ed25519 signature Telnyx puts on every
 * inbound webhook. Outbound calls only need a single Bearer API key
 * (TELNYX_API_KEY, used directly wherever it's needed) - unlike Vonage,
 * there's no per-request JWT to sign, so no signing counterpart to this
 * file exists.
 *
 * No `telnyx-node` dependency, hand-implemented via Web Crypto - same
 * approach as verifyVonageWebhookSignature used to take, to stay
 * edge/node-portable.
 */

// Returns a plain ArrayBuffer rather than a Uint8Array view - matches
// crypto.subtle's BufferSource expectations directly (same pattern as
// pemToPkcs8Bytes used to in vonage.server.ts) without fighting the
// TypedArray<ArrayBufferLike> vs. ArrayBufferView<ArrayBuffer> mismatch
// in the current lib.dom types.
function base64Decode(input: string): ArrayBuffer {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// 5 minutes, matching Telnyx's own SDK default - bounds how old a
// signed request can be before it's treated as a stale replay.
const TIMESTAMP_TOLERANCE_SECONDS = 300;

/**
 * Verifies an inbound Telnyx webhook. Two headers carry the proof:
 * `telnyx-signature-ed25519` (base64 signature) and `telnyx-timestamp`.
 * The signed message is `{timestamp}|{raw body}`, verified against
 * TELNYX_PUBLIC_KEY - Telnyx holds the private half, so this is
 * asymmetric verification, not a shared secret both sides know.
 *
 * The exact public-key encoding (raw 32-byte Ed25519 key vs. some other
 * wrapper) is confirmed against Telnyx's dashboard output at
 * implementation time, not guessed here - same discipline as every other
 * "verify against real traffic" caveat from the Vonage build.
 */
export async function verifyTelnyxWebhookSignature(
  request: Request,
  rawBody: string,
): Promise<boolean> {
  const signatureHeader = request.headers.get("telnyx-signature-ed25519");
  const timestampHeader = request.headers.get("telnyx-timestamp");
  if (!signatureHeader || !timestampHeader) return false;

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const publicKeyRaw = process.env.TELNYX_PUBLIC_KEY;
  if (!publicKeyRaw) return false;

  try {
    const publicKey = await crypto.subtle.importKey(
      "raw",
      base64Decode(publicKeyRaw),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const signedMessage = `${timestampHeader}|${rawBody}`;
    return await crypto.subtle.verify(
      "Ed25519",
      publicKey,
      base64Decode(signatureHeader),
      new TextEncoder().encode(signedMessage),
    );
  } catch (err) {
    console.error("[telnyx] webhook signature verification failed", err);
    return false;
  }
}
