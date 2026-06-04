"use client";

import Image from "next/image";
import { buildSceneImageHistoryEntries } from "@/lib/studio-scene-image-history";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

type StudioSceneImageHistoryPanelProps = {
  images: StudioSceneImageListItem[];
  selectedImageId: string | null;
  canModify?: boolean;
  onSelectImage?: (imageId: string) => void;
  onViewPrompt?: (image: StudioSceneImageListItem) => void;
  onViewCorrections?: (imageId: string) => void;
};

export function StudioSceneImageHistoryPanel({
  images,
  selectedImageId,
  canModify,
  onSelectImage,
  onViewPrompt,
  onViewCorrections,
}: StudioSceneImageHistoryPanelProps) {
  const t = useActiveTranslator();
  const history = buildSceneImageHistoryEntries({
    images,
    selectedImageId,
  });

  if (history.length === 0) {
    return <p className="text-sm text-zinc-500">{t("studio.improve.historyEmpty")}</p>;
  }

  return (
    <ul className="space-y-3">
      {[...history].reverse().map((entry) => {
        const img = images.find((i) => i.id === entry.imageId);
        if (!img || entry.status !== "completed") {
          return null;
        }
        return (
          <li
            key={entry.imageId}
            className={`flex gap-3 rounded-xl border p-3 ${
              entry.isSelected ? "border-[#006D52] bg-[#006D52]/5" : "border-zinc-200"
            }`}
          >
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
              {entry.thumbnailUrl ? (
                <Image
                  src={entry.thumbnailUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900">
                  {t("studio.improve.historyGen", {
                    version: String(entry.generationVersion),
                  })}
                </span>
                {entry.isRecommended ? (
                  <span className="rounded-full bg-[#0067B1]/10 px-2 py-0.5 text-xs font-semibold text-[#0067B1]">
                    {t("studio.improve.recommended")}
                  </span>
                ) : null}
                {entry.isSelected ? (
                  <span className="rounded-full bg-[#006D52]/10 px-2 py-0.5 text-xs font-semibold text-[#006D52]">
                    {t("studio.improve.selected")}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                {t("studio.improve.historyScores", {
                  consistency: String(entry.consistencyScore ?? "—"),
                  vision: String(entry.visionScore ?? "—"),
                  combined: String(entry.combinedScore ?? "—"),
                })}
              </p>
              {entry.overallImprovementScore !== null ? (
                <p className="text-xs font-semibold text-emerald-700">
                  {t("studio.improve.historyOverallDelta", {
                    delta: `${entry.overallImprovementScore > 0 ? "+" : ""}${entry.overallImprovementScore}`,
                  })}
                </p>
              ) : null}
              <p className="text-xs text-zinc-500">
                {new Date(entry.createdAt).toLocaleString()}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {canModify && onSelectImage ? (
                  <button
                    type="button"
                    onClick={() => onSelectImage(entry.imageId)}
                    className="text-xs font-semibold text-[#006D52] hover:underline"
                  >
                    {t("studio.improve.historySelect")}
                  </button>
                ) : null}
                {onViewPrompt ? (
                  <button
                    type="button"
                    onClick={() => onViewPrompt(img)}
                    className="text-xs font-semibold text-zinc-600 hover:underline"
                  >
                    {t("studio.improve.historyViewPrompt")}
                  </button>
                ) : null}
                {onViewCorrections && img.correctionRecommendations.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onViewCorrections(entry.imageId)}
                    className="text-xs font-semibold text-zinc-600 hover:underline"
                  >
                    {t("studio.improve.historyViewCorrections")}
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
