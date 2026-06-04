/**
 * Version labels for dropdowns, history, and deep links.
 */

export function formatMotionVersionLabel(
  versionNumber: number,
  versionNote: string | null | undefined,
  locale: "en" | "nl" = "nl"
): string {
  const note = versionNote?.trim();
  if (note) {
    return `v${versionNumber} — ${note}`;
  }
  return locale === "en" ? `Version ${versionNumber}` : `Versie ${versionNumber}`;
}

/** Parse ?ver=v3, ver=3, or a full selectionKey from the URL. */
export function parseVersionQueryParam(ver: string | null | undefined): {
  versionNumber: number | null;
  selectionKey: string | null;
} {
  const trimmed = ver?.trim();
  if (!trimmed) {
    return { versionNumber: null, selectionKey: null };
  }
  if (trimmed.includes(":")) {
    return { versionNumber: null, selectionKey: trimmed };
  }
  const match = /^v?(\d+)$/i.exec(trimmed);
  if (match?.[1]) {
    const n = Number.parseInt(match[1], 10);
    return Number.isFinite(n) && n > 0
      ? { versionNumber: n, selectionKey: null }
      : { versionNumber: null, selectionKey: null };
  }
  return { versionNumber: null, selectionKey: trimmed };
}

export function buildVersionQueryParam(versionNumber: number): string {
  return `v${versionNumber}`;
}
