import type {
  AssistantProjectContext,
  AssistantContextSnapshot,
} from "@/lib/assistant-context-layer";
import type { LibraryAssetIndexEntry } from "@/lib/library-asset-index";
import {
  getActionPresetRequirement,
  listRequirementsForPreset,
} from "@/lib/action-preset-requirements";
import { getMotionActionPreset } from "@/lib/motion-action-presets";
import type { MotionActionPreset, MotionActionPresetId } from "@/types/motion-action-presets";
import type {
  ActionPresetMissingAsset,
  ActionPresetRequirementId,
  ActionPresetRequirementResult,
  ActionPresetResolutionOption,
  ActionPresetResolvedAsset,
} from "@/types/action-preset-requirements";

export type ResolveActionPresetRequirementsInput = {
  preset: MotionActionPreset;
  snapshot: AssistantContextSnapshot;
  activeProject?: AssistantProjectContext | null;
};

const REQUIREMENT_KEYWORDS: Partial<Record<ActionPresetRequirementId, string[]>> = {
  football_outfit: ["football", "voetbal", "soccer", "shirt", "tenue"],
  sports_outfit: ["sport", "athletic", "jersey", "kit"],
  basketball_outfit: ["basketball", "basketbal", "nba"],
  cycling_outfit: ["cycling", "wielren", "bike", "fiets"],
  dance_outfit: ["dance", "dans", "stage outfit"],
  fashion_outfit: ["fashion", "mode", "runway", "catwalk"],
  hiking_outfit: ["hiking", "outdoor", "berg", "trail"],
  luxury_outfit: ["luxury", "luxe", "designer", "formal"],
  stadium_location: ["stadium", "stadion", "arena", "pitch"],
  mountain_location: ["mountain", "berg", "summit", "peak", "alps"],
  city_location: ["city", "stad", "street", "straat", "urban"],
  beach_location: ["beach", "strand", "ocean", "zee"],
  stage: ["stage", "podium", "concert", "performance"],
  red_carpet: ["red carpet", "rode loper", "premiere"],
  luxury_background: ["luxury", "luxe", "upscale", "vip"],
  background: ["background", "achtergrond", "scene", "landscape"],
  sports_car: ["sports car", "sportwagen", "supercar", "ferrari", "lamborghini"],
  vehicle: ["car", "auto", "vehicle", "voertuig"],
  skateboard: ["skateboard", "skate"],
  snowboard: ["snowboard"],
  microphone: ["microphone", "microfoon", "mic"],
  reporter: ["reporter", "interview", "journalist"],
  trophy: ["trophy", "trofee", "cup", "beker"],
  logo: ["logo", "brand", "merk"],
  mascot: ["mascot", "mascotte", "cartoon"],
  crowd: ["crowd", "publiek", "audience", "fans"],
  paparazzi: ["paparazzi", "flash", "camera"],
  sports_music: ["sport", "anthem", "stadium"],
  music: ["music", "muziek", "track", "audio"],
  sfx: ["sfx", "sound", "effect", "geluid"],
  voice: ["voice", "stem", "narration"],
};

function normalizeSearch(text: string): string {
  return text.trim().toLowerCase();
}

function assetSearchBlob(asset: LibraryAssetIndexEntry): string {
  return normalizeSearch(
    [
      asset.assetName,
      asset.promptSummary,
      asset.assetType,
      asset.workflow,
      asset.fusionArchetype,
      asset.fusionIntent,
      asset.characterType,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function matchesKeywords(asset: LibraryAssetIndexEntry, keywords: string[]): boolean {
  const blob = assetSearchBlob(asset);
  return keywords.some((keyword) => blob.includes(keyword));
}

function scopedLibraryAssets(
  snapshot: AssistantContextSnapshot,
  projectId?: string | null
): LibraryAssetIndexEntry[] {
  const { library } = snapshot;
  const all = [
    ...library.characters,
    ...library.fusionOutputs,
    ...library.references,
    ...library.music,
    ...library.sfx,
    ...library.voice,
    ...library.assets,
  ];
  if (!projectId) {
    return all;
  }
  const projectScoped = all.filter((asset) => asset.projectId === projectId);
  const globalScoped = all.filter((asset) => !asset.projectId);
  return [...projectScoped, ...globalScoped];
}

function findCharacter(
  assets: LibraryAssetIndexEntry[],
  projectId?: string | null
): LibraryAssetIndexEntry | null {
  const characters = assets.filter((asset) => asset.category === "characters");
  const projectCharacter = projectId
    ? characters.find((asset) => asset.projectId === projectId)
    : null;
  if (projectCharacter) {
    return projectCharacter;
  }
  const motionReady = characters.find((asset) => asset.motionReady === true);
  if (motionReady) {
    return motionReady;
  }
  return characters[0] ?? null;
}

function findAssetForRequirement(
  requirementId: ActionPresetRequirementId,
  assets: LibraryAssetIndexEntry[],
  projectId?: string | null
): LibraryAssetIndexEntry | null {
  if (requirementId === "person_character") {
    return findCharacter(assets, projectId);
  }

  const keywords = REQUIREMENT_KEYWORDS[requirementId] ?? [];
  const projectMatches = projectId
    ? assets.filter((asset) => asset.projectId === projectId && matchesKeywords(asset, keywords))
    : [];
  if (projectMatches[0]) {
    return projectMatches[0];
  }

  if (requirementId === "logo") {
    const logoFusion = assets.find(
      (asset) =>
        asset.fusionArchetype?.includes("logo") ||
        asset.fusionIntent?.includes("logo") ||
        matchesKeywords(asset, keywords)
    );
    if (logoFusion) {
      return logoFusion;
    }
  }

  if (requirementId === "mascot") {
    const mascot = assets.find(
      (asset) =>
        asset.characterType?.includes("mascot") ||
        asset.assetName.toLowerCase().includes("mascot") ||
        asset.assetName.toLowerCase().includes("mascotte")
    );
    if (mascot) {
      return mascot;
    }
  }

  if (requirementId === "football_outfit" || requirementId.endsWith("_outfit")) {
    const outfitFusion = assets.find(
      (asset) =>
        asset.fusionArchetype === "character_outfit" ||
        asset.workflow === "fusion" ||
        matchesKeywords(asset, keywords)
    );
    if (outfitFusion) {
      return outfitFusion;
    }
  }

  if (requirementId === "sports_music" || requirementId === "music") {
    return assets.find((asset) => asset.category === "music" || matchesKeywords(asset, keywords)) ?? null;
  }

  if (requirementId === "sfx") {
    return assets.find((asset) => asset.category === "sfx" || matchesKeywords(asset, keywords)) ?? null;
  }

  if (requirementId === "voice") {
    return assets.find((asset) => asset.category === "voices" || matchesKeywords(asset, keywords)) ?? null;
  }

  return assets.find((asset) => matchesKeywords(asset, keywords)) ?? null;
}

function toResolvedAsset(
  requirementId: ActionPresetRequirementId,
  asset: LibraryAssetIndexEntry,
  projectId?: string | null
): ActionPresetResolvedAsset {
  return {
    requirementId,
    assetId: asset.assetId,
    assetName: asset.assetName,
    assetUrl: asset.assetUrl,
    source: asset.projectId === projectId && projectId ? "project" : "library",
    motionReady: asset.motionReady,
    fromProject: Boolean(projectId && asset.projectId === projectId),
  };
}

function buildResolutionOptions(
  requirementId: ActionPresetRequirementId,
  isRequired: boolean
): ActionPresetResolutionOption[] {
  const requirement = getActionPresetRequirement(requirementId);
  const options: ActionPresetResolutionOption[] = [];

  if (requirementId === "person_character") {
    options.push(
      {
        id: `${requirementId}_upload`,
        kind: "upload_photo",
        labelKey: "assistant.requirements.option.uploadPhoto",
        registryOnly: true,
      },
      {
        id: `${requirementId}_library`,
        kind: "choose_from_library",
        labelKey: "assistant.requirements.option.chooseFromLibrary",
        actionId: "open_asset",
        registryOnly: true,
      },
      {
        id: `${requirementId}_create`,
        kind: "create_character",
        labelKey: "assistant.requirements.option.createCharacter",
        actionId: "create_character",
        registryOnly: true,
      }
    );
    return options;
  }

  if (requirement.assetType === "outfit") {
    options.push(
      {
        id: `${requirementId}_upload`,
        kind: "upload_reference",
        labelKey: "assistant.requirements.option.uploadReference",
        registryOnly: true,
      },
      {
        id: `${requirementId}_fusion`,
        kind: "generate_with_fusion",
        labelKey: "assistant.requirements.option.generateWithFusion",
        actionId: "prepare_outfit",
        registryOnly: true,
      }
    );
  } else if (
    requirement.assetType === "location" ||
    requirement.assetType === "background"
  ) {
    options.push(
      {
        id: `${requirementId}_upload`,
        kind: "upload_reference",
        labelKey: "assistant.requirements.option.uploadReference",
        registryOnly: true,
      },
      {
        id: `${requirementId}_generate`,
        kind: "generate_background",
        labelKey: "assistant.requirements.option.generateBackground",
        actionId: "prepare_background",
        registryOnly: true,
      },
      {
        id: `${requirementId}_default`,
        kind: "use_preset_default",
        labelKey: "assistant.requirements.option.usePresetDefault",
        registryOnly: true,
      }
    );
  } else if (requirement.assetType === "vehicle" || requirement.assetType === "prop") {
    options.push(
      {
        id: `${requirementId}_upload`,
        kind: "upload_reference",
        labelKey: "assistant.requirements.option.uploadReference",
        registryOnly: true,
      },
      {
        id: `${requirementId}_generate`,
        kind: "generate_background",
        labelKey: "assistant.requirements.option.generateProp",
        actionId: "prepare_prop",
        registryOnly: true,
      },
      {
        id: `${requirementId}_default`,
        kind: "use_preset_default",
        labelKey: "assistant.requirements.option.usePresetDefault",
        registryOnly: true,
      }
    );
  } else if (requirement.assetType === "music" || requirement.assetType === "sfx") {
    options.push(
      {
        id: `${requirementId}_default`,
        kind: "use_preset_default",
        labelKey: "assistant.requirements.option.usePresetDefault",
        registryOnly: true,
      },
      {
        id: `${requirementId}_library`,
        kind: "use_library_asset",
        labelKey: "assistant.requirements.option.useLibraryAsset",
        actionId: requirement.assetType === "music" ? "prepare_music" : "prepare_sfx",
        registryOnly: true,
      }
    );
  } else {
    options.push({
      id: `${requirementId}_default`,
      kind: "use_preset_default",
      labelKey: "assistant.requirements.option.usePresetDefault",
      registryOnly: true,
    });
  }

  if (!isRequired) {
    options.push({
      id: `${requirementId}_skip`,
      kind: "continue_without",
      labelKey: "assistant.requirements.option.continueWithout",
      registryOnly: true,
    });
  }

  return options;
}

export function resolveActionPresetRequirements(
  input: ResolveActionPresetRequirementsInput
): ActionPresetRequirementResult {
  const { preset, snapshot, activeProject } = input;
  const projectId = activeProject?.id ?? null;
  const assets = scopedLibraryAssets(snapshot, projectId);
  const requirements = listRequirementsForPreset(preset.id);

  const availableAssets: ActionPresetResolvedAsset[] = [];
  const missingAssets: ActionPresetMissingAsset[] = [];
  const recommendedAssets: ActionPresetResolvedAsset[] = [];

  for (const requirement of requirements) {
    const match = findAssetForRequirement(requirement.id, assets, projectId);
    if (match) {
      const resolved = toResolvedAsset(requirement.id, match, projectId);
      availableAssets.push(resolved);
      if (resolved.fromProject) {
        recommendedAssets.push(resolved);
      }
      continue;
    }

    missingAssets.push({
      requirementId: requirement.id,
      label: requirement.label,
      labelKey: requirement.labelKey,
      required: requirement.required,
      options: buildResolutionOptions(requirement.id, requirement.required),
    });
  }

  let motionReadyIssue: ActionPresetRequirementResult["motionReadyIssue"];
  const character = availableAssets.find((asset) => asset.requirementId === "person_character");
  if (character && character.motionReady === false) {
    motionReadyIssue = {
      characterAssetId: character.assetId,
      characterName: character.assetName,
      motionReady: false,
    };
  }

  return {
    presetId: preset.id,
    presetTitle: preset.title,
    availableAssets,
    missingAssets,
    recommendedAssets,
    resolutionPlan: {
      presetId: preset.id,
      presetTitle: preset.title,
      steps: [],
      providerCalls: 0,
      creditsConsumed: 0,
    },
    motionReadyIssue,
  };
}

export function resolveActionPresetRequirementsById(
  presetId: MotionActionPresetId,
  snapshot: AssistantContextSnapshot,
  activeProject?: AssistantProjectContext | null
): ActionPresetRequirementResult | null {
  const preset = getMotionActionPreset(presetId);
  if (!preset) {
    return null;
  }
  return resolveActionPresetRequirements({ preset, snapshot, activeProject });
}
