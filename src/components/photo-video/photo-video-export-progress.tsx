"use client";

import type { PhotoVideoExportStage } from "@/lib/photo-video/export-settings";

const STAGES: PhotoVideoExportStage[] = ["prepare", "frames", "music", "mux", "attach"];

export function PhotoVideoExportProgress({
  stage,
  includeMusic,
  includeAttach,
  title,
  stageLabel,
  onCancel,
  cancelLabel,
}: {
  stage: PhotoVideoExportStage;
  includeMusic: boolean;
  includeAttach: boolean;
  title: string;
  stageLabel: (stage: PhotoVideoExportStage) => string;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const visible = STAGES.filter((item) => {
    if (item === "music") return includeMusic;
    if (item === "attach") return includeAttach;
    return true;
  });
  const currentIndex = Math.max(0, visible.indexOf(stage));
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      data-testid="px4a-export-progress"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <p className="text-base font-semibold text-zinc-900">{title}</p>
        <ol className="mt-4 space-y-2">
          {visible.map((item, index) => {
            const done = index < currentIndex;
            const current = index === currentIndex;
            return (
              <li
                key={item}
                data-testid={`px4a-export-stage-${item}`}
                className={`text-sm ${current ? "font-semibold text-[#006D52]" : done ? "text-zinc-700" : "text-zinc-400"}`}
              >
                {done ? "✓ " : current ? "• " : ""}
                {stageLabel(item)}
              </li>
            );
          })}
        </ol>
        {onCancel ? (
          <button
            type="button"
            data-testid="px4a-export-cancel"
            className="mt-5 min-h-11 w-full rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-800"
            onClick={onCancel}
          >
            {cancelLabel ?? "Cancel"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
