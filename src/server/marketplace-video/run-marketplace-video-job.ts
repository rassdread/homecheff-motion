import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { uploadPublicBlob } from "../../lib/vercel-blob-config";
import {
  MARKETPLACE_VIDEO_NAMESPACE,
  isMarketplaceJobId,
  processMarketplaceVideoFile,
  type MarketplaceJobResult,
  type MarketplaceProbe,
  type MarketplaceVideoFailureCode,
} from "./marketplace-video-job";

const SOURCE_BYTE_CAP = 80 * 1024 * 1024;

export type MarketplaceJobStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export type MarketplaceCallbackBody = {
  jobId: string;
  namespace: typeof MARKETPLACE_VIDEO_NAMESPACE;
  status: MarketplaceJobStatus;
  failureCode: MarketplaceVideoFailureCode | null;
  canonicalUrl: string | null;
  posterUrl: string | null;
  probe: MarketplaceProbe | null;
  decision: "passthrough" | "transcode" | null;
};

async function downloadSource(url: string, destination: string): Promise<{ ok: true; bytes: number } | { ok: false; code: MarketplaceVideoFailureCode }> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return { ok: false, code: "SOURCE_MISSING" };
  }
  if (!response.ok || !response.body) return { ok: false, code: "SOURCE_MISSING" };
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > SOURCE_BYTE_CAP) return { ok: false, code: "OVERSIZE" };
  let received = 0;
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > SOURCE_BYTE_CAP) {
        controller.error(new Error("oversize"));
        return;
      }
      controller.enqueue(chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(response.body.pipeThrough(counter)), createWriteStream(destination));
  } catch {
    return { ok: false, code: received > SOURCE_BYTE_CAP ? "OVERSIZE" : "SOURCE_MISSING" };
  }
  const bytes = (await stat(destination)).size;
  if (bytes <= 0) return { ok: false, code: "SOURCE_MISSING" };
  return { ok: true, bytes };
}

export async function executeMarketplaceVideoJob(input: {
  jobId: string;
  sourceUrl: string;
  maxDurationSeconds: number;
}): Promise<MarketplaceJobResult & { canonicalUrl?: string; posterUrl?: string }> {
  if (!isMarketplaceJobId(input.jobId)) {
    return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "MALFORMED" };
  }
  const workDir = await mkdtemp(path.join(tmpdir(), "hc-marketplace-video-"));
  const sourcePath = path.join(workDir, "source.bin");
  try {
    const downloaded = await downloadSource(input.sourceUrl, sourcePath);
    if (!downloaded.ok) return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: downloaded.code };
    const processed = await processMarketplaceVideoFile({
      sourcePath,
      workDir,
      maxDurationSeconds: input.maxDurationSeconds,
      sourceBytes: downloaded.bytes,
    });
    if (!processed.ok) return processed;
    try {
      const video = await uploadPublicBlob({
        pathname: `marketplace-video/${input.jobId}/canonical.mp4`,
        body: await readFile(processed.outputPath),
        contentType: "video/mp4",
        allowOverwrite: true,
        context: {
          uploadTarget: "marketplace-video",
          provider: "vercel-blob",
          requestId: input.jobId,
        },
      });
      const poster = await uploadPublicBlob({
        pathname: `marketplace-video/${input.jobId}/poster.jpg`,
        body: await readFile(processed.posterPath),
        contentType: "image/jpeg",
        allowOverwrite: true,
        context: {
          uploadTarget: "marketplace-poster",
          provider: "vercel-blob",
          requestId: input.jobId,
        },
      });
      return { ...processed, canonicalUrl: video.url, posterUrl: poster.url };
    } catch {
      return { ok: false, namespace: MARKETPLACE_VIDEO_NAMESPACE, code: "BLOB_WRITE" };
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function notifyMarketplaceCallback(callbackUrl: string, secret: string, body: MarketplaceCallbackBody): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${secret}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (response.ok) return true;
    } catch {
      // Retry. The marketplace job stays PROCESSING until the callback lands or it expires.
    }
  }
  return false;
}

export function callbackFromResult(jobId: string, result: MarketplaceJobResult & { canonicalUrl?: string; posterUrl?: string }): MarketplaceCallbackBody {
  if (!result.ok) {
    return {
      jobId,
      namespace: MARKETPLACE_VIDEO_NAMESPACE,
      status: "FAILED",
      failureCode: result.code,
      canonicalUrl: null,
      posterUrl: null,
      probe: null,
      decision: null,
    };
  }
  return {
    jobId,
    namespace: MARKETPLACE_VIDEO_NAMESPACE,
    status: "READY",
    failureCode: null,
    canonicalUrl: result.canonicalUrl ?? null,
    posterUrl: result.posterUrl ?? null,
    probe: result.probe,
    decision: result.decision,
  };
}
