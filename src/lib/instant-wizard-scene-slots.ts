/**
 * Decoupled wizard scene slots — storyboard text persists independently of media.
 */

import {
  emptySceneTextDraft,
  type InstantSceneTextDraft,
} from "@/components/instant/instant-mode-panel";
import type { InstantMode, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import type { InstantWizardLocalImage } from "@/lib/instant-wizard-image-model";
import type {
  PersistedSceneTextDraft,
  PersistedWizardImage,
  PersistedWizardSceneSlot,
} from "@/lib/instant-premium-wizard-storage";
import {
  normalizeStorySceneDurationSeconds,
  type SceneOverlayTemplate,
} from "@/lib/story-overlay-templates";
import {
  normalizeSceneActingIntensity,
  normalizeSceneEmotionFields,
  withAutoSceneEmotionPatch,
} from "@/lib/animation-scene-emotions";
import {
  hasCustomOverlayLayerStyles,
  sanitizeOverlayLayerStyles,
} from "@/lib/story-overlay-layer-styles";

export type WizardSceneSlot = {
  sceneId: string;
  text: InstantSceneTextDraft;
  image: InstantWizardLocalImage | null;
  studioContext?: import("@/types/studio-scene-context").StudioSceneContextMetadata;
};

const SCENE_TEMPLATES = new Set<SceneOverlayTemplate>([
  "auto",
  "hero",
  "scene",
  "sequence",
]);

export function createWizardSceneId(): string {
  return `scene-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createWizardSceneSlot(
  transitionSeconds: InstantTransitionSeconds | number = 5,
  image: InstantWizardLocalImage | null = null
): WizardSceneSlot {
  return {
    sceneId: createWizardSceneId(),
    text: emptySceneTextDraft(transitionSeconds),
    image,
  };
}

export function listAttachedImages(slots: WizardSceneSlot[]): InstantWizardLocalImage[] {
  return slots.flatMap((slot) => (slot.image ? [slot.image] : []));
}

export function countAttachedImages(slots: WizardSceneSlot[]): number {
  return slots.filter((slot) => slot.image !== null).length;
}

export function sceneTextsFromSlots(slots: WizardSceneSlot[]): InstantSceneTextDraft[] {
  return slots.map((slot) => slot.text);
}

export function sceneHasUserText(text: InstantSceneTextDraft): boolean {
  if (text.heroText.trim() || text.title.trim() || text.subtitle.trim()) {
    return true;
  }
  if (
    text.headlineBeats.some((line) => line.trim()) ||
    text.titleBeats.some((line) => line.trim()) ||
    text.subtitleBeats.some((line) => line.trim()) ||
    text.heroTextBeats.some((line) => line.trim()) ||
    text.finaleTextBeats.some((line) => line.trim())
  ) {
    return true;
  }
  if (text.extraLines.some((line) => line.trim())) {
    return true;
  }
  if (text.lines.some((line) => line.trim())) {
    return true;
  }
  if (text.heroFinaleText.trim() || text.finaleFooter.trim()) {
    return true;
  }
  return false;
}

export function findFirstEmptyImageSlotIndex(slots: WizardSceneSlot[]): number {
  return slots.findIndex((slot) => slot.image === null);
}

/** Fill empty slots first; append new scenes for overflow images. */
export function assignImagesToSceneSlots(
  slots: WizardSceneSlot[],
  images: InstantWizardLocalImage[],
  transitionSeconds: InstantTransitionSeconds | number
): WizardSceneSlot[] {
  const next = slots.map((slot) => ({ ...slot, text: { ...slot.text } }));
  const unassigned = [...images];

  for (let i = 0; i < next.length && unassigned.length > 0; i++) {
    if (next[i]!.image === null) {
      next[i] = { ...next[i]!, image: unassigned.shift()! };
    }
  }

  while (unassigned.length > 0) {
    next.push(createWizardSceneSlot(transitionSeconds, unassigned.shift()!));
  }

  return next;
}

export function clearSceneImageAt(slots: WizardSceneSlot[], index: number): WizardSceneSlot[] {
  if (index < 0 || index >= slots.length) {
    return slots;
  }
  return slots.map((slot, i) => (i === index ? { ...slot, image: null } : slot));
}

export function clearSceneImageByImageId(
  slots: WizardSceneSlot[],
  imageId: string
): WizardSceneSlot[] {
  return slots.map((slot) =>
    slot.image?.id === imageId ? { ...slot, image: null } : slot
  );
}

export function deleteSceneAt(slots: WizardSceneSlot[], index: number): WizardSceneSlot[] {
  if (index < 0 || index >= slots.length) {
    return slots;
  }
  return slots.filter((_, i) => i !== index);
}

export function moveSceneAt(
  slots: WizardSceneSlot[],
  index: number,
  direction: "up" | "down"
): WizardSceneSlot[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= slots.length) {
    return slots;
  }
  const next = [...slots];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved!);
  return next;
}

export function moveScenesByImageId(
  slots: WizardSceneSlot[],
  activeImageId: string,
  overImageId: string
): WizardSceneSlot[] {
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

export function updateAttachedImagesInSlots(
  slots: WizardSceneSlot[],
  updater: (images: InstantWizardLocalImage[]) => InstantWizardLocalImage[]
): WizardSceneSlot[] {
  const attached = listAttachedImages(slots);
  const nextAttached = updater(attached);
  const byId = new Map(nextAttached.map((img) => [img.id, img]));
  return slots.map((slot) => {
    if (!slot.image) {
      return slot;
    }
    const updated = byId.get(slot.image.id);
    return updated ? { ...slot, image: updated } : slot;
  });
}

export function patchSceneTextAt(
  slots: WizardSceneSlot[],
  index: number,
  patch: Partial<InstantSceneTextDraft>
): WizardSceneSlot[] {
  return slots.map((slot, i) =>
    i === index ? { ...slot, text: { ...slot.text, ...patch } } : slot
  );
}

export function patchSceneTextAtWithEmotion(
  slots: WizardSceneSlot[],
  index: number,
  patch: Partial<InstantSceneTextDraft>,
  instantMode?: InstantMode
): WizardSceneSlot[] {
  const next = patchSceneTextAt(slots, index, patch);
  const slot = next[index];
  if (!slot) {
    return next;
  }
  const merged = { ...slot.text, ...patch };
  if (merged.emotionMode === "manual") {
    return patchSceneTextAt(next, index, {
      emotionMode: "manual",
      emotion: merged.emotion,
      actingIntensity: normalizeSceneActingIntensity(merged.actingIntensity),
    });
  }
  const autoPatched = withAutoSceneEmotionPatch(merged, index, next.length, instantMode);
  return patchSceneTextAt(next, index, {
    emotionMode: "auto",
    autoEmotion: autoPatched.autoEmotion,
    actingIntensity: normalizeSceneActingIntensity(merged.actingIntensity ?? autoPatched.actingIntensity),
  });
}

export function syncAutoEmotionsForSceneSlots(
  slots: WizardSceneSlot[],
  instantMode?: InstantMode
): WizardSceneSlot[] {
  const count = Math.max(slots.length, 1);
  return slots.map((slot, index) => ({
    ...slot,
    text:
      slot.text.emotionMode === "manual"
        ? slot.text
        : withAutoSceneEmotionPatch(slot.text, index, count, instantMode),
  }));
}

export function trimScenesToCount(slots: WizardSceneSlot[], maxCount: number): WizardSceneSlot[] {
  if (slots.length <= maxCount) {
    return slots;
  }
  return slots.slice(0, maxCount);
}

function restoreSceneTextDraft(
  raw: PersistedSceneTextDraft | undefined,
  fallbackTransition: InstantTransitionSeconds
): InstantSceneTextDraft {
  if (!raw || typeof raw !== "object") {
    return emptySceneTextDraft(fallbackTransition);
  }
  const template = SCENE_TEMPLATES.has(raw.template as SceneOverlayTemplate)
    ? (raw.template as SceneOverlayTemplate)
    : "auto";
  const transitionDurationSeconds = normalizeStorySceneDurationSeconds(
    raw.transitionDurationSeconds ?? raw.durationSeconds,
    fallbackTransition
  );
  return {
    template,
    transitionDurationSeconds,
    durationSeconds: transitionDurationSeconds,
    heroText: typeof raw.heroText === "string" ? raw.heroText : "",
    title: typeof raw.title === "string" ? raw.title : "",
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    headlineBeats: Array.isArray(raw.headlineBeats)
      ? raw.headlineBeats.filter((line): line is string => typeof line === "string")
      : [],
    titleBeats: Array.isArray(raw.titleBeats)
      ? raw.titleBeats.filter((line): line is string => typeof line === "string")
      : [],
    subtitleBeats: Array.isArray(raw.subtitleBeats)
      ? raw.subtitleBeats.filter((line): line is string => typeof line === "string")
      : [],
    heroTextBeats: Array.isArray(raw.heroTextBeats)
      ? raw.heroTextBeats.filter((line): line is string => typeof line === "string")
      : [],
    finaleTextBeats: Array.isArray(raw.finaleTextBeats)
      ? raw.finaleTextBeats.filter((line): line is string => typeof line === "string")
      : [],
    extraLines: Array.isArray(raw.extraLines)
      ? raw.extraLines.filter((line): line is string => typeof line === "string")
      : [],
    accentWords: typeof raw.accentWords === "string" ? raw.accentWords : "",
    lines: Array.isArray(raw.lines)
      ? raw.lines.filter((line): line is string => typeof line === "string")
      : [],
    heroFinale: typeof raw.heroFinale === "boolean" ? raw.heroFinale : true,
    heroFinaleText: typeof raw.heroFinaleText === "string" ? raw.heroFinaleText : "",
    finaleFooter: typeof raw.finaleFooter === "string" ? raw.finaleFooter : "",
    ...normalizeSceneEmotionFields({
      emotionMode: raw.emotionMode,
      emotion: raw.emotion,
      autoEmotion: raw.autoEmotion,
    }),
    actingIntensity: normalizeSceneActingIntensity(raw.actingIntensity),
    overlayLayerStyles: sanitizeOverlayLayerStyles(raw.overlayLayerStyles),
  };
}

export function serializeSceneSlotsForPersist(
  slots: WizardSceneSlot[]
): PersistedWizardSceneSlot[] {
  return slots.map((slot) => ({
    sceneId: slot.sceneId,
    text: {
      template: slot.text.template,
      transitionDurationSeconds: slot.text.transitionDurationSeconds,
      durationSeconds: slot.text.durationSeconds,
      heroText: slot.text.heroText,
      title: slot.text.title,
      subtitle: slot.text.subtitle,
      headlineBeats: [...slot.text.headlineBeats],
      titleBeats: [...slot.text.titleBeats],
      subtitleBeats: [...slot.text.subtitleBeats],
      heroTextBeats: [...slot.text.heroTextBeats],
      finaleTextBeats: [...slot.text.finaleTextBeats],
      extraLines: [...slot.text.extraLines],
      accentWords: slot.text.accentWords,
      lines: [...slot.text.lines],
      heroFinale: slot.text.heroFinale,
      heroFinaleText: slot.text.heroFinaleText,
      finaleFooter: slot.text.finaleFooter,
      emotionMode: slot.text.emotionMode,
      emotion: slot.text.emotion,
      autoEmotion: slot.text.autoEmotion,
      actingIntensity: slot.text.actingIntensity,
      ...(hasCustomOverlayLayerStyles(slot.text.overlayLayerStyles) ?
        { overlayLayerStyles: sanitizeOverlayLayerStyles(slot.text.overlayLayerStyles) }
      : {}),
    },
    image: slot.image
      ? {
          id: slot.image.id,
          originalFileName: slot.image.originalFileName,
          mimeType: slot.image.mimeType,
          sizeBytes: slot.image.sizeBytes,
          remoteWorkingUrl: slot.image.remoteWorkingUrl,
          remoteThumbnailUrl: slot.image.remoteThumbnailUrl,
          remoteStorageKey: slot.image.remoteStorageKey,
          bakedText: { ...slot.image.bakedText },
        }
      : null,
    ...(slot.studioContext ? { studioContext: slot.studioContext } : {}),
  }));
}

export function restoreSceneSlotsFromPersisted(
  sceneSlots: PersistedWizardSceneSlot[] | undefined,
  legacyImages: PersistedWizardImage[] | undefined,
  legacySceneTexts: PersistedSceneTextDraft[] | undefined,
  fallbackTransition: InstantTransitionSeconds
): WizardSceneSlot[] {
  if (sceneSlots && sceneSlots.length > 0) {
    return sceneSlots.map((slot) => ({
      sceneId: slot.sceneId || createWizardSceneId(),
      text: restoreSceneTextDraft(slot.text, fallbackTransition),
      image: null,
      studioContext: slot.studioContext,
    }));
  }

  const images = legacyImages ?? [];
  const texts = legacySceneTexts ?? [];
  const count = Math.max(images.length, texts.length);
  if (count <= 0) {
    return [];
  }

  const out: WizardSceneSlot[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      sceneId: createWizardSceneId(),
      text: restoreSceneTextDraft(texts[i], fallbackTransition),
      image: null,
    });
  }
  return out;
}

/** Attach legacy persisted image metadata to restored slots (blobs hydrated separately). */
export function attachPersistedImagesToSceneSlots(
  slots: WizardSceneSlot[],
  persistedImages: PersistedWizardImage[],
  hydrateImage: (meta: PersistedWizardImage) => InstantWizardLocalImage | null
): WizardSceneSlot[] {
  if (persistedImages.length === 0) {
    return slots;
  }

  const byId = new Map(persistedImages.map((img) => [img.id, img]));
  const usedIds = new Set<string>();

  const next = slots.map((slot) => {
    const persisted = slot.image?.id ? byId.get(slot.image.id) : undefined;
    if (persisted) {
      const hydrated = hydrateImage(persisted);
      if (hydrated) {
        usedIds.add(persisted.id);
        return { ...slot, image: hydrated };
      }
    }
    return slot;
  });

  const orphanPersisted = persistedImages.filter((img) => !usedIds.has(img.id));
  if (orphanPersisted.length === 0) {
    return next;
  }

  let cursor = 0;
  const filled = next.map((slot) => {
    if (slot.image !== null) {
      return slot;
    }
    const meta = orphanPersisted[cursor];
    if (!meta) {
      return slot;
    }
    cursor += 1;
    const hydrated = hydrateImage(meta);
    return hydrated ? { ...slot, image: hydrated } : slot;
  });

  while (cursor < orphanPersisted.length) {
    const hydrated = hydrateImage(orphanPersisted[cursor]!);
    cursor += 1;
    if (hydrated) {
      filled.push({
        sceneId: createWizardSceneId(),
        text: emptySceneTextDraft(5),
        image: hydrated,
      });
    }
  }

  return filled;
}

export function mergePersistedSceneSlotsWithImages(
  sceneSlots: PersistedWizardSceneSlot[] | undefined,
  legacyImages: PersistedWizardImage[] | undefined,
  legacySceneTexts: PersistedSceneTextDraft[] | undefined,
  fallbackTransition: InstantTransitionSeconds,
  hydrateImage: (meta: PersistedWizardImage) => InstantWizardLocalImage | null
): WizardSceneSlot[] {
  const base = restoreSceneSlotsFromPersisted(
    sceneSlots,
    legacyImages,
    legacySceneTexts,
    fallbackTransition
  );

  if (sceneSlots && sceneSlots.length > 0) {
    return base.map((slot, index) => {
      const persisted = sceneSlots[index];
      if (!persisted?.image) {
        return slot;
      }
      const hydrated = hydrateImage(persisted.image);
      return hydrated
        ? { ...slot, image: hydrated, studioContext: persisted.studioContext ?? slot.studioContext }
        : { ...slot, studioContext: persisted.studioContext ?? slot.studioContext };
    });
  }

  return attachPersistedImagesToSceneSlots(base, legacyImages ?? [], hydrateImage);
}

export function hasPersistableWizardDraft(
  state: Pick<
    { sceneSlots?: PersistedWizardSceneSlot[]; sceneTexts?: PersistedSceneTextDraft[] },
    "sceneSlots" | "sceneTexts"
  >
): boolean {
  if (state.sceneSlots && state.sceneSlots.length > 0) {
    return true;
  }
  if (state.sceneTexts && state.sceneTexts.length > 0) {
    return true;
  }
  return false;
}
