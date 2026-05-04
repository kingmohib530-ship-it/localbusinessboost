// Helpers for building absolute URLs that work both in the Lovable
// preview iframe and in production. Inside the preview, `window.location`
// points at the inner sandbox frame; we prefer the top-level URL so Stripe
// redirects land back on the user-facing page.

export function getTopOrigin(): string {
  if (typeof window === "undefined") return "";
  try {
    if (window.top && window.top.location && window.top.location.origin) {
      return window.top.location.origin;
    }
  } catch {
    // cross-origin top frame — fall through
  }
  try {
    if (document.referrer) return new URL(document.referrer).origin;
  } catch {
    // ignore
  }
  return window.location.origin;
}

export function absoluteUrl(path: string): string {
  const origin = getTopOrigin();
  if (!path.startsWith("/")) path = "/" + path;
  return `${origin}${path}`;
}

export function topLevelNavigate(url: string): void {
  if (typeof window === "undefined") return;
  try {
    if (window.top) {
      window.top.location.href = url;
      return;
    }
  } catch {
    // cross-origin — fall through
  }
  window.location.href = url;
}
