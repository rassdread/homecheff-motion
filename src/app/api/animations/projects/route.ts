import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  type AnimationPresetId,
  estimateProjectCredits,
  getAnimationPreset,
  validateAnimationPresetId,
} from "@/lib/animation-presets";
import { assertUsageAllowed } from "@/server/animations/usage-limits";
import { getAuthenticatedUser } from "@/server/auth/session";
import type {
  CreatedAnimationTransition,
  CreateAnimationProjectErrorBody,
  CreateAnimationProjectRequest,
  CreateAnimationProjectResponse,
} from "@/types/animation-api";

const MIN_IMAGES = 2;

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
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
          error: "Invalid preset. Use basic, standard, or pro.",
          code: "PRESET_INVALID",
        } satisfies CreateAnimationProjectErrorBody,
        { status: 400 }
      );
    }
    presetId = payload.presetId;
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

  const transitionCount = images.length - 1;
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

  if (images.some((image) => !image.fileName || !image.previewUrl)) {
    return NextResponse.json(
      {
        error: "Each image must include fileName and previewUrl.",
        code: "PRESET_INVALID",
      } satisfies CreateAnimationProjectErrorBody,
      { status: 400 }
    );
  }

  const estimatedCredits = estimateProjectCredits(images.length, preset);
  const usageCheck = await assertUsageAllowed({
    userId: user.id,
    presetId: preset.id,
    estimatedCredits,
  });
  if (!usageCheck.ok) {
    return NextResponse.json(
      {
        error: "Animation usage limit reached.",
        code: usageCheck.code,
        usage: usageCheck.status,
      },
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
        viduModel: preset.model,
        viduResolution: preset.resolution,
        viduDurationSeconds: preset.durationSeconds,
        estimatedCredits,
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
