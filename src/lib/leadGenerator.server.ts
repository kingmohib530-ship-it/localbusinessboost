/**
 * Advanced Lead Generator — data + scoring helpers.
 *
 * Real business facts (name, phone, address, rating, review count, review
 * text) come from Google Places, the same source the existing Lead Blast
 * campaign uses. Claude is only ever asked to synthesize copy (a research
 * summary, an opening line) from those real facts — it is never asked to
 * "find" or invent businesses, phone numbers, emails, owner names, or
 * revenue figures, since a bare Anthropic Messages API call has no way to
 * look those up and would otherwise hallucinate them. Fields with no real,
 * accessible source (owner name, email, company size, revenue, last Google
 * Business post) are left null rather than guessed.
 */

import { createMondayItem, createMondayUpdate, updateMondayItem } from "./monday.server";

export interface GooglePlaceLead {
  businessName: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  reviewSnippets: string[];
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function parseAddressComponents(components: AddressComponent[] | undefined): {
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  if (!components) return { city: null, state: null, zip: null };
  const find = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? null;
  const stateShort = components.find((c) => c.types.includes("administrative_area_level_1"))?.short_name ?? null;
  return {
    city: find("locality") ?? find("sublocality") ?? find("postal_town"),
    state: stateShort,
    zip: find("postal_code"),
  };
}

/**
 * Real business data from Google Places Text Search + Details — the exact
 * pattern already used by /api/lead-blast, extended with rating, review
 * count, website, and up to 5 real review excerpts (used later for
 * keyword-based pain-signal detection, never fabricated).
 */
interface RawPlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
}

/**
 * Google Places Text Search returns at most 20 results per page. Getting up
 * to 50 requires following next_page_token across additional pages — capped
 * at 3 pages (Google's own limit, ~60 results) or once maxResults is met.
 * Google requires a short delay before a next_page_token becomes valid.
 */
async function fetchAllPlaces(
  searchQuery: string,
  googleKey: string,
  maxResults: number,
): Promise<RawPlaceResult[]> {
  const results: RawPlaceResult[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < 3 && results.length < maxResults; page++) {
    const url = pageToken
      ? `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${pageToken}&key=${googleKey}`
      : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&key=${googleKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data.results)) results.push(...data.results);
    pageToken = data.next_page_token;
    if (!pageToken) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return results.slice(0, maxResults);
}

export async function searchGooglePlacesLeads(
  googleKey: string,
  industry: string,
  city: string,
  count: number,
): Promise<GooglePlaceLead[]> {
  const searchQuery = encodeURIComponent(`${industry} in ${city}`);
  const candidates = await fetchAllPlaces(searchQuery, googleKey, count);

  if (candidates.length === 0) {
    return [];
  }

  const detailed = await Promise.all(
    candidates.map(async (place: { place_id: string; name: string; formatted_address?: string }) => {
      try {
        const fields = "name,formatted_phone_number,formatted_address,website,rating,user_ratings_total,address_components,reviews";
        const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=${fields}&key=${googleKey}`;
        const detailRes = await fetch(detailUrl);
        const detailData = await detailRes.json();
        const detail = detailData.result ?? {};
        const { city: parsedCity, state, zip } = parseAddressComponents(detail.address_components);

        return {
          businessName: detail.name || place.name,
          phone: detail.formatted_phone_number || null,
          website: detail.website || null,
          address: detail.formatted_address || place.formatted_address || null,
          city: parsedCity,
          state,
          zip,
          googleRating: typeof detail.rating === "number" ? detail.rating : null,
          googleReviewCount: typeof detail.user_ratings_total === "number" ? detail.user_ratings_total : null,
          reviewSnippets: Array.isArray(detail.reviews)
            ? detail.reviews.slice(0, 5).map((r: { text?: string }) => r.text || "").filter(Boolean)
            : [],
        } as GooglePlaceLead;
      } catch {
        return null;
      }
    }),
  );

  // A phone number is required for the SMS-based outreach sequence this
  // system generates — same filter /api/lead-blast already applies.
  return detailed.filter((d): d is GooglePlaceLead => d !== null && !!d.phone);
}

export interface WebsiteAssessment {
  hasWebsite: boolean;
  quality: "modern" | "outdated" | "broken" | "none";
  socialMedia: { facebook?: string; instagram?: string; linkedin?: string };
}

/**
 * Lightweight, honest heuristic from a real fetch of the business's own
 * homepage — not a fabricated judgment. "broken" = fetch failed or 4xx/5xx;
 * "outdated" = loads but missing a responsive-viewport meta tag; "modern" =
 * loads with one present. Social links are only ever real hrefs found in
 * the fetched HTML.
 */
export async function assessWebsite(url: string | null): Promise<WebsiteAssessment> {
  if (!url) {
    return { hasWebsite: false, quality: "none", socialMedia: {} };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);

    if (!res.ok) {
      return { hasWebsite: true, quality: "broken", socialMedia: {} };
    }

    const html = (await res.text()).slice(0, 200_000);
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);

    const socialMedia: WebsiteAssessment["socialMedia"] = {};
    const fb = html.match(/https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.\-/]+/i);
    const ig = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.\-/]+/i);
    const li = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/[A-Za-z0-9_.\-/]+/i);
    if (fb) socialMedia.facebook = fb[0];
    if (ig) socialMedia.instagram = ig[0];
    if (li) socialMedia.linkedin = li[0];

    return { hasWebsite: true, quality: hasViewport ? "modern" : "outdated", socialMedia };
  } catch {
    return { hasWebsite: true, quality: "broken", socialMedia: {} };
  }
}

const MISSED_CALL_PHRASES = [
  "never answer", "never picked up", "no response", "doesn't pick up", "does not pick up",
  "hard to reach", "never called back", "didn't call back", "did not call back", "straight to voicemail",
  "no call back", "unresponsive",
];

/**
 * Every signal here is derived from real, already-fetched data (rating,
 * review count, website fetch result, actual review text) — nothing here
 * is invented.
 */
export function detectPainSignals(
  place: GooglePlaceLead,
  website: WebsiteAssessment,
): string[] {
  const signals: string[] = [];

  if (place.googleRating !== null && place.googleRating < 4.0) signals.push("Low rating");
  if (place.googleReviewCount === 0 || place.googleReviewCount === null) {
    signals.push("No reviews");
  } else if (place.googleReviewCount < 5) {
    signals.push("Low review volume");
  }
  if (!website.hasWebsite) signals.push("No website");
  if (website.quality === "outdated") signals.push("Outdated website");
  if (website.quality === "broken") signals.push("Broken website");

  const reviewText = place.reviewSnippets.join(" ").toLowerCase();
  if (MISSED_CALL_PHRASES.some((p) => reviewText.includes(p))) {
    signals.push("Missed calls");
  }

  return signals;
}

/**
 * Deterministic 0-100 score per the spec's weighting: pain severity 40%,
 * company size/revenue 20%, recency of activity 20%, review sentiment 20%.
 * Company size/revenue and recency (last Google Business post) have no
 * real accessible source here, so they contribute a neutral midpoint —
 * same convention as lanavix_score's NEUTRAL_SCORE for unmeasured
 * components — rather than a fabricated number.
 */
export function computeLeadScore(painSignals: string[], googleRating: number | null): number {
  const NEUTRAL = 50;
  const painSeverityScore = Math.min(100, painSignals.length * 25);
  const companySizeScore = NEUTRAL;
  const recencyScore = NEUTRAL;
  const reviewSentimentScore =
    googleRating === null ? NEUTRAL : Math.max(0, Math.min(100, ((5 - googleRating) / 5) * 100));

  const score =
    0.4 * painSeverityScore + 0.2 * companySizeScore + 0.2 * recencyScore + 0.2 * reviewSentimentScore;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function priorityFromScore(score: number): "hot" | "warm" | "cold" {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

export interface SequenceStepTemplate {
  stepNumber: number;
  channel: "sms";
  delayHours: number;
  messageTemplate: string;
}

/**
 * The 3-step SMS sequence the spec asks for. Only the opening line (step 1)
 * is AI-personalized to a specific detected pain point — steps 2-3 are
 * fixed, honest follow-up copy referencing the same business by name.
 */
export function buildSequenceTemplates(
  openingLine: string,
  businessName: string,
): SequenceStepTemplate[] {
  return [
    {
      stepNumber: 1,
      channel: "sms",
      delayHours: 0,
      messageTemplate: openingLine,
    },
    {
      stepNumber: 2,
      channel: "sms",
      delayHours: 72,
      messageTemplate: `Hi again — following up for ${businessName}. Other local businesses have booked more jobs just by never missing a call. Worth a quick chat?`,
    },
    {
      stepNumber: 3,
      channel: "sms",
      delayHours: 168,
      messageTemplate: `Last note from me — if now isn't the right time for ${businessName}, no worries. Just reply STOP and I won't follow up again, or reply here if you'd like to talk.`,
    },
  ];
}

export interface LeadForMonday {
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  lead_score: number;
  priority: string;
  pain_signals: string[] | null;
  ai_research_summary: string | null;
  status: string;
}

const PRIORITY_LABEL: Record<string, string> = { hot: "Hot", warm: "Warm", cold: "Cold", medium: "Warm" };

/**
 * Pushes what the board's known columns actually support (business name,
 * phone, email, a priority-derived status color) and attaches the richer
 * context — lead score, pain signals, research summary — as a text update
 * on the item, since those don't map to a documented column on this board.
 * Non-blocking: failures are caught and logged, never surfaced to the
 * caller, matching the existing Monday sync convention elsewhere in this
 * codebase.
 */
export async function syncLeadToMonday(lead: LeadForMonday): Promise<string | null> {
  try {
    const columnValues: Record<string, unknown> = {
      color_mm40t58z: { label: PRIORITY_LABEL[lead.priority] || "Warm" },
      text_mm408bbv: "Lead Generator",
      text_mm40qp3y: lead.owner_name ? `${lead.business_name} (${lead.owner_name})` : lead.business_name,
    };
    if (lead.email) columnValues.email_mm40q7z1 = { email: lead.email, text: lead.email };
    if (lead.phone) columnValues.text_mm40k4r8 = lead.phone;

    const itemId = await createMondayItem(lead.business_name, columnValues);

    const noteLines = [
      `Lead score: ${lead.lead_score}/100 (${lead.priority})`,
      `Status: ${lead.status}`,
      lead.pain_signals?.length ? `Pain signals: ${lead.pain_signals.join(", ")}` : null,
      lead.ai_research_summary ? `Research: ${lead.ai_research_summary}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    if (noteLines) await createMondayUpdate(String(itemId), noteLines);

    return String(itemId);
  } catch (e) {
    console.error("[leadGenerator] monday sync failed", e);
    return null;
  }
}

/** Best-effort status sync for an already-linked Monday item. Non-blocking. */
export async function syncLeadStatusToMonday(
  mondayItemId: string,
  status: string,
  priority: string,
): Promise<void> {
  try {
    await updateMondayItem(Number(mondayItemId), {
      color_mm40t58z: { label: PRIORITY_LABEL[priority] || "Warm" },
    });
    await createMondayUpdate(mondayItemId, `Status changed to: ${status}`);
  } catch (e) {
    console.error("[leadGenerator] monday status sync failed", e);
  }
}

export interface LeadCopy {
  summary: string;
  openingLine: string;
}

/**
 * Claude synthesizes copy from real facts only — it is explicitly given
 * just the data already extracted from Google Places and told not to
 * introduce any fact not present in that input (no owner name, no email,
 * no revenue figure, nothing about the business not listed below).
 */
export async function synthesizeLeadCopy(
  anthropicKey: string,
  industry: string,
  place: GooglePlaceLead,
  painSignals: string[],
): Promise<LeadCopy> {
  const facts = [
    `Business name: ${place.businessName}`,
    `Industry context: ${industry}`,
    place.googleRating !== null ? `Google rating: ${place.googleRating} (${place.googleReviewCount ?? 0} reviews)` : "Google rating: unknown",
    painSignals.length ? `Detected pain signals: ${painSignals.join(", ")}` : "Detected pain signals: none",
    place.reviewSnippets.length ? `Real review excerpts:\n${place.reviewSnippets.map((s) => `- "${s.slice(0, 200)}"`).join("\n")}` : "",
  ].filter(Boolean).join("\n");

  const prompt = `You are a sales analyst helping a Lanavix customer (a ${industry} contractor) evaluate a prospect they might reach out to. You are given ONLY the real facts below — do not invent or assume any fact not listed here (no owner name, no email, no revenue, no detail not present below).

${facts}

Write:
1. A 2-sentence research summary explaining why this business is (or isn't) a good outreach target, referencing only the facts above.
2. A single personalized opening line (under 25 words) for a first-touch SMS, referencing a specific detected pain point if one exists, otherwise a general local-business angle. No fabricated specifics.

Return ONLY valid JSON, no markdown:
{ "summary": "...", "openingLine": "..." }`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic error: ${await res.text()}`);
  }

  const result = await res.json();
  const text: string = result.content?.map((b: { text?: string }) => b.text || "").join("").trim() ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse AI response");

  const parsed = JSON.parse(match[0]);
  return {
    summary: parsed.summary || `${place.businessName} matches the target profile for ${industry} outreach.`,
    openingLine: parsed.openingLine || `Hi! I noticed ${place.businessName} and wanted to reach out about helping you capture more business.`,
  };
}

export type ResponseClassification =
  | "interested"
  | "not_interested"
  | "needs_time"
  | "asked_question"
  | "wrong_number"
  | "stop";

const VALID_CLASSIFICATIONS: ResponseClassification[] = [
  "interested", "not_interested", "needs_time", "asked_question", "wrong_number", "stop",
];

/** Classifies a lead's SMS reply into a fixed set of categories from the reply text alone. */
export async function classifyLeadResponse(
  anthropicKey: string,
  replyText: string,
): Promise<ResponseClassification> {
  if (/^\s*stop\s*$/i.test(replyText)) return "stop";

  const prompt = `Classify this SMS reply to a cold outreach message from a home-services company into exactly one category:
- interested: wants to learn more or engage
- not_interested: declines or says no
- needs_time: asks to follow up later, busy now
- asked_question: asks a clarifying question without a clear yes/no
- wrong_number: says this isn't them / wrong number
- stop: asks to stop being contacted (beyond just the word STOP)

Reply: "${replyText.replace(/"/g, "'").slice(0, 500)}"

Return ONLY one word, exactly one of: interested, not_interested, needs_time, asked_question, wrong_number, stop`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 10,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return "asked_question";

  const result = await res.json();
  const text: string = (result.content?.[0]?.text || "").trim().toLowerCase();
  const match = VALID_CLASSIFICATIONS.find((c) => text.includes(c));
  return match || "asked_question";
}
