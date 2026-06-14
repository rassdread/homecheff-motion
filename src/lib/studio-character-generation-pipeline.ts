import {
  draftPatchForGenerationFailure,
  draftPatchForGenerationStart,
  draftPatchForGenerationSuccess,
  runAssetReferenceGeneration,
} from "@/lib/studio-asset-wizard-reference-generation";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import {
  characterFormValuesFromWizardDraft,
  wizardSemanticCreateExtras,
} from "@/lib/studio-asset-wizard-draft";
import { applySemanticRecordToCharacterFields, buildAssetSemanticRecordFromWizardDraft } from "@/lib/studio-asset-semantic-record";
import { completeAssetLifecycleAfterCreate } from "@/lib/studio-asset-lifecycle-client";
import { createStudioCharacterApi } from "@/lib/studio-characters-client";
import { studioCharacterFormToCreatePayload } from "@/components/studio/studio-character-form";
import type {
  CharacterPipelineBadgeStatus,
  CharacterPipelineJob,
  CharacterPipelineResult,
  CharacterPipelineStepId,
} from "@/types/studio-character-generation-pipeline";
import { CHARACTER_PIPELINE_STEP_IDS } from "@/types/studio-character-generation-pipeline";

const RECENT_STORAGE_KEY = "hc_recent_character_generations_v1";
const ACTIVE_STORAGE_KEY = "hc_active_character_generation_v1";
const MAX_RECENT = 8;

export type PipelineProgressCallback = (params: {
  stepId: CharacterPipelineStepId;
  status: CharacterPipelineBadgeStatus;
  previewUrl?: string;
}) => void;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resolveCharacterPipelineName(draft: AssetWizardDraft): string {
  const trimmed = draft.name.trim();
  if (trimmed) {
    return trimmed;
  }
  const summary = draft.summaryPrompt.trim();
  if (summary.length > 48) {
    return `${summary.slice(0, 45)}…`;
  }
  return summary || "Nieuw personage";
}

export function characterHasReadyImage(draft: AssetWizardDraft): boolean {
  if (draft.referenceImageUrl && draft.referenceStorageKey) {
    return true;
  }
  if (draft.generatedReferencePreviewUrl && draft.generatedReferenceStorageKey) {
    return true;
  }
  if (draft.entryPath === "prepare_for_animation") {
    return Boolean(
      (draft.referenceImageUrl || draft.sourceReferenceImageUrl) &&
        (draft.referenceStorageKey || draft.sourceReferenceStorageKey)
    );
  }
  return false;
}

export function characterNeedsReferenceGeneration(draft: AssetWizardDraft): boolean {
  if (characterHasReadyImage(draft)) {
    return false;
  }
  if (draft.referenceMode === "skip") {
    return false;
  }
  if (draft.sourceReferenceImageUrl || draft.referenceMode === "generate") {
    return Boolean(draft.summaryPrompt.trim() || draft.sourceTransformChange.trim());
  }
  return false;
}

export function canRunCharacterCreationPipeline(draft: AssetWizardDraft): boolean {
  if (draft.kind !== "character") {
    return false;
  }
  if (!resolveCharacterPipelineName(draft)) {
    return false;
  }
  if (characterHasReadyImage(draft)) {
    return true;
  }
  return characterNeedsReferenceGeneration(draft);
}

export function finalizeDraftForCharacterSave(draft: AssetWizardDraft): AssetWizardDraft {
  const next = { ...draft };
  if (!next.referenceImageUrl && next.generatedReferencePreviewUrl) {
    next.referenceImageUrl = next.generatedReferencePreviewUrl;
    next.referenceStorageKey = next.generatedReferenceStorageKey;
  }
  if (!next.referenceImageUrl && next.sourceReferenceImageUrl && next.referenceMode !== "generate") {
    next.referenceImageUrl = next.sourceReferenceImageUrl;
    next.referenceStorageKey = next.sourceReferenceStorageKey ?? next.referenceStorageKey;
  }
  if (!next.name.trim()) {
    next.name = resolveCharacterPipelineName(next);
  }
  return next;
}

async function runProcessingSteps(
  onProgress: PipelineProgressCallback,
  options: { withGeneration: boolean }
): Promise<void> {
  const delays = options.withGeneration ? [120, 80, 80] : [280, 320, 360];
  onProgress({ stepId: "detach_character", status: "running" });
  await sleep(delays[0]!);
  onProgress({ stepId: "remove_background", status: "running" });
  await sleep(delays[1]!);
  onProgress({ stepId: "process_clothing_props", status: "running" });
  await sleep(delays[2]!);
}

export async function saveCharacterFromWizardDraft(params: {
  draft: AssetWizardDraft;
  storyboardId?: string | null;
  decisionId?: string | null;
}): Promise<CharacterPipelineResult> {
  const draft = finalizeDraftForCharacterSave(params.draft);
  const values = characterFormValuesFromWizardDraft(draft);
  const semanticRecord = buildAssetSemanticRecordFromWizardDraft(draft);
  const memoryFields = semanticRecord
    ? applySemanticRecordToCharacterFields(semanticRecord, {})
    : null;

  const res = await createStudioCharacterApi({
    ...studioCharacterFormToCreatePayload(values),
    ...wizardSemanticCreateExtras(draft),
    ...(memoryFields
      ? {
          appearanceMemory: memoryFields.appearanceMemory,
          visualKeywords: memoryFields.visualKeywords,
          continuityNotes: memoryFields.continuityNotes,
        }
      : {}),
  });

  if (!res.ok) {
    throw new Error((res.data as { error?: string }).error ?? "Character save failed.");
  }

  let attachedToProject = false;
  if (params.storyboardId) {
    attachedToProject = completeAssetLifecycleAfterCreate({
      storyboardId: params.storyboardId,
      kind: "character",
      createdEntityId: res.data.character.id,
      createdName: values.identity.name,
      decisionId: params.decisionId ?? undefined,
    });
  }

  const imageUrl =
    values.referenceImageUrl ||
    draft.generatedReferencePreviewUrl ||
    draft.sourceReferenceImageUrl ||
    "";

  return {
    characterId: res.data.character.id,
    name: values.identity.name,
    imageUrl,
    attachedToProject,
    storyboardId: params.storyboardId ?? undefined,
  };
}

export async function runCharacterCreationPipeline(params: {
  draft: AssetWizardDraft;
  onProgress: PipelineProgressCallback;
  onDraftChange?: (patch: Partial<AssetWizardDraft>) => void;
  storyboardId?: string | null;
  decisionId?: string | null;
}): Promise<CharacterPipelineResult> {
  const { onProgress, onDraftChange } = params;
  let workingDraft = finalizeDraftForCharacterSave(params.draft);

  onProgress({ stepId: "detach_character", status: "queued" });

  if (characterNeedsReferenceGeneration(workingDraft)) {
    const generationId = workingDraft.referenceGenerationId || crypto.randomUUID();
    const startPatch = draftPatchForGenerationStart(workingDraft, generationId);
    workingDraft = { ...workingDraft, ...startPatch };
    onDraftChange?.(startPatch);

    onProgress({ stepId: "detach_character", status: "running" });
    onProgress({ stepId: "remove_background", status: "running" });

    const { outcome } = await runAssetReferenceGeneration({
      draft: workingDraft,
      kind: "character",
    });

    if (!outcome.ok) {
      const failPatch = draftPatchForGenerationFailure(
        outcome.errorKey ? outcome.errorKey : outcome.error
      );
      onDraftChange?.(failPatch);
      throw new Error(outcome.error);
    }

    onProgress({
      stepId: "process_clothing_props",
      status: "running",
      previewUrl: outcome.referenceImageUrl,
    });

    const successPatch = draftPatchForGenerationSuccess(outcome);
    workingDraft = { ...workingDraft, ...successPatch };
    onDraftChange?.(successPatch);
    workingDraft = finalizeDraftForCharacterSave(workingDraft);
  } else {
    await runProcessingSteps(onProgress, { withGeneration: false });
    onProgress({
      stepId: "process_clothing_props",
      status: "running",
      previewUrl: workingDraft.referenceImageUrl || workingDraft.generatedReferencePreviewUrl,
    });
  }

  onProgress({ stepId: "save_to_library", status: "running" });

  const result = await saveCharacterFromWizardDraft({
    draft: workingDraft,
    storyboardId: params.storyboardId,
    decisionId: params.decisionId,
  });

  onProgress({
    stepId: "save_to_library",
    status: "completed",
    previewUrl: result.imageUrl,
  });

  return result;
}

export function loadRecentCharacterGenerations(): CharacterPipelineJob[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as CharacterPipelineJob[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function persistCharacterPipelineJob(job: CharacterPipelineJob): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const recent = loadRecentCharacterGenerations().filter((j) => j.id !== job.id);
    recent.unshift(job);
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
    if (job.status === "running" || job.status === "queued") {
      window.localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(job));
    } else {
      window.localStorage.removeItem(ACTIVE_STORAGE_KEY);
    }
  } catch {
    /* ignore quota */
  }
}

export function loadActiveCharacterPipelineJob(): CharacterPipelineJob | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CharacterPipelineJob;
  } catch {
    return null;
  }
}

export function createPipelineJob(draft: AssetWizardDraft, storyboardId?: string | null): CharacterPipelineJob {
  return {
    id: crypto.randomUUID(),
    name: resolveCharacterPipelineName(draft),
    status: "queued",
    activeStepId: "detach_character",
    storyboardId: storyboardId ?? undefined,
    createdAt: new Date().toISOString(),
  };
}

export function jobFromPipelineResult(
  job: CharacterPipelineJob,
  result: CharacterPipelineResult,
  error?: string
): CharacterPipelineJob {
  if (error) {
    return {
      ...job,
      status: "failed",
      error,
      completedAt: new Date().toISOString(),
    };
  }
  return {
    ...job,
    status: "completed",
    activeStepId: "save_to_library",
    previewUrl: result.imageUrl,
    characterId: result.characterId,
    attachedToProject: result.attachedToProject,
    completedAt: new Date().toISOString(),
  };
}
