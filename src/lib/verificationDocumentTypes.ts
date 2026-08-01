// Shared document-type taxonomy for the verification flow: the
// contractor's own upload form (app.verification.tsx) and the admin
// review page (app.admin.verification-review.tsx) both need the same
// value-to-label mapping so a document type reads the same friendly way
// on both sides instead of the admin page falling back to a raw
// underscore-separated value.

export const DOCUMENT_TYPES: { value: string; label: string; required: boolean }[] = [
  { value: "business_license", label: "Business license", required: true },
  { value: "insurance_certificate", label: "Certificate of insurance", required: true },
  { value: "photo_id", label: "Photo ID", required: true },
  { value: "business_card", label: "Business card", required: false },
  { value: "website_screenshot", label: "Website screenshot", required: false },
  { value: "utility_bill", label: "Utility bill (proof of address)", required: false },
  { value: "other", label: "Other supporting document", required: false },
];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.label]),
);
