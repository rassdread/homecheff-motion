import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { auditAdminVideoStorage } from "@/server/animation-projects/admin-storage-audit";
import { auditProjectStorage } from "@/server/animation-projects/project-storage-audit";
import {
  buildProjectVideoVersionCatalog,
  normalizeLanguageExportRows,
} from "@/lib/project-video-versions";
import { selectCleanupDryRunCandidates } from "@/lib/storage-retention-policy";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) {
    return admin;
  }

  const projects = await prisma.animationProject.findMany({
    where: {
      OR: [
        { instantCleanFinalVideoUrl: { not: null } },
        { exports: { some: { outputVideoUrl: { not: null } } } },
        { languageExports: { some: {} } },
      ],
    },
    include: {
      images: { orderBy: { order: "asc" } },
      transitions: { orderBy: { order: "asc" } },
      exports: { orderBy: { createdAt: "desc" } },
      languageExports: { orderBy: [{ languageCode: "asc" }, { version: "desc" }] },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const allCandidates = [];
  let bytesRecoverable = 0;

  for (const project of projects) {
    const audit = await auditProjectStorage({ project });
    const catalog = buildProjectVideoVersionCatalog({
      projectId: project.id,
      originalVideoUrl: audit.assets.find((asset) => asset.kind === "original")?.url ?? null,
      cleanVideoUrl: project.instantCleanFinalVideoUrl?.trim() ?? null,
      languageExports: normalizeLanguageExportRows(
        project.languageExports.map((row) => ({
          id: row.id,
          languageCode: row.languageCode,
          languageLabel: row.languageLabel,
          status: row.status,
          outputVideoUrl: row.outputVideoUrl,
          sourceFinalVideoUrl: row.sourceFinalVideoUrl,
          textLayerJson: row.textLayerJson,
          translationProvider: row.translationProvider,
          errorMessage: row.errorMessage,
          createdAt: row.createdAt.toISOString(),
          completedAt: row.completedAt?.toISOString() ?? null,
          version: row.version,
          isDefault: row.isDefault,
        }))
      ),
      previousFinalVideoUrl: project.instantPreviousFinalVideoUrl,
      rebuildCount: project.instantFinalRebuildCount,
      rebuiltAt: project.instantFinalRebuiltAt?.toISOString() ?? null,
    });

    const dryRun = selectCleanupDryRunCandidates({
      assets: audit.assets,
      languageVersions: catalog.all
        .filter((item) => item.kind === "language")
        .map((item) => ({
          languageCode: item.languageCode ?? "",
          version: item.versionNumber,
          lifecycle: item.lifecycle === "failed" ? "failed" : item.lifecycle,
          url: item.outputVideoUrl,
        })),
    });

    allCandidates.push(...dryRun.candidates.map((candidate) => ({ ...candidate, projectId: project.id })));
    bytesRecoverable += dryRun.bytesRecoverable;
  }

  const summary = await auditAdminVideoStorage({ projectLimit: 100 });

  return NextResponse.json({
    ok: true,
    dryRun: true,
    deleted: false,
    projectCount: projects.length,
    candidateCount: allCandidates.length,
    bytesRecoverable,
    candidates: allCandidates.slice(0, 200),
    policy: selectCleanupDryRunCandidates({ assets: [] }).policy,
    storageSummary: summary,
  });
}
