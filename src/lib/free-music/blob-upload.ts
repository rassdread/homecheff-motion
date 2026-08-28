/**
 * Idempotent Free Music master/preview upload to Vercel Blob.
 * Pathnames: music/master/{trackId}.{ext} and music/preview/{trackId}.{ext}
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { head } from "@vercel/blob";
import { getBlobReadWriteToken, uploadPublicBlob } from "@/lib/vercel-blob-config";
import type { FreeMusicTrackRights } from "@/lib/free-music/types";

export type FreeMusicUploadResult = {
  trackId: string;
  action: "created" | "reused" | "failed";
  masterPathname?: string;
  previewPathname?: string;
  masterUrl?: string;
  previewUrl?: string;
  sourceHash?: string;
  storedHash?: string;
  error?: string;
};

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function findLocalMaster(trackId: string, mastersDir: string): string | null {
  if (!existsSync(mastersDir)) return null;
  const files = readdirSync(mastersDir);
  const hit = files.find((f) => f.startsWith(trackId + ".") && !f.endsWith(".json"));
  return hit ? join(mastersDir, hit) : null;
}

function mimeForExt(ext: string): string {
  const e = ext.replace(".", "").toLowerCase();
  if (e === "mp3") return "audio/mpeg";
  if (e === "ogg" || e === "oga") return "audio/ogg";
  if (e === "wav") return "audio/wav";
  if (e === "flac") return "audio/flac";
  return "application/octet-stream";
}

async function blobExists(pathname: string): Promise<boolean> {
  const token = getBlobReadWriteToken();
  if (!token) return false;
  try {
    await head(pathname, { token });
    return true;
  } catch {
    return false;
  }
}

export async function uploadFreeMusicTrackMaster(input: {
  track: FreeMusicTrackRights;
  mastersDir?: string;
}): Promise<FreeMusicUploadResult> {
  const mastersDir = input.mastersDir ?? join(process.cwd(), "tmp/free-music-masters");
  const track = input.track;
  const local = findLocalMaster(track.trackId, mastersDir);
  if (!local) {
    return { trackId: track.trackId, action: "failed", error: "LOCAL_MASTER_MISSING" };
  }
  if (!getBlobReadWriteToken()) {
    return { trackId: track.trackId, action: "failed", error: "BLOB_TOKEN_MISSING" };
  }

  const bytes = readFileSync(local);
  const sourceHash = sha256Hex(bytes);
  if (track.sourceFileHash && track.sourceFileHash !== sourceHash) {
    return { trackId: track.trackId, action: "failed", error: "HASH_MISMATCH", sourceHash };
  }

  const ext = extname(local).replace(".", "") || "mp3";
  const masterPathname = `music/master/${track.trackId}.${ext}`;
  const previewPathname = `music/preview/${track.trackId}.${ext}`;
  const contentType = mimeForExt(ext);

  const masterExists = await blobExists(masterPathname);
  const previewExists = await blobExists(previewPathname);

  let masterUrl: string | undefined;
  let previewUrl: string | undefined;
  let action: "created" | "reused" = "reused";

  const uploadCtx = {
    uploadTarget: "free-music-master",
    provider: "vercel-blob",
    requestId: `fm-${track.trackId}`,
  };

  if (masterExists) {
    const existing = await head(masterPathname, { token: getBlobReadWriteToken()! });
    masterUrl = existing.url;
  } else {
    const put = await uploadPublicBlob({
      pathname: masterPathname,
      body: bytes,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
      context: uploadCtx,
    });
    masterUrl = put.url;
    action = "created";
  }

  if (previewExists) {
    const existing = await head(previewPathname, { token: getBlobReadWriteToken()! });
    previewUrl = existing.url;
  } else {
    // Phase 3: preview = same bytes as master (no destructive transcode). Separate key for ACL evolution.
    const put = await uploadPublicBlob({
      pathname: previewPathname,
      body: bytes,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
      context: { ...uploadCtx, uploadTarget: "free-music-preview" },
    });
    previewUrl = put.url;
    action = "created";
  }

  return {
    trackId: track.trackId,
    action,
    masterPathname,
    previewPathname,
    masterUrl,
    previewUrl,
    sourceHash,
    storedHash: sourceHash,
  };
}

export async function uploadFreeMusicTracksIdempotent(
  tracks: FreeMusicTrackRights[]
): Promise<{ created: number; reused: number; failed: number; results: FreeMusicUploadResult[] }> {
  const results: FreeMusicUploadResult[] = [];
  for (const track of tracks) {
    results.push(await uploadFreeMusicTrackMaster({ track }));
  }
  return {
    created: results.filter((r) => r.action === "created").length,
    reused: results.filter((r) => r.action === "reused").length,
    failed: results.filter((r) => r.action === "failed").length,
    results,
  };
}
