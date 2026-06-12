import { triggerBrowserDownload } from "@/lib/editor-export-download";
import { buildStoreZip } from "@/lib/store-zip";
import { fetchUrlAsBytes } from "@/lib/editor-generation-package-download";

export async function downloadMotionFrameUrlsZip(frameUrls: string[], label = "motion-frames"): Promise<void> {
  if (!frameUrls.length) {
    throw new Error("No frames to download");
  }
  const entries = await Promise.all(
    frameUrls.map(async (url, index) => {
      const ext = url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1]?.toLowerCase() ?? "png";
      return {
        path: `frames/frame-${String(index + 1).padStart(2, "0")}.${ext}`,
        data: await fetchUrlAsBytes(url),
      };
    })
  );
  const zipBytes = buildStoreZip(entries);
  const blob = new Blob([Uint8Array.from(zipBytes)], { type: "application/zip" });
  const objectUrl = URL.createObjectURL(blob);
  triggerBrowserDownload(objectUrl, `${label}.zip`);
  URL.revokeObjectURL(objectUrl);
}
