/**
 * Canonical Simple Studio intents — thin orchestration over existing engines.
 * Quick Ad (social advertisement) is the first production purpose.
 */

export type SimpleStudioPurpose =
  | "advertisement"
  | "product_video"
  | "talking_photo"
  | "story"
  | "animation"
  | "social_video"
  | "general";

export type SimpleStudioPlatform = "instagram" | "facebook";

export type SimpleStudioIntent = {
  purpose: SimpleStudioPurpose;
  product: string | null;
  audience: string | null;
  location: string | null;
  tone: string;
  platforms: SimpleStudioPlatform[];
  cta: string;
  format: "9:16";
  durationSeconds: 15 | 20;
};

export type SimpleStudioCatalogEntry = {
  purpose: SimpleStudioPurpose;
  /** In-app route for this simple flow (or deep-link to existing product). */
  href: string;
  titleNl: string;
  descNl: string;
  /** Uses shared photo+story orchestrator (vs deep-link only). */
  usesSharedOrchestrator: boolean;
  usesCredits: boolean;
  free?: boolean;
};

/**
 * Desired Simple Studio tree. Animation / free slideshow deep-link existing products
 * instead of duplicating orchestrators.
 */
export const SIMPLE_STUDIO_CATALOG: readonly SimpleStudioCatalogEntry[] = [
  {
    purpose: "advertisement",
    href: "/studio/quick-ad",
    titleNl: "Advertentie",
    descNl: "Foto + beschrijving → verticale social advertentie.",
    usesSharedOrchestrator: true,
    usesCredits: true,
  },
  {
    purpose: "product_video",
    href: "/studio/simple?purpose=product_video",
    titleNl: "Productvideo",
    descNl: "Laat je product of dienst zien in een korte vertical.",
    usesSharedOrchestrator: true,
    usesCredits: true,
  },
  {
    purpose: "talking_photo",
    href: "/studio/simple?purpose=talking_photo",
    titleNl: "Pratende foto",
    descNl: "Breng één foto tot leven met boodschap en beweging.",
    usesSharedOrchestrator: true,
    usesCredits: true,
  },
  {
    purpose: "story",
    href: "/studio/simple?purpose=story",
    titleNl: "Verhaal",
    descNl: "Vertel een kort verhaal bij je foto.",
    usesSharedOrchestrator: true,
    usesCredits: true,
  },
  {
    purpose: "social_video",
    href: "/studio/simple?purpose=social_video",
    titleNl: "Social video",
    descNl: "Korte feed-video voor Instagram of Facebook.",
    usesSharedOrchestrator: true,
    usesCredits: true,
  },
  {
    purpose: "animation",
    href: "/motion/start",
    titleNl: "Animatie",
    descNl: "Laat een stilstaand beeld bewegen (bestaande Motion).",
    usesSharedOrchestrator: false,
    usesCredits: true,
  },
  {
    purpose: "general",
    href: "/studio/photo-video",
    titleNl: "Snelle video (gratis)",
    descNl: "Gratis diashow van foto’s op je apparaat.",
    usesSharedOrchestrator: false,
    usesCredits: false,
    free: true,
  },
] as const;

export function simpleStudioCatalogEntry(
  purpose: SimpleStudioPurpose,
): SimpleStudioCatalogEntry {
  const row = SIMPLE_STUDIO_CATALOG.find((e) => e.purpose === purpose);
  if (!row) throw new Error(`Unknown Simple Studio purpose: ${purpose}`);
  return row;
}

export function parseSimpleStudioPurpose(
  raw: string | null | undefined,
): SimpleStudioPurpose {
  const v = (raw ?? "").trim().toLowerCase();
  const allowed: SimpleStudioPurpose[] = [
    "advertisement",
    "product_video",
    "talking_photo",
    "story",
    "animation",
    "social_video",
    "general",
  ];
  if (allowed.includes(v as SimpleStudioPurpose)) return v as SimpleStudioPurpose;
  return "advertisement";
}
