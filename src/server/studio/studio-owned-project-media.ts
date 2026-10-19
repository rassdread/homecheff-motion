import { choosePlayableVideoUrl } from "@/lib/studio-owned-project-media";
import {
  buildProjectMediaLibrary,
  classifyProbeResponses,
  queryProjectMediaLibrary,
} from "@/lib/studio-project-media-library";
import type {
  FileProbe,
  ProjectMediaSection,
  ProjectMediaSort,
  ProjectMediaStatus,
} from "@/lib/studio-project-media-library";
import { getOwnerAudioLibrary } from "@/server/studio/studio-user-audio-library-service";
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

const probeCache = new Map<string, { at: number; probe: FileProbe }>();
const PROBE_TTL_MS = 10 * 60 * 1000;
const OPEN_STATUSES = ["pending", "queued", "starting", "generating", "processing", "rendering"];

async function readProbe(url: string): Promise<{ status: number; contentType: string } | null> {
  try {
    const head = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (head.status !== 405 && head.status !== 501) {
      return { status: head.status, contentType: head.headers.get("content-type") ?? "" };
    }
    const ranged = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-15" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    return { status: ranged.status, contentType: ranged.headers.get("content-type") ?? "" };
  } catch {
    return null;
  }
}

export async function probeMediaUrl(url: string): Promise<FileProbe> {
  const cached = probeCache.get(url);
  if (cached && Date.now() - cached.at < PROBE_TTL_MS) {
    return cached.probe;
  }
  const first = await readProbe(url);
  const confirmed = first && (first.status === 200 || first.status === 206) && !first.contentType.toLowerCase().includes("text/html");
  const second = confirmed ? null : await readProbe(url);
  const probe = classifyProbeResponses(second ? [first, second] : [first]);
  probeCache.set(url, { at: Date.now(), probe });
  return probe;
}

export async function listProjectMediaLibraryPage(input: {
  ownerId: string;
  untitledLabel: string;
  section: ProjectMediaSection;
  q: string;
  projectId: string;
  status: ProjectMediaStatus | "all";
  sort: ProjectMediaSort;
  page: number;
  pageSize: number;
}) {
  const now = new Date();
  const activeSince = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const [sceneRows, projectRows, jobs, audio] = await Promise.all([
    prisma.studioSceneImage.findMany({
      where: {
        status: "completed",
        imageUrl: { not: "" },
        scene: { storyboard: { ownerId: input.ownerId } },
      },
      orderBy: { createdAt: "desc" },
      take: IMAGE_TAKE,
      select: {
        id: true,
        imageUrl: true,
        createdAt: true,
        scene: { select: { title: true, storyboard: { select: { id: true, title: true } } } },
      },
    }),
    prisma.animationProject.findMany({
      where: { ownerId: input.ownerId },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        instantOutputDurationSeconds: true,
        instantPreviousFinalVideoUrl: true,
        images: { orderBy: { order: "asc" }, take: 1, select: { previewUrl: true } },
        exports: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { status: true, outputVideoUrl: true, updatedAt: true },
        },
        renderVersions: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { status: true, finalVideoUrl: true, updatedAt: true },
        },
      },
    }),
    prisma.studioGenerationJob.findMany({
      where: { ownerId: input.ownerId, status: { notIn: ["succeeded", "completed"] } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        capability: true,
        createdAt: true,
        updatedAt: true,
        storyboardId: true,
      },
    }),
    getOwnerAudioLibrary(input.ownerId).catch(() => []),
  ]);

  const projects = await Promise.all(projectRows.map(async (row) => {
    const videoUrl = choosePlayableVideoUrl({
      exportUrls: row.exports.map((item) => item.outputVideoUrl),
      renderUrls: row.renderVersions.filter((item) => item.status === "completed").map((item) => item.finalVideoUrl),
      previousUrl: row.instantPreviousFinalVideoUrl,
    });
    const recentExport = row.exports.some((item) => OPEN_STATUSES.includes(item.status) && item.updatedAt >= activeSince);
    const recentRender = row.renderVersions.some((item) => OPEN_STATUSES.includes(item.status) && item.updatedAt >= activeSince);
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      videoUrl,
      posterUrl: row.images[0]?.previewUrl ?? null,
      durationSeconds: row.instantOutputDurationSeconds,
      probe: videoUrl ? await probeMediaUrl(videoUrl) : "unverified" as const,
      activeJob: row.updatedAt >= activeSince || recentExport || recentRender,
    };
  }));

  const items = buildProjectMediaLibrary({
    now: now.toISOString(),
    untitledLabel: input.untitledLabel,
    sceneImages: sceneRows.map((row) => ({
      id: row.id,
      projectId: row.scene.storyboard.id,
      projectTitle: row.scene.storyboard.title,
      sceneTitle: row.scene.title,
      createdAt: row.createdAt.toISOString(),
      imageUrl: row.imageUrl,
      probe: "unverified" as const,
    })),
    projects,
    audio: audio.map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt,
      audioUrl: item.audioUrl,
      durationSeconds: item.durationSeconds,
    })),
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      capability: job.capability,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      projectId: job.storyboardId,
      projectTitle: null,
    })),
  });

  return queryProjectMediaLibrary(items, input);
}
