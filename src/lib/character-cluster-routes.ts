import type {
  CharacterClusterFlowId,
  CharacterClusterProjectContext,
  CharacterClusterRoute,
  DeprecatedCharacterEntryPath,
} from "@/types/character-cluster";
import { logDeprecatedCharacterFlow } from "@/lib/character-cluster-analytics";

export const CHARACTER_CLUSTER_PATHS: Record<CharacterClusterRoute, string> = {
  new: "/studio/characters/new",
  "from-reference": "/studio/characters/from-reference",
  "motion-ready": "/studio/characters/motion-ready",
};

export const CHARACTER_CLUSTER_FLOW_BY_ROUTE: Record<CharacterClusterRoute, CharacterClusterFlowId> = {
  new: "character_new",
  "from-reference": "character_reference",
  "motion-ready": "character_motion_ready",
};

export function buildCharacterClusterHref(
  route: CharacterClusterRoute,
  context?: CharacterClusterProjectContext
): string {
  const base = CHARACTER_CLUSTER_PATHS[route];
  const params = new URLSearchParams();
  if (context?.storyboardId) {
    params.set("storyboardId", context.storyboardId);
  }
  if (context?.sceneId) {
    params.set("sceneId", context.sceneId);
  }
  if (context?.hcProject) {
    params.set("hcProject", context.hcProject);
  } else if (context?.projectId) {
    params.set("projectId", context.projectId);
    if (context.projectTitle) {
      params.set("projectTitle", context.projectTitle);
    }
  }
  if (context?.sourceImage) {
    params.set("sourceImage", context.sourceImage);
  }
  if (context?.sourceAsset) {
    params.set("sourceAsset", context.sourceAsset);
  }
  if (context?.sourceName) {
    params.set("sourceName", context.sourceName);
  }
  if (context?.returnTo) {
    params.set("returnTo", context.returnTo);
  }
  if (context?.advanced) {
    params.set("advanced", "1");
  }
  if (context?.characterId) {
    params.set("characterId", context.characterId);
  }
  if (context?.mode) {
    params.set("mode", context.mode);
  }
  if (context?.requirementId) {
    params.set("requirementId", context.requirementId);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export type DeprecatedEntryResolution = {
  redirectTo: string;
  deprecated: DeprecatedCharacterEntryPath | string;
};

export function resolveDeprecatedCharacterEntry(input: {
  entry?: string | null;
  deriveFrom?: string | null;
  sourceGeneration?: string | null;
  storyboardId?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  characterId?: string | null;
}): DeprecatedEntryResolution | null {
  const context: CharacterClusterProjectContext = {
    storyboardId: input.storyboardId,
    projectId: input.projectId,
    projectTitle: input.projectTitle,
  };

  if (input.entry === "prepare_for_animation") {
    logDeprecatedCharacterFlow("prepare_for_animation");
    return {
      deprecated: "prepare_for_animation",
      redirectTo: buildCharacterClusterHref("motion-ready", context),
    };
  }

  if (
    input.entry === "derive" ||
    input.entry === "derive_from_reference" ||
    input.entry === "existing_asset" ||
    input.deriveFrom ||
    input.sourceGeneration
  ) {
    const deprecated = (input.entry ?? "derive_from_reference") as DeprecatedCharacterEntryPath;
    logDeprecatedCharacterFlow(deprecated);
    return {
      deprecated,
      redirectTo: buildCharacterClusterHref("from-reference", {
        ...context,
        characterId: input.deriveFrom ?? input.characterId ?? undefined,
      }),
    };
  }

  return null;
}

export function buildFromReferenceHrefFromWizardDraft(input: {
  sourceReferenceImageUrl?: string | null;
  referenceImageUrl?: string | null;
  sourceReferenceStorageKey?: string | null;
  referenceStorageKey?: string | null;
  name?: string | null;
  sourceAssetId?: string | null;
  hcProjectId?: string | null;
  storyboardId?: string | null;
  sceneId?: string | null;
  characterId?: string | null;
}): string {
  const sourceImage =
    input.sourceReferenceImageUrl?.trim() || input.referenceImageUrl?.trim() || undefined;
  const hcProject = input.hcProjectId?.trim() || undefined;
  return buildCharacterClusterHref("from-reference", {
    sourceImage,
    sourceAsset: input.sourceAssetId?.trim() || undefined,
    sourceName: input.name?.trim() || undefined,
    hcProject,
    projectId: hcProject,
    storyboardId: input.storyboardId?.trim() || undefined,
    sceneId: input.sceneId?.trim() || undefined,
    characterId: input.characterId?.trim() || undefined,
  });
}

export function flowIdForRoute(route: CharacterClusterRoute): CharacterClusterFlowId {
  return CHARACTER_CLUSTER_FLOW_BY_ROUTE[route];
}

export function sourceRouteLabel(route: CharacterClusterRoute): string {
  return route;
}
