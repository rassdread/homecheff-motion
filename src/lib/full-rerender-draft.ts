/**
 * Server-safe serialization for full-rerender editor drafts.
 */

import {
  emptySceneTextDraft,
  type InstantSceneTextDraft,
} from "@/lib/instant-scene-text-draft-model";
import type { InstantMode, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import {
  buildFullRerenderImageSequencePayload,
  buildFullRerenderSlotsFromProject,
  computeImageChangeAuditFromSlots,
  isFullRerenderTempImageId,
} from "@/lib/full-rerender-editor-slots";
import type { FullRerenderEditorImage, FullRerenderEditorSlot } from "@/lib/full-rerender-editor-types";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";

export const FULL_RERENDER_DRAFT_VERSION = 1 as const;

export type PersistedFullRerenderDraftSlot = {
  sceneId: string;
  image: FullRerenderEditorImage | null;
  text: InstantSceneTextDraft;
};

export type PersistedFullRerenderDraftPayload = {
  version: typeof FULL_RERENDER_DRAFT_VERSION;
  savedAt: string;
  slots: PersistedFullRerenderDraftSlot[];
  versionNote: string;
  /** Target bundle language for the version created by this concept. */
  targetLanguage: string;
  userIntent: string;
  transitionSeconds: InstantTransitionSeconds | number;
  instantMode: InstantMode;
  expandedIndex: number | null;
  initialImageIds: string[];
};

export type FullRerenderDraftRenderBody = {
  sceneTexts: ReturnType<typeof instantSceneTextFromDraft>[];
  instantUserIntent: string;
  instantTransitionSeconds: number;
  versionNote?: string;
  versionName?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  imageChanges: {
    sequence: ReturnType<typeof buildFullRerenderImageSequencePayload>["sequence"];
    replacedImageIds: string[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDraftImage(raw: unknown): FullRerenderEditorImage | null {
  if (!isRecord(raw)) {
    return null;
  }
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const previewUrl = typeof raw.previewUrl === "string" ? raw.previewUrl.trim() : "";
  if (!id || !previewUrl) {
    return null;
  }
  return {
    id,
    previewUrl,
    originalFileName:
      typeof raw.originalFileName === "string" && raw.originalFileName.trim()
        ? raw.originalFileName.trim()
        : "scene.jpg",
    isNew: raw.isNew === true || isFullRerenderTempImageId(id),
    isReplaced: raw.isReplaced === true,
    remoteWorkingUrl:
      typeof raw.remoteWorkingUrl === "string" ? raw.remoteWorkingUrl : undefined,
    remoteThumbnailUrl:
      typeof raw.remoteThumbnailUrl === "string" ? raw.remoteThumbnailUrl : undefined,
    remoteStorageKey:
      typeof raw.remoteStorageKey === "string" ? raw.remoteStorageKey : undefined,
  };
}

export function serializeFullRerenderDraftPayload(params: {
  slots: FullRerenderEditorSlot[];
  versionNote: string;
  targetLanguage?: string;
  userIntent: string;
  transitionSeconds: InstantTransitionSeconds | number;
  instantMode: InstantMode;
  expandedIndex: number | null;
  initialImageIds: string[];
}): PersistedFullRerenderDraftPayload {
  return {
    version: FULL_RERENDER_DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    slots: params.slots.map((slot) => ({
      sceneId: slot.sceneId,
      image: slot.image
        ? {
            ...slot.image,
            previewUrl: slot.image.previewUrl,
          }
        : null,
      text: { ...slot.text },
    })),
    versionNote: params.versionNote,
    targetLanguage: params.targetLanguage?.trim() || "",
    userIntent: params.userIntent,
    transitionSeconds: params.transitionSeconds,
    instantMode: params.instantMode,
    expandedIndex: params.expandedIndex,
    initialImageIds: [...params.initialImageIds],
  };
}

export function parseFullRerenderDraftPayload(raw: unknown): PersistedFullRerenderDraftPayload | null {
  if (!isRecord(raw) || raw.version !== FULL_RERENDER_DRAFT_VERSION) {
    return null;
  }
  const slotsRaw = Array.isArray(raw.slots) ? raw.slots : [];
  const slots: PersistedFullRerenderDraftSlot[] = [];
  for (const row of slotsRaw) {
    if (!isRecord(row) || typeof row.sceneId !== "string") {
      continue;
    }
    const text = row.text;
    if (!isRecord(text)) {
      continue;
    }
    slots.push({
      sceneId: row.sceneId,
      image: normalizeDraftImage(row.image),
      text: text as InstantSceneTextDraft,
    });
  }
  if (slots.length === 0) {
    return null;
  }
  const transitionSeconds =
    typeof raw.transitionSeconds === "number" && [3, 5, 8].includes(raw.transitionSeconds)
      ? raw.transitionSeconds
      : 5;
  const instantMode = raw.instantMode === "story" ? "story" : "transition";
  const expandedIndex =
    typeof raw.expandedIndex === "number" && Number.isFinite(raw.expandedIndex)
      ? raw.expandedIndex
      : null;
  const initialImageIds = Array.isArray(raw.initialImageIds)
    ? raw.initialImageIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    version: FULL_RERENDER_DRAFT_VERSION,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : new Date().toISOString(),
    slots,
    versionNote: typeof raw.versionNote === "string" ? raw.versionNote : "",
    targetLanguage: typeof raw.targetLanguage === "string" ? raw.targetLanguage : "",
    userIntent: typeof raw.userIntent === "string" ? raw.userIntent : "",
    transitionSeconds,
    instantMode,
    expandedIndex,
    initialImageIds,
  };
}

export function draftPayloadToEditorSlots(
  payload: PersistedFullRerenderDraftPayload
): FullRerenderEditorSlot[] {
  const transitionSeconds = payload.transitionSeconds;
  return payload.slots.map((slot) => ({
    sceneId: slot.sceneId,
    image: slot.image,
    text: { ...emptySceneTextDraft(transitionSeconds), ...slot.text },
  }));
}

export function buildInitialFullRerenderDraftPayload(params: {
  images: Array<{ id: string; previewUrl: string; fileName?: string | null }>;
  instantSceneTexts: unknown;
  instantUserIntent?: string | null;
  instantTransitionSeconds?: number;
  instantMode?: string | null;
}): PersistedFullRerenderDraftPayload {
  const transitionSeconds =
    typeof params.instantTransitionSeconds === "number" &&
    [3, 5, 8].includes(params.instantTransitionSeconds)
      ? params.instantTransitionSeconds
      : 5;
  const instantMode = params.instantMode === "story" ? "story" : "transition";
  const initialImageIds = params.images.map((img) => img.id);
  const slots = buildFullRerenderSlotsFromProject({
    images: params.images,
    instantSceneTexts: params.instantSceneTexts,
    transitionSeconds,
  });
  return serializeFullRerenderDraftPayload({
    slots,
    versionNote: "",
    targetLanguage: "",
    userIntent: params.instantUserIntent?.trim() ?? "",
    transitionSeconds,
    instantMode,
    expandedIndex: 0,
    initialImageIds,
  });
}

export function buildFullRerenderRenderBodyFromDraft(
  payload: PersistedFullRerenderDraftPayload,
  options?: { sourceLanguage?: string }
): FullRerenderDraftRenderBody {
  const slots = draftPayloadToEditorSlots(payload);
  const sceneTexts = slots.map((scene, index) =>
    instantSceneTextFromDraft(scene.text, index, slots.length)
  );
  const imagePayload = buildFullRerenderImageSequencePayload(slots);
  const audit = computeImageChangeAuditFromSlots(payload.initialImageIds, slots);
  const versionName = payload.versionNote.trim() || undefined;
  const targetLanguage = payload.targetLanguage.trim() || undefined;
  return {
    sceneTexts,
    instantUserIntent: payload.userIntent.trim(),
    instantTransitionSeconds: payload.transitionSeconds,
    versionNote: versionName,
    versionName,
    sourceLanguage: options?.sourceLanguage?.trim() || undefined,
    targetLanguage,
    imageChanges: {
      sequence: imagePayload.sequence,
      replacedImageIds: audit.replacedImageIds ?? [],
    },
  };
}

export function draftPayloadHasMeaningfulEdits(
  payload: PersistedFullRerenderDraftPayload,
  baseline: PersistedFullRerenderDraftPayload
): boolean {
  return JSON.stringify(payload) !== JSON.stringify(baseline);
}
