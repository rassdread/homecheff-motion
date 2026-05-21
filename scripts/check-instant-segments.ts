#!/usr/bin/env npx tsx
/**
 * Read-only diagnostic: verify stored Vidu transition segment videos.
 *
 * Usage:
 *   npx tsx scripts/check-instant-segments.ts <projectId>
 *   npx tsx scripts/check-instant-segments.ts <projectId> --json
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { hashFileSha256 } from "../src/lib/file-content-hash";
import {
  buildSegmentIntegrityReport,
  evaluateSegmentIssues,
  type ProbedSegmentMetrics,
  type SegmentIntegrityRow,
  type TransitionRow,
  validateTransitionImageChain,
} from "../src/lib/instant-segment-integrity-check";
import { prisma } from "../src/lib/prisma";
import {
  downloadProviderVideoToWorkDir,
  isImageLikeMediaUrl,
} from "../src/server/instant-premium/final-segment-source";
import { probeSegmentMotion } from "../src/server/instant-premium/segment-motion-validation";
import { probeVideoSegment } from "../src/server/instant-premium/segment-transition";

function usage(): never {
  console.error("Usage: npx tsx scripts/check-instant-segments.ts <projectId> [--json]");
  process.exit(1);
}

function parseArgs(argv: string[]): { projectId: string; json: boolean } {
  const args = argv.filter((a) => a !== "--");
  const json = args.includes("--json");
  const positional = args.filter((a) => a !== "--json");
  const projectId = positional[0]?.trim();
  if (!projectId) {
    usage();
  }
  return { projectId: projectId!, json };
}

async function probeLocalSegment(
  localPath: string,
  outputVideoUrl: string
): Promise<ProbedSegmentMetrics> {
  const imagePlaceholderUrl = isImageLikeMediaUrl(outputVideoUrl);
  try {
    const probed = await probeVideoSegment(localPath);
    if (!probed) {
      return {
        durationSec: null,
        frameCount: null,
        width: null,
        height: null,
        fps: null,
        sha256: null,
        motionScore: null,
        likelyFrozen: null,
        imagePlaceholderUrl,
        probeError: "no_video_stream",
      };
    }
    const motion = await probeSegmentMotion(localPath).catch(() => null);
    const frameCount =
      motion?.frameCountEstimate ?? Math.max(1, Math.round(probed.durationSec * probed.fps));
    const sha256 = await hashFileSha256(localPath);
    return {
      durationSec: probed.durationSec,
      frameCount,
      width: probed.width,
      height: probed.height,
      fps: probed.fps,
      sha256,
      motionScore: motion?.motionScore ?? null,
      likelyFrozen: motion?.likelyFrozen ?? null,
      imagePlaceholderUrl,
      probeError: null,
    };
  } catch (error) {
    return {
      durationSec: null,
      frameCount: null,
      width: null,
      height: null,
      fps: null,
      sha256: null,
      motionScore: null,
      likelyFrozen: null,
      imagePlaceholderUrl,
      probeError: error instanceof Error ? error.message : String(error),
    };
  }
}

function printHumanReport(
  report: ReturnType<typeof buildSegmentIntegrityReport>,
  projectMeta: { status: string; projectType: string | null; stylePreset: string | null }
): void {
  console.log(`\nInstant segment check — project ${report.projectId}`);
  console.log(
    `Project status: ${projectMeta.status} | type: ${projectMeta.projectType ?? "—"} | preset: ${projectMeta.stylePreset ?? "—"}`
  );
  console.log(`Transitions: ${report.segments.length}\n`);

  for (const seg of report.segments) {
    const m = seg.metrics;
    console.log(`— Transition order ${seg.order} (${seg.transitionId})`);
    console.log(`  status: ${seg.status}`);
    console.log(`  images: ${seg.startImageId} → ${seg.endImageId}`);
    console.log(`  providerJobId: ${seg.providerJobId ?? "—"}`);
    console.log(`  outputVideoUrl: ${seg.outputVideoUrl ?? "—"}`);
    console.log(
      `  probe: duration=${m.durationSec ?? "?"}s frames=${m.frameCount ?? "?"} ${m.width ?? "?"}x${m.height ?? "?"} @${m.fps ?? "?"}fps`
    );
    console.log(`  sha256: ${m.sha256 ?? "—"}`);
    console.log(
      `  motion: score=${m.motionScore ?? "—"} frozen=${m.likelyFrozen ?? "—"} placeholderUrl=${m.imagePlaceholderUrl}`
    );
    if (seg.duplicateUrl) {
      console.log("  duplicateUrl: yes");
    }
    if (seg.duplicateHash) {
      console.log("  duplicateHash: yes");
    }
    if (seg.issues.length) {
      console.log(`  issues: ${seg.issues.join(", ")}`);
    } else {
      console.log("  issues: none");
    }
    console.log("");
  }

  if (!report.chain.ok) {
    console.log("Chain validation:");
    for (const br of report.chain.breaks) {
      console.log(`  ✗ ${br.message}`);
    }
    console.log("");
  } else if (report.segments.length > 1) {
    console.log("Chain validation: OK (each endImageId matches next startImageId)\n");
  }

  console.log(report.summary);
  console.log("");
}

async function main(): Promise<void> {
  const { projectId, json } = parseArgs(process.argv.slice(2));

  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { transitions: { orderBy: { order: "asc" } } },
  });

  if (!project) {
    console.error(`Project not found: ${projectId}`);
    process.exit(1);
  }

  const transitions: TransitionRow[] = project.transitions.map((t) => ({
    id: t.id,
    order: t.order,
    status: t.status,
    startImageId: t.startImageId,
    endImageId: t.endImageId,
    providerJobId: t.providerJobId,
    outputVideoUrl: t.outputVideoUrl,
  }));

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `hc-check-segments-${projectId}-`));
  const chain = validateTransitionImageChain(transitions);
  const urlFirstOrder = new Map<string, number>();
  const hashFirstOrder = new Map<string, number>();
  const rows: SegmentIntegrityRow[] = [];

  try {
    for (let i = 0; i < transitions.length; i += 1) {
      const row = transitions[i]!;
      const url = row.outputVideoUrl?.trim() ?? "";
      let metrics: ProbedSegmentMetrics = {
        durationSec: null,
        frameCount: null,
        width: null,
        height: null,
        fps: null,
        sha256: null,
        motionScore: null,
        likelyFrozen: null,
        imagePlaceholderUrl: url ? isImageLikeMediaUrl(url) : true,
        probeError: url ? null : "no_url",
      };

      if (url && !isImageLikeMediaUrl(url)) {
        try {
          const localPath = await downloadProviderVideoToWorkDir({
            url,
            workDir,
            segmentIndex: i,
            segmentCount: transitions.length,
          });
          metrics = await probeLocalSegment(localPath, url);
        } catch (error) {
          metrics.probeError = error instanceof Error ? error.message : String(error);
        }
      }

      let duplicateUrl = false;
      let duplicateUrlWithOrder: number | undefined;
      if (url) {
        const first = urlFirstOrder.get(url);
        if (first != null) {
          duplicateUrl = true;
          duplicateUrlWithOrder = first;
        } else {
          urlFirstOrder.set(url, row.order);
        }
      }

      let duplicateHash = false;
      if (metrics.sha256) {
        const firstHash = hashFirstOrder.get(metrics.sha256);
        if (firstHash != null) {
          duplicateHash = true;
          if (!duplicateUrlWithOrder) {
            duplicateUrlWithOrder = firstHash;
          }
        } else {
          hashFirstOrder.set(metrics.sha256, row.order);
        }
      }

      const issues = evaluateSegmentIssues({
        row,
        metrics,
        duplicateUrl,
        duplicateHash,
        duplicateUrlWithOrder,
      });

      if (duplicateHash && duplicateUrlWithOrder != null && row.order !== duplicateUrlWithOrder) {
        const other = transitions.find((t) => t.order === duplicateUrlWithOrder);
        if (other && other.endImageId !== row.endImageId) {
          issues.push(`possible_wrong_segment_reuse:matches_order_${duplicateUrlWithOrder}`);
        }
      }

      rows.push({
        transitionId: row.id,
        order: row.order,
        status: row.status,
        startImageId: row.startImageId,
        endImageId: row.endImageId,
        providerJobId: row.providerJobId,
        outputVideoUrl: row.outputVideoUrl,
        metrics,
        duplicateUrl,
        duplicateHash,
        issues,
      });
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    await prisma.$disconnect();
  }

  const report = buildSegmentIntegrityReport({
    projectId,
    segments: rows,
    chain,
  });

  if (json) {
    console.log(
      JSON.stringify(
        {
          ...report,
          project: {
            status: project.status,
            projectType: project.projectType,
            stylePreset: project.stylePreset,
          },
        },
        null,
        2
      )
    );
  } else {
    printHumanReport(report, {
      status: project.status,
      projectType: project.projectType,
      stylePreset: project.stylePreset,
    });
  }

  process.exit(report.verdict === "SEGMENTS_OK" ? 0 : 1);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  void prisma.$disconnect();
  process.exit(1);
});
