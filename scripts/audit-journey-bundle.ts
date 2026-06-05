/**
 * Motion V22.7 — read-only legacy audit for "the journey" bundle.
 * Run: npx tsx scripts/audit-journey-bundle.ts
 */
import { prisma } from "@/lib/prisma";
import { resolveProjectBundleGroupKey } from "@/lib/project-display-title";

const JOURNEY_HINTS = ["the journey", "de reis", "journey"];

function includesJourney(text: string | null | undefined): boolean {
  const norm = (text ?? "").trim().toLowerCase();
  return JOURNEY_HINTS.some((hint) => norm.includes(hint));
}

function scanJsonForUrls(value: unknown, hits: string[]): void {
  if (value == null) {
    return;
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (
      lower.includes("clean") ||
      lower.includes("final") ||
      lower.includes("30") ||
      lower.includes(".mp4")
    ) {
      hits.push(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      scanJsonForUrls(item, hits);
    }
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      scanJsonForUrls(v, hits);
    }
  }
}

async function main() {
  const candidates = await prisma.animationProject.findMany({
    where: {
      OR: [
        { title: { contains: "journey", mode: "insensitive" } },
        { bundleName: { contains: "journey", mode: "insensitive" } },
        { bundleKey: { contains: "journey", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      bundleName: true,
      bundleKey: true,
      ownerId: true,
      projectType: true,
      status: true,
      instantOutputDurationSeconds: true,
      instantStoryboardDurationSeconds: true,
      instantCleanFinalVideoUrl: true,
      instantPreviousFinalVideoUrl: true,
      instantFinalRebuildAuditJson: true,
      studioHandoffJson: true,
      createdAt: true,
      updatedAt: true,
      exports: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          outputVideoUrl: true,
          status: true,
          progress: true,
          updatedAt: true,
        },
      },
      renderVersions: {
        orderBy: { renderVersionNumber: "asc" },
        select: {
          id: true,
          renderVersionNumber: true,
          status: true,
          finalVideoUrl: true,
          cleanVideoUrl: true,
          isDefault: true,
          settingsSnapshot: true,
          segmentSnapshot: true,
          completedAt: true,
          createdAt: true,
        },
      },
      transitions: {
        select: {
          outputVideoUrl: true,
          status: true,
        },
      },
      languageExports: {
        select: {
          id: true,
          languageCode: true,
          outputVideoUrl: true,
          sourceCleanVideoUrl: true,
          status: true,
        },
      },
    },
  });

  const journeyProjects = candidates.filter(
    (p) =>
      includesJourney(p.title) ||
      includesJourney(p.bundleName) ||
      includesJourney(p.bundleKey)
  );

  if (!journeyProjects.length) {
    console.log(JSON.stringify({ ok: true, message: "No journey projects found", projects: [] }, null, 2));
    return;
  }

  const report = journeyProjects.map((project) => {
    const auditHits: string[] = [];
    scanJsonForUrls(project.instantFinalRebuildAuditJson, auditHits);
    scanJsonForUrls(project.studioHandoffJson, auditHits);

    const groupKey = resolveProjectBundleGroupKey({
      ownerId: project.ownerId,
      projectType: project.projectType ?? "classic",
      title: project.title,
      bundleName: project.bundleName,
      bundleKey: project.bundleKey,
    });

    return {
      projectId: project.id,
      title: project.title,
      bundleName: project.bundleName,
      bundleKey: project.bundleKey,
      bundleGroupKey: groupKey,
      status: project.status,
      instantOutputDurationSeconds: project.instantOutputDurationSeconds,
      instantStoryboardDurationSeconds: project.instantStoryboardDurationSeconds,
      instantCleanFinalVideoUrl: project.instantCleanFinalVideoUrl,
      instantPreviousFinalVideoUrl: project.instantPreviousFinalVideoUrl,
      renderVersions: project.renderVersions,
      exports: project.exports,
      transitions: project.transitions,
      languageExports: project.languageExports,
      auditJsonCandidates: [...new Set(auditHits)].slice(0, 40),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  });

  const allCleanUrls = report.flatMap((r) => [
    r.instantCleanFinalVideoUrl,
    ...r.renderVersions.map((rv) => rv.cleanVideoUrl),
    ...r.languageExports.map((le) => le.sourceCleanVideoUrl),
  ].filter(Boolean));

  const durations = report.flatMap((r) =>
    [r.instantOutputDurationSeconds, r.instantStoryboardDurationSeconds].filter(
      (d) => d != null
    )
  );

  const has30s = durations.some((d) => typeof d === "number" && Math.abs(d - 30) < 2);
  const render30 = report.some((r) =>
    r.renderVersions.some((rv) => rv.finalVideoUrl?.includes("30") || rv.cleanVideoUrl?.includes("30"))
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        projectCount: report.length,
        projectIds: report.map((r) => r.projectId),
        has30sDurationField: has30s,
        has30InRenderUrls: render30,
        uniqueCleanUrls: [...new Set(allCleanUrls)],
        classification:
          report.some((r) => r.renderVersions.length >= 2)
            ? "Case A — multiple ProjectRenderVersion rows (catalog mapping)"
            : report.some((r) => r.instantCleanFinalVideoUrl && has30s)
              ? "Case B/C — clean URL on project; verify blob vs render registration"
              : "Case D — no registered 30s clean; likely legacy overwrite",
        projects: report,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
