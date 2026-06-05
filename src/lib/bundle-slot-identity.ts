import type { MotionVersionSlot } from "@/lib/motion-version-catalog";

/** Stable `render:{id}` / `lang:{id}` keys work on per-project and merged catalogs. */
export function parseSelectionKeyIds(selectionKey: string | null | undefined): {
  renderVersionId?: string;
  languageExportId?: string;
} {
  const trimmed = selectionKey?.trim() ?? "";
  const renderMatch = /^render:(.+)$/i.exec(trimmed);
  if (renderMatch?.[1]) {
    return { renderVersionId: renderMatch[1] };
  }
  const langMatch = /^lang:(.+)$/i.exec(trimmed);
  if (langMatch?.[1]) {
    return { languageExportId: langMatch[1] };
  }
  return {};
}

export function stableSelectionKeyFromSlot(slot: Pick<
  MotionVersionSlot,
  "selectionKey" | "kind" | "renderVersionId" | "languageExportId"
>): string {
  if (slot.renderVersionId?.trim()) {
    return `render:${slot.renderVersionId.trim()}`;
  }
  if (slot.languageExportId?.trim()) {
    return `lang:${slot.languageExportId.trim()}`;
  }
  return slot.selectionKey;
}

export function resolveSlotFromStableSelectionParam(
  catalog: { slotsByLanguage: Record<string, MotionVersionSlot[]> },
  sel: string
): MotionVersionSlot | null {
  const trimmed = sel.trim();
  if (!trimmed) {
    return null;
  }
  const renderMatch = /^render:(.+)$/i.exec(trimmed);
  if (renderMatch?.[1]) {
    const id = renderMatch[1];
    for (const slots of Object.values(catalog.slotsByLanguage)) {
      const hit = slots.find(
        (s) => s.renderVersionId === id || s.selectionKey === trimmed
      );
      if (hit) {
        return hit;
      }
    }
    return null;
  }
  const langMatch = /^lang:(.+)$/i.exec(trimmed);
  if (langMatch?.[1]) {
    const id = langMatch[1];
    for (const slots of Object.values(catalog.slotsByLanguage)) {
      const hit = slots.find(
        (s) => s.languageExportId === id || s.selectionKey === trimmed
      );
      if (hit) {
        return hit;
      }
    }
    return null;
  }
  for (const slots of Object.values(catalog.slotsByLanguage)) {
    const hit = slots.find((s) => s.selectionKey === trimmed);
    if (hit) {
      return hit;
    }
  }
  return null;
}
