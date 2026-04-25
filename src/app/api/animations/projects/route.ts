import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  CreatedAnimationTransition,
  CreateAnimationProjectRequest,
  CreateAnimationProjectResponse,
} from "@/types/animation-api";

const MIN_IMAGES = 2;
const MAX_IMAGES = 7;

export async function POST(request: Request) {
  let payload: CreateAnimationProjectRequest;

  try {
    payload = (await request.json()) as CreateAnimationProjectRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const images = payload.images ?? [];

  if (images.length < MIN_IMAGES || images.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Images count must be between ${MIN_IMAGES} and ${MAX_IMAGES}.` },
      { status: 400 }
    );
  }

  if (images.some((image) => !image.fileName || !image.previewUrl)) {
    return NextResponse.json(
      { error: "Each image must include fileName and previewUrl." },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.animationProject.create({
      data: {
        status: "generating",
        stylePreset: payload.stylePreset,
        aspectRatio: payload.aspectRatio,
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

    return response;
  });

  return NextResponse.json(result, { status: 201 });
}
