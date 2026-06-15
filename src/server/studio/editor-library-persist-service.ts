import { prisma } from "@/lib/prisma";
import {
  applySemanticRecordToCharacterFields,
  applySemanticRecordToPropFields,
  extractAssetSemanticRecordFromCharacter,
  extractAssetSemanticRecordFromProp,
  parseAssetSemanticRecordFromNotes,
} from "@/lib/studio-asset-semantic-record";
import {
  buildEditorMergedSemanticRecord,
  resolveEditorEntityKind,
  resolveLibraryHref,
} from "@/lib/editor-semantic-record-merge";
import type { EditorSaveMode } from "@/lib/editor-library-persist";
import type { EditorSavePayload } from "@/lib/editor-canvas-export";
import type { EditorSourceKind } from "@/types/homecheff-visual-editor";
import {
  createStudioCharacter,
  mapStudioCharacterToDetail,
  updateStudioCharacter,
} from "@/server/studio/studio-character-service";
import { createStudioProp, updateStudioProp } from "@/server/studio/studio-prop-service";
import { ensureCompletedGenerationInLibrary } from "@/server/studio/library-consistency-service";
import { registerUserLibraryUpload } from "@/server/studio/studio-user-upload-library-blob";
import type { SessionUser } from "@/server/auth/session";

export type EditorLibraryPersistResponse = {
  ok: true;
  assetId: string;
  entityKind: "character" | "prop" | "location" | "upload";
  libraryHref: string;
  persistedTo: "server";
  name: string;
};

type PersistError = { ok: false; error: string; httpStatus: number };

async function findOwnedEntity(ownerId: string, assetId: string) {
  const character = await prisma.studioCharacter.findFirst({ where: { id: assetId, ownerId } });
  if (character) {
    return { kind: "character" as const, character };
  }
  const prop = await prisma.studioProp.findFirst({ where: { id: assetId, ownerId } });
  if (prop) {
    return { kind: "prop" as const, prop };
  }
  const location = await prisma.studioLocation.findFirst({ where: { id: assetId, ownerId } });
  if (location) {
    return { kind: "location" as const, location };
  }
  return null;
}

function referenceFromPayload(payload: EditorSavePayload): { referenceImageUrl: string; referenceStorageKey: string } {
  return {
    referenceImageUrl: payload.backgroundUrl,
    referenceStorageKey: payload.backgroundStorageKey ?? payload.backgroundUrl,
  };
}

async function persistAsUpload(
  ownerId: string,
  payload: EditorSavePayload,
  mode: EditorSaveMode
): Promise<EditorLibraryPersistResponse> {
  const refs = referenceFromPayload(payload);
  const record = await registerUserLibraryUpload({
    ownerId,
    assetType: "reference_image",
    mimeType: "image/png",
    fileName: `${payload.name}.png`,
    storageKey: refs.referenceStorageKey,
    publicUrl: refs.referenceImageUrl,
    originContext: `editor:${mode}:${payload.sessionId}`,
  });
  return {
    ok: true,
    assetId: record.id,
    entityKind: "upload",
    libraryHref: resolveLibraryHref("upload", record.id),
    persistedTo: "server",
    name: payload.name,
  };
}

async function registerEditorPersistConsistency(input: {
  ownerId: string;
  response: EditorLibraryPersistResponse;
  payload: EditorSavePayload;
  mode: EditorSaveMode;
  sourceKind: EditorSourceKind;
}): Promise<void> {
  const refs = referenceFromPayload(input.payload);
  const generationType =
    input.response.entityKind === "character"
      ? input.mode === "canonical_base"
        ? "mascot"
        : "character"
      : input.response.entityKind === "prop"
        ? input.sourceKind === "logo"
          ? "logo"
          : "prop"
        : "editor_output";
  try {
    await ensureCompletedGenerationInLibrary({
      ownerId: input.ownerId,
      createdBy: input.ownerId,
      generationType,
      assetUrl: refs.referenceImageUrl,
      storageKey: refs.referenceStorageKey,
      thumbnailUrl: refs.referenceImageUrl,
      assetName: input.response.name,
      projectId: input.payload.sessionId,
      projectTitle: input.payload.name,
      sourceModule: "editor",
      backingId: input.response.assetId,
      isMascot: generationType === "mascot",
      isLogo: generationType === "logo",
    });
  } catch (error) {
    console.error("[library-consistency] editor persist failed", error);
  }
}

async function persistCharacter(
  ownerId: string,
  viewer: Pick<SessionUser, "id" | "role">,
  payload: EditorSavePayload,
  mode: EditorSaveMode,
  sourceKind: EditorSourceKind,
  createNew: boolean
): Promise<EditorLibraryPersistResponse | PersistError> {
  const refs = referenceFromPayload(payload);
  const existingEntity =
    !createNew && payload.sourceAssetId ? await findOwnedEntity(ownerId, payload.sourceAssetId) : null;
  const existingRecord =
    existingEntity?.kind === "character"
      ? extractAssetSemanticRecordFromCharacter(existingEntity.character)
      : null;

  const record = buildEditorMergedSemanticRecord({
    payload,
    mode,
    existing: existingRecord,
    sourceKind,
  });

  if (existingEntity?.kind === "character" && !createNew) {
    const fields = applySemanticRecordToCharacterFields(record, {
      appearanceMemory: existingEntity.character.appearanceMemory ?? undefined,
      visualKeywords: existingEntity.character.visualKeywords ?? undefined,
      continuityNotes: existingEntity.character.continuityNotes ?? undefined,
      referenceNotes: existingEntity.character.referenceNotes ?? undefined,
    });
    const updated = await updateStudioCharacter(existingEntity.character.id, viewer, {
      name: mode === "edited_copy" ? `${payload.name} (edited)` : payload.name,
      referenceImageUrl: refs.referenceImageUrl,
      referenceStorageKey: refs.referenceStorageKey,
      ...fields,
    });
    if ("error" in updated) {
      return { ok: false, error: updated.error.message, httpStatus: updated.error.httpStatus };
    }
    return {
      ok: true,
      assetId: updated.character.id,
      entityKind: "character",
      libraryHref: resolveLibraryHref("character", updated.character.id),
      persistedTo: "server",
      name: updated.character.name,
    };
  }

  const fields = applySemanticRecordToCharacterFields(record, {});
  const created = await createStudioCharacter(ownerId, {
    name: payload.name,
    role: mode === "canonical_base" ? "mascot" : "character",
    referenceImageUrl: refs.referenceImageUrl,
    referenceStorageKey: refs.referenceStorageKey,
    description: payload.compositionSummary.slice(0, 500) || undefined,
    ...fields,
  });
  if ("error" in created) {
    return { ok: false, error: created.error.message, httpStatus: created.error.httpStatus };
  }
  return {
    ok: true,
    assetId: created.character.id,
    entityKind: "character",
    libraryHref: resolveLibraryHref("character", created.character.id),
    persistedTo: "server",
    name: created.character.name,
  };
}

async function persistProp(
  ownerId: string,
  viewer: Pick<SessionUser, "id" | "role">,
  payload: EditorSavePayload,
  mode: EditorSaveMode,
  sourceKind: EditorSourceKind,
  createNew: boolean
): Promise<EditorLibraryPersistResponse | PersistError> {
  const refs = referenceFromPayload(payload);
  const existingEntity =
    !createNew && payload.sourceAssetId ? await findOwnedEntity(ownerId, payload.sourceAssetId) : null;
  const existingRecord =
    existingEntity?.kind === "prop" ? extractAssetSemanticRecordFromProp(existingEntity.prop) : null;

  const record = buildEditorMergedSemanticRecord({ payload, mode, existing: existingRecord, sourceKind });

  if (existingEntity?.kind === "prop" && !createNew) {
    const fields = applySemanticRecordToPropFields(record, {
      appearanceMemory: existingEntity.prop.appearanceMemory ?? undefined,
      brandingRules: existingEntity.prop.brandingRules ?? undefined,
      continuityNotes: existingEntity.prop.continuityNotes ?? undefined,
    });
    const updated = await updateStudioProp(existingEntity.prop.id, viewer, {
      name: mode === "edited_copy" ? `${payload.name} (edited)` : payload.name,
      referenceImageUrl: refs.referenceImageUrl,
      referenceStorageKey: refs.referenceStorageKey,
      ...fields,
    });
    if ("error" in updated) {
      return { ok: false, error: updated.error.message, httpStatus: updated.error.httpStatus };
    }
    return {
      ok: true,
      assetId: updated.prop.id,
      entityKind: "prop",
      libraryHref: resolveLibraryHref("prop", updated.prop.id),
      persistedTo: "server",
      name: updated.prop.name,
    };
  }

  const fields = applySemanticRecordToPropFields(record, {});
  const created = await createStudioProp(ownerId, {
    name: payload.name,
    category: sourceKind === "logo" ? "brand" : "product",
    referenceImageUrl: refs.referenceImageUrl,
    referenceStorageKey: refs.referenceStorageKey,
    description: payload.compositionSummary.slice(0, 500) || undefined,
    ...fields,
  });
  if ("error" in created) {
    return { ok: false, error: created.error.message, httpStatus: created.error.httpStatus };
  }
  return {
    ok: true,
    assetId: created.prop.id,
    entityKind: "prop",
    libraryHref: resolveLibraryHref("prop", created.prop.id),
    persistedTo: "server",
    name: created.prop.name,
  };
}

export async function persistEditorSaveToLibrary(params: {
  ownerId: string;
  viewer: Pick<SessionUser, "id" | "role">;
  mode: EditorSaveMode;
  payload: EditorSavePayload;
  sourceKind: EditorSourceKind;
}): Promise<EditorLibraryPersistResponse | PersistError> {
  const { ownerId, viewer, mode, payload, sourceKind } = params;

  if (
    mode === "draft" ||
    mode === "cutout" ||
    mode === "gif_asset" ||
    mode === "motion_ready_export" ||
    mode === "print_export" ||
    mode === "composition"
  ) {
    const response = await persistAsUpload(ownerId, payload, mode);
    await registerEditorPersistConsistency({ ownerId, response, payload, mode, sourceKind });
    return response;
  }

  const entityKind = resolveEditorEntityKind(sourceKind);
  const hasSource = Boolean(payload.sourceAssetId);
  const shouldUpdateExisting = mode === "official_reference" && hasSource;
  const shouldCreateNew =
    mode === "edited_copy" ||
    mode === "new_asset" ||
    mode === "canonical_base" ||
    (mode === "animation_ready" && !hasSource) ||
    (mode === "official_reference" && !hasSource);

  if (entityKind === "prop") {
    if (shouldUpdateExisting) {
      const response = await persistProp(ownerId, viewer, payload, mode, sourceKind, false);
      if (response.ok) {
        await registerEditorPersistConsistency({ ownerId, response, payload, mode, sourceKind });
      }
      return response;
    }
    const response = await persistProp(ownerId, viewer, payload, mode, sourceKind, true);
    if (response.ok) {
      await registerEditorPersistConsistency({ ownerId, response, payload, mode, sourceKind });
    }
    return response;
  }

  if (entityKind === "character") {
    if (shouldUpdateExisting || (mode === "animation_ready" && hasSource && !shouldCreateNew)) {
      const response = await persistCharacter(ownerId, viewer, payload, mode, sourceKind, false);
      if (response.ok) {
        await registerEditorPersistConsistency({ ownerId, response, payload, mode, sourceKind });
      }
      return response;
    }
    const response = await persistCharacter(ownerId, viewer, payload, mode, sourceKind, true);
    if (response.ok) {
      await registerEditorPersistConsistency({ ownerId, response, payload, mode, sourceKind });
    }
    return response;
  }

  const response = await persistAsUpload(ownerId, payload, mode);
  await registerEditorPersistConsistency({ ownerId, response, payload, mode, sourceKind });
  return response;
}

/** Test helper — parse semantic marker from character notes */
export function peekCharacterSemanticRecord(referenceNotes: string | null | undefined) {
  return parseAssetSemanticRecordFromNotes(referenceNotes).record;
}

export { mapStudioCharacterToDetail };
