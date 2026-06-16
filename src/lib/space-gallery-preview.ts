/** Space Gallery preview index navigation — unit-testable. */

export function spaceGalleryPreviewIndexAfterPrev(index: number | null): number | null {
  if (index === null || index <= 0) {
    return index;
  }
  return index - 1;
}

export function spaceGalleryPreviewIndexAfterNext(
  index: number | null,
  total: number
): number | null {
  if (index === null || index >= total - 1) {
    return index;
  }
  return index + 1;
}

export function spaceGalleryPreviewHasPrev(index: number | null): boolean {
  return index !== null && index > 0;
}

export function spaceGalleryPreviewHasNext(index: number | null, total: number): boolean {
  return index !== null && index < total - 1;
}
