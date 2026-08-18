"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

export const PHOTO_VIDEO_EDIT_PANELS = ["text", "motion", "order"] as const;
export type PhotoVideoEditPanel = (typeof PHOTO_VIDEO_EDIT_PANELS)[number];

const PANEL_LABEL: Record<PhotoVideoEditPanel, TranslationKey> = {
  text: "px4a.toolbar.text",
  motion: "px4a.toolbar.motion",
  order: "px4a.toolbar.order",
};

export function PhotoVideoEditToolbar({
  panel,
  onPanel,
}: {
  panel: PhotoVideoEditPanel;
  onPanel: (panel: PhotoVideoEditPanel) => void;
}) {
  const t = useActiveTranslator();
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
      data-testid="px4a-edit-toolbar"
      role="tablist"
      aria-label={t("px4a.inspector.thisPhoto")}
    >
      {PHOTO_VIDEO_EDIT_PANELS.map((id) => {
        const selected = id === panel;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            data-testid={`px4a-toolbar-${id}`}
            onClick={() => onPanel(id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${
              selected
                ? "border-[#006D52] bg-[#006D52] text-white"
                : "border-zinc-200 bg-white text-zinc-800"
            }`}
          >
            {t(PANEL_LABEL[id])}
          </button>
        );
      })}
    </div>
  );
}
