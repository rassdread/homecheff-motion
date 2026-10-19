import { choosePlayableVideoUrl } from "@/lib/studio-owned-project-media";
import type {
  OwnedAnimationImageRecord,
  OwnedPlayableVideoRecord,
  OwnedSceneImageRecord,
} from "@/lib/studio-owned-project-media";
import { prisma } from "@/lib/prisma";

const IMAGE_TAKE = 400;
const VIDEO_TAKE = 80;

export type OwnedProjectMediaPayload = {
  sceneImages: OwnedSceneImageRecord[];
  animationImages: OwnedAnimationImageRecord[];
  videos: OwnedPlayableVideoRecord[];
};

export async function listOwnedProjectMedia(ownerId: string): Promise<OwnedProjectMediaPayload> {
  const [sceneRows, animationRows, videoRows] = await Promise.all([
    prisma.studioSceneImage.findMany({
      where: {
        status: "completed",
        imageUrl: { not: "" },
        scene: { storyboard: { ownerId } },
      },
      orderBy: { createdAt: "desc" },
      take: IMAGE_TAKE,
      select: {
        id: true,
        imageUrl: true,
        thumbnailUrl: true,
        createdAt: true,
        scene: {
          select: {
            title: true,
            storyboard: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.animationImage.findMany({
      where: {
        project: { ownerId },
        NOT: { previewUrl: null },
      },
      orderBy: { createdAt: "desc" },
      take: IMAGE_TAKE,
      select: {
        id: true,
        previewUrl: true,
        fileName: true,
        createdAt: true,
        studioSceneImageId: true,
        project: { select: { id: true, title: true } },
      },
    }),
    prisma.animationProject.findMany({
      where: {
        ownerId,
        OR: [
          { exports: { some: { NOT: { outputVideoUrl: null } } } },
          { NOT: { instantPreviousFinalVideoUrl: null } },
          {
            renderVersions: {
              some: { status: "completed", NOT: { finalVideoUrl: null } },
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: VIDEO_TAKE,
      select: {
        id: true,
        title: true,
        createdAt: true,
        instantPreviousFinalVideoUrl: true,
        images: {
          orderBy: { order: "asc" },
          take: 1,
          select: { previewUrl: true },
        },
        exports: {
          where: { NOT: { outputVideoUrl: null } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { outputVideoUrl: true },
        },
        renderVersions: {
          where: { status: "completed", NOT: { finalVideoUrl: null } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { finalVideoUrl: true },
        },
      },
    }),
  ]);

  const sceneImages: OwnedSceneImageRecord[] = sceneRows.map((row) => ({
    id: row.id,
    imageUrl: row.imageUrl,
    thumbnailUrl: row.thumbnailUrl,
    createdAt: row.createdAt.toISOString(),
    projectId: row.scene.storyboard.id,
    projectTitle: row.scene.storyboard.title,
    sceneTitle: row.scene.title,
  }));

  const animationImages: OwnedAnimationImageRecord[] = animationRows.map((row) => ({
    id: row.id,
    previewUrl: row.previewUrl,
    fileName: row.fileName,
    createdAt: row.createdAt.toISOString(),
    projectId: row.project.id,
    projectTitle: row.project.title,
    studioSceneImageId: row.studioSceneImageId,
  }));

  const videos: OwnedPlayableVideoRecord[] = [];
  for (const row of videoRows) {
    const videoUrl = choosePlayableVideoUrl({
      exportUrls: row.exports.map((item) => item.outputVideoUrl),
      renderUrls: row.renderVersions.map((item) => item.finalVideoUrl),
      previousUrl: row.instantPreviousFinalVideoUrl,
    });
    if (!videoUrl) {
      continue;
    }
    videos.push({
      projectId: row.id,
      projectTitle: row.title,
      createdAt: row.createdAt.toISOString(),
      videoUrl,
      posterUrl: row.images[0]?.previewUrl ?? null,
    });
  }

  return { sceneImages, animationImages, videos };
}
