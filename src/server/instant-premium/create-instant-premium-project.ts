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
import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";
import {
  emptyNormalizedSceneText,
  isInstantMode,
  isInstantTransitionSeconds,
  maxImagesForInstantMode,
  minImagesForInstantMode,
  parseInstantMode,
  parseInstantSceneTexts,
  type InstantMode,
  type InstantSceneText,
  type InstantTransitionSeconds,
  viduMultiframeTotalDurationSeconds,
} from "@/lib/instant-premium-mode-types";
import { MIN_INSTANT_PREMIUM_IMAGES } from "@/lib/instant-premium-pricing";
import {
  composeStoredInstantUserIntent,
  isInstantPremiumChipId,
  normalizeInstantPremiumContinuityStrength,
  type InstantPremiumContinuityStrength,
  isInstantPremiumStylePreset,
  type InstantPremiumDurationSeconds,
} from "@/lib/instant-premium-prompt";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";
import {
  DEFAULT_OVERLAY_STYLE,
  DEFAULT_TEXT_RENDER_MODE,
  normalizeOverlayStyle,
  normalizeTextRenderMode,
  usesPosterMotionPreserve,
  type OverlayStyle,
  type TextRenderMode,
} from "@/lib/hybrid-motion-overlay";
import {
  normalizeMotionEnergy,
  parseCharacterMotionProfile,
  type MotionEnergy,
} from "@/lib/premium-motion-engine";
import { analyzeSceneIntelligence } from "@/lib/scene-intelligence";
import { resolveAnimationStyleIdFromSettings } from "@/lib/animation-style-presets";
import { posterMotionSettingsFromClient } from "@/lib/poster-motion-preserve";
import { prepareInstantImagesWithBakedTextProtection } from "@/server/instant-premium/prepare-baked-text-images";
import { runInstantPremiumTextPreflight } from "@/server/instant-premium/instant-premium-preflight";
import { guardInstantPremiumVideoRendering } from "@/server/instant-premium/video-rendering-guard";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";
import { buildPremiumRenderValidationReport } from "@/lib/premium-render-validation";
import { runViduPromptLengthPreflight } from "@/lib/vidu-prompt-preflight";

const INSTANT_PRESET_ID: AnimationPresetId = "standard";
const MAX_CHIPS = 3;
const MAX_INTENT_LENGTH = 500;

export type InstantPremiumCreatePayload = {
  images: CreateAnimationProjectImageInput[];
  instantMode?: InstantMode;
  instantTransitionSeconds?: InstantTransitionSeconds;
  instantSceneTexts?: InstantSceneText[];
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
  textRenderMode?: TextRenderMode;
  hybridOverlayStyle?: OverlayStyle;
  posterMotionSettings?: import("@/lib/poster-motion-preserve").PosterMotionSettings;
  motionEnergy?: MotionEnergy;
  characterMotion?: import("@/lib/premium-motion-engine").CharacterMotionProfile;
};

export type InstantPremiumCreateResult =
  | { ok: true; projectId: string; warnings?: string[] }
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
  const instantMode = parseInstantMode(o.instantMode);
  const minImages = minImagesForInstantMode(instantMode);
  const maxImages = maxImagesForInstantMode(instantMode);
  if (images.length < minImages || images.length > maxImages) {
    return {
      ok: false,
      error: `Instant premium ${instantMode} mode requires between ${minImages} and ${maxImages} images.`,
      status: 400,
    };
  }

  if (o.instantMode !== undefined && o.instantMode !== null && !isInstantMode(o.instantMode)) {
    return { ok: false, error: "instantMode must be transition or story.", status: 400 };
  }

  const transitionSecondsRaw = o.instantTransitionSeconds ?? o.transitionSeconds;
  if (
    transitionSecondsRaw !== undefined &&
    transitionSecondsRaw !== null &&
    !isInstantTransitionSeconds(transitionSecondsRaw)
  ) {
    return {
      ok: false,
      error: "transitionSeconds must be 3, 5, or 8.",
      status: 400,
    };
  }
  const instantTransitionSeconds: InstantTransitionSeconds =
    transitionSecondsRaw === 3 || transitionSecondsRaw === 5 || transitionSecondsRaw === 8 ?
      transitionSecondsRaw
    : 5;

  const instantSceneTexts = parseInstantSceneTexts(o.instantSceneTexts);
  if (instantSceneTexts.length > images.length) {
    return {
      ok: false,
      error: "instantSceneTexts cannot exceed image count.",
      status: 400,
    };
  }
  while (instantSceneTexts.length < images.length) {
    instantSceneTexts.push(emptyNormalizedSceneText());
  }

  if (images.some((image) => !image.fileName?.trim() || !image.previewUrl?.trim())) {
    return { ok: false, error: "Each image must include fileName and previewUrl.", status: 400 };
  }

  for (const image of images) {
    const url = image.workingImageUrl?.trim() || image.previewUrl?.trim() || "";
    if (!isValidHttpUrl(url)) {
      return {
        ok: false,
        error: `Invalid image URL for ${image.fileName}. Re-upload the image.`,
        status: 400,
      };
    }
  }

  const stylePreset = typeof o.stylePreset === "string" ? o.stylePreset.trim() : "";
  if (!isInstantPremiumStylePreset(stylePreset)) {
    return { ok: false, error: "Invalid style preset.", status: 400 };
  }

  const outputPlan = resolveInstantPremiumOutputPlan({
    imageCount: images.length,
    instantMode,
    transitionSeconds: instantTransitionSeconds,
  });
  const duration = outputPlan.totalDurationSeconds;

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
  const durationMs = duration * 1000;
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

  const textRenderMode = normalizeTextRenderMode(o.textRenderMode ?? DEFAULT_TEXT_RENDER_MODE);
  const hybridOverlayStyle = normalizeOverlayStyle(o.hybridOverlayStyle ?? DEFAULT_OVERLAY_STYLE);
  let posterMotionSettings = posterMotionSettingsFromClient(o.posterMotionSettings);
  if (o.motionEnergy !== undefined) {
    posterMotionSettings = {
      ...posterMotionSettings,
      motionEnergy: normalizeMotionEnergy(o.motionEnergy),
    };
  }
  const characterFromPayload =
    parseCharacterMotionProfile(o.characterMotion) ??
    parseCharacterMotionProfile(o.characterMotionDirection);
  if (characterFromPayload) {
    posterMotionSettings = {
      ...posterMotionSettings,
      characterMotion: characterFromPayload,
    };
  }

  const animationStyleId = resolveAnimationStyleIdFromSettings(posterMotionSettings);
  const sceneIntelligence = analyzeSceneIntelligence({
    animationStyleId,
    userIntent: userIntent ?? null,
    imageCount: images.length,
    imageHints: images.map((img) => img.fileName?.trim() ?? "").filter(Boolean),
  });
  posterMotionSettings = {
    ...posterMotionSettings,
    animationStyleId,
    sceneIntelligence,
    emotionalActingPreset:
      posterMotionSettings.emotionalActingPreset ?? sceneIntelligence.resolvedEmotionalPreset,
  };

  const data: InstantPremiumCreatePayload = {
    images,
    instantMode,
    instantTransitionSeconds,
    instantSceneTexts,
    stylePreset,
    duration,
    aspectRatio,
    ...(uiLanguage ? { uiLanguage } : {}),
    selectedChips: chips,
    continuityStrength,
    lockedTextMode,
    lockedTextLayers: layerCheck.layers,
    textRenderMode,
    hybridOverlayStyle,
    posterMotionSettings,
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

export { instantPremiumPerTransitionSeconds } from "@/lib/instant-premium-output-plan";
export type { InstantMode, InstantSceneText, InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";

export async function createInstantPremiumAnimationProject(
  ownerId: string,
  payload: InstantPremiumCreatePayload
): Promise<InstantPremiumCreateResult> {
  const validated = validateInstantPremiumCreatePayload(payload);
  if (!validated.ok) {
    return { ok: false, error: validated.error, status: validated.status };
  }

  const renderingGuard = await guardInstantPremiumVideoRendering(validated.data);
  if (!renderingGuard.ok) {
    return { ok: false, error: renderingGuard.error, status: renderingGuard.status };
  }

  const viduLengthCheck = runViduPromptLengthPreflight(validated.data);
  const renderValidation = buildPremiumRenderValidationReport({
    payload: validated.data,
    viduPromptChars:
      viduLengthCheck.ok ? viduLengthCheck.chars : viduLengthCheck.debug.charsAfter,
    viduPromptOk: viduLengthCheck.ok,
  });
  if (!renderValidation.ok) {
    return {
      ok: false,
      error: renderValidation.blockMessage ?? "Render validation failed.",
      status: 400,
    };
  }

  const preflight = await runInstantPremiumTextPreflight(validated.data);
  if (!preflight.ok) {
    return {
      ok: false,
      error: preflight.blockMessage,
      status:
        preflight.code === "PREFLIGHT_UNAVAILABLE"
          ? 503
          : preflight.code === "OPENAI_RATE_LIMITED"
            ? 429
            : 422,
    };
  }

  const {
    images,
    stylePreset,
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

  const instantMode = parseInstantMode(validated.data.instantMode);
  const instantTransitionSeconds = validated.data.instantTransitionSeconds ?? 5;
  const instantSceneTexts = validated.data.instantSceneTexts ?? [];

  const outputPlan = resolveInstantPremiumOutputPlan({
    imageCount: images.length,
    instantMode,
    transitionSeconds: instantTransitionSeconds,
  });
  const durationResolved: InstantPremiumDurationSeconds =
    instantMode === "story" ?
      viduMultiframeTotalDurationSeconds(images.length, instantTransitionSeconds)
    : outputPlan.totalDurationSeconds;

  const preset = getAnimationPreset(INSTANT_PRESET_ID);
  const transitionCount = images.length - 1;
  const perTransition = outputPlan.viduSegmentDurationSeconds;
  const estimatedCredits =
    transitionCount * perTransition * preset.estimatedCreditsPerSecond;

  const chipsJson = chips.length > 0 ? (chips as unknown as Prisma.InputJsonValue) : undefined;
  const totalDurationMs = durationResolved * 1000;

  const textRenderMode = normalizeTextRenderMode(
    validated.data.textRenderMode ?? DEFAULT_TEXT_RENDER_MODE
  );
  const hybridOverlayStyle = normalizeOverlayStyle(
    validated.data.hybridOverlayStyle ?? DEFAULT_OVERLAY_STYLE
  );

  const imagePrep = await prepareInstantImagesWithBakedTextProtection(images, {
    uploadPathPrefix: `motion/instant-baked/${ownerId}`,
    totalDurationMs,
    textRenderMode,
    posterMotionSettings: validated.data.posterMotionSettings,
  });
  if (!imagePrep.ok) {
    return { ok: false, error: imagePrep.error, status: 400 };
  }

  const lockedLayers = mergeLockedTextLayers(
    validated.data.lockedTextLayers ?? [],
    imagePrep.extraLockedLayers
  );
  const layerCheck = validateLockedTextLayersForCreate(lockedLayers, totalDurationMs);
  if (!layerCheck.ok) {
    return { ok: false, error: layerCheck.error, status: 400 };
  }
  const preparedImages = imagePrep.images;
  const hasBakedMasked = preparedImages.some((img) => img.bakedTextProtectionStatus === "masked");
  const lockedTextMode =
    !usesPosterMotionPreserve(textRenderMode) &&
    (validated.data.lockedTextMode !== false || hasBakedMasked);
  const lockedLayersJson =
    layerCheck.layers.length > 0
      ? (lockedTextLayersForStorage(layerCheck.layers) as unknown as Prisma.InputJsonValue)
      : undefined;

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
          instantMode,
          instantTransitionSeconds,
          instantSceneTexts:
            instantMode === "story" ?
              (instantSceneTexts as unknown as Prisma.InputJsonValue)
            : undefined,
          instantSelectedChips: chipsJson ?? undefined,
          instantUserIntent: intent,
          instantLockedTextLayers: lockedLayersJson,
          instantLockedTextMode: lockedTextMode,
          instantTextRenderMode: textRenderMode,
          instantHybridOverlayStyle: hybridOverlayStyle,
          instantPosterMotionSettings: usesPosterMotionPreserve(textRenderMode)
            ? (validated.data.posterMotionSettings as unknown as Prisma.InputJsonValue)
            : undefined,
          instantDetectedTextMetadata:
            imagePrep.detectedTextMetadata.blocks.length > 0
              ? (imagePrep.detectedTextMetadata as unknown as Prisma.InputJsonValue)
              : undefined,
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
        preparedImages.map((image, index) =>
          tx.animationImage.create({
            data: {
              projectId: project.id,
              order: index,
              fileName: image.fileName,
              mimeType: image.mimeType,
              sizeBytes: image.sizeBytes,
              previewUrl: image.previewUrl,
              storageKey: image.storageKey ?? image.workingImageUrl,
              hasBakedText: image.hasBakedText,
              bakedTextProtectionStatus: image.bakedTextProtectionStatus,
              bakedTextExactCopy: image.bakedTextExactCopy,
              bakedTextMaskRegion: image.bakedTextMaskRegion ?? undefined,
              bakedTextBlocksJson: image.bakedTextBlocksJson ?? undefined,
              instantTextPatches: image.instantTextPatches ?? undefined,
              posterMotionLayersJson: image.posterMotionLayersJson ?? undefined,
              viduInputUrl: image.viduInputUrl,
            },
          })
        )
      );

      if (instantMode === "story") {
        await tx.animationTransition.create({
          data: {
            projectId: project.id,
            startImageId: createdImages[0].id,
            endImageId: createdImages[createdImages.length - 1].id,
            order: 0,
            status: "queued",
            progress: 0,
          },
        });
      } else {
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
      }

      return project.id;
    });

    return {
      ok: true,
      projectId,
      warnings: imagePrep.warnings.length > 0 ? imagePrep.warnings : undefined,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create project.";
    return { ok: false, error: message, status: 500 };
  }
}

/** Credit estimate for UI (same formula as persisted project). */
export function estimateInstantPremiumCredits(
  imageCount: number,
  duration?: InstantPremiumDurationSeconds,
  options?: { instantMode?: InstantMode; transitionSeconds?: InstantTransitionSeconds }
): number {
  if (imageCount < MIN_INSTANT_PREMIUM_IMAGES) {
    return 0;
  }
  const preset = getAnimationPreset(INSTANT_PRESET_ID);
  const instantMode = parseInstantMode(options?.instantMode);
  const plan = resolveInstantPremiumOutputPlan({
    imageCount,
    instantMode,
    transitionSeconds: options?.transitionSeconds,
  });
  const per = plan.viduSegmentDurationSeconds;
  const transitions = imageCount - 1;
  return transitions * per * preset.estimatedCreditsPerSecond;
}
