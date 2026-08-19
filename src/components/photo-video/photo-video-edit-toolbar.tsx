"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";

export const PHOTO_VIDEO_EDIT_PANELS = ["text", "motion", "order"] as const;
export const PHOTO_VIDEO_VIDEO_EDIT_PANELS = ["text", "clip", "order"] as const;
export type PhotoVideoEditPanel = (typeof PHOTO_VIDEO_EDIT_PANELS)[number] | "clip";

const PANEL_LABEL: Record<PhotoVideoEditPanel, TranslationKey> = {
  text: "px4a.toolbar.text",
  motion: "px4a.toolbar.motion",
  clip: "px4a.toolbar.clip",
  order: "px4a.toolbar.order",
};

export function PhotoVideoEditToolbar({
  panel,
  onPanel,
  videoSelected = false,
}: {
  panel: PhotoVideoEditPanel;
  onPanel: (panel: PhotoVideoEditPanel) => void;
  videoSelected?: boolean;
}) {
  const t = useActiveTranslator();
  const panels = videoSelected ? PHOTO_VIDEO_VIDEO_EDIT_PANELS : PHOTO_VIDEO_EDIT_PANELS;
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
      data-testid="px4a-edit-toolbar"
      role="tablist"
      aria-label={t("px4a.inspector.thisPhoto")}
    >
      {panels.map((id) => {
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
