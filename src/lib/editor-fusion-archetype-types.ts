import type { EditorFusionGenerationSettings, EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { EditorReferenceRoleSlot } from "@/types/editor-reference-role-flow";

export const FUSION_ARCHETYPE_IDS = [
  "person_background",
  "character_prop",
  "character_outfit",
  "mascot_brand_scene",
  "mascot_into_human",
  "product_logo_placement",
  "product_packaging",
  "product_environment",
  "product_family",
  "multi_character_scene",
  "style_fusion",
  "poster_social_composite",
  "social_media_visual",
  "campaign_variant",
  "animal_fusion",
  "animal_human_fusion",
  "pet_customization",
  "fantasy_creature",
  "future_look",
  "life_timeline",
  "genetic_blend",
  "future_child",
  "future_professions",
  "future_home",
  "multi_reference",
  "custom_composition",
] as const;

export type FusionArchetypeId = (typeof FUSION_ARCHETYPE_IDS)[number];

export type FusionOutputFieldType = "boolean" | "choice" | "text" | "multi_choice";

export type FusionOutputField = {
  key: string;
  type: FusionOutputFieldType;
  labelKey: string;
  defaultValue: boolean | string | string[] | number[];
  choices?: string[];
};

export type FusionArchetypeQuestion = {
  id: string;
  labelKey: string;
  outputKey: string;
  type: FusionOutputFieldType;
  choices?: string[];
  required?: boolean;
};

export type FusionArchetypeValidationRule = {
  id: string;
  labelKey: string;
  settingKey?: string;
  check: "boolean_true" | "array_min_length" | "both_parents_present";
};

export type FusionArchetype = {
  id: FusionArchetypeId;
  intent: EditorFusionIntent;
  labelKey: string;
  requiredInputRoles: string[];
  minCharacterCount?: number;
  defaultOutput: EditorFusionGenerationSettings;
  outputFields: FusionOutputField[];
  questions: FusionArchetypeQuestion[];
  reviewChecklist: string[];
  negativePromptLines: string[];
  validationRules: FusionArchetypeValidationRule[];
  wizardAvailable: boolean;
  supportsOutfitItems?: boolean;
  supportsParentSlots?: boolean;
};

export type FusionArchetypeInputContext = {
  intent: EditorFusionIntent;
  slots: EditorReferenceRoleSlot[];
};

export type FusionArchetypeAnalysis = {
  ready: boolean;
  detectedObjects: string[];
  semanticObjects: Record<string, string>;
  warnings: string[];
};

export type FusionArchetypeValidationResult = {
  valid: boolean;
  issues: string[];
};

export type FusionArchetypeSaveMetadata = {
  fusionIntent: string;
  fusionArchetype: FusionArchetypeId;
  sourceAssets: Array<{ role: string; roleId: string; url: string; name: string }>;
  questionAnswers: Record<string, string | boolean | string[]>;
  outputSettings: EditorFusionGenerationSettings;
  generationProfile: string;
  validatedAt: string;
};

export type FusionOutfitItem = {
  id: string;
  type: "jacket" | "shirt" | "pants" | "shoes" | "dress" | "accessory" | "full_outfit" | "custom";
  description: string;
  previewUrl?: string;
};
