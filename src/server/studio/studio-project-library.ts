/**
 * S2H — Server aggregator for human “Mijn projecten”.
 * Aggregates storyboards + orphan Motion; dedupes linked AnimationProjects.
 * 0 provider generation calls. No schema migration.
 */

import { prisma } from "@/lib/prisma";
import { readS2cMetadataFromAudioAssetJson } from "@/lib/studio-preset-materialization-plan";
import {
  compareStudioProjectSummariesByRecency,
  isMotionProjectFailed,
  isMotionProjectGenerating,
  resolveStudioProjectContinueHref,
  resolveStudioProjectHumanType,
  resolveStudioProjectOrigin,
  resolveStudioProjectStatus,
  resolveStudioProjectTitle,
} from "@/lib/studio-project-status";
import {
  LOCAL_QUICK_VIDEO_LIBRARY_CAPABILITY,
  STUDIO_PROJECT_SUMMARY_VERSION,
  type StudioProjectLibraryResponse,
  type StudioProjectSummary,
} from "@/types/studio-project-summary";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 80;

export type ListStudioProjectsParams = {
  ownerId: string;
  limit?: number;
  /** ISO cursor = lastEditedAt of last item (exclusive window via id tie-break client-side). */
  cursor?: string | null;
  archived?: boolean;
};

function sceneHasStory(s: {
  title: string | null;
  action: string | null;
  description: string | null;
}): boolean {
  return Boolean(s.title?.trim() || s.action?.trim() || s.description?.trim());
}

function pickThumbnail(
  scenes: Array<{
    selectedSceneImageId: string | null;
    selectedSceneImage: { imageUrl: string; thumbnailUrl: string } | null;
    sceneImages: Array<{ imageUrl: string; thumbnailUrl: string; status: string }>;
    order: number;
  }>
): string | null {
  const ordered = [...scenes].sort((a, b) => a.order - b.order);
  for (const scene of ordered) {
    const selected = scene.selectedSceneImage;
    if (selected) {
      const u = selected.thumbnailUrl?.trim() || selected.imageUrl?.trim();
      if (u) return u;
    }
    const completed = scene.sceneImages.find(
      (i) => i.status === "completed" && (i.thumbnailUrl?.trim() || i.imageUrl?.trim())
    );
    if (completed) {
      return completed.thumbnailUrl?.trim() || completed.imageUrl?.trim() || null;
    }
  }
  return null;
}

export async function listStudioProjectsForUser(
  params: ListStudioProjectsParams
): Promise<StudioProjectLibraryResponse> {
  const started = Date.now();
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
  const sourceWarnings: string[] = [];

  // Archive not on StudioStoryboard — archived filter returns empty for now.
  if (params.archived) {
    return {
      projects: [],
      nextCursor: null,
      localDraftSupported: false,
      sourceWarnings: ["archive_not_supported_for_storyboards"],
      meta: {
        storyboardRoots: 0,
        motionOrphans: 0,
        dedupedMotionLinks: 0,
        durationMs: Date.now() - started,
      },
    };
  }

  let storyboards: Array<{
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    audioAssetMetadataJson: unknown;
  }> = [];
  let motionRows: Array<{
    id: string;
    title: string | null;
    status: string;
    projectType: string;
    createdAt: Date;
    updatedAt: Date;
    studioSourceStoryboardId: string | null;
    studioSourceStoryboardTitle: string | null;
    exports: Array<{
      status: string;
      outputVideoUrl: string | null;
      createdAt: Date;
    }>;
    _count: { renderVersions: number; languageExports: number };
  }> = [];

  try {
    storyboards = await prisma.studioStoryboard.findMany({
      where: { ownerId: params.ownerId },
      orderBy: { updatedAt: "desc" },
      take: limit + 10,
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        audioAssetMetadataJson: true,
      },
    });
  } catch {
    sourceWarnings.push("storyboards_unavailable");
  }

  try {
    motionRows = await prisma.animationProject.findMany({
      where: { ownerId: params.ownerId },
      orderBy: { updatedAt: "desc" },
      take: Math.min(100, limit * 3),
      select: {
        id: true,
        title: true,
        status: true,
        projectType: true,
        createdAt: true,
        updatedAt: true,
        studioSourceStoryboardId: true,
        studioSourceStoryboardTitle: true,
        exports: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, outputVideoUrl: true, createdAt: true },
        },
        _count: { select: { renderVersions: true, languageExports: true } },
      },
    });
  } catch {
    sourceWarnings.push("motion_unavailable");
  }

  const storyboardIds = storyboards.map((s) => s.id);
  const scenesBySb = new Map<
    string,
    Array<{
      title: string | null;
      action: string | null;
      description: string | null;
      selectedSceneImageId: string | null;
      selectedSceneImage: { imageUrl: string; thumbnailUrl: string } | null;
      order: number;
      sceneImages: Array<{ imageUrl: string; thumbnailUrl: string; status: string }>;
    }>
  >();

  if (storyboardIds.length > 0) {
    try {
      const scenes = await prisma.studioScene.findMany({
        where: { storyboardId: { in: storyboardIds } },
        select: {
          storyboardId: true,
          title: true,
          action: true,
          description: true,
          selectedSceneImageId: true,
          selectedSceneImage: {
            select: { imageUrl: true, thumbnailUrl: true },
          },
          order: true,
          sceneImages: {
            take: 2,
            orderBy: { createdAt: "desc" },
            select: { imageUrl: true, thumbnailUrl: true, status: true },
          },
        },
      });
      for (const scene of scenes) {
        const list = scenesBySb.get(scene.storyboardId) ?? [];
        list.push(scene);
        scenesBySb.set(scene.storyboardId, list);
      }
    } catch {
      sourceWarnings.push("scenes_unavailable");
    }
  }

  const motionByStoryboard = new Map<string, typeof motionRows>();
  const orphanMotion: typeof motionRows = [];
  let dedupedMotionLinks = 0;

  for (const row of motionRows) {
    const sbId = row.studioSourceStoryboardId?.trim();
    if (sbId && storyboardIds.includes(sbId)) {
      dedupedMotionLinks += 1;
      const list = motionByStoryboard.get(sbId) ?? [];
      list.push(row);
      motionByStoryboard.set(sbId, list);
    } else if (sbId && !storyboardIds.includes(sbId)) {
      // Linked to missing/foreign storyboard — treat as orphan for this user view
      orphanMotion.push(row);
    } else {
      orphanMotion.push(row);
    }
  }

  const projects: StudioProjectSummary[] = [];

  for (const sb of storyboards) {
    const scenes = scenesBySb.get(sb.id) ?? [];
    const sceneCount = scenes.length;
    const scenesWithStory = scenes.filter(sceneHasStory).length;
    const scenesWithVisual = scenes.filter(
      (s) => Boolean(s.selectedSceneImageId) || (s.sceneImages?.length ?? 0) > 0
    ).length;

    const linked = (motionByStoryboard.get(sb.id) ?? []).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
    const primary =
      linked.find((m) => m.exports[0]?.status === "completed" && m.exports[0]?.outputVideoUrl) ??
      linked[0] ??
      null;

    const latestExport = primary?.exports[0] ?? null;
    const hasFinalOutput = Boolean(
      latestExport?.status === "completed" && latestExport.outputVideoUrl?.trim()
    );
    const resultUrl = hasFinalOutput ? latestExport!.outputVideoUrl!.trim() : null;
    const isGenerating = primary ? isMotionProjectGenerating(primary.status) : false;
    const lastAttemptFailed = primary ? isMotionProjectFailed(primary.status) : false;

    let editedAfterOutput = false;
    if (hasFinalOutput && latestExport?.createdAt) {
      editedAfterOutput = sb.updatedAt.getTime() > latestExport.createdAt.getTime() + 2000;
    }

    const statusResult = resolveStudioProjectStatus({
      sceneCount,
      scenesWithStory,
      scenesWithVisual,
      hasFinalOutput,
      editedAfterOutput,
      lastAttemptFailed,
      isGenerating,
    });

    const s2c = readS2cMetadataFromAudioAssetJson(sb.audioAssetMetadataJson);
    const origin = resolveStudioProjectOrigin({
      homecheffItemId: s2c?.homecheffItemId,
      growthLeadId: s2c?.growthLeadId,
      returnUrl: s2c?.returnUrl,
      hasPresetMeta: Boolean(s2c),
    });

    const title =
      resolveStudioProjectTitle({
        userTitle: sb.title,
        storyTitle: scenes.find((s) => s.title?.trim())?.title,
      }) || sb.title;

    const versionCount = primary?._count.renderVersions ?? 0;
    const languageCount = primary?._count.languageExports ?? 0;

    projects.push({
      version: STUDIO_PROJECT_SUMMARY_VERSION,
      id: `storyboard:${sb.id}`,
      sourceType: "storyboard",
      sourceId: sb.id,
      title,
      humanType: resolveStudioProjectHumanType({
        sourceType: "storyboard",
        sceneCount,
      }),
      status: statusResult.status,
      thumbnailUrl: pickThumbnail(scenes),
      latestResultUrl: resultUrl,
      lastEditedAt: sb.updatedAt.toISOString(),
      createdAt: sb.createdAt.toISOString(),
      origin,
      presetName: null,
      recommendedStage: statusResult.recommendedStage,
      recommendedAction: statusResult.recommendedAction,
      hasFinalOutput,
      versionCount,
      languageCount,
      archived: false,
      canContinue: true,
      continueHref: resolveStudioProjectContinueHref({
        sourceType: "storyboard",
        sourceId: sb.id,
        motionProjectId: primary?.id,
        recommendedStage: statusResult.recommendedStage,
        hasFinalOutput,
      }),
      canRename: true,
      canDuplicate: Boolean(primary?.id),
      canArchive: false,
      canDownload: hasFinalOutput,
      canOpenHomecheff: Boolean(s2c?.homecheffItemId && s2c.returnUrl),
      canReturnGrowth: Boolean(s2c?.growthLeadId || (s2c?.returnUrl && /growth/i.test(s2c.returnUrl))),
      returnUrl: s2c?.returnUrl ?? null,
      localOnly: false,
      secondaryWarningKey: statusResult.secondaryWarningKey,
    });
  }

  for (const row of orphanMotion) {
    const latestExport = row.exports[0] ?? null;
    const hasFinalOutput = Boolean(
      latestExport?.status === "completed" && latestExport.outputVideoUrl?.trim()
    );
    const resultUrl = hasFinalOutput ? latestExport!.outputVideoUrl!.trim() : null;
    const isGenerating = isMotionProjectGenerating(row.status);
    const lastAttemptFailed = isMotionProjectFailed(row.status);

    const statusResult = resolveStudioProjectStatus({
      sceneCount: hasFinalOutput ? 1 : 0,
      scenesWithStory: hasFinalOutput ? 1 : 0,
      scenesWithVisual: hasFinalOutput ? 1 : 0,
      hasFinalOutput,
      lastAttemptFailed,
      isGenerating,
    });

    const title =
      resolveStudioProjectTitle({
        userTitle: row.title,
        storyTitle: row.studioSourceStoryboardTitle,
      }) ||
      row.title?.trim() ||
      "";

    projects.push({
      version: STUDIO_PROJECT_SUMMARY_VERSION,
      id: `motion:${row.id}`,
      sourceType: "motion",
      sourceId: row.id,
      title,
      humanType: resolveStudioProjectHumanType({
        sourceType: "motion",
        isInstantOrMotion: true,
      }),
      status: statusResult.status,
      thumbnailUrl: null,
      latestResultUrl: resultUrl,
      lastEditedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      origin: "standalone",
      presetName: null,
      recommendedStage: statusResult.recommendedStage,
      recommendedAction: statusResult.recommendedAction,
      hasFinalOutput,
      versionCount: row._count.renderVersions,
      languageCount: row._count.languageExports,
      archived: false,
      canContinue: true,
      continueHref: resolveStudioProjectContinueHref({
        sourceType: "motion",
        sourceId: row.id,
        hasFinalOutput,
      }),
      canRename: true,
      canDuplicate: true,
      canArchive: false,
      canDownload: hasFinalOutput,
      canOpenHomecheff: false,
      canReturnGrowth: false,
      returnUrl: null,
      localOnly: false,
      secondaryWarningKey: statusResult.secondaryWarningKey,
    });
  }

  projects.sort(compareStudioProjectSummariesByRecency);

  let sliced = projects;
  if (params.cursor) {
    const cursorMs = Date.parse(params.cursor);
    if (!Number.isNaN(cursorMs)) {
      sliced = projects.filter((p) => Date.parse(p.lastEditedAt) < cursorMs);
    }
  }
  const page = sliced.slice(0, limit);
  const nextCursor =
    sliced.length > limit ? page[page.length - 1]?.lastEditedAt ?? null : null;

  void LOCAL_QUICK_VIDEO_LIBRARY_CAPABILITY;

  return {
    projects: page,
    nextCursor,
    localDraftSupported: false,
    sourceWarnings,
    meta: {
      storyboardRoots: storyboards.length,
      motionOrphans: orphanMotion.length,
      dedupedMotionLinks,
      durationMs: Date.now() - started,
    },
  };
}

/** Home continue strip — same summaries, capped. */
export async function listStudioProjectsForHomeContinue(
  ownerId: string,
  limit = 3
): Promise<StudioProjectSummary[]> {
  const result = await listStudioProjectsForUser({ ownerId, limit });
  return result.projects.slice(0, limit);
}
