/**
 * Real, deterministic technical checks against a business's own website —
 * SSL, load time, and basic on-page SEO tags. These are genuine measured
 * facts (a real fetch, real timing, real regex over the real HTML), never
 * AI-fabricated, and are fed into the audit's AI prompt as ground truth so
 * the model can't invent contradicting claims about a site's SSL status or
 * meta tags.
 */

import { fetchSafeExternal, isSafeExternalUrl } from "./ssrfGuard.server";

const MAX_RESPONSE_BYTES = 300_000;

export interface WebsiteTechnicalCheck {
  hasWebsite: boolean;
  reachable: boolean;
  sslValid: boolean | null;
  loadTimeMs: number | null;
  hasTitleTag: boolean | null;
  hasMetaDescription: boolean | null;
  hasViewportTag: boolean | null;
}

const EMPTY: WebsiteTechnicalCheck = {
  hasWebsite: false,
  reachable: false,
  sslValid: null,
  loadTimeMs: null,
  hasTitleTag: null,
  hasMetaDescription: null,
  hasViewportTag: null,
};

function withScheme(url: string, scheme: "https" | "http"): string {
  return `${scheme}://${url.replace(/^https?:\/\//i, "")}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<{ res: Response; text: string; ms: number } | null> {
  if (!isSafeExternalUrl(url)) return null;
  const start = Date.now();
  try {
    const { res, text } = await fetchSafeExternal(url, { timeoutMs, maxBytes: MAX_RESPONSE_BYTES });
    return { res, text, ms: Date.now() - start };
  } catch {
    return null;
  }
}

function scanHtml(html: string): { hasTitleTag: boolean; hasMetaDescription: boolean; hasViewportTag: boolean } {
  const trimmed = html.slice(0, 300_000);
  return {
    hasTitleTag: /<title[^>]*>\s*[^<\s][^<]*<\/title>/i.test(trimmed),
    hasMetaDescription: /<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(trimmed),
    hasViewportTag: /<meta[^>]+name=["']viewport["']/i.test(trimmed),
  };
}

/**
 * Tries https first (the only acceptable scheme for a real site today). If
 * https fails outright but plain http succeeds, that's a real, reportable
 * "no valid SSL" finding rather than "site is down" — those are different
 * problems with different fixes.
 */
export async function checkWebsite(rawUrl?: string): Promise<WebsiteTechnicalCheck> {
  if (!rawUrl || !rawUrl.trim()) return EMPTY;

  const httpsUrl = withScheme(rawUrl, "https");
  const httpsAttempt = await fetchWithTimeout(httpsUrl, 8000);

  if (httpsAttempt) {
    const { res, text, ms } = httpsAttempt;
    if (!res.ok) {
      return { hasWebsite: true, reachable: false, sslValid: true, loadTimeMs: ms, hasTitleTag: null, hasMetaDescription: null, hasViewportTag: null };
    }
    return { hasWebsite: true, reachable: true, sslValid: true, loadTimeMs: ms, ...scanHtml(text) };
  }

  // https failed outright (could be a TLS/cert problem, or the domain is
  // simply unreachable) — try http to tell those two cases apart.
  const httpUrl = withScheme(rawUrl, "http");
  const httpAttempt = await fetchWithTimeout(httpUrl, 8000);
  if (!httpAttempt) {
    return { hasWebsite: true, reachable: false, sslValid: null, loadTimeMs: null, hasTitleTag: null, hasMetaDescription: null, hasViewportTag: null };
  }

  const { res, text, ms } = httpAttempt;
  if (!res.ok) {
    return { hasWebsite: true, reachable: false, sslValid: false, loadTimeMs: ms, hasTitleTag: null, hasMetaDescription: null, hasViewportTag: null };
  }
  return { hasWebsite: true, reachable: true, sslValid: false, loadTimeMs: ms, ...scanHtml(text) };
}

/** Renders the check as plain-English facts for the AI prompt — never lets the model contradict these. */
export function describeTechnicalCheck(check: WebsiteTechnicalCheck): string {
  if (!check.hasWebsite) return "No website URL was provided.";
  if (!check.reachable) {
    return check.sslValid === false
      ? "Website scan: the site did not respond over HTTPS, but did respond over plain HTTP — it has no valid SSL certificate."
      : "Website scan: the site could not be reached at all (timed out or DNS failure).";
  }
  const parts = [
    `Website scan (real, measured): SSL is ${check.sslValid ? "valid" : "NOT valid (site only responds over unencrypted HTTP)"}.`,
    `Page load time: ${check.loadTimeMs}ms.`,
    `Title tag: ${check.hasTitleTag ? "present" : "missing"}.`,
    `Meta description tag: ${check.hasMetaDescription ? "present" : "missing"}.`,
    `Mobile viewport tag: ${check.hasViewportTag ? "present" : "missing"}.`,
  ];
  return parts.join(" ");
}
