import type {
  EditorFusionIntent,
  EditorFusionIntentCategory,
  EditorFusionPreservationRule,
} from "@/types/editor-instruction-studio";

export type EditorFusionUploadStep = {
  id: string;
  labelKey: string;
  hintKey?: string;
  role: string;
  optional?: boolean;
};

export type EditorFusionIntentDefinition = {
  id: EditorFusionIntent;
  category: EditorFusionIntentCategory;
  labelKey: string;
  hintKey: string;
  uploadSteps: EditorFusionUploadStep[];
  defaultFusionStrength: number;
  defaultPreservation: EditorFusionPreservationRule[];
  supportsVariations?: boolean;
  supportsSequences?: boolean;
  supportsMotionHandoff?: boolean;
  isSimulation?: boolean;
  legacy?: boolean;
  badge?: "popular" | "recommended" | "new" | "premium";
};

export const FUTURE_IDENTITY_DISCLAIMER =
  "Likely visual simulation — not a factual prediction.";

const PEOPLE: EditorFusionIntentDefinition[] = [
  {
    id: "outfit_from_reference",
    category: "people_characters",
    labelKey: "editor.fusion.intent.outfitFromReference.label",
    hintKey: "editor.fusion.intent.outfitFromReference.hint",
    uploadSteps: [
      { id: "person", labelKey: "editor.fusion.upload.person", role: "person" },
      { id: "outfit", labelKey: "editor.fusion.upload.outfit", role: "outfit" },
    ],
    defaultFusionStrength: 85,
    defaultPreservation: ["face", "hair", "identity", "expression", "body_proportions", "pose"],
    badge: "popular",
  },
  {
    id: "person_outfit",
    category: "people_characters",
    labelKey: "editor.fusion.intent.outfitFromReference.label",
    hintKey: "editor.fusion.intent.outfitFromReference.hint",
    uploadSteps: [
      { id: "person", labelKey: "editor.fusion.upload.person", role: "person" },
      { id: "outfit", labelKey: "editor.fusion.upload.outfit", role: "outfit" },
    ],
    defaultFusionStrength: 85,
    defaultPreservation: ["face", "hair", "identity", "expression", "body_proportions", "pose"],
    legacy: true,
  },
  {
    id: "character_fusion",
    category: "people_characters",
    labelKey: "editor.fusion.intent.characterFusion.label",
    hintKey: "editor.fusion.intent.characterFusion.hint",
    uploadSteps: [
      { id: "character_a", labelKey: "editor.fusion.upload.characterA", role: "character" },
      { id: "character_b", labelKey: "editor.fusion.upload.characterB", role: "character" },
    ],
    defaultFusionStrength: 50,
    defaultPreservation: ["identity", "illustration_style"],
    badge: "recommended",
  },
  {
    id: "character_upgrade",
    category: "people_characters",
    labelKey: "editor.fusion.intent.characterUpgrade.label",
    hintKey: "editor.fusion.intent.characterUpgrade.hint",
    uploadSteps: [{ id: "character", labelKey: "editor.fusion.upload.character", role: "character" }],
    defaultFusionStrength: 65,
    defaultPreservation: ["face", "identity", "pose"],
  },
  {
    id: "human_into_mascot",
    category: "people_characters",
    labelKey: "editor.fusion.intent.humanIntoMascot.label",
    hintKey: "editor.fusion.intent.humanIntoMascot.hint",
    uploadSteps: [
      { id: "human", labelKey: "editor.fusion.upload.human", role: "person" },
      {
        id: "mascot_style",
        labelKey: "editor.fusion.upload.mascotStyle",
        role: "style",
        optional: true,
      },
    ],
    defaultFusionStrength: 75,
    defaultPreservation: ["identity", "hair", "clothing", "brand_colors"],
  },
  {
    id: "mascot_into_human",
    category: "people_characters",
    labelKey: "editor.fusion.intent.mascotIntoHuman.label",
    hintKey: "editor.fusion.intent.mascotIntoHuman.hint",
    uploadSteps: [{ id: "mascot", labelKey: "editor.fusion.upload.mascot", role: "character" }],
    defaultFusionStrength: 70,
    defaultPreservation: ["brand_identity", "brand_colors", "logo", "identity"],
  },
];

const ANIMALS: EditorFusionIntentDefinition[] = [
  {
    id: "animal_fusion",
    category: "animals",
    labelKey: "editor.fusion.intent.animalFusion.label",
    hintKey: "editor.fusion.intent.animalFusion.hint",
    uploadSteps: [
      { id: "animal_a", labelKey: "editor.fusion.upload.animalA", role: "animal" },
      { id: "animal_b", labelKey: "editor.fusion.upload.animalB", role: "animal" },
    ],
    defaultFusionStrength: 50,
    defaultPreservation: ["pose", "expression"],
  },
  {
    id: "animal_human_fusion",
    category: "animals",
    labelKey: "editor.fusion.intent.animalHumanFusion.label",
    hintKey: "editor.fusion.intent.animalHumanFusion.hint",
    uploadSteps: [
      { id: "animal", labelKey: "editor.fusion.upload.animal", role: "animal" },
      { id: "human", labelKey: "editor.fusion.upload.human", role: "person" },
    ],
    defaultFusionStrength: 45,
    defaultPreservation: ["identity", "expression"],
  },
  {
    id: "pet_customization",
    category: "animals",
    labelKey: "editor.fusion.intent.petCustomization.label",
    hintKey: "editor.fusion.intent.petCustomization.hint",
    uploadSteps: [{ id: "pet", labelKey: "editor.fusion.upload.pet", role: "animal" }],
    defaultFusionStrength: 60,
    defaultPreservation: ["face", "expression", "body_proportions"],
  },
  {
    id: "fantasy_creature",
    category: "animals",
    labelKey: "editor.fusion.intent.fantasyCreature.label",
    hintKey: "editor.fusion.intent.fantasyCreature.hint",
    uploadSteps: [
      { id: "ref_a", labelKey: "editor.fusion.upload.referenceA", role: "creature" },
      { id: "ref_b", labelKey: "editor.fusion.upload.referenceB", role: "creature", optional: true },
    ],
    defaultFusionStrength: 65,
    defaultPreservation: [],
  },
];

const PRODUCTS: EditorFusionIntentDefinition[] = [
  {
    id: "product_branding",
    category: "products_brands",
    labelKey: "editor.fusion.intent.productBranding.label",
    hintKey: "editor.fusion.intent.productBranding.hint",
    uploadSteps: [
      { id: "product", labelKey: "editor.fusion.upload.product", role: "product" },
      { id: "logo", labelKey: "editor.fusion.upload.logo", role: "logo", optional: true },
    ],
    defaultFusionStrength: 80,
    defaultPreservation: ["product_shape", "brand_colors"],
  },
  {
    id: "product_packaging",
    category: "products_brands",
    labelKey: "editor.fusion.intent.productPackaging.label",
    hintKey: "editor.fusion.intent.productPackaging.hint",
    uploadSteps: [
      { id: "product", labelKey: "editor.fusion.upload.product", role: "product" },
      { id: "packaging", labelKey: "editor.fusion.upload.packaging", role: "packaging", optional: true },
    ],
    defaultFusionStrength: 75,
    defaultPreservation: ["product_shape"],
  },
  {
    id: "product_environment",
    category: "products_brands",
    labelKey: "editor.fusion.intent.productEnvironment.label",
    hintKey: "editor.fusion.intent.productEnvironment.hint",
    uploadSteps: [
      { id: "product", labelKey: "editor.fusion.upload.product", role: "product" },
      { id: "environment", labelKey: "editor.fusion.upload.environment", role: "background", optional: true },
    ],
    defaultFusionStrength: 70,
    defaultPreservation: ["product_shape"],
  },
  {
    id: "product_family",
    category: "products_brands",
    labelKey: "editor.fusion.intent.productFamily.label",
    hintKey: "editor.fusion.intent.productFamily.hint",
    uploadSteps: [{ id: "product", labelKey: "editor.fusion.upload.product", role: "product" }],
    defaultFusionStrength: 55,
    defaultPreservation: ["product_shape"],
  },
];

const MARKETING: EditorFusionIntentDefinition[] = [
  {
    id: "ad_composition",
    category: "marketing_content",
    labelKey: "editor.fusion.intent.adComposition.label",
    hintKey: "editor.fusion.intent.adComposition.hint",
    uploadSteps: [
      { id: "product", labelKey: "editor.fusion.upload.product", role: "product", optional: true },
      { id: "person", labelKey: "editor.fusion.upload.person", role: "person", optional: true },
      { id: "background", labelKey: "editor.fusion.upload.background", role: "background", optional: true },
    ],
    defaultFusionStrength: 70,
    defaultPreservation: ["brand_colors", "logo"],
  },
  {
    id: "social_media_visual",
    category: "marketing_content",
    labelKey: "editor.fusion.intent.socialMediaVisual.label",
    hintKey: "editor.fusion.intent.socialMediaVisual.hint",
    uploadSteps: [{ id: "source", labelKey: "editor.fusion.upload.source", role: "object" }],
    defaultFusionStrength: 65,
    defaultPreservation: ["brand_colors"],
  },
  {
    id: "poster_composition",
    category: "marketing_content",
    labelKey: "editor.fusion.intent.posterComposition.label",
    hintKey: "editor.fusion.intent.posterComposition.hint",
    uploadSteps: [{ id: "source", labelKey: "editor.fusion.upload.source", role: "object" }],
    defaultFusionStrength: 70,
    defaultPreservation: ["brand_colors", "logo"],
  },
  {
    id: "campaign_variant",
    category: "marketing_content",
    labelKey: "editor.fusion.intent.campaignVariant.label",
    hintKey: "editor.fusion.intent.campaignVariant.hint",
    uploadSteps: [{ id: "source", labelKey: "editor.fusion.upload.source", role: "object" }],
    defaultFusionStrength: 50,
    defaultPreservation: ["brand_identity", "logo"],
  },
  {
    id: "person_background",
    category: "marketing_content",
    labelKey: "editor.fusion.intent.personBackground.label",
    hintKey: "editor.fusion.intent.personBackground.hint",
    uploadSteps: [
      { id: "person", labelKey: "editor.fusion.upload.person", role: "person" },
      { id: "background", labelKey: "editor.fusion.upload.background", role: "background", optional: true },
    ],
    defaultFusionStrength: 75,
    defaultPreservation: ["face", "identity", "pose"],
    badge: "popular",
  },
];

const FUTURE: EditorFusionIntentDefinition[] = [
  {
    id: "how_will_i_look",
    category: "future_identity",
    labelKey: "editor.fusion.intent.howWillILook.label",
    hintKey: "editor.fusion.intent.howWillILook.hint",
    uploadSteps: [
      { id: "current", labelKey: "editor.fusion.upload.currentPhoto", role: "person" },
      { id: "father", labelKey: "editor.fusion.upload.father", role: "family", optional: true },
      { id: "mother", labelKey: "editor.fusion.upload.mother", role: "family", optional: true },
    ],
    defaultFusionStrength: 60,
    defaultPreservation: ["face", "identity", "distinctive_features"],
    isSimulation: true,
    badge: "new",
  },
  {
    id: "life_timeline",
    category: "future_identity",
    labelKey: "editor.fusion.intent.lifeTimeline.label",
    hintKey: "editor.fusion.intent.lifeTimeline.hint",
    uploadSteps: [{ id: "current", labelKey: "editor.fusion.upload.currentPhoto", role: "person" }],
    defaultFusionStrength: 55,
    defaultPreservation: ["face", "identity"],
    isSimulation: true,
    badge: "premium",
  },
  {
    id: "genetic_blend",
    category: "future_identity",
    labelKey: "editor.fusion.intent.geneticBlend.label",
    hintKey: "editor.fusion.intent.geneticBlend.hint",
    uploadSteps: [
      { id: "person", labelKey: "editor.fusion.upload.currentPhoto", role: "person" },
      { id: "mother", labelKey: "editor.fusion.upload.mother", role: "family", optional: true },
      { id: "father", labelKey: "editor.fusion.upload.father", role: "family", optional: true },
    ],
    defaultFusionStrength: 50,
    defaultPreservation: ["identity"],
    isSimulation: true,
  },
  {
    id: "future_child",
    category: "future_identity",
    labelKey: "editor.fusion.intent.futureChild.label",
    hintKey: "editor.fusion.intent.futureChild.hint",
    uploadSteps: [
      { id: "parent_a", labelKey: "editor.fusion.upload.parentA", role: "person" },
      { id: "parent_b", labelKey: "editor.fusion.upload.parentB", role: "person" },
    ],
    defaultFusionStrength: 50,
    defaultPreservation: [],
    isSimulation: true,
  },
  {
    id: "future_professions",
    category: "future_identity",
    labelKey: "editor.fusion.intent.futureProfessions.label",
    hintKey: "editor.fusion.intent.futureProfessions.hint",
    uploadSteps: [{ id: "current", labelKey: "editor.fusion.upload.currentPhoto", role: "person" }],
    defaultFusionStrength: 65,
    defaultPreservation: ["face", "identity", "hair"],
    isSimulation: true,
  },
  {
    id: "future_home",
    category: "future_identity",
    labelKey: "editor.fusion.intent.futureHome.label",
    hintKey: "editor.fusion.intent.futureHome.hint",
    uploadSteps: [{ id: "property", labelKey: "editor.fusion.upload.property", role: "environment" }],
    defaultFusionStrength: 60,
    defaultPreservation: ["building_structure"],
    isSimulation: true,
  },
];

const LEGACY: EditorFusionIntentDefinition[] = [
  {
    id: "multiple_references",
    category: "marketing_content",
    labelKey: "editor.fusion.intent.multipleReferences.label",
    hintKey: "editor.fusion.intent.multipleReferences.hint",
    uploadSteps: [{ id: "base", labelKey: "editor.fusion.upload.source", role: "object" }],
    defaultFusionStrength: 50,
    defaultPreservation: ["identity"],
    legacy: true,
  },
  {
    id: "custom_composition",
    category: "marketing_content",
    labelKey: "editor.fusion.intent.customComposition.label",
    hintKey: "editor.fusion.intent.customComposition.hint",
    uploadSteps: [{ id: "base", labelKey: "editor.fusion.upload.source", role: "object" }],
    defaultFusionStrength: 50,
    defaultPreservation: [],
    legacy: true,
  },
];

export const EDITOR_FUSION_INTENT_DEFINITIONS: EditorFusionIntentDefinition[] = [
  ...PEOPLE,
  ...ANIMALS,
  ...PRODUCTS,
  ...MARKETING,
  ...FUTURE,
  ...LEGACY,
];

export const EDITOR_FUSION_CATEGORY_ORDER: EditorFusionIntentCategory[] = [
  "people_characters",
  "animals",
  "products_brands",
  "marketing_content",
  "future_identity",
];

export function normalizeFusionIntent(intent: EditorFusionIntent): EditorFusionIntent {
  if (intent === "person_outfit") {
    return "outfit_from_reference";
  }
  return intent;
}

export function fusionIntentDefinition(intent: EditorFusionIntent): EditorFusionIntentDefinition {
  const normalized = normalizeFusionIntent(intent);
  return (
    EDITOR_FUSION_INTENT_DEFINITIONS.find((d) => d.id === normalized && !d.legacy) ??
    EDITOR_FUSION_INTENT_DEFINITIONS.find((d) => d.id === intent) ??
    EDITOR_FUSION_INTENT_DEFINITIONS.find((d) => d.id === "custom_composition")!
  );
}

export function fusionIntentsForCategory(
  category: EditorFusionIntentCategory,
  includeLegacy = false
): EditorFusionIntentDefinition[] {
  return EDITOR_FUSION_INTENT_DEFINITIONS.filter(
    (d) => d.category === category && (includeLegacy || !d.legacy)
  );
}

export function fusionCategoryLabelKey(category: EditorFusionIntentCategory): string {
  return `editor.fusion.category.${category}.title`;
}

export function requiresMultiUpload(intent: EditorFusionIntent): boolean {
  const def = fusionIntentDefinition(intent);
  return def.uploadSteps.filter((s) => !s.optional).length > 1;
}

export function defaultInheritedTraits(intent: EditorFusionIntent): Array<{ id: string; label: string; group?: string }> {
  const normalized = normalizeFusionIntent(intent);
  switch (normalized) {
    case "outfit_from_reference":
      return [
        { id: "jacket", label: "Jacket", group: "clothing" },
        { id: "shirt", label: "Shirt", group: "clothing" },
        { id: "pants", label: "Pants", group: "clothing" },
        { id: "shoes", label: "Shoes", group: "clothing" },
        { id: "accessories", label: "Accessories", group: "clothing" },
      ];
    case "character_fusion":
      return [
        { id: "face", label: "Face", group: "merge" },
        { id: "eyes", label: "Eyes", group: "merge" },
        { id: "mouth", label: "Mouth", group: "merge" },
        { id: "hair", label: "Hair", group: "merge" },
        { id: "clothing", label: "Clothing", group: "merge" },
        { id: "colors", label: "Colors", group: "merge" },
        { id: "expression", label: "Expression", group: "merge" },
        { id: "style", label: "Style", group: "merge" },
      ];
    case "animal_fusion":
      return [
        { id: "fur", label: "Fur", group: "animal_b" },
        { id: "color_palette", label: "Color palette", group: "animal_b" },
        { id: "eyes", label: "Eyes", group: "animal_b" },
        { id: "body_shape", label: "Body shape", group: "animal_b" },
        { id: "pose", label: "Pose", group: "animal_b" },
        { id: "expression", label: "Expression", group: "animal_b" },
      ];
    case "animal_human_fusion":
      return [
        { id: "eyes", label: "Eyes", group: "face" },
        { id: "smile", label: "Smile", group: "face" },
        { id: "expression", label: "Facial expression", group: "face" },
        { id: "hair_color", label: "Hair color inspiration", group: "identity" },
        { id: "personality", label: "Personality", group: "identity" },
      ];
    case "product_family":
      return [
        { id: "premium", label: "Premium version", group: "variant" },
        { id: "luxury", label: "Luxury version", group: "variant" },
        { id: "budget", label: "Budget version", group: "variant" },
        { id: "eco", label: "Eco version", group: "variant" },
      ];
    default:
      return [];
  }
}
