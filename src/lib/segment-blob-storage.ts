import { resolvePublicBlobUrlByPathname, uploadPublicBlob } from "@/lib/vercel-blob-config";

export function segmentBlobPathname(projectId: string, segmentOrder: number): string {
  return `motion/segments/${projectId}/segment-${segmentOrder + 1}.mp4`;
}

export function isBlobSegmentUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim() ?? "";
  return trimmed.includes(".public.blob.vercel-storage.com/motion/segments/");
}

export async function urlIsReachableVideo(url: string): Promise<boolean> {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const response = await fetch(trimmed, {
      method: "HEAD",
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) {
      return true;
    }
    if (response.status === 405 || response.status === 403) {
      const ranged = await fetch(trimmed, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: AbortSignal.timeout(20_000),
      });
      return ranged.ok || ranged.status === 206;
    }
    return false;
  } catch {
    return false;
  }
}

export async function resolveStoredSegmentBlobUrl(
  projectId: string,
  segmentOrder: number
): Promise<string | null> {
  const pathname = segmentBlobPathname(projectId, segmentOrder);
  const url = await resolvePublicBlobUrlByPathname(pathname);
  if (!url) {
    return null;
  }
  if (!(await urlIsReachableVideo(url))) {
    return null;
  }
  return url;
}

export async function persistSegmentVideoToBlob(
  projectId: string,
  segmentOrder: number,
  sourceUrl: string
): Promise<string> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    throw new Error("Missing segment URL.");
  }
  if (isBlobSegmentUrl(trimmed)) {
    return trimmed;
  }

  const existingBlob = await resolveStoredSegmentBlobUrl(projectId, segmentOrder);
  if (existingBlob) {
    return existingBlob;
  }

  const response = await fetch(trimmed, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) {
    throw new Error(`Could not download segment URL ${trimmed} (HTTP ${response.status})`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  if (!body || body.length <= 0) {
    throw new Error(`Downloaded empty segment for ${trimmed}`);
  }
  const uploadTarget = segmentBlobPathname(projectId, segmentOrder);
  const { url } = await uploadPublicBlob({
    pathname: uploadTarget,
    body,
    contentType: "video/mp4",
    addRandomSuffix: false,
    allowOverwrite: true,
    context: {
      projectId,
      uploadTarget,
      provider: "segment-blob-storage",
    },
  });
  console.info("[segment-blob-storage]", {
    action: "blob_persisted",
    projectId,
    segmentOrder: segmentOrder + 1,
    storedBlobUrl: url,
    contentLength: body.length,
  });
  return url;
}
