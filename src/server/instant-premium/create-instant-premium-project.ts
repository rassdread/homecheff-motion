import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAnimationPreset, type AnimationPresetId } from "@/lib/animation-presets";
import { normalizeAnimationIntent } from "@/lib/animation-intents";
import { DEFAULT_GLOBAL_ANIMATION_CONTEXT } from "@/lib/animation-global-prompt-context";
import {
  buildLockedTextLayersFromChips,
  lockedTextLayersForStorage,
  mergeLockedTextLayers,
  parseLockedTextLayersJson,
  validateLockedTextLayersForCreate,
  type LockedTextLayer,
  isTextImplyingChipId,
  type TextImplyingChipId,
} from "@/lib/locked-text-layer";
import {
  composeStoredInstantUserIntent,
  isInstantPremiumChipId,
  normalizeInstantPremiumContinuityStrength,
  type InstantPremiumContinuityStrength,
  isInstantPremiumStylePreset,
  type InstantPremiumDurationSeconds,
} from "@/lib/instant-premium-prompt";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";

const INSTANT_PRESET_ID: AnimationPresetId = "standard";
const MIN_IMAGES = 3;
const MAX_IMAGES = 5;
const MAX_CHIPS = 3;
const MAX_INTENT_LENGTH = 500;

export type InstantPremiumCreatePayload = {
  images: CreateAnimationProjectImageInput[];
  stylePreset: string;
  duration: number;
  aspectRatio: string;
  uiLanguage?: "nl" | "en";
  userIntent?: string | null;
  selectedChips?: string[];
  continuityStrength?: InstantPremiumContinuityStrength;
  lockedTextMode?: boolean;
  lockedTextLayers?: LockedTextLayer[];
  chipTextBySlot?: Partial<Record<TextImplyingChipId, string>>;
};

export type InstantPremiumCreateResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string; status: number };

export type ValidateInstantPayloadResult =
  | { ok: true; data: InstantPremiumCreatePayload }
  | { ok: false; error: string; status: number };

function isImageInput(value: unknown): value is CreateAnimationProjectImageInput {
  if (!value || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  return typeof o.fileName === "string" && typeof o.previewUrl === "string";
}

/** Shared validation for checkout storage and post-payment project creation. */
export function validateInstantPremiumCreatePayload(raw: unknown): ValidateInstantPayloadResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid JSON body.", status: 400 };
  }
  const o = raw as Record<string, unknown>;
  const imagesRaw = o.images;
  if (!Array.isArray(imagesRaw)) {
    return { ok: false, error: "images must be an array.", status: 400 };
  }
  const images = imagesRaw.filter(isImageInput);
  if (images.length < MIN_IMAGES || images.length > MAX_IMAGES) {
    return {
      ok: false,
      error: `Instant premium requires between ${MIN_IMAGES} and ${MAX_IMAGES} images.`,
      status: 400,
    };
  }

  if (images.some((image) => !image.fileName?.trim() || !image.previewUrl?.trim())) {
    return { ok: false, error: "Each image must include fileName and previewUrl.", status: 400 };
  }

  const stylePreset = typeof o.stylePreset === "string" ? o.stylePreset.trim() : "";
  if (!isInstantPremiumStylePreset(stylePreset)) {
    return { ok: false, error: "Invalid style preset.", status: 400 };
  }

  const duration = typeof o.duration === "number" ? o.duration : Number.NaN;
  if (duration !== 8 && duration !== 15) {
    return { ok: false, error: "Duration must be 8 or 15 seconds.", status: 400 };
  }

  const aspectRatio = typeof o.aspectRatio === "string" ? o.aspectRatio.trim() : "";
  if (aspectRatio !== "9:16" && aspectRatio !== "16:9") {
    return { ok: false, error: "Invalid aspect ratio.", status: 400 };
  }

  const chips = parseChips(o.selectedChips);
  let uiLanguage: "nl" | "en" | undefined;
  if (o.uiLanguage !== undefined && o.uiLanguage !== null) {
    if (o.uiLanguage !== "nl" && o.uiLanguage !== "en") {
      return { ok: false, error: "uiLanguage must be nl or en.", status: 400 };
    }
    uiLanguage = o.uiLanguage;
  }

  let userIntent: string | null | undefined;
  if (o.userIntent !== undefined && o.userIntent !== null) {
    if (typeof o.userIntent !== "string") {
      return { ok: false, error: "User intent must be a string.", status: 400 };
    }
    const t = o.userIntent.trim();
    if (t.length > MAX_INTENT_LENGTH) {
      return {
        ok: false,
        error: `User intent is too long (max ${MAX_INTENT_LENGTH} characters).`,
        status: 400,
      };
    }
    userIntent = t.length > 0 ? t : null;
  }

  const continuityStrength = normalizeInstantPremiumContinuityStrength(o.continuityStrength);

  let lockedTextMode = true;
  if (o.lockedTextMode === false) {
    lockedTextMode = false;
  }

  const explicitLayers = parseLockedTextLayersJson(o.lockedTextLayers);
  const durationMs = (duration === 15 ? 15 : 8) * 1000;
  const chipTextBySlot = parseChipTextBySlot(o.chipTextBySlot);
  const fromChips = buildLockedTextLayersFromChips({
    selectedChips: chips,
    chipTextBySlot,
    totalDurationMs: durationMs,
    uiLanguage,
  });
  const mergedLayers = mergeLockedTextLayers(explicitLayers, fromChips);
  const layerCheck = validateLockedTextLayersForCreate(mergedLayers, durationMs);
  if (!layerCheck.ok) {
    return { ok: false, error: layerCheck.error, status: 400 };
  }

  const data: InstantPremiumCreatePayload = {
    images,
    stylePreset,
    duration,
    aspectRatio,
    ...(uiLanguage ? { uiLanguage } : {}),
    selectedChips: chips,
    continuityStrength,
    lockedTextMode,
    lockedTextLayers: layerCheck.layers,
    ...(Object.keys(chipTextBySlot).length > 0 ? { chipTextBySlot } : {}),
    ...(userIntent !== undefined ? { userIntent } : {}),
  };

  return { ok: true, data };
}

function parseChipTextBySlot(raw: unknown): Partial<Record<TextImplyingChipId, string>> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const o = raw as Record<string, unknown>;
  const out: Partial<Record<TextImplyingChipId, string>> = {};
  for (const key of Object.keys(o)) {
    if (!isTextImplyingChipId(key)) {
      continue;
    }
    const val = o[key];
    if (typeof val === "string" && val.trim()) {
      out[key] = val;
    }
  }
  return out;
}

function parseChips(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  let motionCount = 0;
  let textCount = 0;
  for (const item of raw) {
    if (typeof item !== "string") {
      continue;
    }
    const id = item.trim();
    if (!id) {
      continue;
    }
    const isMotion = isInstantPremiumChipId(id);
    const isText = isTextImplyingChipId(id);
    if (!isMotion && !isText) {
      continue;
    }
    if (isMotion && motionCount >= MAX_CHIPS) {
      continue;
    }
    if (isText && textCount >= 5) {
      continue;
    }
    if (!out.includes(id)) {
      out.push(id);
      if (isMotion) {
        motionCount += 1;
      }
      if (isText) {
        textCount += 1;
      }
    }
  }
  return out;
}

/** Per-transition Vidu duration: spread total target across segments, clamped 1–16s. */
export function instantPremiumPerTransitionSeconds(
  totalSeconds: InstantPremiumDurationSeconds,
  imageCount: number
): number {
  const n = imageCount - 1;
  if (n <= 0) {
    return 1;
  }
  const raw = Math.round(totalSeconds / n);
  return Math.max(1, Math.min(16, raw));
}

export async function createInstantPremiumAnimationProject(
  ownerId: string,
  payload: InstantPremiumCreatePayload
): Promise<InstantPremiumCreateResult> {
  const validated = validateInstantPremiumCreatePayload(payload);
  if (!validated.ok) {
    return { ok: false, error: validated.error, status: validated.status };
  }

  const {
    images,
    stylePreset,
    duration,
    aspectRatio,
    userIntent,
    selectedChips,
    uiLanguage,
    continuityStrength,
  } = validated.data;
  const chips = parseChips(selectedChips);
  const typedIntent =
    userIntent !== undefined && userIntent !== null && String(userIntent).trim()
      ? String(userIntent).trim()
      : null;
  const languageHint =
    uiLanguage === "en"
      ? "Preferred output language for any on-screen text: English."
      : "Preferred output language for any on-screen text: Dutch.";
  const intentBase = typedIntent ? `${languageHint}\n${typedIntent}` : languageHint;
  const intent = composeStoredInstantUserIntent({
    continuityStrength: normalizeInstantPremiumContinuityStrength(continuityStrength),
    text: intentBase,
  });

  const durationResolved: InstantPremiumDurationSeconds = duration === 15 ? 15 : 8;

  const preset = getAnimationPreset(INSTANT_PRESET_ID);
  const transitionCount = images.length - 1;
  const perTransition = instantPremiumPerTransitionSeconds(durationResolved, images.length);
  const estimatedCredits =
    transitionCount * perTransition * preset.estimatedCreditsPerSecond;

  const chipsJson = chips.length > 0 ? (chips as unknown as Prisma.InputJsonValue) : undefined;
  const lockedLayers = validated.data.lockedTextLayers ?? [];
  const lockedLayersJson =
    lockedLayers.length > 0
      ? (lockedTextLayersForStorage(lockedLayers) as unknown as Prisma.InputJsonValue)
      : undefined;
  const lockedTextMode = validated.data.lockedTextMode !== false;

  const viduModel = preset.model;
  const viduResolution = preset.resolution;

  try {
    const projectId = await prisma.$transaction(async (tx) => {
      const project = await tx.animationProject.create({
        data: {
          ownerId,
          status: "generating",
          projectType: "instant_premium",
          stylePreset,
          aspectRatio,
          instantOutputDurationSeconds: durationResolved,
          instantSelectedChips: chipsJson ?? undefined,
          instantUserIntent: intent,
          instantLockedTextLayers: lockedLayersJson,
          instantLockedTextMode: lockedTextMode,
          presetId: preset.id,
          viduModel,
          viduResolution,
          viduDurationSeconds: perTransition,
          estimatedCredits,
          advancedSettingsEnabled: false,
          userPrompt: null,
          intent: normalizeAnimationIntent("cinematic"),
          globalPromptContext: DEFAULT_GLOBAL_ANIMATION_CONTEXT,
        },
      });

      const createdImages = await Promise.all(
        images.map((image, index) =>
          tx.animationImage.create({
            data: {
              projectId: project.id,
              order: index,
              fileName: image.fileName,
              mimeType: image.mimeType,
              sizeBytes: image.sizeBytes,
              previewUrl: image.previewUrl,
              storageKey: image.storageKey ?? image.workingImageUrl,
            },
          })
        )
      );

      for (let index = 0; index < createdImages.length - 1; index += 1) {
        const image = createdImages[index];
        const nextImage = createdImages[index + 1];

        await tx.animationTransition.create({
          data: {
            projectId: project.id,
            startImageId: image.id,
            endImageId: nextImage.id,
            order: index,
            status: "queued",
            progress: 0,
          },
        });
      }

      return project.id;
    });

    return { ok: true, projectId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create project.";
    return { ok: false, error: message, status: 500 };
  }
}

/** Credit estimate for UI (same formula as persisted project). */
export function estimateInstantPremiumCredits(
  imageCount: number,
  duration: InstantPremiumDurationSeconds
): number {
  if (imageCount < MIN_IMAGES) {
    return 0;
  }
  const preset = getAnimationPreset(INSTANT_PRESET_ID);
  const per = instantPremiumPerTransitionSeconds(duration, imageCount);
  const transitions = imageCount - 1;
  return transitions * per * preset.estimatedCreditsPerSecond;
}
