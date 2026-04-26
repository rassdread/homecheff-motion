import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  type AnimationAdvancedResolution,
  estimateAdvancedCredits,
  validateAdvancedSettingsForUser,
} from "@/lib/animation-advanced-settings";
import {
  type AnimationPresetId,
  estimateProjectCredits,
  getAnimationPreset,
  MAX_ANIMATION_USER_PROMPT_LENGTH,
  validateAnimationPresetId,
} from "@/lib/animation-presets";
import { assertUsageAllowed } from "@/server/animations/usage-limits";
import {
  assertUserActive,
  canUseAdvancedAnimationControls,
  canUsePreset,
  getAdvancedAnimationLimitsForUser,
  requireUser,
} from "@/server/auth/permissions";
import type {
  CreatedAnimationTransition,
  CreateAnimationProjectErrorBody,
  CreateAnimationProjectRequest,
  CreateAnimationProjectResponse,
} from "@/types/animation-api";

const MIN_IMAGES = 2;

function isAdvancedEnabledPayload(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { enabled?: unknown }).enabled === true
  );
}

function parseAdvancedDurationSeconds(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseFloat(value.trim());
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return Number.NaN;
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const activeGate = assertUserActive(user);
  if (!activeGate.ok) {
    return NextResponse.json(
      {
        error: "Account is disabled.",
        code: "USER_INACTIVE",
      } satisfies CreateAnimationProjectErrorBody,
      { status: 403 }
    );
  }

  let payload: CreateAnimationProjectRequest;

  try {
    payload = (await request.json()) as CreateAnimationProjectRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." } satisfies CreateAnimationProjectErrorBody, {
      status: 400,
    });
  }

  let presetId: AnimationPresetId = "standard";
  if (
    payload.presetId !== undefined &&
    payload.presetId !== null &&
    String(payload.presetId).trim() !== ""
  ) {
    if (!validateAnimationPresetId(payload.presetId)) {
      return NextResponse.json(
        {
          error: "Invalid preset.",
          code: "PRESET_INVALID",
        } satisfies CreateAnimationProjectErrorBody,
        { status: 400 }
      );
    }
    presetId = payload.presetId;
  }

  if (!canUsePreset(user, presetId)) {
    return NextResponse.json(
      {
        error: "This quality tier is not available for your account.",
        code: "PRESET_NOT_ALLOWED",
      } satisfies CreateAnimationProjectErrorBody,
      { status: 403 }
    );
  }

  const preset = getAnimationPreset(presetId);
  const images = payload.images ?? [];

  if (images.length < MIN_IMAGES) {
    return NextResponse.json(
      {
        error: `At least ${MIN_IMAGES} images are required.`,
        code: "PRESET_INVALID",
      } satisfies CreateAnimationProjectErrorBody,
      { status: 400 }
    );
  }

  if (images.some((image) => !image.fileName || !image.previewUrl)) {
    return NextResponse.json(
      {
        error: "Each image must include fileName and previewUrl.",
        code: "PRESET_INVALID",
      } satisfies CreateAnimationProjectErrorBody,
      { status: 400 }
    );
  }

  const transitionCount = images.length - 1;
  const rawAdvanced = payload.advancedSettings;
  const advancedEnabled = isAdvancedEnabledPayload(rawAdvanced);

  if (advancedEnabled && !canUseAdvancedAnimationControls(user)) {
    return NextResponse.json(
      {
        error: "Advanced settings are not available for your account.",
        code: "ADVANCED_SETTINGS_NOT_ALLOWED",
      } satisfies CreateAnimationProjectErrorBody,
      { status: 403 }
    );
  }

  let estimatedCredits: number;
  let viduModel: string;
  let viduResolution: string;
  let viduDurationSeconds: number;
  let advancedSettingsEnabled = false;

  if (advancedEnabled) {
    const limits = getAdvancedAnimationLimitsForUser(user);
    if (images.length > limits.maxImages) {
      return NextResponse.json(
        {
          error: `Advanced mode allows at most ${limits.maxImages} images.`,
          code: "ADVANCED_IMAGE_LIMIT",
          maxImages: limits.maxImages,
        } satisfies CreateAnimationProjectErrorBody,
        { status: 400 }
      );
    }
    if (transitionCount > limits.maxTransitions) {
      return NextResponse.json(
        {
          error: `Advanced mode allows at most ${limits.maxTransitions} transitions.`,
          code: "ADVANCED_TRANSITION_LIMIT",
          maxTransitions: limits.maxTransitions,
        } satisfies CreateAnimationProjectErrorBody,
        { status: 400 }
      );
    }

    const adv = rawAdvanced as Record<string, unknown>;
    const validated = validateAdvancedSettingsForUser(
      limits,
      {
        enabled: true,
        model: typeof adv.model === "string" ? adv.model : undefined,
        resolution:
          typeof adv.resolution === "string"
            ? (adv.resolution.trim().toLowerCase() as AnimationAdvancedResolution)
            : undefined,
        durationSeconds: parseAdvancedDurationSeconds(adv.durationSeconds),
      },
      images.length
    );

    if (!validated.ok) {
      const code = validated.code;
      if (code === "ADVANCED_MODEL_NOT_ALLOWED") {
        return NextResponse.json(
          {
            error: "That model is not allowed for your account.",
            code: "ADVANCED_MODEL_NOT_ALLOWED",
          } satisfies CreateAnimationProjectErrorBody,
          { status: 400 }
        );
      }
      if (code === "ADVANCED_RESOLUTION_NOT_ALLOWED") {
        return NextResponse.json(
          {
            error: "That resolution is not allowed for your account.",
            code: "ADVANCED_RESOLUTION_NOT_ALLOWED",
          } satisfies CreateAnimationProjectErrorBody,
          { status: 400 }
        );
      }
      if (code === "ADVANCED_DURATION_NOT_ALLOWED") {
        return NextResponse.json(
          {
            error: `Duration must be between 1 and ${limits.maxDurationSeconds} seconds.`,
            code: "ADVANCED_DURATION_NOT_ALLOWED",
          } satisfies CreateAnimationProjectErrorBody,
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: `Advanced mode allows at most ${limits.maxImages} images.`,
          code: "ADVANCED_IMAGE_LIMIT",
          maxImages: limits.maxImages,
        } satisfies CreateAnimationProjectErrorBody,
        { status: 400 }
      );
    }

    estimatedCredits = estimateAdvancedCredits(
      validated.model,
      validated.resolution,
      validated.durationSeconds,
      transitionCount
    );
    viduModel = validated.model;
    viduResolution = validated.resolution;
    viduDurationSeconds = validated.durationSeconds;
    advancedSettingsEnabled = true;
  } else {
    if (images.length > preset.maxImages) {
      return NextResponse.json(
        {
          error: `This preset allows at most ${preset.maxImages} images.`,
          code: "PRESET_MAX_IMAGES",
          maxImages: preset.maxImages,
        } satisfies CreateAnimationProjectErrorBody,
        { status: 400 }
      );
    }

    if (transitionCount > preset.maxTransitions) {
      return NextResponse.json(
        {
          error: `This preset allows at most ${preset.maxTransitions} transitions.`,
          code: "PRESET_MAX_TRANSITIONS",
          maxTransitions: preset.maxTransitions,
        } satisfies CreateAnimationProjectErrorBody,
        { status: 400 }
      );
    }

    estimatedCredits = estimateProjectCredits(images.length, preset);
    viduModel = preset.model;
    viduResolution = preset.resolution;
    viduDurationSeconds = preset.durationSeconds;
    advancedSettingsEnabled = false;
  }

  let storedUserPrompt: string | null = null;
  if (payload.userPrompt !== undefined && payload.userPrompt !== null) {
    if (typeof payload.userPrompt !== "string") {
      return NextResponse.json(
        {
          error: "User prompt must be a string.",
          code: "USER_PROMPT_INVALID",
        } satisfies CreateAnimationProjectErrorBody,
        { status: 400 }
      );
    }
    const trimmed = payload.userPrompt.trim();
    if (trimmed.length > MAX_ANIMATION_USER_PROMPT_LENGTH) {
      return NextResponse.json(
        {
          error: `User prompt is too long (max ${MAX_ANIMATION_USER_PROMPT_LENGTH} characters).`,
          code: "USER_PROMPT_TOO_LONG",
          maxLength: MAX_ANIMATION_USER_PROMPT_LENGTH,
        } satisfies CreateAnimationProjectErrorBody,
        { status: 400 }
      );
    }
    if (trimmed.length > 0) {
      storedUserPrompt = trimmed;
    }
  }

  const usageCheck = await assertUsageAllowed({
    userId: user.id,
    userRole: user.role,
    presetId: preset.id,
    estimatedCredits,
  });
  if (!usageCheck.ok) {
    const creditCode =
      advancedEnabled && usageCheck.code === "ANIMATION_CREDIT_LIMIT"
        ? "ADVANCED_CREDIT_LIMIT"
        : usageCheck.code;
    return NextResponse.json(
      {
        error: "Animation usage limit reached.",
        code: creditCode,
        usage: usageCheck.status,
      } satisfies CreateAnimationProjectErrorBody,
      { status: 403 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.animationProject.create({
      data: {
        ownerId: user.id,
        status: "generating",
        stylePreset: payload.stylePreset,
        aspectRatio: payload.aspectRatio,
        presetId: preset.id,
        viduModel,
        viduResolution,
        viduDurationSeconds,
        estimatedCredits,
        advancedSettingsEnabled,
        userPrompt: storedUserPrompt,
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

    const createdTransitions: CreatedAnimationTransition[] = [];

    for (let index = 0; index < createdImages.length - 1; index += 1) {
      const image = createdImages[index];
      const nextImage = createdImages[index + 1];

      const transition = await tx.animationTransition.create({
        data: {
          projectId: project.id,
          startImageId: image.id,
          endImageId: nextImage.id,
          order: index,
          status: "queued",
          progress: 0,
        },
      });

      createdTransitions.push({
        id: transition.id,
        order: transition.order,
      });
    }

    const response: CreateAnimationProjectResponse = {
      projectId: project.id,
      transitionsCount: createdTransitions.length,
      transitions: createdTransitions,
    };

    await tx.animationUsageLedger.create({
      data: {
        userId: user.id,
        projectId: project.id,
        presetId: preset.id,
        estimatedCredits,
      },
    });

    return response;
  });

  return NextResponse.json(result, { status: 201 });
}
