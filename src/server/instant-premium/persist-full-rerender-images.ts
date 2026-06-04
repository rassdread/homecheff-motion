import { prisma } from "@/lib/prisma";
import type { FullRerenderImageChangeAudit } from "@/lib/full-rerender-editor-types";
import {
  maxImagesForInstantMode,
  minImagesForInstantMode,
  parseInstantMode,
  type InstantMode,
} from "@/lib/instant-premium-mode-types";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import {
  ensureStoryModeTransitionRows,
  isStoryInstantMode,
} from "@/server/instant-premium/story-mode-transitions";

export type FullRerenderImageSequenceInput = {
  imageId?: string;
  fileName: string;
  previewUrl: string;
  workingImageUrl: string;
  workingStorageKey?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type PersistFullRerenderImagesInput = {
  sequence: FullRerenderImageSequenceInput[];
  replacedImageIds?: string[];
};

function validateSequenceEntry(entry: FullRerenderImageSequenceInput): string | null {
  if (!entry.fileName?.trim()) {
    return "Image file name is required.";
  }
  if (!isValidHttpUrl(entry.previewUrl)) {
    return "Invalid preview URL.";
  }
  if (!isValidHttpUrl(entry.workingImageUrl)) {
    return "Invalid working image URL.";
  }
  if (entry.thumbnailUrl && !isValidHttpUrl(entry.thumbnailUrl)) {
    return "Invalid thumbnail URL.";
  }
  return null;
}

function buildImageCreateData(
  projectId: string,
  order: number,
  entry: FullRerenderImageSequenceInput
) {
  const storageKey = entry.workingStorageKey?.trim() || entry.workingImageUrl.trim();
  return {
    projectId,
    order,
    fileName: entry.fileName.trim(),
    mimeType: entry.mimeType?.trim() || "image/jpeg",
    sizeBytes: typeof entry.sizeBytes === "number" ? entry.sizeBytes : 0,
    previewUrl: entry.previewUrl.trim(),
    storageKey,
    viduInputUrl: entry.workingImageUrl.trim(),
    hasBakedText: false,
    bakedTextProtectionStatus: "none",
  };
}

async function rebuildTransitionRows(projectId: string, instantMode: InstantMode): Promise<void> {
  const images = await prisma.animationImage.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  if (images.length < 2) {
    return;
  }

  await prisma.animationTransition.deleteMany({ where: { projectId } });

  if (isStoryInstantMode(instantMode)) {
    await prisma.animationTransition.create({
      data: {
        projectId,
        startImageId: images[0]!.id,
        endImageId: images[images.length - 1]!.id,
        order: 0,
        status: "queued",
        progress: 0,
      },
    });
    await ensureStoryModeTransitionRows(projectId);
    return;
  }

  for (let index = 0; index < images.length - 1; index += 1) {
    await prisma.animationTransition.create({
      data: {
        projectId,
        startImageId: images[index]!.id,
        endImageId: images[index + 1]!.id,
        order: index,
        status: "queued",
        progress: 0,
      },
    });
  }
}

export function computePersistedImageChangeAudit(params: {
  beforeIds: string[];
  afterIds: string[];
  replacedImageIds: string[];
}): FullRerenderImageChangeAudit {
  const beforeSet = new Set(params.beforeIds);
  const afterSet = new Set(params.afterIds);
  const removedImageIds = params.beforeIds.filter((id) => !afterSet.has(id));
  const addedImageIds = params.afterIds.filter((id) => !beforeSet.has(id));
  const orderChanged =
    params.beforeIds.length === params.afterIds.length &&
    params.afterIds.some((id, index) => params.beforeIds[index] !== id);

  return {
    beforeImageCount: params.beforeIds.length,
    afterImageCount: params.afterIds.length,
    reordered: orderChanged && removedImageIds.length === 0 && addedImageIds.length === 0,
    addedCount: addedImageIds.length,
    removedCount: removedImageIds.length,
    replacedCount: params.replacedImageIds.length,
    addedImageIds,
    removedImageIds,
    replacedImageIds: params.replacedImageIds,
  };
}

export async function persistFullRerenderImagesForProject(
  projectId: string,
  input: PersistFullRerenderImagesInput
): Promise<
  | { ok: true; imageChangeAudit: FullRerenderImageChangeAudit }
  | { ok: false; error: string; status: number }
> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { images: { orderBy: { order: "asc" } } },
  });
  if (!project) {
    return { ok: false, error: "Project not found.", status: 404 };
  }

  const instantMode = parseInstantMode(project.instantMode);
  const min = minImagesForInstantMode(instantMode);
  const max = maxImagesForInstantMode(instantMode);
  const sequence = input.sequence ?? [];

  if (sequence.length < min) {
    return {
      ok: false,
      error: `At least ${min} images are required for this mode.`,
      status: 400,
    };
  }
  if (sequence.length > max) {
    return {
      ok: false,
      error: `At most ${max} images are allowed for this mode.`,
      status: 400,
    };
  }

  const seenIds = new Set<string>();
  for (const entry of sequence) {
    const validationError = validateSequenceEntry(entry);
    if (validationError) {
      return { ok: false, error: validationError, status: 400 };
    }
    if (entry.imageId) {
      if (seenIds.has(entry.imageId)) {
        return { ok: false, error: "Duplicate image IDs in sequence.", status: 400 };
      }
      seenIds.add(entry.imageId);
      if (!project.images.some((img) => img.id === entry.imageId)) {
        return { ok: false, error: `Unknown image id: ${entry.imageId}`, status: 400 };
      }
    }
  }

  const beforeIds = project.images.map((img) => img.id);
  const replacedSet = new Set((input.replacedImageIds ?? []).filter(Boolean));
  const finalIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    const keptIds = new Set(
      sequence.map((row) => row.imageId).filter((id): id is string => Boolean(id?.trim()))
    );
    const toRemove = project.images.filter((img) => !keptIds.has(img.id));
    if (toRemove.length > 0) {
      await tx.animationTransition.deleteMany({ where: { projectId } });
      await tx.animationImage.deleteMany({
        where: { id: { in: toRemove.map((img) => img.id) } },
      });
    }

    for (let order = 0; order < sequence.length; order += 1) {
      const entry = sequence[order]!;
      if (entry.imageId) {
        await tx.animationImage.update({
          where: { id: entry.imageId },
          data: buildImageCreateData(projectId, order, entry),
        });
        finalIds.push(entry.imageId);
        continue;
      }
      const created = await tx.animationImage.create({
        data: buildImageCreateData(projectId, order, entry),
      });
      finalIds.push(created.id);
    }
  });

  await rebuildTransitionRows(projectId, instantMode);

  const imageChangeAudit = computePersistedImageChangeAudit({
    beforeIds,
    afterIds: finalIds,
    replacedImageIds: [...replacedSet].filter((id) => finalIds.includes(id)),
  });

  return { ok: true, imageChangeAudit };
}
