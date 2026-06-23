/**
 * Sprint CC6/CC7 — Person & Mascot consistency profiles from existing vision data.
 */

import type { ReferenceAnalysisProfile } from "@/types/editor-fusion-intelligence";
import type {
  MascotConsistencyProfile,
  PersonConsistencyProfile,
} from "@/types/character-consistency-audit";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { buildReferenceAnalysisEnrichment } from "@/lib/fusion-profile-enrichment";

const EYE_COLOR_RE = /\b(blue|green|brown|hazel|grey|gray|amber)\s*(eyes?)?\b/i;
const HAIR_COLOR_RE = /\b(blonde|brunette|brown|black|red|auburn|dark|light)\s*(hair|haar)?\b/i;
const HAIR_STYLE_RE = /\b(curly|straight|wavy|braided|ponytail|buzz)\b/i;
const HAIR_LENGTH_RE = /\b(short|long|medium)\s*(hair|haar)?\b/i;
const HAT_RE = /\b(hat|hoed|cap|pet|beanie)\b/i;
const NECKLACE_RE = /\b(necklace|ketting|chain)\b/i;
const EARRING_RE = /\b(earrings?|oorbellen)\b/i;
const WATCH_RE = /\b(watch|horloge)\b/i;
const SHIRT_RE = /\b(shirt|top|blouse)\b/i;
const HOODIE_RE = /\b(hoodie|hoody|sweatshirt)\b/i;
const JACKET_RE = /\b(jacket|jas|coat|vest)\b/i;
const DRESS_RE = /\b(dress|jurk)\b/i;
const EMBLEM_RE = /\b(emblem|badge|logo|mascot\s*mark)\b/i;
const MASCOT_HEAD_RE = /\b(head|hoofd|snout|snuit|muzzle)\b/i;
const MASCOT_BODY_RE = /\b(body|lichaam|torso|poten|paws)\b/i;

function findPartLabel(profile: ReferenceAnalysisProfile, pattern: RegExp): string | undefined {
  return profile.parts.find((p) => pattern.test(p.label))?.label;
}

function findInTraits(profile: ReferenceAnalysisProfile, pattern: RegExp): string | undefined {
  return profile.identityTraits.find((t) => pattern.test(t));
}

function extractEyeColor(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const match = text.match(EYE_COLOR_RE);
  return match ? match[0].trim() : undefined;
}

function extractHairColor(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const match = text.match(HAIR_COLOR_RE);
  return match ? match[0].trim() : undefined;
}

export function buildPersonConsistencyProfile(
  profile: ReferenceAnalysisProfile,
  document?: EditorCanvasDocument
): PersonConsistencyProfile {
  const enrichment = profile.enrichment ?? buildReferenceAnalysisEnrichment(profile, document);
  const traitText = profile.identityTraits.join(" ");
  const eyesText = enrichment.eyes ?? findInTraits(profile, /\beyes?\b/i);

  return {
    eyes: eyesText,
    eyeColor: extractEyeColor(eyesText) ?? extractEyeColor(traitText),
    glasses: enrichment.glasses,
    beard: enrichment.beard,
    mustache: /\b(mustache|snor)\b/i.test(traitText) ? true : undefined,
    faceShape: enrichment.faceShape,
    hairColor: extractHairColor(enrichment.hair) ?? extractHairColor(traitText),
    hairStyle: findInTraits(profile, HAIR_STYLE_RE) ?? (enrichment.hair && HAIR_STYLE_RE.test(enrichment.hair) ? enrichment.hair : undefined),
    hairLength: findInTraits(profile, HAIR_LENGTH_RE),
    accessories: {
      hat: profile.accessories.find((a) => HAT_RE.test(a)) ?? findPartLabel(profile, HAT_RE),
      necklace: profile.accessories.find((a) => NECKLACE_RE.test(a)) ?? findPartLabel(profile, NECKLACE_RE),
      earrings: profile.accessories.find((a) => EARRING_RE.test(a)) ?? findPartLabel(profile, EARRING_RE),
      watch: profile.accessories.find((a) => WATCH_RE.test(a)) ?? findPartLabel(profile, WATCH_RE),
    },
    clothing: {
      shirt: enrichment.clothingItems.find((c) => SHIRT_RE.test(c)) ?? findPartLabel(profile, SHIRT_RE),
      hoodie: enrichment.clothingItems.find((c) => HOODIE_RE.test(c)) ?? findPartLabel(profile, HOODIE_RE),
      jacket: enrichment.clothingItems.find((c) => JACKET_RE.test(c)) ?? findPartLabel(profile, JACKET_RE),
      dress: enrichment.clothingItems.find((c) => DRESS_RE.test(c)) ?? findPartLabel(profile, DRESS_RE),
    },
    styleDnaSummary: enrichment.styleDnaSummary,
    dominantColors: enrichment.dominantColors,
  };
}

export function buildMascotConsistencyProfile(
  profile: ReferenceAnalysisProfile,
  document?: EditorCanvasDocument
): MascotConsistencyProfile {
  const enrichment = profile.enrichment ?? buildReferenceAnalysisEnrichment(profile, document);
  const isMascot =
    profile.objectType === "mascot" ||
    /\bmascot\b/i.test(profile.styleDNA?.brandIdentity ?? "") ||
    /\bmascot\b/i.test(enrichment.styleDnaSummary ?? "");

  const emblems = [
    ...profile.parts.filter((p) => EMBLEM_RE.test(p.label)).map((p) => p.label),
    ...enrichment.visionTargets.filter((t) => EMBLEM_RE.test(t.label)).map((t) => t.label),
  ];

  return {
    headShape: isMascot ? findPartLabel(profile, MASCOT_HEAD_RE) ?? enrichment.faceShape : enrichment.faceShape,
    bodyShape: findPartLabel(profile, MASCOT_BODY_RE),
    accessories: enrichment.accessoryItems,
    emblems: [...new Set(emblems)],
    colorPalette: enrichment.dominantColors,
    visualStyle: enrichment.styleDnaSummary ?? profile.styleDNA?.visualStyle,
  };
}

export function attachCharacterConsistencyProfiles(
  profile: ReferenceAnalysisProfile,
  document?: EditorCanvasDocument
): ReferenceAnalysisProfile {
  return {
    ...profile,
    personConsistency: buildPersonConsistencyProfile(profile, document),
    mascotConsistency: buildMascotConsistencyProfile(profile, document),
  };
}

export function formatPersonConsistencyBlock(
  label: string,
  person: PersonConsistencyProfile
): string[] {
  const lines: string[] = [`${label}:`];
  if (person.eyeColor || person.eyes) lines.push(`- ${person.eyeColor ?? person.eyes} eyes`);
  if (person.hairColor) lines.push(`- ${person.hairColor} hair`);
  else if (person.hairStyle) lines.push(`- hair: ${person.hairStyle}`);
  if (person.glasses) lines.push("- glasses: yes");
  if (person.beard) lines.push("- beard: yes");
  if (person.mustache) lines.push("- mustache: yes");
  if (person.faceShape) lines.push(`- face: ${person.faceShape}`);
  const clothing = Object.values(person.clothing).filter(Boolean);
  if (clothing.length) lines.push(`- clothing: ${clothing.join(", ")}`);
  const accessories = Object.values(person.accessories).filter(Boolean);
  if (accessories.length) lines.push(`- accessories: ${accessories.join(", ")}`);
  if (person.styleDnaSummary) lines.push(`- style: ${person.styleDnaSummary}`);
  return lines.length > 1 ? lines : [];
}

export function formatMascotConsistencyBlock(
  label: string,
  mascot: MascotConsistencyProfile
): string[] {
  const lines: string[] = [`${label} (mascot):`];
  if (mascot.headShape) lines.push(`- head: ${mascot.headShape}`);
  if (mascot.bodyShape) lines.push(`- body: ${mascot.bodyShape}`);
  if (mascot.emblems.length) lines.push(`- emblems: ${mascot.emblems.join(", ")}`);
  if (mascot.accessories.length) lines.push(`- accessories: ${mascot.accessories.join(", ")}`);
  if (mascot.colorPalette.length) lines.push(`- palette: ${mascot.colorPalette.join(", ")}`);
  if (mascot.visualStyle) lines.push(`- style: ${mascot.visualStyle}`);
  return lines.length > 1 ? lines : [];
}

export function formatCharacterConsistencyPromptBlocks(
  profiles: ReferenceAnalysisProfile[]
): string[] {
  const lines: string[] = ["CHARACTER CONSISTENCY"];
  for (const profile of profiles) {
    const label = profile.name ?? profile.role ?? profile.referenceId;
    const person = profile.personConsistency;
    const mascot = profile.mascotConsistency;
    if (person) {
      lines.push(...formatPersonConsistencyBlock(label, person));
    }
    if (mascot && (mascot.emblems.length || mascot.visualStyle || profile.objectType === "mascot")) {
      lines.push(...formatMascotConsistencyBlock(label, mascot));
    }
    lines.push("");
  }
  return lines.filter((line, index, arr) => line !== "" || index < arr.length - 1);
}
