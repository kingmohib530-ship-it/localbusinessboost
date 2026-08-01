// Shared service-type taxonomy for anything that books or matches a home-
// service job: the SMS booking flow (sms-reply.ts), the SMS consumer
// marketplace (consumer-inbound.ts), and the web-based consumer request
// form. Previously duplicated between the first two files on purpose (an
// earlier "add new files only" constraint) - promoted to one module now
// that a third caller needs the exact same set.

export const SERVICE_TYPE_KEYS = [
  "hvac_tuneup",
  "hvac_repair",
  "hvac_install",
  "plumbing",
  "plumbing_emergency",
  "roofing",
  "electrical",
  "cleaning",
  "landscaping",
  "pest_control",
] as const;

export type ServiceTypeKey = (typeof SERVICE_TYPE_KEYS)[number];

export const ESTIMATED_VALUE_MAP: Record<ServiceTypeKey | "default", number> = {
  hvac_tuneup: 150,
  hvac_repair: 450,
  hvac_install: 3500,
  plumbing: 400,
  plumbing_emergency: 650,
  roofing: 1200,
  electrical: 350,
  cleaning: 200,
  landscaping: 300,
  pest_control: 250,
  default: 400,
};

// Maps a service-type key to the free-text `industry` values businesses
// pick during onboarding (see src/lib/auditApi.ts's Industry type).
export const SERVICE_TYPE_TO_INDUSTRY: Record<ServiceTypeKey, string> = {
  hvac_tuneup: "HVAC",
  hvac_repair: "HVAC",
  hvac_install: "HVAC",
  plumbing: "Plumbing",
  plumbing_emergency: "Plumbing",
  roofing: "Roofing",
  electrical: "Electrician",
  cleaning: "Cleaning",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
};

// Human-readable labels for UI dropdowns (the web request form). The SMS
// flows never show these - they only ever come from AI-parsed free text.
export const SERVICE_TYPE_LABELS: Record<ServiceTypeKey, string> = {
  hvac_tuneup: "HVAC tune-up",
  hvac_repair: "HVAC repair",
  hvac_install: "HVAC installation",
  plumbing: "Plumbing",
  plumbing_emergency: "Plumbing (emergency)",
  roofing: "Roofing",
  electrical: "Electrical",
  cleaning: "Cleaning",
  landscaping: "Landscaping",
  pest_control: "Pest control",
};
