/** Keyboard actions for HomeCheff preview modal — unit-testable. */

export type PreviewModalKeyAction = "close" | "prev" | "next";

export function resolvePreviewModalKeyAction(
  key: string,
  opts: { hasPrev?: boolean; hasNext?: boolean }
): PreviewModalKeyAction | null {
  if (key === "Escape") {
    return "close";
  }
  if (key === "ArrowLeft" && opts.hasPrev) {
    return "prev";
  }
  if (key === "ArrowRight" && opts.hasNext) {
    return "next";
  }
  return null;
}
