import { prisma } from "@/lib/prisma";
import { buildProviderVideoStorageRows } from "@/server/instant-premium/canonical-provider-video";
import {
  buildAdminFinalAssemblyReport,
  buildConcatIncludedByTransitionId,
  buildProviderChainByTransitionId,
  expectedTransitionCountForImageCount,
} from "@/server/instant-premium/final-assembly-invariants";
import { getRebuildAssemblyTrace } from "@/server/instant-premium/rebuild-assembly-trace";
import { isPlainConcatSafeMode, readFinalAssemblySafeMode } from "@/server/instant-premium/final-assembly-safe-mode";
export type HardAssemblyDiagnostics = {
  projectId: string;
  imageCount: number;
  expectedTransitions: number;
  providerVideoUrlCount: number;
  concatInputCount: number | null;
  finalOutputUrl: string | null;
  previousFinalVideoUrl: string | null;
  rebuildTrace: ReturnType<typeof getRebuildAssemblyTrace>;
  segmentIntegrityVerdict: string | null;
  finalAssemblyReport: ReturnType<typeof buildAdminFinalAssemblyReport>;
  providerVideoStorage: Awaited<ReturnType<typeof buildProviderVideoStorageRows>>;
  comparison: {
    expectedTransitions: number;
    providerUrlsPresent: number;
    concatInputsFromTrace: number;
    segment2InConcatTrace: boolean;
    segment2DownloadHash: string | null;
    segment2ConcatHash: string | null;
    finalHashBefore: string | null;
    finalHashAfter: string | null;
    allCountsMatch: boolean;
  };
  env: {
    FINAL_ASSEMBLY_SAFE_MODE: string | null;
    plainConcatActive: boolean;
  };
};

export async function buildHardAssemblyDiagnostics(
  projectId: string
): Promise<HardAssemblyDiagnostics | null> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: {
      images: { orderBy: { order: "asc" }, select: { id: true, order: true } },
      transitions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          startImageId: true,
          endImageId: true,
          status: true,
          provider: true,
          providerJobId: true,
          outputVideoUrl: true,
          updatedAt: true,
        },
      },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!project) {
    return null;
  }

  const latestExport = project.exports[0] ?? null;
  const rebuildTrace = getRebuildAssemblyTrace(projectId);
  const transitionRows = project.transitions.map((t) => ({
    id: t.id,
    order: t.order,
    startImageId: t.startImageId,
    endImageId: t.endImageId,
    status: t.status,
    providerJobId: t.providerJobId,
    outputVideoUrl: t.outputVideoUrl,
  }));

  const storageRows = await buildProviderVideoStorageRows(
    project.transitions.map((t) => ({
      transitionId: t.id,
      segmentIndex: t.order,
      transitionOrder: t.order,
      status: t.status,
      provider: t.provider,
      providerJobId: t.providerJobId,
      outputVideoUrl: t.outputVideoUrl,
      updatedAt: t.updatedAt,
    }))
  );

  const concatIncludedByTransitionId = buildConcatIncludedByTransitionId({
    transitions: transitionRows,
    rebuildSegmentTraces: rebuildTrace?.segments ?? [],
    latestExportCompleted: latestExport?.status === "completed",
  });

  const providerChainByTransitionId = buildProviderChainByTransitionId({
    transitions: transitionRows,
    storageSha256ByTransitionId: new Map(
      storageRows.map((row) => [row.transitionId, row.sha256])
    ),
    rebuildSegmentTraces: rebuildTrace?.segments ?? [],
  });

  const finalAssemblyReport = buildAdminFinalAssemblyReport({
    images: project.images,
    transitions: transitionRows,
    concatIncludedByTransitionId,
    providerChainByTransitionId,
  });

  const expected = expectedTransitionCountForImageCount(project.images.length);
  const providerPresent = project.transitions.filter(
    (t) => t.status === "completed" && t.outputVideoUrl?.trim()
  ).length;
  const concatFromTrace = rebuildTrace?.segments.filter((s) => s.concatInputPath?.trim()).length ?? 0;
  const seg2Trace = rebuildTrace?.segments.find((s) => s.segmentIndex === 1);
  const seg2InConcat = Boolean(seg2Trace?.concatInputPath?.trim());

  const comparison = {
    expectedTransitions: expected,
    providerUrlsPresent: providerPresent,
    concatInputsFromTrace: concatFromTrace,
    segment2InConcatTrace: seg2InConcat,
    segment2DownloadHash: seg2Trace?.downloadedFileHash ?? null,
    segment2ConcatHash: seg2Trace?.concatInputHash ?? null,
    finalHashBefore: rebuildTrace?.previousFinalHash ?? null,
    finalHashAfter: rebuildTrace?.finalOutputHash ?? null,
    allCountsMatch:
      expected === providerPresent &&
      (concatFromTrace === 0 || concatFromTrace === expected) &&
      providerPresent === expected,
  };

  return {
    projectId,
    imageCount: project.images.length,
    expectedTransitions: expected,
    providerVideoUrlCount: providerPresent,
    concatInputCount: concatFromTrace > 0 ? concatFromTrace : null,
    finalOutputUrl: latestExport?.outputVideoUrl?.trim() ?? null,
    previousFinalVideoUrl: project.instantPreviousFinalVideoUrl?.trim() ?? null,
    rebuildTrace,
    segmentIntegrityVerdict: null,
    finalAssemblyReport,
    providerVideoStorage: storageRows,
    comparison,
    env: {
      FINAL_ASSEMBLY_SAFE_MODE: readFinalAssemblySafeMode(),
      plainConcatActive: isPlainConcatSafeMode(),
    },
  };
}

export async function attachSegmentIntegrityVerdict(
  diagnostics: HardAssemblyDiagnostics,
  verdict: string
): Promise<HardAssemblyDiagnostics> {
  return { ...diagnostics, segmentIntegrityVerdict: verdict };
}
