import { del } from "@vercel/blob";

export function looksLikeVercelBlobUrl(url: string): boolean {
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

/** Best-effort delete of a character reference image in Vercel Blob. */
export async function deleteStudioCharacterReferenceBlob(referenceImageUrl: string): Promise<void> {
  const url = referenceImageUrl.trim();
  if (!url || !looksLikeVercelBlobUrl(url)) {
    return;
  }
  try {
    await del(url);
  } catch {
    /* non-fatal */
  }
}
