import { del } from "@vercel/blob";
import {
  ExportBlobUploadError,
  classifyExportBlobFailure,
  exportBlobErrorMessage,
  logExportBlobUploadFailure,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import { finalBlobPathname } from "@/lib/final-video-storage";

const FINAL_BLOB_PROVIDER = "instant-final-merge";

function looksLikeVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return (
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.includes("blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export function scheduleDeleteOldFinalBlob(oldFinalUrl: string | null | undefined): void {
  const url = oldFinalUrl?.trim();
  if (!url || !looksLikeVercelBlobUrl(url)) {
    return;
  }
  void (async () => {
    try {
      await del(url);
      console.info("[final-video-blob-cleanup]", { oldUrl: url, deleted: true });
    } catch (error) {
      console.warn("[final-video-blob-cleanup]", {
        oldUrl: url,
        deleted: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();
}

export type ReplaceFinalVideoBlobParams = {
  projectId: string;
  oldFinalUrl: string | null | undefined;
  body: Buffer;
  rebuildCount: number;
};

/**
 * Upload new final blob, return public URL. Caller updates DB first, then calls
 * {@link scheduleDeleteOldFinalBlob} with the previous URL.
 */
export async function replaceFinalVideoBlobSafely(
  params: ReplaceFinalVideoBlobParams
): Promise<string> {
  const { projectId, body, rebuildCount } = params;
  if (!body?.length) {
    throw new Error("Merged video is empty before blob upload.");
  }
  const uploadTarget = finalBlobPathname(projectId, rebuildCount);
  console.info("[hc-instant-premium]", {
    projectId,
    phase: "finalBlobUploadStart",
    uploadTarget,
    provider: FINAL_BLOB_PROVIDER,
    bytes: body.length,
    rebuildCount,
  });
  try {
    const { url } = await uploadPublicBlob({
      pathname: uploadTarget,
      body,
      contentType: "video/mp4",
      addRandomSuffix: false,
      context: {
        projectId,
        uploadTarget,
        provider: FINAL_BLOB_PROVIDER,
      },
    });
    console.info("[hc-instant-premium]", {
      projectId,
      phase: "finalBlobUploadComplete",
      uploadTarget,
      provider: FINAL_BLOB_PROVIDER,
      rebuildCount,
    });
    return url;
  } catch (error) {
    const code = classifyExportBlobFailure(error);
    logExportBlobUploadFailure(error, {
      phase: "replace-final-video-blob",
      projectId,
      uploadTarget,
      provider: FINAL_BLOB_PROVIDER,
    });
    if (error instanceof ExportBlobUploadError) {
      throw error;
    }
    throw new ExportBlobUploadError({
      code,
      projectId,
      uploadTarget,
      provider: FINAL_BLOB_PROVIDER,
      cause: error,
    });
  }
}

export function logFinalVideoReplaced(data: {
  projectId: string;
  oldUrl: string | null;
  newUrl: string;
  rebuildCount: number;
  rebuiltAt: string;
}): void {
  console.info("[final-video-replaced]", data);
}

export { exportBlobErrorMessage, classifyExportBlobFailure };
