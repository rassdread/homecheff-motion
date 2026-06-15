import { resolveLibraryCategory } from "@/lib/library-consistency";
import { studioAssetId } from "@/lib/studio-media-asset-registry";
import { registerUserGeneratedReference } from "@/server/studio/studio-user-generated-reference-manifest-blob";
import { registerUserLibraryUpload } from "@/server/studio/studio-user-upload-library-blob";
import {
  isStorageKeyInLibrary,
  listLibraryConsistencyRecords,
  upsertLibraryConsistencyRecord,
} from "@/server/studio/library-consistency-manifest-blob";
import { recordAssetLibraryRecent } from "@/server/studio/studio-asset-library-preferences-blob";
import type {
  LibraryConsistencyMissingAsset,
  LibraryConsistencyRecord,
  LibraryGenerationType,
  LibrarySourceModule,
  RegisterCompletedGenerationInput,
} from "@/types/library-consistency";

const MAX_SCAN = 500;

export type EnsureLibraryConsistencyInput = {
  ownerId: string;
  createdBy: string;
  generationType: LibraryGenerationType;
  assetUrl: string;
  storageKey: string;
  thumbnailUrl?: string | null;
  assetName?: string;
  promptSummary?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  sourceModule: LibrarySourceModule;
  /** Prisma entity id, generationId, upload id, audio id, etc. */
  backingId?: string;
  backingStore?: RegisterCompletedGenerationInput["backingStore"];
  registryAssetId?: string;
  isMascot?: boolean;
  isLogo?: boolean;
  mimeType?: string;
  sourceRoute?: string | null;
  characterCompleteness?: string | null;
  motionReadinessScore?: number | null;
  motionReady?: boolean | null;
  missingParts?: string[] | null;
  characterType?: string | null;
  assetType?: string | null;
  workflow?: string | null;
  storyboardId?: string | null;
  fusionIntent?: string | null;
  fusionArchetype?: string | null;
  fusionMetadata?: RegisterCompletedGenerationInput["fusionMetadata"];
  motionMetadata?: RegisterCompletedGenerationInput["motionMetadata"];
  publishMetadata?: RegisterCompletedGenerationInput["publishMetadata"];
  usedInModules?: LibrarySourceModule[];
};

function defaultAssetType(generationType: LibraryGenerationType, explicit?: string | null): string {
  if (explicit?.trim()) {
    return explicit.trim();
  }
  switch (generationType) {
    case "motion_output":
      return "motion_video";
    case "publish_export":
      return "publish_export";
    case "editor_variant":
      return "fusion_output";
    case "character":
    case "character_extraction":
      return "character";
    case "mascot":
      return "mascot";
    default:
      return generationType;
  }
}

function defaultWorkflow(generationType: LibraryGenerationType, explicit?: string | null): string | null {
  if (explicit?.trim()) {
    return explicit.trim();
  }
  switch (generationType) {
    case "motion_output":
      return "motion_render";
    case "publish_export":
      return "publish_export";
    case "editor_variant":
      return "fusion";
    default:
      return null;
  }
}

function defaultAssetName(generationType: LibraryGenerationType, prompt?: string | null): string {
  if (prompt?.trim()) {
    const trimmed = prompt.trim();
    return trimmed.length > 48 ? `${trimmed.slice(0, 45)}…` : trimmed;
  }
  return generationType.replace(/_/g, " ");
}

function resolveBackingStore(
  generationType: LibraryGenerationType,
  explicit?: RegisterCompletedGenerationInput["backingStore"]
): RegisterCompletedGenerationInput["backingStore"] {
  if (explicit) {
    return explicit;
  }
  switch (generationType) {
    case "character":
    case "character_extraction":
    case "mascot":
      return "prisma_character";
    case "location":
      return "prisma_location";
    case "prop":
    case "logo":
      return "prisma_prop";
    case "world":
      return "prisma_world";
    case "music":
    case "sfx":
      return "audio_library";
    case "voice":
      return "voice_clone";
    case "motion_output":
    case "publish_export":
      return "user_upload";
    default:
      return "generated_reference";
  }
}

function resolveRegistryAssetId(input: {
  backingStore: RegisterCompletedGenerationInput["backingStore"];
  backingId: string;
  generationType: LibraryGenerationType;
}): string {
  switch (input.backingStore) {
    case "prisma_character":
      return studioAssetId("character", input.backingId);
    case "prisma_location":
      return studioAssetId("location", input.backingId);
    case "prisma_prop":
      return studioAssetId("prop", input.backingId);
    case "prisma_world":
      return studioAssetId("location", `world_${input.backingId}`);
    case "audio_library":
      return studioAssetId(
        input.generationType === "music" ? "music" : "sound_effect",
        `user_audio_${input.backingId}`
      );
    case "voice_clone":
      return studioAssetId("voice", `clone_${input.backingId}`);
    case "user_upload":
      return studioAssetId("reference_image", `upload_${input.backingId}`);
    case "generated_reference":
    default:
      return studioAssetId("reference_image", `gen_${input.backingId}`);
  }
}

async function ensureBrowsableBackingStore(input: EnsureLibraryConsistencyInput & {
  backingId: string;
  backingStore: RegisterCompletedGenerationInput["backingStore"];
}): Promise<void> {
  const name = input.assetName?.trim() || defaultAssetName(input.generationType, input.promptSummary);
  const thumb = input.thumbnailUrl ?? input.assetUrl;

  if (input.backingStore === "generated_reference") {
    const kind =
      input.generationType === "editor_variant"
        ? "editor_variant"
        : input.generationType === "editor_output"
          ? "editor_output"
          : input.generationType;
    await registerUserGeneratedReference({
      generationId: input.backingId,
      ownerId: input.ownerId,
      kind,
      createdAt: new Date().toISOString(),
      promptSummary: input.promptSummary?.trim() || name,
      referenceImageUrl: input.assetUrl,
      referenceStorageKey: input.storageKey,
      thumbnailUrl: thumb,
      sourceAssetName: input.projectTitle ?? null,
      sourceAssetId: input.projectId ?? null,
      origin: input.generationType === "editor_variant" ? "derived" : "generated",
    });
    return;
  }

  if (input.backingStore === "user_upload") {
    const assetType =
      input.generationType === "motion_output"
        ? "video"
        : input.generationType === "publish_export"
          ? "export"
          : "reference_image";
    await registerUserLibraryUpload({
      ownerId: input.ownerId,
      assetType,
      mimeType: input.mimeType ?? (assetType === "video" ? "video/mp4" : "image/png"),
      fileName: `${name}.${assetType === "video" ? "mp4" : "png"}`,
      storageKey: input.storageKey,
      publicUrl: input.assetUrl,
      thumbnailUrl: thumb,
      originContext: input.sourceModule,
    });
  }
}

/**
 * Register a completed generation in the library index and browsable backing store.
 * Idempotent on storageKey / backingId.
 */
export async function ensureCompletedGenerationInLibrary(
  input: EnsureLibraryConsistencyInput
): Promise<LibraryConsistencyRecord> {
  const backingId =
    input.backingId?.trim() ||
    input.storageKey.split("/").pop()?.replace(/\.\w+$/, "") ||
    `gen_${Date.now()}`;
  const backingStore = resolveBackingStore(input.generationType, input.backingStore);
  const category = resolveLibraryCategory(input.generationType, {
    isMascot: input.isMascot,
    isLogo: input.isLogo,
  });
  const registryAssetId =
    input.registryAssetId?.trim() ||
    resolveRegistryAssetId({ backingStore, backingId, generationType: input.generationType });

  await ensureBrowsableBackingStore({ ...input, backingId, backingStore });

  const record = await upsertLibraryConsistencyRecord({
    ownerId: input.ownerId,
    createdBy: input.createdBy,
    generationType: input.generationType,
    category,
    registryAssetId,
    backingStore,
    backingId,
    assetUrl: input.assetUrl,
    storageKey: input.storageKey,
    thumbnailUrl: input.thumbnailUrl ?? input.assetUrl,
    assetName: input.assetName?.trim() || defaultAssetName(input.generationType, input.promptSummary),
    promptSummary: input.promptSummary ?? null,
    projectId: input.projectId ?? null,
    projectTitle: input.projectTitle ?? null,
    sourceModule: input.sourceModule,
    sourceRoute: input.sourceRoute ?? null,
    characterCompleteness: input.characterCompleteness ?? null,
    motionReadinessScore: input.motionReadinessScore ?? null,
    motionReady: input.motionReady ?? null,
    missingParts: input.missingParts ?? null,
    characterType: input.characterType ?? null,
    assetType: defaultAssetType(input.generationType, input.assetType),
    workflow: defaultWorkflow(input.generationType, input.workflow),
    storyboardId: input.storyboardId ?? input.motionMetadata?.storyboardId ?? null,
    fusionIntent: input.fusionIntent ?? input.fusionMetadata?.fusionIntent ?? null,
    fusionArchetype: input.fusionArchetype ?? input.fusionMetadata?.fusionArchetype ?? null,
    fusionMetadata: input.fusionMetadata ?? null,
    motionMetadata: input.motionMetadata ?? null,
    publishMetadata: input.publishMetadata ?? null,
    usedInModules: input.usedInModules ?? [input.sourceModule],
  });

  await recordAssetLibraryRecent({
    ownerId: input.ownerId,
    assetId: record.registryAssetId,
  });

  return record;
}

/** Scan blob storage keys that look generated but lack a library consistency record. */
export async function findMissingLibraryAssets(ownerId: string): Promise<LibraryConsistencyMissingAsset[]> {
  const records = await listLibraryConsistencyRecords(ownerId, MAX_SCAN);
  const { listUserGeneratedReferenceManifest } = await import(
    "@/server/studio/studio-user-generated-reference-manifest-blob"
  );
  const { listUserLibraryUploads } = await import(
    "@/server/studio/studio-user-upload-library-blob"
  );

  const missing: LibraryConsistencyMissingAsset[] = [];

  const refs = await listUserGeneratedReferenceManifest(ownerId);
  for (const ref of refs) {
    if (!isStorageKeyInLibrary(records, ref.referenceStorageKey)) {
      missing.push({
        storageKey: ref.referenceStorageKey,
        assetUrl: ref.referenceImageUrl,
        generationType: ref.kind === "editor_variant" ? "editor_variant" : "image",
        category: ref.kind === "editor_variant" ? "images" : resolveLibraryCategory("image"),
        projectId: ref.sourceAssetId,
        projectTitle: ref.sourceAssetName,
        createdAt: ref.createdAt,
        thumbnailUrl: ref.thumbnailUrl,
        assetName: ref.promptSummary,
      });
    }
  }

  const uploads = await listUserLibraryUploads(ownerId);
  for (const upload of uploads) {
    if (upload.sourceType !== "uploaded") {
      continue;
    }
    if (isStorageKeyInLibrary(records, upload.storageKey)) {
      continue;
    }
    const genType: LibraryGenerationType =
      upload.assetType === "video"
        ? "motion_output"
        : upload.assetType === "export"
          ? "publish_export"
          : "editor_output";
    missing.push({
      storageKey: upload.storageKey,
      assetUrl: upload.publicUrl,
      generationType: genType,
      category: resolveLibraryCategory(genType),
      projectId: null,
      projectTitle: upload.originContext ?? null,
      createdAt: upload.createdAt,
      thumbnailUrl: upload.thumbnailUrl ?? null,
      assetName: upload.fileName,
    });
  }

  return missing.slice(0, 50);
}

export async function repairMissingLibraryAsset(
  ownerId: string,
  createdBy: string,
  item: LibraryConsistencyMissingAsset
): Promise<LibraryConsistencyRecord> {
  return ensureCompletedGenerationInLibrary({
    ownerId,
    createdBy,
    generationType: item.generationType,
    assetUrl: item.assetUrl,
    storageKey: item.storageKey,
    thumbnailUrl: item.thumbnailUrl,
    assetName: item.assetName,
    projectId: item.projectId,
    projectTitle: item.projectTitle,
    sourceModule: "studio",
    promptSummary: item.assetName,
  });
}
