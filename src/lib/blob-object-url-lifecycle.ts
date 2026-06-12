/** Safe create/revoke for local preview blob URLs (Safari memory). */

export function revokeObjectUrlSafe(url: string | undefined): void {
  if (!url?.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

export function createTrackedObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function replaceTrackedObjectUrl(previous: string | undefined, file: File): string {
  revokeObjectUrlSafe(previous);
  return createTrackedObjectUrl(file);
}
