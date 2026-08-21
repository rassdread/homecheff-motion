/**
 * S2C — Pure materialization plan from StudioPresetProductionContext.
 * No DB, no providers, no credits.
 */

import type {
  StudioPresetMaterializationRecord,
  StudioPresetProductionContext,
  StudioPresetRoleTaggedAsset,
} from "@/types/studio-preset-production-context";
import { PRESET_PRODUCTION_CONTEXT_VERSION } from "@/types/studio-preset-production-context";

export const S2C_METADATA_NAMESPACE = "s2c" as const;

export type S2cStoryboardMetadata = {
  version: typeof PRESET_PRODUCTION_CONTEXT_VERSION;
  idempotencyKey: string;
  sourceType: string;
  sourceId: string;
  lifecycleClass: string;
  materializationMode: string;
  experienceId?: string | null;
  presetId?: string | null;
  wizardId?: string | null;
  sourceQuickProjectId?: string | null;
  returnUrl?: string | null;
  homecheffItemId?: string | null;
  homecheffItemType?: string | null;
  growthLeadId?: string | null;
  transformationIntent?: unknown;
  motionHints: string[];
  audioHints: StudioPresetProductionContext["audioHints"];
  styleHints: string[];
  worldHints: string[];
  resultStillPointers: string[];
  resultVideoPointers: string[];
  materializationVersion: typeof PRESET_PRODUCTION_CONTEXT_VERSION;
};

export type PlannedCharacter = {
  sourceKey: string;
  name: string;
  role: "human";
  referenceImageUrl: string;
  referenceStorageKey: string;
  description: string;
  defaultClothing: string;
  identityStrength: string;
  referenceNotes: string;
};

export type PlannedLocation = {
  sourceKey: string;
  name: string;
  category: "street" | "city" | "other" | "nature" | "fantasy";
  referenceImageUrl: string;
  referenceStorageKey: string;
  description: string;
  visualIdentity: string;
  environmentKeywords: string;
};

export type PlannedProp = {
  sourceKey: string;
  name: string;
  category: "packaging" | "brand_asset" | "clothing" | "other";
  referenceImageUrl: string;
  referenceStorageKey: string;
  description: string;
  brandingRules: string;
  appearanceMemory: string;
  continuityStrength: string;
};

export type PlannedScene = {
  order: number;
  title: string;
  action: string;
  camera: string;
  emotion: string;
  durationSeconds: number;
  transitionToNext: string;
  locationSourceKey: string | null;
  characterSourceKeys: string[];
  propSourceKeys: string[];
  audioHints?: {
    musicMood?: string | null;
    sfx?: string[];
    voice?: string | null;
  };
};

export type PresetMaterializationPlanStatus =
  | "READY"
  | "SKIPPED_ONE_SHOT"
  | "MISSING_INPUT"
  | "BLOCKED"
  | "UNSUPPORTED";

export type PresetMaterializationPlan = {
  status: PresetMaterializationPlanStatus;
  reason: string;
  title: string;
  description: string;
  promptStyleProfile: string;
  directorProfile: string;
  aiDirectorPrompt: string;
  musicEnabled: boolean;
  musicNotes: string;
  soundEnabled: boolean;
  soundNotes: string;
  characters: PlannedCharacter[];
  locations: PlannedLocation[];
  props: PlannedProp[];
  scenes: PlannedScene[];
  metadata: S2cStoryboardMetadata;
  providerCalls: 0;
  creditsDebited: 0;
};

function assetUrl(asset: StudioPresetRoleTaggedAsset | undefined): string | null {
  const url = asset?.url?.trim();
  return url && /^https?:\/\//i.test(url) ? url : null;
}

function storageKeyFor(asset: StudioPresetRoleTaggedAsset, fallback: string): string {
  const key = asset.pointer?.trim() || asset.assetId?.trim();
  if (key) return key.slice(0, 240);
  return `s2c/${fallback}`;
}

function pickAssets(
  assets: StudioPresetRoleTaggedAsset[],
  roles: StudioPresetRoleTaggedAsset["role"][]
): StudioPresetRoleTaggedAsset[] {
  return assets.filter((a) => roles.includes(a.role) && assetUrl(a));
}

function firstAsset(
  assets: StudioPresetRoleTaggedAsset[],
  roles: StudioPresetRoleTaggedAsset["role"][]
): StudioPresetRoleTaggedAsset | undefined {
  return pickAssets(assets, roles)[0];
}

function styleProfiles(context: StudioPresetProductionContext): {
  promptStyleProfile: string;
  directorProfile: string;
} {
  const joined = [...context.styleHints, ...context.worldHints, context.displayTitle]
    .join(" ")
    .toLowerCase();
  if (
    joined.includes("red carpet") ||
    joined.includes("rode loper") ||
    context.origin.sourceId.includes("RED_CARPET") ||
    context.origin.sourceId === "red_carpet_moment"
  ) {
    return { promptStyleProfile: "cinematic", directorProfile: "cinematic" };
  }
  if (joined.includes("social") || context.lifecycleClass === "QUICK_ONE_SHOT") {
    return { promptStyleProfile: "social_media", directorProfile: "social_media" };
  }
  if (
    context.lifecycleClass === "ADVANCED_STORY" ||
    context.lifecycleClass === "CANONICAL_MULTI_SCENE"
  ) {
    return { promptStyleProfile: "cinematic", directorProfile: "storytelling" };
  }
  if (
    context.origin.sourceId.includes("BUSINESS") ||
    context.origin.sourceId.includes("product") ||
    context.origin.sourceId.includes("COMMERCIAL")
  ) {
    return { promptStyleProfile: "commercial", directorProfile: "commercial" };
  }
  return { promptStyleProfile: "commercial", directorProfile: "commercial" };
}

function requiredRolesFor(context: StudioPresetProductionContext): StudioPresetRoleTaggedAsset["role"][] {
  const id = context.origin.sourceId;
  if (
    id === "PEOPLE_RED_CARPET" ||
    id === "PEOPLE_CELEBRITY" ||
    id === "red_carpet_moment" ||
    id === "IDENTITY_OUTFIT" ||
    id === "outfit_from_reference" ||
    id === "person_outfit" ||
    id === "IDENTITY_PERSON_BACKGROUND" ||
    id === "person_background"
  ) {
    return ["person"];
  }
  if (
    id === "BUSINESS_PRODUCT" ||
    id === "BUSINESS_COMMERCIAL" ||
    id === "BUSINESS_ADVERTISEMENT" ||
    id === "product_environment"
  ) {
    return ["product"];
  }
  if (id === "BUSINESS_LOGO_PLACEMENT" || id === "product_branding") {
    return ["logo"];
  }
  if (context.lifecycleClass === "MOTION_ONLY" || context.lifecycleClass === "IMAGE_ONLY") {
    return [];
  }
  return [];
}

function buildAiDirectorPrompt(context: StudioPresetProductionContext): string {
  const parts = [
    context.userIntent?.trim(),
    ...context.styleHints,
    ...context.worldHints,
    context.motionHints.length ? `Motion: ${context.motionHints.join(", ")}` : "",
  ].filter(Boolean);
  return parts.join("\n").slice(0, 4000);
}

function buildAudioNotes(context: StudioPresetProductionContext): {
  musicEnabled: boolean;
  musicNotes: string;
  soundEnabled: boolean;
  soundNotes: string;
} {
  const mood = context.audioHints.musicMood?.trim() ?? "";
  const sfx = context.audioHints.sfxSuggestions ?? [];
  return {
    musicEnabled: Boolean(mood),
    musicNotes: mood.slice(0, 2000),
    soundEnabled: sfx.length > 0,
    soundNotes: sfx.join(", ").slice(0, 2000),
  };
}

/**
 * Build an idempotent materialization plan. Never calls providers.
 */
export function planPresetMaterialization(
  context: StudioPresetProductionContext
): PresetMaterializationPlan {
  const styles = styleProfiles(context);
  const audio = buildAudioNotes(context);
  const resultStills = pickAssets(context.assets, ["result_still"]);
  const resultVideos = pickAssets(context.assets, ["result_video"]);

  const metadata: S2cStoryboardMetadata = {
    version: PRESET_PRODUCTION_CONTEXT_VERSION,
    idempotencyKey: context.idempotencyKey,
    sourceType: context.origin.sourceType,
    sourceId: context.origin.sourceId,
    lifecycleClass: context.lifecycleClass,
    materializationMode: context.materializationMode,
    experienceId: context.origin.experienceId ?? null,
    presetId: context.origin.presetId ?? null,
    wizardId: context.origin.wizardId ?? null,
    sourceQuickProjectId: context.origin.sourceQuickProjectId ?? null,
    returnUrl: context.origin.returnUrl ?? null,
    homecheffItemId: context.origin.homecheffItemId ?? null,
    homecheffItemType: context.origin.homecheffItemType ?? null,
    growthLeadId: context.origin.growthLeadId ?? null,
    transformationIntent: context.transformationIntent ?? null,
    motionHints: context.motionHints,
    audioHints: context.audioHints,
    styleHints: context.styleHints,
    worldHints: context.worldHints,
    resultStillPointers: resultStills.map((a) => a.pointer ?? a.assetId ?? a.url ?? "").filter(Boolean),
    resultVideoPointers: resultVideos.map((a) => a.pointer ?? a.assetId ?? a.url ?? "").filter(Boolean),
    materializationVersion: PRESET_PRODUCTION_CONTEXT_VERSION,
  };

  const emptyBase = (): Omit<PresetMaterializationPlan, "status" | "reason"> => ({
    title: context.displayTitle.slice(0, 160) || context.origin.sourceId,
    description: `Materialized from ${context.origin.sourceType}:${context.origin.sourceId}`,
    promptStyleProfile: styles.promptStyleProfile,
    directorProfile: styles.directorProfile,
    aiDirectorPrompt: buildAiDirectorPrompt(context),
    ...audio,
    characters: [],
    locations: [],
    props: [],
    scenes: [],
    metadata,
    providerCalls: 0,
    creditsDebited: 0,
  });

  if (context.lifecycleClass === "BLOCKED") {
    return { ...emptyBase(), status: "BLOCKED", reason: "preset_blocked" };
  }

  if (context.materializationMode === "NONE" && context.lifecycleClass === "QUICK_ONE_SHOT") {
    return {
      ...emptyBase(),
      status: "SKIPPED_ONE_SHOT",
      reason: "quick_one_shot_no_project",
    };
  }

  if (
    context.lifecycleClass === "LEGACY" &&
    context.materializationMode === "LINK_RESULT_ONLY" &&
    resultStills.length === 0 &&
    resultVideos.length === 0
  ) {
    return {
      ...emptyBase(),
      status: "UNSUPPORTED",
      reason: "legacy_missing_result",
    };
  }

  const required = requiredRolesFor(context);
  for (const role of required) {
    if (!firstAsset(context.assets, [role])) {
      return {
        ...emptyBase(),
        status: "MISSING_INPUT",
        reason: `MATERIALIZATION_MISSING_INPUT:${role}`,
      };
    }
  }

  const characters: PlannedCharacter[] = [];
  const locations: PlannedLocation[] = [];
  const props: PlannedProp[] = [];

  const person = firstAsset(context.assets, ["person"]);
  const outfit = firstAsset(context.assets, ["outfit"]);
  const locationAsset = firstAsset(context.assets, ["location", "background"]);
  const product = firstAsset(context.assets, ["product"]);
  const logo = firstAsset(context.assets, ["logo"]);
  const sourceImage = firstAsset(context.assets, ["source_image"]);
  const resultStill = resultStills[0];

  // Subject person — intentional production subject only
  if (person) {
    const url = assetUrl(person)!;
    characters.push({
      sourceKey: `person:${person.assetId ?? person.pointer ?? "0"}`,
      name: person.name?.trim() || "Character",
      role: "human",
      referenceImageUrl: url,
      referenceStorageKey: storageKeyFor(person, "person"),
      description: context.userIntent?.trim() || context.displayTitle,
      defaultClothing: outfit?.name?.trim() || "",
      identityStrength: "strong",
      referenceNotes: JSON.stringify({
        s2c: {
          outfitAssetId: outfit?.assetId ?? null,
          outfitPointer: outfit?.pointer ?? null,
          sourceRole: "person",
        },
      }),
    });
  } else if (sourceImage && (context.lifecycleClass === "MOTION_ONLY" || context.lifecycleClass === "IMAGE_ONLY")) {
    const url = assetUrl(sourceImage)!;
    characters.push({
      sourceKey: `source:${sourceImage.assetId ?? sourceImage.pointer ?? "0"}`,
      name: sourceImage.name?.trim() || "Subject",
      role: "human",
      referenceImageUrl: url,
      referenceStorageKey: storageKeyFor(sourceImage, "source"),
      description: context.displayTitle,
      defaultClothing: "",
      identityStrength: "medium",
      referenceNotes: JSON.stringify({ s2c: { sourceRole: "source_image" } }),
    });
  }

  // Outfit as clothing prop when no person (image-only clothing ref still preserved)
  if (outfit && !person) {
    const url = assetUrl(outfit)!;
    props.push({
      sourceKey: `outfit:${outfit.assetId ?? outfit.pointer ?? "0"}`,
      name: outfit.name?.trim() || "Outfit",
      category: "clothing",
      referenceImageUrl: url,
      referenceStorageKey: storageKeyFor(outfit, "outfit"),
      description: "Outfit reference",
      brandingRules: "",
      appearanceMemory: "clothing reference",
      continuityStrength: "strong",
    });
  }

  if (locationAsset) {
    const url = assetUrl(locationAsset)!;
    const isRedCarpet =
      context.origin.sourceId.includes("RED_CARPET") ||
      context.origin.sourceId === "red_carpet_moment";
    locations.push({
      sourceKey: `location:${locationAsset.assetId ?? locationAsset.pointer ?? "0"}`,
      name: locationAsset.name?.trim() || (isRedCarpet ? "Red carpet" : "Location"),
      category: isRedCarpet ? "street" : "other",
      referenceImageUrl: url,
      referenceStorageKey: storageKeyFor(locationAsset, "location"),
      description: context.worldHints.join(", ") || "Preset location",
      visualIdentity: context.worldHints.join(", ") || context.styleHints.join(", "),
      environmentKeywords: context.worldHints.join(", "),
    });
  } else if (
    context.origin.sourceId.includes("RED_CARPET") ||
    context.origin.sourceId === "red_carpet_moment"
  ) {
    // Style-only red carpet — no invented photo location entity
  }

  if (product) {
    const url = assetUrl(product)!;
    props.push({
      sourceKey: `product:${product.assetId ?? product.pointer ?? "0"}`,
      name: product.name?.trim() || "Product",
      category: "packaging",
      referenceImageUrl: url,
      referenceStorageKey: storageKeyFor(product, "product"),
      description: "Product reference — MUST_PRESERVE",
      brandingRules: "MUST_PRESERVE product appearance",
      appearanceMemory: product.name?.trim() || "product",
      continuityStrength: "strong",
    });
  }

  if (logo) {
    const url = assetUrl(logo)!;
    props.push({
      sourceKey: `logo:${logo.assetId ?? logo.pointer ?? "0"}`,
      name: logo.name?.trim() || "Logo",
      category: "brand_asset",
      referenceImageUrl: url,
      referenceStorageKey: storageKeyFor(logo, "logo"),
      description: "Exact logo asset",
      brandingRules: "MUST_PRESERVE exact logo geometry; LOGO_REFERENCE",
      appearanceMemory: "exact logo",
      continuityStrength: "strong",
    });
  }

  const characterKeys = characters.map((c) => c.sourceKey);
  const propKeys = props.map((p) => p.sourceKey);
  const locationKey = locations[0]?.sourceKey ?? null;

  const beats =
    context.scenePlan.length > 0
      ? context.scenePlan
      : [
          {
            order: 0,
            title: context.displayTitle,
            action: context.userIntent ?? context.displayTitle,
            durationSeconds: 5,
          },
        ];

  const scenes: PlannedScene[] = beats
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((beat, index) => ({
      order: index,
      title: beat.title || `Scene ${index + 1}`,
      action: beat.action ?? context.displayTitle,
      camera: beat.camera ?? "",
      emotion: beat.emotion ?? "",
      durationSeconds: Math.min(120, Math.max(1, beat.durationSeconds ?? 5)),
      transitionToNext: beat.transitionToNext ?? "",
      locationSourceKey: locationKey,
      characterSourceKeys: characterKeys,
      propSourceKeys: propKeys,
      audioHints: beat.audioHints,
    }));

  // Attach result still pointer into first scene description via action suffix (metadata holds primary)
  if (resultStill && scenes[0]) {
    scenes[0] = {
      ...scenes[0],
      action: `${scenes[0].action}\n[approved_result:${resultStill.assetId ?? resultStill.pointer ?? "still"}]`,
    };
  }

  return {
    ...emptyBase(),
    status: "READY",
    reason: "ok",
    characters,
    locations,
    props,
    scenes,
  };
}

export function wrapAudioAssetMetadataWithS2c(
  existing: unknown,
  metadata: S2cStoryboardMetadata
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return {
    ...base,
    [S2C_METADATA_NAMESPACE]: metadata,
  };
}

export function readS2cMetadataFromAudioAssetJson(
  value: unknown
): S2cStoryboardMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s2c = (value as Record<string, unknown>)[S2C_METADATA_NAMESPACE];
  if (!s2c || typeof s2c !== "object" || Array.isArray(s2c)) return null;
  const rec = s2c as Record<string, unknown>;
  if (typeof rec.idempotencyKey !== "string" || !rec.idempotencyKey) return null;
  return s2c as S2cStoryboardMetadata;
}

export function materializationRecordFromResult(input: {
  context: StudioPresetProductionContext;
  storyboardId: string;
  characterIds: string[];
  locationIds: string[];
  propIds: string[];
  sceneIds: string[];
  resultAssetIds: string[];
  upcReady: boolean;
}): StudioPresetMaterializationRecord {
  return {
    version: PRESET_PRODUCTION_CONTEXT_VERSION,
    sourceType: input.context.origin.sourceType,
    sourceId: input.context.origin.sourceId,
    lifecycleClass: input.context.lifecycleClass,
    materializationMode: input.context.materializationMode,
    storyboardId: input.storyboardId,
    characterIds: input.characterIds,
    locationIds: input.locationIds,
    propIds: input.propIds,
    sceneIds: input.sceneIds,
    resultAssetIds: input.resultAssetIds,
    transformationIntentPreserved: Boolean(input.context.transformationIntent),
    upcReady: input.upcReady,
    providerCalls: 0,
    creditsDebited: 0,
    materializedAt: new Date().toISOString(),
  };
}
