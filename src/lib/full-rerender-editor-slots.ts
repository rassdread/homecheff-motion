import {
  emptySceneTextDraft,
  type InstantSceneTextDraft,
} from "@/lib/instant-scene-text-draft-model";
import type { InstantMode, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import {
  maxImagesForInstantMode,
  minImagesForInstantMode,
} from "@/lib/instant-premium-mode-types";
import { createWizardSceneId } from "@/lib/instant-wizard-scene-slots";
import { buildSceneTextDraftsFromProject } from "@/lib/instant-scene-text-editor";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import type {
  FullRerenderEditorImage,
  FullRerenderEditorSlot,
  FullRerenderImageChangeAudit,
  FullRerenderImageChangesPayload,
  FullRerenderImageSequenceEntry,
} from "@/lib/full-rerender-editor-types";

export function createFullRerenderTempImageId(): string {
  return `new-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isFullRerenderTempImageId(id: string): boolean {
  return id.startsWith("new-");
}

export function buildFullRerenderSlotsFromProject(params: {
  images: Array<{ id: string; previewUrl: string; fileName?: string | null }>;
  instantSceneTexts: unknown;
  transitionSeconds: InstantTransitionSeconds | number;
}): FullRerenderEditorSlot[] {
  const count = Math.max(params.images.length, 1);
  const texts = buildSceneTextDraftsFromProject(params.instantSceneTexts, count);
  if (params.images.length === 0) {
    return [
      {
        sceneId: createWizardSceneId(),
        image: null,
        text: texts[0] ?? emptySceneTextDraft(params.transitionSeconds),
      },
    ];
  }
  return params.images.map((image, index) => ({
    sceneId: createWizardSceneId(),
    image: {
      id: image.id,
      previewUrl: image.previewUrl,
      originalFileName: image.fileName?.trim() || `scene-${index + 1}.jpg`,
    },
    text: texts[index] ?? emptySceneTextDraft(params.transitionSeconds),
  }));
}

export function countFullRerenderAttachedImages(slots: FullRerenderEditorSlot[]): number {
  return slots.filter((slot) => slot.image !== null).length;
}

export function fullRerenderSlotsToStoryboardImages(
  slots: FullRerenderEditorSlot[]
): Array<{ id: string; previewUrl: string }> {
  return slots.flatMap((slot) =>
    slot.image ? [{ id: slot.image.id, previewUrl: slot.image.previewUrl }] : []
  );
}

export function moveFullRerenderSlotAt(
  slots: FullRerenderEditorSlot[],
  index: number,
  direction: "up" | "down"
): FullRerenderEditorSlot[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= slots.length) {
    return slots;
  }
  const next = [...slots];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved!);
  return next;
}

export function moveFullRerenderSlotsByImageId(
  slots: FullRerenderEditorSlot[],
  activeImageId: string,
  overImageId: string
): FullRerenderEditorSlot[] {
  const oldIndex = slots.findIndex((slot) => slot.image?.id === activeImageId);
  const newIndex = slots.findIndex((slot) => slot.image?.id === overImageId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return slots;
  }
  const next = [...slots];
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved!);
  return next;
}

export function removeFullRerenderSlotAt(
  slots: FullRerenderEditorSlot[],
  index: number
): FullRerenderEditorSlot[] {
  if (index < 0 || index >= slots.length) {
    return slots;
  }
  return slots.filter((_, i) => i !== index);
}

export function appendFullRerenderSlot(
  slots: FullRerenderEditorSlot[],
  image: FullRerenderEditorImage,
  transitionSeconds: InstantTransitionSeconds | number
): FullRerenderEditorSlot[] {
  return [
    ...slots,
    {
      sceneId: createWizardSceneId(),
      image,
      text: emptySceneTextDraft(transitionSeconds),
    },
  ];
}

export function replaceFullRerenderSlotImage(
  slots: FullRerenderEditorSlot[],
  index: number,
  image: FullRerenderEditorImage
): FullRerenderEditorSlot[] {
  return slots.map((slot, i) => (i === index ? { ...slot, image } : slot));
}

export function patchFullRerenderSceneTextAt(
  slots: FullRerenderEditorSlot[],
  index: number,
  patch: Partial<InstantSceneTextDraft>
): FullRerenderEditorSlot[] {
  return slots.map((slot, i) =>
    i === index ? { ...slot, text: { ...slot.text, ...patch } } : slot
  );
}

export function validateFullRerenderImageSequenceEntry(
  entry: FullRerenderImageSequenceEntry
): string | null {
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

export function buildFullRerenderImageSequencePayload(
  slots: FullRerenderEditorSlot[]
): FullRerenderImageChangesPayload {
  const sequence: FullRerenderImageSequenceEntry[] = [];
  for (const slot of slots) {
    if (!slot.image) {
      continue;
    }
    const working = slot.image.remoteWorkingUrl?.trim() || slot.image.previewUrl.trim();
    const thumb = slot.image.remoteThumbnailUrl?.trim() || slot.image.previewUrl.trim();
    sequence.push({
      imageId: slot.image.isNew ? undefined : slot.image.id,
      fileName: slot.image.originalFileName,
      previewUrl: thumb,
      workingImageUrl: working,
      workingStorageKey: slot.image.remoteStorageKey,
      thumbnailUrl: thumb,
      mimeType: "image/jpeg",
      sizeBytes: 0,
    });
  }
  return { sequence };
}

export function slotImageReadyForRender(image: FullRerenderEditorImage): boolean {
  const working = image.remoteWorkingUrl?.trim() || image.previewUrl.trim();
  return isValidHttpUrl(working) && isValidHttpUrl(image.previewUrl);
}

export function validateFullRerenderSlotsForRender(params: {
  slots: FullRerenderEditorSlot[];
  instantMode: InstantMode;
}): string | null {
  const attached = countFullRerenderAttachedImages(params.slots);
  const min = minImagesForInstantMode(params.instantMode);
  const max = maxImagesForInstantMode(params.instantMode);
  if (attached < min) {
    return `At least ${min} images are required.`;
  }
  if (attached > max) {
    return `At most ${max} images are allowed.`;
  }
  const ids = new Set<string>();
  for (const slot of params.slots) {
    if (!slot.image) {
      continue;
    }
    if (ids.has(slot.image.id)) {
      return "Duplicate scene image IDs.";
    }
    ids.add(slot.image.id);
    if (!slotImageReadyForRender(slot.image)) {
      return `Image ${slot.image.originalFileName} is still uploading or missing a valid URL.`;
    }
  }
  const payload = buildFullRerenderImageSequencePayload(params.slots);
  for (const entry of payload.sequence) {
    const err = validateFullRerenderImageSequenceEntry(entry);
    if (err) {
      return err;
    }
  }
  return null;
}

export function computeFullRerenderImageChangeAudit(params: {
  initialImageIds: string[];
  sequence: FullRerenderImageSequenceEntry[];
}): FullRerenderImageChangeAudit {
  const beforeImageCount = params.initialImageIds.length;
  const afterImageCount = params.sequence.length;
  const finalExistingIds = params.sequence
    .map((row) => row.imageId)
    .filter((id): id is string => Boolean(id?.trim()));
  const initialSet = new Set(params.initialImageIds);
  const finalSet = new Set(finalExistingIds);

  const removedImageIds = params.initialImageIds.filter((id) => !finalSet.has(id));
  const addedCount = params.sequence.filter((row) => !row.imageId?.trim()).length;
  const orderChanged =
    finalExistingIds.length === params.initialImageIds.length &&
    finalExistingIds.some((id, index) => params.initialImageIds[index] !== id);

  const reordered = orderChanged && removedImageIds.length === 0 && addedCount === 0;

  return {
    beforeImageCount,
    afterImageCount,
    reordered,
    addedCount,
    removedCount: removedImageIds.length,
    replacedCount: 0,
    removedImageIds,
    replacedImageIds: [],
  };
}

export function mergeFullRerenderImageChangeAudit(
  base: FullRerenderImageChangeAudit,
  patch: Partial<FullRerenderImageChangeAudit>
): FullRerenderImageChangeAudit {
  return { ...base, ...patch };
}

export function computeImageChangeAuditFromSlots(
  initialImageIds: string[],
  slots: FullRerenderEditorSlot[]
): FullRerenderImageChangeAudit {
  const payload = buildFullRerenderImageSequencePayload(slots);
  const base = computeFullRerenderImageChangeAudit({
    initialImageIds,
    sequence: payload.sequence,
  });
  const replacedImageIds = slots.flatMap((slot) =>
    slot.image?.isReplaced && slot.image.id && !slot.image.isNew ? [slot.image.id] : []
  );
  return mergeFullRerenderImageChangeAudit(base, {
    replacedCount: replacedImageIds.length,
    replacedImageIds,
  });
}

export function fullRerenderSlotsChanged(
  initialIds: string[],
  slots: FullRerenderEditorSlot[]
): boolean {
  const payload = buildFullRerenderImageSequencePayload(slots);
  const audit = computeFullRerenderImageChangeAudit({
    initialImageIds: initialIds,
    sequence: payload.sequence,
  });
  return (
    audit.addedCount > 0 ||
    audit.removedCount > 0 ||
    audit.reordered ||
    slots.some((slot) => slot.image?.isNew || slot.image?.isReplaced)
  );
}
