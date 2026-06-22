/**
 * Maps Vision Truth hierarchy nodes back to legacy editor/copilot part groups.
 * Reuses pre–Truth Mode groups: eyes, outfit, mouth, accessories, pose, …
 */

import { resolveUserTaxonomyPlacement } from "@/lib/editor-vision-user-taxonomy";
import type { EditorVisionTruthAssetType } from "@/lib/editor-vision-evidence-audit";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

export type LegacyEditorActionPartGroup =
  | "eyes"
  | "mouth"
  | "face"
  | "hair"
  | "outfit"
  | "accessories"
  | "globe"
  | "coat"
  | "tail"
  | "pose"
  | "expression"
  | "background"
  | "appearance";

const ACCESSORY_LABEL_RE =
  /sunglasses|glasses|eyewear|hat|cap|helmet|necklace|watch|bracelet|ring|backpack|bag|headphones|collar|leash|harness|bandana|globe|badge|microphone|zonnebril|bril|horloge|ketting|halsband|oorbellen|tas|rugzak/i;

function labelPartGroup(label: string): LegacyEditorActionPartGroup | null {
  const text = label.toLowerCase().trim();
  if (!text) {
    return null;
  }
  if (/eye|ogen|pupil|eyebrow|iris/.test(text)) {
    return "eyes";
  }
  if (/mouth|mond|lip|teeth|smile|grin|tongue/.test(text)) {
    return "mouth";
  }
  if (/hair|haar|beard|moustache|mustache|snor|baard/.test(text)) {
    return "hair";
  }
  if (/globe|wereldbol|world\s*globe/.test(text)) {
    return "globe";
  }
  if (/tail|staart/.test(text)) {
    return "tail";
  }
  if (/fur|vacht|feather|veren|coat|paw|poten|whisker|snout|muzzle|beak/.test(text)) {
    return "coat";
  }
  if (
    /outfit|jacket|jas|shirt|blouse|pants|trousers|broek|dress|skirt|jeans|shoe|schoen|sneaker|boot|kleding|clothing|tie|apron|vest|hoodie|blazer/.test(
      text
    )
  ) {
    return "outfit";
  }
  if (/pose|standing|sitting|walking|running|waving|pointing|houding|\barm|\bhand|\bleg|\bfoot|\bfeet/.test(text)) {
    return "pose";
  }
  if (/expr|express|serious|happy|neutral|friendly|blij|angry|surprised|confident/.test(text)) {
    return "expression";
  }
  if (/background|backdrop|wall|muur|sky|lucht|room|kamer|furniture|meubel/.test(text)) {
    return "background";
  }
  if (/face|gezicht|nose|neus|ear|oor|cheek|wang|chin|forehead|jawline/.test(text)) {
    return "face";
  }
  if (ACCESSORY_LABEL_RE.test(text)) {
    return "accessories";
  }
  return null;
}

function userTaxonomyPartGroup(
  parent: string | undefined,
  sub: string | undefined
): LegacyEditorActionPartGroup | null {
  if (!parent) {
    return null;
  }
  if (parent === "accessories") {
    return "accessories";
  }
  if (parent === "clothing") {
    return "outfit";
  }
  if (parent === "pose") {
    return "pose";
  }
  if (parent === "background") {
    return "background";
  }
  if (parent === "expression") {
    return "expression";
  }
  if (parent === "morph") {
    return "appearance";
  }
  if (parent === "character") {
    switch (sub) {
      case "eyes":
        return "eyes";
      case "mouth":
        return "mouth";
      case "hair":
        return "hair";
      case "face":
        return "face";
      case "skin":
        return "coat";
      case "body":
        return "appearance";
      default:
        return "appearance";
    }
  }
  return null;
}

function legacyTaxonomyTabPartGroup(
  tab: string | undefined,
  label: string
): LegacyEditorActionPartGroup | null {
  if (!tab) {
    return null;
  }
  const fromLabel = labelPartGroup(label);
  switch (tab) {
    case "accessories":
      return "accessories";
    case "clothing":
      return "outfit";
    case "pose":
      return "pose";
    case "expression":
      return "expression";
    case "hair":
      return "hair";
    case "background":
      return "background";
    case "face":
      return fromLabel ?? "face";
    case "body":
      return fromLabel ?? "appearance";
    case "head":
      return fromLabel ?? "face";
    case "coat":
    case "paws_wings":
      return fromLabel ?? "coat";
    case "appearance":
      return fromLabel ?? "appearance";
    case "eyes":
      return "eyes";
    case "mouth":
      return "mouth";
    case "outfit":
      return "outfit";
    default:
      return fromLabel;
  }
}

/** Resolve legacy copilot/instruction part group for a hierarchy node. */
export function resolveLegacyActionPartGroupFromNode(
  node: EditorVisionHierarchyNode
): LegacyEditorActionPartGroup {
  if (node.actionPartGroup) {
    return node.actionPartGroup as LegacyEditorActionPartGroup;
  }

  const fromLabel = labelPartGroup(node.label);
  if (fromLabel) {
    return fromLabel;
  }

  const fromUserTaxonomy = userTaxonomyPartGroup(node.taxonomyParentTab, node.taxonomyTab);
  if (fromUserTaxonomy) {
    return fromUserTaxonomy;
  }

  const fromLegacyTab = legacyTaxonomyTabPartGroup(node.taxonomyTab, node.label);
  if (fromLegacyTab) {
    return fromLegacyTab;
  }

  return "appearance";
}

/** Resolve legacy part group when building truth hierarchy leaves. */
export function resolveLegacyActionPartGroupFromPart(
  part: IllustrationPartSpec,
  assetType: EditorVisionTruthAssetType = "unknown"
): LegacyEditorActionPartGroup {
  const placement = resolveUserTaxonomyPlacement(part, assetType);
  const fromLabel = labelPartGroup(part.label);
  if (fromLabel) {
    return fromLabel;
  }
  const fromUserTaxonomy = userTaxonomyPartGroup(placement.parent, placement.sub);
  if (fromUserTaxonomy) {
    return fromUserTaxonomy;
  }
  return legacyTaxonomyTabPartGroup(placement.sub, part.label) ?? "appearance";
}
