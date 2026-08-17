export function createPhotoVideoObjectUrl(file: Blob): string {
  return URL.createObjectURL(file);
}

export function revokePhotoVideoObjectUrl(url: string | null | undefined): void {
  if (!url || !url.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

export function revokePhotoVideoObjectUrls(urls: readonly (string | null | undefined)[]): void {
  for (const url of urls) {
    revokePhotoVideoObjectUrl(url);
  }
}
