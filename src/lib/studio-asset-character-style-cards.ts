import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type {
  CharacterStyleCardConfig,
  CharacterStyleCardId,
} from "@/types/studio-asset-generation-workbench";
import { CHARACTER_STYLE_CARD_IDS } from "@/types/studio-asset-generation-workbench";
import type { IdentityAssetType } from "@/types/studio-asset-identity-profile";

export const CHARACTER_STYLE_CARDS: CharacterStyleCardConfig[] = [
  {
    id: "flat_vector",
    labelKey: "studio.workbench.style.flatVector.label",
    descriptionKey: "studio.workbench.style.flatVector.description",
    bestForKey: "studio.workbench.style.flatVector.bestFor",
    identityRetentionPercent: 92,
    animationFlexibilityPercent: 75,
    complexity: "low",
    wireframe: "circle_head",
  },
  {
    id: "brand_2_5d",
    labelKey: "studio.workbench.style.brand25d.label",
    descriptionKey: "studio.workbench.style.brand25d.description",
    bestForKey: "studio.workbench.style.brand25d.bestFor",
    identityRetentionPercent: 90,
    animationFlexibilityPercent: 70,
    complexity: "medium",
    wireframe: "rounded_mascot",
  },
  {
    id: "brand_3d_mascot",
    labelKey: "studio.workbench.style.brand3d.label",
    descriptionKey: "studio.workbench.style.brand3d.description",
    bestForKey: "studio.workbench.style.brand3d.bestFor",
    identityRetentionPercent: 88,
    animationFlexibilityPercent: 65,
    complexity: "high",
    wireframe: "blocky_3d",
  },
  {
    id: "mobile_game",
    labelKey: "studio.workbench.style.mobileGame.label",
    descriptionKey: "studio.workbench.style.mobileGame.description",
    bestForKey: "studio.workbench.style.mobileGame.bestFor",
    identityRetentionPercent: 85,
    animationFlexibilityPercent: 80,
    complexity: "medium",
    wireframe: "game_sprite",
  },
  {
    id: "stylized_cartoon",
    labelKey: "studio.workbench.style.stylizedCartoon.label",
    descriptionKey: "studio.workbench.style.stylizedCartoon.description",
    bestForKey: "studio.workbench.style.stylizedCartoon.bestFor",
    identityRetentionPercent: 86,
    animationFlexibilityPercent: 78,
    complexity: "medium",
    wireframe: "rounded_mascot",
  },
  {
    id: "storybook",
    labelKey: "studio.workbench.style.storybook.label",
    descriptionKey: "studio.workbench.style.storybook.description",
    bestForKey: "studio.workbench.style.storybook.bestFor",
    identityRetentionPercent: 84,
    animationFlexibilityPercent: 60,
    complexity: "low",
    wireframe: "storybook",
  },
  {
    id: "custom",
    labelKey: "studio.workbench.style.custom.label",
    descriptionKey: "studio.workbench.style.custom.description",
    bestForKey: "studio.workbench.style.custom.bestFor",
    identityRetentionPercent: 80,
    animationFlexibilityPercent: 70,
    complexity: "medium",
    wireframe: "custom",
  },
];

const STYLE_ASSET_TYPES = new Set<IdentityAssetType | "">([
  "character",
  "mascot",
  "person",
  "canonical_character_base",
]);

export function shouldShowCharacterStyleStep(draft: AssetWizardDraft): boolean {
  const type = draft.identityAssetType;
  if (!STYLE_ASSET_TYPES.has(type)) {
    return false;
  }
  return Boolean(draft.sourceVisionAnalysis);
}

export function resolveCharacterStyleCard(id: CharacterStyleCardId | ""): CharacterStyleCardConfig | null {
  if (!id) {
    return null;
  }
  return CHARACTER_STYLE_CARDS.find((c) => c.id === id) ?? null;
}

export function suggestCharacterStyleFromVision(
  draft: AssetWizardDraft
): CharacterStyleCardId | "" {
  const vision = draft.sourceVisionAnalysis;
  if (!vision) {
    return "";
  }
  const style = `${vision.visualStyle} ${vision.objectTypeLabel}`.toLowerCase();
  if (/flat|vector|icon/.test(style)) {
    return "flat_vector";
  }
  if (/3d|render/.test(style) || (/mascot/.test(style) && !/flat|vector/.test(style))) {
    return "brand_3d_mascot";
  }
  if (/2\.5|2d.*depth|layered/.test(style)) {
    return "brand_2_5d";
  }
  if (/game|sprite|mobile/.test(style)) {
    return "mobile_game";
  }
  if (/storybook|illustration|watercolor/.test(style)) {
    return "storybook";
  }
  if (/cartoon|stylized/.test(style)) {
    return "stylized_cartoon";
  }
  return "flat_vector";
}

export function buildCharacterStylePromptBlock(
  styleId: CharacterStyleCardId | "",
  customStyle?: string
): string {
  const card = resolveCharacterStyleCard(styleId);
  if (!card) {
    return customStyle?.trim() ? `Character style: ${customStyle.trim()}.` : "";
  }
  const label = styleId.replace(/_/g, " ");
  return [
    `Character style: ${label}.`,
    `Target identity retention ~${card.identityRetentionPercent}%.`,
    `Animation flexibility ~${card.animationFlexibilityPercent}%.`,
    customStyle?.trim() ? `Custom style notes: ${customStyle.trim()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function canAdvanceFromCharacterStyleStep(draft: AssetWizardDraft): boolean {
  if (!shouldShowCharacterStyleStep(draft)) {
    return true;
  }
  if (draft.characterStyleCard === "custom") {
    return Boolean(draft.characterStyleCustom.trim());
  }
  return CHARACTER_STYLE_CARD_IDS.includes(draft.characterStyleCard as CharacterStyleCardId);
}
