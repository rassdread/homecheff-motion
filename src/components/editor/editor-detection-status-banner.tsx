"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorDetectionMeta } from "@/types/homecheff-visual-editor";

type Props = {
  meta?: EditorDetectionMeta;
};

function statusTone(status: EditorDetectionMeta["status"]): {
  className: string;
  icon: string;
} {
  switch (status) {
    case "active":
      return {
        icon: "🟢",
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
      };
    case "fallback":
      return {
        icon: "🟡",
        className: "border-amber-200 bg-amber-50 text-amber-900",
      };
    case "unavailable":
    default:
      return {
        icon: "🔴",
        className: "border-rose-200 bg-rose-50 text-rose-900",
      };
  }
}

export function EditorDetectionStatusBanner({ meta }: Props) {
  const t = useActiveTranslator();

  if (!meta?.bootstrapAttempted) {
    return null;
  }

  const status = meta.status ?? (meta.onnxAvailable ? "active" : "fallback");
  const tone = statusTone(status);
  const backend = meta.backend ?? "fallback";

  const titleKey =
    status === "active" && backend === "video-worker"
      ? "editor.detectionStatus.workerActive"
      : status === "active"
        ? "editor.detectionStatus.localActive"
        : status === "fallback"
          ? "editor.detectionStatus.visionFallback"
          : "editor.detectionStatus.unavailable";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${tone.className}`}>
      <p className="font-medium">
        {tone.icon} {t(titleKey as never)}
      </p>
      <p className="mt-1 text-xs opacity-90">
        {t("editor.detectionStatus.detail" as never, {
          backend,
          source: meta.source,
          count: String(meta.count),
          detector: meta.detectorKind ?? "rtdetr",
          inferenceMs: meta.inferenceMs != null ? String(meta.inferenceMs) : "—",
        })}
      </p>
    </div>
  );
}
