/**
 * Shared intent inference for Simple Studio purposes.
 * Quick Ad heuristics remain the foundation; purpose adjusts defaults/CTA.
 */

import type {
  SimpleStudioIntent,
  SimpleStudioPlatform,
  SimpleStudioPurpose,
} from "@/lib/simple-studio/catalog";

const LOCATION_RE =
  /\b(in|uit|van|te)\s+([A-ZÁÉÍÓÚÄËÏÖÜÀÈ][\wÁÉÍÓÚÄËÏÖÜÀÈáéíóúäëïöüàè-]{2,})/u;

const CTA_PATTERNS: Array<{ re: RegExp; cta: string }> = [
  { re: /bestel/i, cta: "Bestel nu" },
  { re: /growth|klanten vinden|leads/i, cta: "Probeer Growth" },
  { re: /studio|advertentie maken|social content/i, cta: "Probeer Studio" },
  { re: /aanbied|verk(oop|oop)|listing|home\s*cheff/i, cta: "Start op HomeCheff" },
  { re: /meld\s*je\s*aan|aanmelden|inschrijven/i, cta: "Meld je aan" },
  { re: /volg/i, cta: "Volg ons" },
];

const TONE_WARM = /warm|lokaal|buurt|gezellig|ambacht/i;
const TONE_PRO = /professioneel|zakelijk|direct|modern/i;

const PURPOSE_DEFAULT_CTA: Record<SimpleStudioPurpose, string> = {
  advertisement: "Meer info",
  product_video: "Bekijk product",
  talking_photo: "Bekijk meer",
  story: "Lees verder",
  animation: "Bekijk",
  social_video: "Volg ons",
  general: "Meer info",
};

const PURPOSE_DURATION: Record<SimpleStudioPurpose, 15 | 20> = {
  advertisement: 20,
  product_video: 15,
  talking_photo: 15,
  story: 20,
  animation: 15,
  social_video: 15,
  general: 15,
};

export function inferSimpleStudioIntent(input: {
  story: string;
  purpose: SimpleStudioPurpose;
  platforms?: SimpleStudioPlatform[];
}): SimpleStudioIntent {
  const story = input.story.trim();
  const platforms =
    input.platforms && input.platforms.length > 0
      ? input.platforms
      : (["instagram", "facebook"] as SimpleStudioPlatform[]);

  const locMatch = story.match(LOCATION_RE);
  const location = locMatch?.[2] ?? null;

  let product: string | null = null;
  const productMatch = story.match(
    /\b(taarten?|producten?|diensten?|maaltijden?|groente|fruit|creaties?|ambacht)\b/i,
  );
  if (productMatch) product = productMatch[1] ?? null;
  else {
    const maakMatch = story.match(
      /\b(?:maak|maakt|verkopen?|bied)\s+(?:zelf\s+)?(.{3,40}?)(?:\s+in\s|\s+en\s|\.|$)/i,
    );
    if (maakMatch?.[1]) product = maakMatch[1].trim();
  }

  let audience: string | null = null;
  if (/buurt|lokaal|vlaardingen|stad|regio/i.test(story)) audience = "lokale klanten";
  if (/ondernemers?|verkopers?|makers?/i.test(story)) audience = "ondernemers en makers";

  let cta = PURPOSE_DEFAULT_CTA[input.purpose];
  for (const row of CTA_PATTERNS) {
    if (row.re.test(story)) {
      cta = row.cta;
      break;
    }
  }

  let tone = "warm en professioneel";
  if (TONE_WARM.test(story) && TONE_PRO.test(story)) tone = "warm, lokaal en professioneel";
  else if (TONE_WARM.test(story)) tone = "warm en lokaal";
  else if (TONE_PRO.test(story)) tone = "professioneel en direct";

  return {
    purpose: input.purpose,
    product,
    audience,
    location,
    tone,
    platforms,
    cta,
    format: "9:16",
    durationSeconds: PURPOSE_DURATION[input.purpose],
  };
}

export function buildSimpleStudioPipelineMessage(input: {
  story: string;
  intent: SimpleStudioIntent;
  revisionInstruction?: string | null;
}): string {
  const parts = [input.story.trim()];
  if (
    input.intent.cta &&
    !input.story.toLowerCase().includes(input.intent.cta.toLowerCase().slice(0, 6))
  ) {
    parts.push(input.intent.cta);
  }
  if (input.revisionInstruction?.trim()) {
    parts.push(`Aanpassing: ${input.revisionInstruction.trim()}`);
  }
  return parts.filter(Boolean).join(". ");
}

export function simpleStudioProjectName(
  intent: SimpleStudioIntent,
  story: string,
): string {
  const label =
    intent.purpose === "advertisement"
      ? "Advertentie"
      : intent.purpose === "product_video"
        ? "Productvideo"
        : intent.purpose === "talking_photo"
          ? "Pratende foto"
          : intent.purpose === "story"
            ? "Verhaal"
            : intent.purpose === "social_video"
              ? "Social video"
              : "Studio";
  if (intent.product && intent.location) return `${intent.product} · ${intent.location}`;
  if (intent.product) return `${label} · ${intent.product}`;
  if (intent.location) return `${label} · ${intent.location}`;
  const first = story.trim().split(/\s+/).slice(0, 5).join(" ");
  return first ? `${label} · ${first}` : label;
}
