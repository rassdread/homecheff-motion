/**
 * Build ReferenceAnalysisProfile from a premium-analyzed editor document.
 */

import { buildVisibleEditorPartsTreeFromDocument } from "@/lib/build-visible-editor-parts-tree";
import { resolveEditorAssetId } from "@/lib/editor-project-isolation";
import { mapVisionAnalysisToStyleDna } from "@/lib/studio-asset-vision-analysis";
import {
  FUSION_REFERENCE_ANALYSIS_VERSION,
  type ReferenceAnalysisPart,
  type ReferenceAnalysisProfile,
} from "@/types/editor-fusion-intelligence";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const EYES_RE = /\b(eyes?|ogen|pupil|iris|oog)\b/i;
const MOUTH_RE = /\b(mouth|mond|lips?|lippen|smile|glimlach)\b/i;
const HAIR_RE = /\b(hair|haar|beard|baard|mustache|snor|curls?|krul)\b/i;
const FACE_RE = /\b(face|gezicht|head|hoofd|kop|jaw|kaak|nose|neus|cheek|wang)\b/i;
const CLOTHING_RE =
  /\b(jacket|jas|shirt|top|pants|broek|dress|jurk|shoe|schoen|outfit|kleding|coat|vest|tie|stropdas|skirt|rok)\b/i;
const ACCESSORY_RE =
  /\b(hat|hoed|glasses|bril|sunglasses|necklace|ketting|watch|horloge|bag|tas|belt|riem|jewelry|sieraad|headphone)\b/i;
const POSE_RE = /\b(arms?|armen|hands?|handen|legs?|benen|feet|voeten|pose|houding|standing|zittend)\b/i;
const BACKGROUND_RE =
  /\b(background|achtergrond|sky|lucht|sea|zee|mountain|berg|environment|omgeving|landscape|landschap)\b/i;
const ANIMAL_RE =
  /\b(fur|vacht|snout|snuit|paws?|poten|tail|staart|whiskers|snorharen|ears?|oren|muzzle)\b/i;
const PRODUCT_RE =
  /\b(product|label|verpakking|packaging|bottle|fles|box|doos|material|materiaal|reflectie|reflection)\b/i;

function categorizePartLabel(label: string): ReferenceAnalysisPart["category"] {
  if (EYES_RE.test(label)) return "eyes";
  if (MOUTH_RE.test(label)) return "mouth";
  if (HAIR_RE.test(label)) return "hair";
  if (FACE_RE.test(label)) return "face";
  if (CLOTHING_RE.test(label)) return "clothing";
  if (ACCESSORY_RE.test(label)) return "accessories";
  if (POSE_RE.test(label)) return "pose";
  if (BACKGROUND_RE.test(label)) return "background";
  if (ANIMAL_RE.test(label)) return "animal";
  if (PRODUCT_RE.test(label)) return "product";
  return "other";
}

function collectLeafLabels(
  nodes: Array<{ label: string; children?: Array<{ label: string; children?: unknown[] }> }>
): string[] {
  const labels: string[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      labels.push(...collectLeafLabels(node.children as typeof nodes));
    } else if (node.label.trim()) {
      labels.push(node.label.trim());
    }
  }
  return labels;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function buildReferenceAnalysisProfile(input: {
  document: EditorCanvasDocument;
  referenceId: string;
  role?: string;
  roleId?: string;
  name?: string;
  premiumCached?: boolean;
}): ReferenceAnalysisProfile {
  const { document } = input;
  const vision = document.visionAnalysis;
  let leafLabels: string[] = [];
  try {
    const visible = buildVisibleEditorPartsTreeFromDocument(document);
    leafLabels = uniqueStrings(collectLeafLabels(visible.tree));
  } catch {
    leafLabels = [];
  }
  if (leafLabels.length === 0 && vision?.keyFeatures?.length) {
    leafLabels = uniqueStrings(vision.keyFeatures);
  }

  const parts: ReferenceAnalysisPart[] = leafLabels.map((label, index) => ({
    id: `part_${index}`,
    label,
    category: categorizePartLabel(label),
  }));

  const clothing = parts.filter((p) => p.category === "clothing").map((p) => p.label);
  const accessories = parts.filter((p) => p.category === "accessories").map((p) => p.label);
  const poseParts = parts.filter((p) => p.category === "pose").map((p) => p.label);
  const backgroundParts = parts.filter((p) => p.category === "background").map((p) => p.label);

  const styleDNA = vision ? mapVisionAnalysisToStyleDna(vision) : undefined;
  const identityTraits = uniqueStrings([
    ...(vision?.keyFeatures ?? []),
    vision?.visualStyle ? `style: ${vision.visualStyle}` : "",
    styleDNA?.mascotTraits ?? "",
    styleDNA?.outfitHints ?? "",
  ].filter(Boolean));

  const confidence =
    vision?.confidence ??
    (document.visionV6Meta?.analysisTier === "premium"
      ? Math.min(0.95, 0.5 + (parts.length * 0.05))
      : Math.min(0.6, 0.2 + parts.length * 0.04));

  return {
    referenceId: input.referenceId,
    assetId: resolveEditorAssetId(document),
    imageUrl: document.backgroundUrl?.trim() ?? "",
    role: input.role,
    roleId: input.roleId,
    name: input.name ?? document.name,
    analysisVersion: FUSION_REFERENCE_ANALYSIS_VERSION,
    analyzedAt: new Date().toISOString(),
    styleDNA,
    parts,
    clothing,
    accessories,
    colors: vision?.colors ?? [],
    pose: poseParts.join(", ") || undefined,
    background: backgroundParts.join(", ") || vision?.environmentHints || undefined,
    identityTraits,
    objectType: vision?.objectType,
    confidence,
    premiumCached: Boolean(input.premiumCached),
  };
}

export function summarizeReferenceProfile(profile: ReferenceAnalysisProfile): string {
  const traits: string[] = [];
  const eyes = profile.parts.filter((p) => p.category === "eyes").map((p) => p.label);
  const hair = profile.parts.filter((p) => p.category === "hair").map((p) => p.label);
  const face = profile.parts.filter((p) => p.category === "face").map((p) => p.label);
  const mouth = profile.parts.filter((p) => p.category === "mouth").map((p) => p.label);

  if (eyes.length) traits.push(`eyes: ${eyes.join(", ")}`);
  if (hair.length) traits.push(`hair: ${hair.join(", ")}`);
  if (face.length) traits.push(`face: ${face.join(", ")}`);
  if (mouth.length) traits.push(`mouth: ${mouth.join(", ")}`);
  if (profile.clothing.length) traits.push(`clothing: ${profile.clothing.join(", ")}`);
  if (profile.accessories.length) traits.push(`accessories: ${profile.accessories.join(", ")}`);
  if (profile.styleDNA?.visualStyle) traits.push(`visual style: ${profile.styleDNA.visualStyle}`);
  if (profile.styleDNA?.colorTheme) traits.push(`colors: ${profile.styleDNA.colorTheme}`);

  return traits.length > 0 ? traits.join("; ") : profile.identityTraits.slice(0, 4).join("; ");
}
