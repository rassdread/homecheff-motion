import {
  cleanFinalBlobPathname,
  finalBlobPathname,
} from "@/lib/final-video-storage";
import { prisma } from "@/lib/prisma";
import {
  isBlobTokenConfigured,
  resolvePublicBlobUrlByPathname,
} from "@/lib/vercel-blob-config";
import { probeProviderBlobMetadata } from "@/server/instant-premium/canonical-provider-video";
import { probeVideoDurationSeconds } from "@/server/instant-premium/poster-motion/probe-media-dimensions";

const MIN_READABLE_BYTES = 1;

export type FinalArtifactProbe = {
  kind: "final" | "clean";
  pathname: string;
  url: string | null;
  blobExists: boolean;
  contentLength: number | null;
  mimeType: string | null;
  durationSec: number | null;
  readable: boolean;
  probeNotes: string[];
};

export type SyncFinalVideoArtifactsResult =
  | {
      ok: true;
      action: "synced" | "already_synced";
      projectId: string;
      exportId: string;
      finalUrl: string;
      cleanUrl: string;
      rebuildVersion: number;
      probes: { final: FinalArtifactProbe; clean: FinalArtifactProbe };
    }
  | {
      ok: false;
      action: "missing_artifacts" | "not_readable" | "project_not_found" | "blob_token_missing";
      projectId: string;
      message: string;
      probes?: { final: FinalArtifactProbe; clean: FinalArtifactProbe };
    };

export function resolveFinalArtifactPathnames(
  projectId: string,
  rebuildVersion: number
): { finalPathname: string; cleanPathname: string } {
  return {
    finalPathname: finalBlobPathname(projectId, rebuildVersion),
    cleanPathname: cleanFinalBlobPathname(projectId, rebuildVersion),
  };
}

function isAcceptableVideoMime(mimeType: string | null): boolean {
  if (!mimeType) {
    return true;
  }
  const lower = mimeType.toLowerCase();
  return (
    lower.startsWith("video/") ||
    lower === "application/octet-stream" ||
    lower === "binary/octet-stream"
  );
}

export function isReadableFinalArtifactProbe(probe: FinalArtifactProbe): boolean {
  if (!probe.blobExists || !probe.url) {
    return false;
  }
  if ((probe.contentLength ?? 0) < MIN_READABLE_BYTES) {
    return false;
  }
  if (!isAcceptableVideoMime(probe.mimeType)) {
    return false;
  }
  return true;
}

export async function probeFinalArtifactAtPathname(params: {
  kind: "final" | "clean";
  pathname: string;
  tryFfprobeDuration?: boolean;
}): Promise<FinalArtifactProbe> {
  const notes: string[] = [];
  const url = await resolvePublicBlobUrlByPathname(params.pathname);
  if (!url) {
    return {
      kind: params.kind,
      pathname: params.pathname,
      url: null,
      blobExists: false,
      contentLength: null,
      mimeType: null,
      durationSec: null,
      readable: false,
      probeNotes: ["blob_head_missing"],
    };
  }

  const head = await probeProviderBlobMetadata(url);
  if (!head.blobExists) {
    return {
      kind: params.kind,
      pathname: params.pathname,
      url,
      blobExists: false,
      contentLength: head.contentLength,
      mimeType: head.mimeType,
      durationSec: null,
      readable: false,
      probeNotes: ["http_head_failed"],
    };
  }

  let durationSec: number | null = null;
  if (params.tryFfprobeDuration !== false) {
    try {
      durationSec = await probeVideoDurationSeconds(url);
      if (durationSec != null) {
        notes.push(`ffprobe_duration=${durationSec.toFixed(3)}`);
      } else {
        notes.push("ffprobe_no_duration");
      }
    } catch {
      notes.push("ffprobe_skipped");
    }
  }

  const readable =
    (head.contentLength ?? 0) >= MIN_READABLE_BYTES && isAcceptableVideoMime(head.mimeType);

  return {
    kind: params.kind,
    pathname: params.pathname,
    url,
    blobExists: true,
    contentLength: head.contentLength,
    mimeType: head.mimeType,
    durationSec,
    readable,
    probeNotes: notes,
  };
}

async function probeArtifactPair(
  projectId: string,
  rebuildVersion: number
): Promise<{ final: FinalArtifactProbe; clean: FinalArtifactProbe }> {
  const paths = resolveFinalArtifactPathnames(projectId, rebuildVersion);
  const [final, clean] = await Promise.all([
    probeFinalArtifactAtPathname({ kind: "final", pathname: paths.finalPathname }),
    probeFinalArtifactAtPathname({ kind: "clean", pathname: paths.cleanPathname }),
  ]);
  return { final, clean };
}

function urlsAlreadySynced(params: {
  exportStatus: string | null | undefined;
  exportUrl: string | null | undefined;
  projectStatus: string | null | undefined;
  cleanUrl: string | null | undefined;
  finalUrl: string;
  cleanTarget: string;
}): boolean {
  if (params.exportStatus !== "completed" || params.projectStatus !== "completed") {
    return false;
  }
  const exportUrl = params.exportUrl?.trim();
  const clean = params.cleanUrl?.trim();
  return exportUrl === params.finalUrl && clean === params.cleanTarget;
}

/**
 * Align AnimationProject / AnimationExport with existing final + clean blobs.
 * No Vidu, merge, or upload — DB sync only when artifacts are readable on Blob.
 */
export async function syncFinalVideoArtifactsFromBlob(
  projectId: string
): Promise<SyncFinalVideoArtifactsResult> {
  if (!isBlobTokenConfigured()) {
    return {
      ok: false,
      action: "blob_token_missing",
      projectId,
      message: "BLOB_READ_WRITE_TOKEN is not configured.",
    };
  }

  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    include: { exports: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!project) {
    return {
      ok: false,
      action: "project_not_found",
      projectId,
      message: "Animation project not found.",
    };
  }

  const rebuildVersion = Math.max(0, project.instantFinalRebuildCount ?? 0);
  let probes = await probeArtifactPair(projectId, rebuildVersion);

  if (
    rebuildVersion > 0 &&
    (!isReadableFinalArtifactProbe(probes.final) ||
      !isReadableFinalArtifactProbe(probes.clean))
  ) {
    const baseProbes = await probeArtifactPair(projectId, 0);
    if (
      isReadableFinalArtifactProbe(baseProbes.final) &&
      isReadableFinalArtifactProbe(baseProbes.clean)
    ) {
      probes = baseProbes;
    }
  }

  if (
    !isReadableFinalArtifactProbe(probes.final) ||
    !isReadableFinalArtifactProbe(probes.clean)
  ) {
    return {
      ok: false,
      action: !probes.final.blobExists || !probes.clean.blobExists ? "missing_artifacts" : "not_readable",
      projectId,
      message: "Final and/or clean artifact missing or not readable on Blob.",
      probes,
    };
  }

  const finalUrl = probes.final.url!.trim();
  const cleanUrl = probes.clean.url!.trim();
  const exportRow = project.exports[0];

  if (
    exportRow &&
    urlsAlreadySynced({
      exportStatus: exportRow.status,
      exportUrl: exportRow.outputVideoUrl,
      projectStatus: project.status,
      cleanUrl: project.instantCleanFinalVideoUrl,
      finalUrl,
      cleanTarget: cleanUrl,
    })
  ) {
    return {
      ok: true,
      action: "already_synced",
      projectId,
      exportId: exportRow.id,
      finalUrl,
      cleanUrl,
      rebuildVersion,
      probes,
    };
  }

  const exportId =
    exportRow?.id ??
    (
      await prisma.animationExport.create({
        data: {
          projectId,
          status: "completed",
          progress: 100,
          provider: "sync-final-artifacts",
        },
      })
    ).id;

  await prisma.animationExport.update({
    where: { id: exportId },
    data: {
      status: "completed",
      progress: 100,
      outputVideoUrl: finalUrl,
      errorMessage: null,
    },
  });

  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      status: "completed",
      instantCleanFinalVideoUrl: cleanUrl,
      failureReason: null,
      lastOverlayError: null,
      instantWorkerJobStatus: "completed",
      instantFinalRebuildStatus: null,
    },
  });

  return {
    ok: true,
    action: "synced",
    projectId,
    exportId,
    finalUrl,
    cleanUrl,
    rebuildVersion,
    probes,
  };
}
