/**
 * Server-side helpers for the business_facts table - the per-business "AI
 * memory" that Missed-Call Text-Back (and later, other AI features) reads
 * as real context instead of guessing.
 *
 * Every fact written here has to trace back to something the business
 * actually said or something a real source (Google, their own website)
 * actually contains - never invented, matching the same real-data rule
 * already used by the Lead Generator's copy synthesis.
 */

export interface GooglePlaceCandidate {
  placeId: string;
  name: string;
  address: string | null;
}

/**
 * Text-searches Google Places for a business by name + city so the
 * contractor can pick their real listing from a short list, rather than
 * being asked to paste a raw Place ID. Returns at most 5 candidates -
 * enough to tell businesses apart, cheap enough to always show at once.
 */
export async function searchGooglePlaceCandidates(
  googleKey: string,
  query: string,
): Promise<GooglePlaceCandidate[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    throw new Error(`Google Places search failed with status ${res.status}`);
  }
  const data = await res.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places search returned ${data.status}`);
  }

  const results: { place_id: string; name: string; formatted_address?: string }[] = data.results || [];
  return results.slice(0, 5).map((r) => ({
    placeId: r.place_id,
    name: r.name,
    address: r.formatted_address || null,
  }));
}
