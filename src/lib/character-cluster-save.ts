import { registerCompletedGenerationInLibraryClient } from "@/lib/library-consistency-client";
import { ensureHcProjectOnStudioStart } from "@/lib/hc-project-lifecycle";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import { saveCharacterFromWizardDraft } from "@/lib/studio-character-generation-pipeline";
import { runCharacterCreationPipeline } from "@/lib/studio-character-generation-pipeline";
import { characterEngineMetadataToDraftFields } from "@/lib/character-engine";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { CharacterClusterRoute } from "@/types/character-cluster";
import type { CharacterEngineSaveMetadata } from "@/types/character-engine";
import type { CharacterPipelineResult } from "@/types/studio-character-generation-pipeline";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type CharacterClusterSaveInput = {
  draft: AssetWizardDraft;
  route: CharacterClusterRoute;
  storyboardId?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  characterName?: string;
  isMascot?: boolean;
  engineMetadata?: CharacterEngineSaveMetadata | null;
  onProgress?: Parameters<typeof runCharacterCreationPipeline>[0]["onProgress"];
};

export type CharacterClusterSaveResult = CharacterPipelineResult & {
  projectId: string | null;
  projectTitle: string | null;
  sourceRoute: CharacterClusterRoute;
};

function attachCharacterToHcProject(
  project: HomeCheffProjectPackage,
  result: CharacterPipelineResult
): HomeCheffProjectPackage {
  if (!result.imageUrl) {
    return project;
  }
  const ref = createHcAssetReference({
    id: `char_${result.characterId}`,
    url: result.imageUrl,
    kind: "character",
    role: result.name,
    sourceService: "studio",
  });
  return upsertHcAssetReference(project, ref);
}

export async function saveCharacterFromCluster(input: CharacterClusterSaveInput): Promise<CharacterClusterSaveResult> {
  const hc = ensureHcProjectOnStudioStart({
    hcProjectId: input.projectId,
    storyboardId: input.storyboardId ?? undefined,
    syncToServer: false,
  });

  const draftWithMeta: AssetWizardDraft = {
    ...input.draft,
    fields: {
      ...input.draft.fields,
      sourceRoute: input.route,
      hcProjectId: hc.project.id,
      ...(input.engineMetadata ? characterEngineMetadataToDraftFields(input.engineMetadata) : {}),
    },
  };

  let result: CharacterPipelineResult;
  if (input.draft.referenceMode === "upload" && input.draft.referenceImageUrl && !input.draft.referenceGenerationPrompt) {
    result = await runCharacterCreationPipeline({
      draft: draftWithMeta,
      storyboardId: input.storyboardId ?? null,
      onProgress: input.onProgress ?? (() => undefined),
    });
  } else if (input.draft.animationReadinessConfirmed || input.route === "motion-ready") {
    result = await saveCharacterFromWizardDraft({
      draft: draftWithMeta,
      storyboardId: input.storyboardId ?? null,
    });
  } else {
    result = await runCharacterCreationPipeline({
      draft: draftWithMeta,
      storyboardId: input.storyboardId ?? null,
      onProgress: input.onProgress ?? (() => undefined),
    });
  }

  attachCharacterToHcProject(hc.project, result);

  const generationType =
    input.route === "from-reference"
      ? "character_extraction"
      : input.isMascot || draftWithMeta.identityAssetType === "mascot"
        ? "mascot"
        : "character";

  await registerCompletedGenerationInLibraryClient({
    generationType,
    assetUrl: result.imageUrl,
    storageKey: draftWithMeta.referenceStorageKey || draftWithMeta.sourceReferenceStorageKey,
    thumbnailUrl: result.imageUrl,
    assetName: input.characterName ?? result.name,
    projectId: hc.project.id,
    projectTitle: input.projectTitle ?? hc.project.title,
    sourceModule: "wizard",
    backingId: result.characterId,
    isMascot: input.isMascot ?? draftWithMeta.identityAssetType === "mascot",
    sourceRoute: input.route,
    characterCompleteness: input.engineMetadata?.characterCompleteness,
    motionReadinessScore: input.engineMetadata?.motionReadinessScore,
    motionReady: input.engineMetadata?.motionReady,
    missingParts: input.engineMetadata?.missingParts,
    characterType: input.engineMetadata?.characterType,
  });

  return {
    ...result,
    projectId: hc.project.id,
    projectTitle: hc.project.title,
    sourceRoute: input.route,
  };
}
