/**
 * Shared guard for server-side fetches of a contractor- or lead-supplied
 * URL (lead research, technical audits). Mirrors the guard already used by
 * business_facts' website sync: blocks requests aimed at the local machine
 * or a private network, so a supplied URL can't make our server reach an
 * internal-only address (cloud metadata, an internal admin panel) on its
 * behalf. Redirects are followed manually so every hop gets the same
 * check - fetch's built-in redirect:"follow" would jump straight to the
 * final host without ever validating it.
 */
export function isSafeExternalUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return false;

  // IPv4 literal in a private/loopback/link-local range.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127) return false; // loopback
    if (a === 10) return false; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12
    if (a === 192 && b === 168) return false; // 192.168.0.0/16
    if (a === 169 && b === 254) return false; // link-local / cloud metadata
    if (a === 0) return false;
  }

  // IPv6 loopback / unique-local / link-local.
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return false;

  return true;
}

interface FetchSafeOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_MAX_BYTES = 2_000_000;

/**
 * Fetches an external URL with the guard re-applied on the original URL and
 * on every redirect hop, a per-request timeout, and a hard cap on how much
 * of the response body is read into memory.
 */
export async function fetchSafeExternal(
  rawUrl: string,
  opts: FetchSafeOptions = {},
): Promise<{ res: Response; text: string }> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;

  let currentUrl = rawUrl;
  let res: Response | undefined;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!isSafeExternalUrl(currentUrl)) {
      throw new Error("That URL isn't safe to fetch.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      res = await fetch(currentUrl, { signal: controller.signal, redirect: "manual" });
    } finally {
      clearTimeout(timeout);
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    break;
  }
  if (!res) {
    throw new Error("Couldn't reach that URL.");
  }

  const text = await readBoundedText(res, maxBytes);
  return { res, text };
}

async function readBoundedText(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return (await res.text()).slice(0, maxBytes);

  const decoder = new TextDecoder();
  let result = "";
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      break;
    }
    result += decoder.decode(value, { stream: true });
  }
  return result;
}
