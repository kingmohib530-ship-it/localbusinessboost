import Stripe from 'stripe';

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

// Constant-time comparison (same approach as verifyTwilioRequest in
// twilio.server.ts) — a naive `===`/`.includes()` check on the signature
// short-circuits on the first mismatched byte, which is a (largely
// theoretical, but free to close) timing side-channel.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function createStripeClient(): Stripe {
  return new Stripe(getEnv('STRIPE_SECRET_KEY'), { apiVersion: '2026-03-25.dahlia' });
}

export async function verifyWebhook(req: Request): Promise<{ type: string; data: { object: any } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = getEnv('STRIPE_WEBHOOK_SECRET');

  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (!key || !value) continue; // malformed segment (no "=", or an empty side) — skip rather than storing undefined
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Buffer.from(new Uint8Array(signed)).toString('hex');

  if (!v1Signatures.some((sig) => timingSafeEqualStr(sig, expected))) {
    throw new Error("Invalid webhook signature");
  }

  return JSON.parse(body);
}
