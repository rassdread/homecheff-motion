"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  contextActionsForMode,
  type PhotoVideoContextAction,
  type PhotoVideoContextMode,
} from "@/lib/photo-video/context-actions";

function trackContextAnalytics(event: string) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("hc-photo-video-analytics", { detail: { event } }));
  } catch {
    /* optional telemetry */
  }
}

const ACTION_LABEL: Record<PhotoVideoContextAction, TranslationKey> = {
  text: "px4a.slice1b.context.text",
  motion: "px4a.slice1b.context.motion",
  order: "px4a.slice1b.context.order",
  trim: "px4a.slice1b.context.trim",
  fit: "px4a.slice1b.context.fit",
  audio: "px4a.slice1b.context.audio",
  style: "px4a.slice1b.context.style",
  position: "px4a.slice1b.context.position",
};

export function PhotoVideoContextBar({
  mode,
  action,
  onAction,
  onDeleteOverlay,
  showDelete,
}: {
  mode: PhotoVideoContextMode;
  action: PhotoVideoContextAction;
  onAction: (next: PhotoVideoContextAction) => void;
  onDeleteOverlay?: () => void;
  showDelete?: boolean;
}) {
  const t = useActiveTranslator();
  const actions = contextActionsForMode(mode);

  if (mode === "none") {
    return (
      <p className="text-sm text-zinc-600" data-testid="px4a-context-none-helper">
        {t("px4a.slice1b.context.noneHelper")}
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="px4a-context-bar"
      role="toolbar"
      aria-label={t("px4a.slice1b.context.toolbar")}
    >
      {actions.map((id) => {
        const selected = id === action;
        return (
          <button
            key={id}
            type="button"
            data-testid={`px4a-context-${id}`}
            aria-pressed={selected}
            onClick={() => {
              trackContextAnalytics(
                id === "trim"
                  ? "photo_video_trim_open"
                  : id === "audio"
                    ? "photo_video_audio_open"
                    : "photo_video_context_action"
              );
              onAction(id);
            }}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${
              selected
                ? "border-[#006D52] bg-[#006D52] text-white"
                : "border-zinc-200 bg-white text-zinc-800"
            }`}
          >
            {t(ACTION_LABEL[id])}
          </button>
        );
      })}
      {showDelete && onDeleteOverlay ?
        <button
          type="button"
          data-testid="px4a-context-delete"
          className="min-h-11 shrink-0 rounded-full border border-red-200 px-4 text-sm font-medium text-red-700"
          onClick={onDeleteOverlay}
        >
          {t("px4a.slice1b.context.delete")}
        </button>
      : null}
    </div>
  );
}
