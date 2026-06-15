import { ensureCompletedGenerationInLibrary } from "@/server/studio/library-consistency-service";
import type { LibraryGenerationType, LibrarySourceModule } from "@/types/library-consistency";

function logLibraryConsistencyFailure(context: string, error: unknown): void {
  console.error(`[library-consistency] ${context}`, error);
}

export async function registerPrismaEntityInLibrary(input: {
  ownerId: string;
  createdBy: string;
  entityId: string;
  entityName: string;
  generationType: LibraryGenerationType;
  assetUrl?: string | null;
  storageKey?: string | null;
  thumbnailUrl?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  sourceModule?: LibrarySourceModule;
  isMascot?: boolean;
  isLogo?: boolean;
}): Promise<void> {
  const assetUrl = input.assetUrl?.trim();
  const storageKey = input.storageKey?.trim() || `prisma/${input.generationType}/${input.entityId}`;
  if (!assetUrl) {
    return;
  }
  try {
    await ensureCompletedGenerationInLibrary({
      ownerId: input.ownerId,
      createdBy: input.createdBy,
      generationType: input.generationType,
      assetUrl,
      storageKey,
      thumbnailUrl: input.thumbnailUrl ?? assetUrl,
      assetName: input.entityName,
      projectId: input.projectId,
      projectTitle: input.projectTitle,
      sourceModule: input.sourceModule ?? "studio",
      backingId: input.entityId,
      isMascot: input.isMascot,
      isLogo: input.isLogo,
    });
  } catch (error) {
    logLibraryConsistencyFailure(`prisma ${input.generationType} ${input.entityId}`, error);
  }
}

export async function registerGeneratedReferenceInLibrary(input: {
  ownerId: string;
  createdBy: string;
  generationId: string;
  kind: string;
  assetUrl: string;
  storageKey: string;
  thumbnailUrl?: string | null;
  promptSummary?: string;
  projectId?: string | null;
  projectTitle?: string | null;
  sourceModule?: LibrarySourceModule;
}): Promise<void> {
  const generationType: LibraryGenerationType =
    input.kind === "editor_variant"
      ? "editor_variant"
      : input.kind === "character"
        ? "character"
        : input.kind === "mascot"
          ? "mascot"
          : input.kind === "location"
            ? "location"
            : input.kind === "prop"
              ? "prop"
              : input.kind === "world"
                ? "world"
                : "image";
  try {
    await ensureCompletedGenerationInLibrary({
      ownerId: input.ownerId,
      createdBy: input.createdBy,
      generationType,
      assetUrl: input.assetUrl,
      storageKey: input.storageKey,
      thumbnailUrl: input.thumbnailUrl ?? input.assetUrl,
      assetName: input.promptSummary,
      promptSummary: input.promptSummary,
      projectId: input.projectId,
      projectTitle: input.projectTitle,
      sourceModule: input.sourceModule ?? "wizard",
      backingId: input.generationId,
      isMascot: input.kind === "mascot",
      isLogo: input.kind === "logo",
    });
  } catch (error) {
    logLibraryConsistencyFailure(`generated ref ${input.generationId}`, error);
  }
}

export async function registerAudioAssetInLibrary(input: {
  ownerId: string;
  createdBy: string;
  assetId: string;
  assetName: string;
  audioUrl: string;
  storageKey: string;
  generationType: "music" | "sfx";
  projectId?: string | null;
  projectTitle?: string | null;
}): Promise<void> {
  try {
    await ensureCompletedGenerationInLibrary({
      ownerId: input.ownerId,
      createdBy: input.createdBy,
      generationType: input.generationType,
      assetUrl: input.audioUrl,
      storageKey: input.storageKey,
      assetName: input.assetName,
      projectId: input.projectId,
      projectTitle: input.projectTitle,
      sourceModule: "studio",
      backingId: input.assetId,
      backingStore: "audio_library",
    });
  } catch (error) {
    logLibraryConsistencyFailure(`audio ${input.assetId}`, error);
  }
}
