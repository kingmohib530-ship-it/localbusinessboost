/**
 * Shared per-page SEO meta builder — title, description, Open Graph, and
 * Twitter Card tags. Route-level `head()` meta overrides the matching keys
 * set in __root.tsx's site-wide defaults, so every marketing page needs to
 * set its own OG/Twitter tags explicitly or a social share of e.g. /pricing
 * would show the homepage's title/description instead.
 */

const SITE_URL = "https://www.lanavix.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png.svg`;

export function pageMeta({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}) {
  const url = `${SITE_URL}${path}`;
  const ogImage = image ?? DEFAULT_OG_IMAGE;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:url", content: url },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
}
