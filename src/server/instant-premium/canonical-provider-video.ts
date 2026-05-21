/**
 * Canonical provider (Vidu) MP4 source-of-truth for final assembly.
 * Only `transition.outputVideoUrl` when status === "completed" is authoritative.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { hashFileSha256, hashRemoteVideoUrl } from "@/lib/file-content-hash";
import { resolveSegmentDownloadTimeoutMs } from "@/lib/export-timeout";
import { probeVideoSegment } from "@/server/instant-premium/segment-transition";

export const DUPLICATE_PROVIDER_VIDEO_SOURCE = "DUPLICATE_PROVIDER_VIDEO_SOURCE";
export const CANONICAL_PROVIDER_HASH_MISMATCH = "CANONICAL_PROVIDER_HASH_MISMATCH";
export const CANONICAL_PROVIDER_BLOB_MISSING = "CANONICAL_PROVIDER_BLOB_MISSING";
export const SEGMENT_VIDEO_MISSING = "SEGMENT_VIDEO_MISSING";
export const INVALID_FINAL_ASSEMBLY_SOURCE = "INVALID_FINAL_ASSEMBLY_SOURCE";

export class ProviderVideoPipelineError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ProviderVideoPipelineError";
    this.code = code;
  }
}

export class DuplicateProviderVideoSourceError extends ProviderVideoPipelineError {
  constructor(message: string) {
    super(DUPLICATE_PROVIDER_VIDEO_SOURCE, message);
    this.name = "DuplicateProviderVideoSourceError";
  }
}

function isAllowedCanonicalProviderUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  const pathOnly = (trimmed.split("?")[0] ?? trimmed).toLowerCase();
  if (/\.(jpe?g|png|webp|gif|bmp|avif|heic)$/.test(pathOnly)) {
    return false;
  }
  if (trimmed.includes("/preview") && !pathOnly.endsWith(".mp4")) {
    return false;
  }
  return (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  );
}

export type CanonicalProviderTransitionInput = {
  transitionId: string;
  segmentIndex: number;
  transitionOrder: number;
  status: string;
  provider: string | null;
  providerJobId: string | null;
  outputVideoUrl: string | null;
  updatedAt?: Date | string | null;
};

export type CanonicalProviderSegment = {
  transitionId: string;
  segmentIndex: number;
  transitionOrder: number;
  canonicalOutputVideoUrl: string;
  canonicalProviderVideoPath: string;
  downloadedHash: string;
  provider: string | null;
  providerJobId: string | null;
};

export type ProviderVideoStorageLogRow = {
  transitionId: string;
  providerJobId: string | null;
  provider: string | null;
  originalProviderUrl: string;
  storedBlobUrl: string;
  outputVideoUrl: string;
  uploadCompletedAt: string | null;
  blobExists: boolean;
  contentLength: number | null;
  mimeType: string | null;
  sha256: string | null;
  blobMatchesOutputVideoUrl: boolean;
};

export function isVercelBlobStorageUrl(url: string): boolean {
  return url.includes(".public.blob.vercel-storage.com/");
}

export function resolveCanonicalOutputVideoUrl(transition: {
  status: string;
  outputVideoUrl: string | null;
}): string {
  if (transition.status !== "completed") {
    throw new ProviderVideoPipelineError(
      SEGMENT_VIDEO_MISSING,
      `Transition is not completed (status=${transition.status}); canonical outputVideoUrl unavailable.`
    );
  }
  const url = transition.outputVideoUrl?.trim() ?? "";
  if (!url) {
    throw new ProviderVideoPipelineError(
      SEGMENT_VIDEO_MISSING,
      "Missing canonical transition.outputVideoUrl for completed transition."
    );
  }
  if (!isAllowedCanonicalProviderUrl(url)) {
    throw new ProviderVideoPipelineError(
      INVALID_FINAL_ASSEMBLY_SOURCE,
      `Canonical outputVideoUrl is not an allowed provider video: ${url}`
    );
  }
  return url;
}

export function buildCanonicalProviderVideoPath(
  workDir: string,
  transitionId: string,
  segmentIndex: number
): string {
  const safeId = transitionId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  return path.join(workDir, `canonical-${segmentIndex}-${safeId}.mp4`);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function absolutePublicPath(...segments: string[]): string {
  return path.join(process.cwd(), "public", ...segments);
}

export async function probeProviderBlobMetadata(
  url: string
): Promise<{ blobExists: boolean; contentLength: number | null; mimeType: string | null }> {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    const relative = trimmed.replace(/^\/+/, "");
    const abs = absolutePublicPath(...relative.split("/"));
    try {
      const stat = await fs.stat(abs);
      return {
        blobExists: stat.isFile(),
        contentLength: stat.size,
        mimeType: "video/mp4",
      };
    } catch {
      return { blobExists: false, contentLength: null, mimeType: null };
    }
  }
  try {
    const head = await fetch(trimmed, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!head.ok) {
      return { blobExists: false, contentLength: null, mimeType: null };
    }
    const len = head.headers.get("content-length");
    return {
      blobExists: true,
      contentLength: len ? Number(len) : null,
      mimeType: head.headers.get("content-type"),
    };
  } catch {
    return { blobExists: false, contentLength: null, mimeType: null };
  }
}

export async function buildProviderVideoStorageRows(
  transitions: CanonicalProviderTransitionInput[]
): Promise<ProviderVideoStorageLogRow[]> {
  const rows: ProviderVideoStorageLogRow[] = [];

  for (const transition of transitions) {
    const outputVideoUrl = transition.outputVideoUrl?.trim() ?? "";
    const storedBlobUrl = outputVideoUrl;
    const originalProviderUrl = outputVideoUrl;
    const uploadCompletedAt =
      transition.updatedAt instanceof Date
        ? transition.updatedAt.toISOString()
        : typeof transition.updatedAt === "string"
          ? transition.updatedAt
          : null;

    if (transition.status !== "completed" || !outputVideoUrl) {
      rows.push({
        transitionId: transition.transitionId,
        providerJobId: transition.providerJobId,
        provider: transition.provider,
        originalProviderUrl,
        storedBlobUrl,
        outputVideoUrl,
        uploadCompletedAt,
        blobExists: false,
        contentLength: null,
        mimeType: null,
        sha256: null,
        blobMatchesOutputVideoUrl: storedBlobUrl === outputVideoUrl,
      });
      continue;
    }

    const meta = await probeProviderBlobMetadata(outputVideoUrl);
    let sha256: string | null = null;
    if (meta.blobExists && outputVideoUrl.startsWith("http")) {
      sha256 = await hashRemoteVideoUrl(outputVideoUrl);
    }

    const row: ProviderVideoStorageLogRow = {
      transitionId: transition.transitionId,
      providerJobId: transition.providerJobId,
      provider: transition.provider,
      originalProviderUrl,
      storedBlobUrl,
      outputVideoUrl,
      uploadCompletedAt,
      blobExists: meta.blobExists,
      contentLength: meta.contentLength,
      mimeType: meta.mimeType,
      sha256,
      blobMatchesOutputVideoUrl: storedBlobUrl === outputVideoUrl,
    };
    rows.push(row);

  }

  return rows;
}

export async function logProviderVideoStorage(params: {
  projectId: string;
  transitions: CanonicalProviderTransitionInput[];
}): Promise<ProviderVideoStorageLogRow[]> {
  const rows = await buildProviderVideoStorageRows(params.transitions);

  console.info("[provider-video-storage]", {
    projectId: params.projectId,
    transitionCount: rows.length,
    transitions: rows,
  });

  for (const row of rows) {
    const transition = params.transitions.find((t) => t.transitionId === row.transitionId);
    if (
      transition?.status === "completed" &&
      row.outputVideoUrl &&
      !row.blobExists
    ) {
      throw new ProviderVideoPipelineError(
        CANONICAL_PROVIDER_BLOB_MISSING,
        `[${params.projectId}] Canonical provider blob missing for transition ${row.transitionId} (${row.outputVideoUrl}).`
      );
    }
  }

  return rows;
}

export async function downloadCanonicalProviderVideo(params: {
  canonicalOutputVideoUrl: string;
  workDir: string;
  transitionId: string;
  segmentIndex: number;
  segmentCount?: number;
  projectId: string;
}): Promise<{ canonicalProviderVideoPath: string; downloadedHash: string }> {
  const url = params.canonicalOutputVideoUrl.trim();
  const dest = buildCanonicalProviderVideoPath(
    params.workDir,
    params.transitionId,
    params.segmentIndex
  );

  await fs.rm(dest, { force: true }).catch(() => undefined);

  if (url.startsWith("/")) {
    const relative = url.replace(/^\/+/, "");
    const abs = absolutePublicPath(...relative.split("/"));
    if (!(await pathExists(abs))) {
      throw new ProviderVideoPipelineError(
        SEGMENT_VIDEO_MISSING,
        `[${params.projectId}] Missing local canonical provider video: ${url}`
      );
    }
    await fs.copyFile(abs, dest);
  } else if (url.startsWith("http://") || url.startsWith("https://")) {
    const downloadTimeoutMs = resolveSegmentDownloadTimeoutMs(params.segmentCount ?? 3);
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(downloadTimeoutMs),
    });
    if (!response.ok) {
      throw new ProviderVideoPipelineError(
        SEGMENT_VIDEO_MISSING,
        `[${params.projectId}] Could not download canonical provider video (${response.status}): ${url}`
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length <= 0) {
      throw new ProviderVideoPipelineError(
        SEGMENT_VIDEO_MISSING,
        `[${params.projectId}] Empty canonical provider video: ${url}`
      );
    }
    await fs.writeFile(dest, buffer);
  } else {
    throw new ProviderVideoPipelineError(
      INVALID_FINAL_ASSEMBLY_SOURCE,
      `[${params.projectId}] Unsupported canonical provider video URL: ${url}`
    );
  }

  const probed = await probeVideoSegment(dest);
  if (!probed) {
    throw new ProviderVideoPipelineError(
      INVALID_FINAL_ASSEMBLY_SOURCE,
      `[${params.projectId}] Canonical download has no valid video stream (segment ${params.segmentIndex}).`
    );
  }

  const downloadedHash = await hashFileSha256(dest);
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const remoteHash = await hashRemoteVideoUrl(url);
    if (remoteHash && remoteHash !== downloadedHash) {
      throw new ProviderVideoPipelineError(
        CANONICAL_PROVIDER_HASH_MISMATCH,
        `[${params.projectId}] Downloaded hash mismatch for transition ${params.transitionId}: local ${downloadedHash.slice(0, 16)}… ≠ remote ${remoteHash.slice(0, 16)}…`
      );
    }
  }

  return { canonicalProviderVideoPath: dest, downloadedHash };
}

export function assertUniqueCanonicalProviderSources(params: {
  projectId: string;
  segments: CanonicalProviderSegment[];
}): void {
  const urlSeen = new Map<string, number>();
  const hashSeen = new Map<string, number>();
  const pathSeen = new Map<string, number>();

  for (const seg of params.segments) {
    const url = seg.canonicalOutputVideoUrl.trim();
    if (urlSeen.has(url)) {
      throw new DuplicateProviderVideoSourceError(
        `[${params.projectId}] DUPLICATE_PROVIDER_VIDEO_SOURCE: segments ${urlSeen.get(url)} and ${seg.segmentIndex} share canonical URL.`
      );
    }
    urlSeen.set(url, seg.segmentIndex);

    if (hashSeen.has(seg.downloadedHash)) {
      throw new DuplicateProviderVideoSourceError(
        `[${params.projectId}] DUPLICATE_PROVIDER_VIDEO_SOURCE: segments ${hashSeen.get(seg.downloadedHash)} and ${seg.segmentIndex} share download hash ${seg.downloadedHash.slice(0, 16)}….`
      );
    }
    hashSeen.set(seg.downloadedHash, seg.segmentIndex);

    const localPath = seg.canonicalProviderVideoPath;
    if (pathSeen.has(localPath)) {
      throw new DuplicateProviderVideoSourceError(
        `[${params.projectId}] DUPLICATE_PROVIDER_VIDEO_SOURCE: segments ${pathSeen.get(localPath)} and ${seg.segmentIndex} share local path.`
      );
    }
    pathSeen.set(localPath, seg.segmentIndex);
  }
}

export function assertConcatLockedToCanonicalProviderPaths(params: {
  projectId: string;
  canonicalProviderVideoPaths: string[];
  concatInputPaths: string[];
}): void {
  if (params.canonicalProviderVideoPaths.length !== params.concatInputPaths.length) {
    throw new ProviderVideoPipelineError(
      INVALID_FINAL_ASSEMBLY_SOURCE,
      `[${params.projectId}] Concat path count ${params.concatInputPaths.length} !== canonical provider count ${params.canonicalProviderVideoPaths.length}.`
    );
  }
  for (let i = 0; i < params.canonicalProviderVideoPaths.length; i += 1) {
    const canonical = params.canonicalProviderVideoPaths[i]!;
    const concat = params.concatInputPaths[i]!;
    if (canonical !== concat) {
      throw new ProviderVideoPipelineError(
        INVALID_FINAL_ASSEMBLY_SOURCE,
        `[${params.projectId}] Segment ${i} concat input must use canonical provider download; got non-canonical path.`
      );
    }
  }
}
