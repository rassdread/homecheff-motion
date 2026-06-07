/**
 * Browser object URLs for local audio file preview (clone sample, etc.).
 */

export function createAudioFileObjectUrl(file: File | null | undefined): string | null {
  if (!file) {
    return null;
  }
  return URL.createObjectURL(file);
}

export function revokeAudioFileObjectUrl(url: string | null | undefined): void {
  if (!url?.startsWith("blob:")) {
    return;
  }
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}
