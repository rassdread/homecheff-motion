import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import { refreshTransitionOutputsFromProvider } from "@/server/instant-premium/status-service";
import { buildAdminAssemblyTimeline, buildFinalSegmentTransitionRows } from "@/server/instant-premium/final-segment-source";
import {
  buildAdminFinalAssemblyReport,
  buildConcatIncludedByTransitionId,
  expectedTransitionCountForImageCount,
} from "@/server/instant-premium/final-assembly-invariants";
import { getRebuildAssemblyTrace } from "@/server/instant-premium/rebuild-assembly-trace";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function hashUrl(url: string | null): string | null {
  const value = url?.trim();
  if (!value) {
    return null;
  }
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function isInstantLike(project: {
  projectType: string;
  stylePreset: string | null;
  instantOutputDurationSeconds: number | null;
  instantSelectedChips: unknown;
  instantUserIntent: string | null;
}): boolean {
  return (
    project.projectType === "instant_premium" ||
    project.stylePreset === "food_promo" ||
    project.stylePreset === "clean_business" ||
    project.stylePreset === "social_boost" ||
    project.instantOutputDurationSeconds != null ||
    project.instantSelectedChips != null ||
    (project.instantUserIntent?.trim().length ?? 0) > 0
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const reconcile = new URL(request.url).searchParams.get("reconcile") === "1";
  if (reconcile) {
    await refreshTransitionOutputsFromProvider(id);
  }

  const project = await prisma.animationProject.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      status: true,
      projectType: true,
      stylePreset: true,
      viduDurationSeconds: true,
      instantOutputDurationSeconds: true,
      instantSelectedChips: true,
      instantUserIntent: true,
      images: {
        orderBy: { order: "asc" },
        select: { id: true, order: true },
      },
      transitions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          startImageId: true,
          endImageId: true,
          status: true,
          progress: true,
          providerJobId: true,
          outputVideoUrl: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!isInstantLike(project)) {
    return NextResponse.json({ error: "Project is not instant premium." }, { status: 409 });
  }

  const latestExport = await prisma.animationExport.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });
  const transitionRows = project.transitions.map((t) => ({
    id: t.id,
    order: t.order,
    startImageId: t.startImageId,
    endImageId: t.endImageId,
    status: t.status,
    providerJobId: t.providerJobId,
    outputVideoUrl: t.outputVideoUrl,
  }));
  const rebuildTrace = getRebuildAssemblyTrace(id);
  const concatIncludedByTransitionId = buildConcatIncludedByTransitionId({
    transitions: transitionRows,
    rebuildSegmentTraces: rebuildTrace?.segments ?? [],
    latestExportCompleted: latestExport?.status === "completed",
  });
  const finalAssemblyReport = buildAdminFinalAssemblyReport({
    images: project.images,
    transitions: transitionRows,
    concatIncludedByTransitionId,
  });

  const assemblyTimeline = buildAdminAssemblyTimeline(
    buildFinalSegmentTransitionRows(
      project.transitions.map((t) => ({
        id: t.id,
        order: t.order,
        startImageId: t.startImageId,
        endImageId: t.endImageId,
        status: t.status,
        providerJobId: t.providerJobId,
        outputVideoUrl: t.outputVideoUrl,
      }))
    )
  );

  const transitions = project.transitions.map((t) => ({
    index: t.order,
    order: t.order,
    transitionId: t.id,
    startImageId: t.startImageId,
    endImageId: t.endImageId,
    status: t.status,
    progress: t.progress,
    providerJobId: t.providerJobId,
    outputVideoUrl: t.outputVideoUrl,
    outputVideoUrlHash: hashUrl(t.outputVideoUrl),
    durationSeconds: project.viduDurationSeconds ?? null,
    error: t.errorMessage,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const duplicateMap = new Map<string, number[]>();
  for (const t of transitions) {
    if (!t.outputVideoUrlHash) continue;
    const arr = duplicateMap.get(t.outputVideoUrlHash) ?? [];
    arr.push(t.index);
    duplicateMap.set(t.outputVideoUrlHash, arr);
  }
  const duplicateOutputUrls = Array.from(duplicateMap.entries())
    .filter(([, segmentIndexes]) => segmentIndexes.length > 1)
    .map(([outputVideoUrlHash, segmentIndexes]) => ({ outputVideoUrlHash, segmentIndexes }));

  const missingSegments = transitions
    .filter((t) => !(t.status === "completed" && t.outputVideoUrl))
    .map((t) => t.index);

  console.info("[hc-instant-premium-inspect]", {
    action: "inspect_project_segments",
    projectId: id,
    reconcile,
    transitionCount: transitions.length,
    duplicateCount: duplicateOutputUrls.length,
    missingCount: missingSegments.length,
  });

  return NextResponse.json(
    {
      projectId: project.id,
      projectType: "instant_premium",
      userId: project.ownerId,
      status: project.status,
      imageCount: project.images.length,
      expectedSegments: expectedTransitionCountForImageCount(project.images.length),
      expectedTransitionCount: expectedTransitionCountForImageCount(project.images.length),
      transitions,
      assemblyTimeline,
      finalAssemblyReport,
      duplicateOutputUrls,
      missingSegments,
    },
    { status: 200 }
  );
}
