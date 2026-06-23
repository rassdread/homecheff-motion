/**
 * Sprint FQ6 — enrich ReferenceAnalysisProfile from existing vision/fusion data (no new AI).
 */

import { attachCharacterConsistencyProfiles } from "@/lib/character-consistency-profile";
import { flattenSelectableTargets, buildVisionTargetTreeFromDocument } from "@/lib/vision-target-picker-v2";
import { normalizeVisionTargetKey } from "@/lib/vision-target-normalization";
import type { ReferenceAnalysisEnrichment, ReferenceAnalysisProfile } from "@/types/editor-fusion-intelligence";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type { ReferenceAnalysisEnrichment } from "@/types/editor-fusion-intelligence";

const GLASSES_RE = /\b(glasses|bril|sunglasses|zonnebril|eyewear)\b/i;
const BEARD_RE = /\b(beard|baard|mustache|snor|facial\s*hair)\b/i;
const EYES_RE = /\b(eyes?|ogen|blue\s*eyes|green\s*eyes|brown\s*eyes|iris)\b/i;
const HAIR_RE = /\b(hair|haar|blonde|brunette|dark\s*hair|curly|straight\s*hair)\b/i;
const FACE_SHAPE_RE = /\b(oval|round|square|heart-shaped|angular)\s*(face|gezicht)?\b/i;

function joinLabels(parts: ReferenceAnalysisProfile["parts"], category: string): string | undefined {
  const labels = parts.filter((p) => p.category === category).map((p) => p.label);
  return labels.length ? labels.join(", ") : undefined;
}

function parseKeyFeatures(features: string[]): Partial<ReferenceAnalysisEnrichment> {
  const text = features.join(" ");
  return {
    glasses: GLASSES_RE.test(text) ? true : features.some((f) => !GLASSES_RE.test(f)) ? false : undefined,
    beard: BEARD_RE.test(text) ? true : undefined,
    eyes: features.find((f) => EYES_RE.test(f)),
    hair: features.find((f) => HAIR_RE.test(f)),
    faceShape: features.find((f) => FACE_SHAPE_RE.test(f)),
  };
}

function collectVisionTargets(document: EditorCanvasDocument): ReferenceAnalysisEnrichment["visionTargets"] {
  try {
    const tree = buildVisionTargetTreeFromDocument(document);
    return flattenSelectableTargets(tree.roots).map((node) => ({
      id: node.id,
      label: node.label,
      normalizedKey: node.normalizedKey,
      hierarchyNodeId: node.hierarchyNodeId,
    }));
  } catch {
    return [];
  }
}

export function buildReferenceAnalysisEnrichment(
  profile: ReferenceAnalysisProfile,
  document?: EditorCanvasDocument
): ReferenceAnalysisEnrichment {
  const keyFeatures = profile.identityTraits.length ? profile.identityTraits : [];
  const fromFeatures = parseKeyFeatures(keyFeatures);

  const dominantColors = profile.colors
    .map((c) => c.label ?? c.hex ?? "")
    .filter(Boolean)
    .slice(0, 6);

  const styleDnaSummary = [
    profile.styleDNA?.visualStyle,
    profile.styleDNA?.colorTheme,
    profile.styleDNA?.brandIdentity,
    profile.styleDNA?.mascotTraits,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    eyes: fromFeatures.eyes ?? joinLabels(profile.parts, "eyes"),
    hair: fromFeatures.hair ?? joinLabels(profile.parts, "hair"),
    beard: fromFeatures.beard,
    glasses:
      fromFeatures.glasses ?? (profile.accessories.some((a) => GLASSES_RE.test(a)) ? true : undefined),
    faceShape: fromFeatures.faceShape ?? joinLabels(profile.parts, "face"),
    clothingItems: profile.clothing.length
      ? profile.clothing
      : profile.parts.filter((p) => p.category === "clothing").map((p) => p.label),
    accessoryItems: profile.accessories.length
      ? profile.accessories
      : profile.parts.filter((p) => p.category === "accessories").map((p) => p.label),
    styleDnaSummary: styleDnaSummary || undefined,
    dominantColors,
    visionTargets: document ? collectVisionTargets(document) : [],
  };
}

export function enrichReferenceAnalysisProfile(
  profile: ReferenceAnalysisProfile,
  document?: EditorCanvasDocument
): ReferenceAnalysisProfile {
  const withEnrichment = {
    ...profile,
    enrichment: buildReferenceAnalysisEnrichment(profile, document),
  };
  return attachCharacterConsistencyProfiles(withEnrichment, document);
}

export function formatEnrichedProfileSummary(profile: ReferenceAnalysisProfile): string {
  const e = profile.enrichment;
  if (!e) {
    return "";
  }
  const lines: string[] = [];
  if (e.eyes) lines.push(`eyes: ${e.eyes}`);
  if (e.hair) lines.push(`hair: ${e.hair}`);
  if (e.beard) lines.push("beard: yes");
  if (e.glasses) lines.push("glasses: yes");
  if (e.faceShape) lines.push(`face: ${e.faceShape}`);
  if (e.clothingItems.length) lines.push(`clothing: ${e.clothingItems.join(", ")}`);
  if (e.accessoryItems.length) lines.push(`accessories: ${e.accessoryItems.join(", ")}`);
  if (e.styleDnaSummary) lines.push(`style: ${e.styleDnaSummary}`);
  if (e.dominantColors.length) lines.push(`colors: ${e.dominantColors.join(", ")}`);
  return lines.join("; ");
}

export function resolveVisionTargetLabelFromBlueprint(
  document: EditorCanvasDocument,
  normalizedKey?: string
): string | undefined {
  if (!normalizedKey) {
    return undefined;
  }
  const tree = buildVisionTargetTreeFromDocument(document);
  const match = flattenSelectableTargets(tree.roots).find(
    (node) => node.normalizedKey === normalizedKey || normalizeVisionTargetKey(node.label) === normalizedKey
  );
  return match?.label;
}
