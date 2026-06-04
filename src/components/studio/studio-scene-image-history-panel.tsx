"use client";

import { buildConsistencyHistoryFromImages } from "@/lib/studio-storyboard-correction-summary";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

type StudioSceneImageHistoryPanelProps = {
  images: StudioSceneImageListItem[];
  selectedImageId: string | null;
  onSelectImage?: (imageId: string) => void;
};

export function StudioSceneImageHistoryPanel({
  images,
  selectedImageId,
  onSelectImage,
}: StudioSceneImageHistoryPanelProps) {
  const t = useActiveTranslator();
  const history = buildConsistencyHistoryFromImages(
    images.map((img) => ({
      id: img.id,
      generationVersion: img.generationVersion,
      consistencyScore: img.consistencyScore,
      consistencyStatus: img.consistencyStatus,
      improvementScore: img.improvementScore,
      correctionRecommendations: img.correctionRecommendations,
      createdAt: img.createdAt,
    }))
  );

  if (history.length === 0) {
    return <p className="text-sm text-zinc-500">{t("studio.correction.historyEmpty")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="py-2 pr-3 font-semibold">{t("studio.correction.history.generation")}</th>
            <th className="py-2 pr-3 font-semibold">{t("studio.correction.history.consistency")}</th>
            <th className="py-2 pr-3 font-semibold">{t("studio.correction.history.promptVersion")}</th>
            <th className="py-2 pr-3 font-semibold">{t("studio.correction.history.corrections")}</th>
            <th className="py-2 font-semibold">{t("studio.correction.history.date")}</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => {
            const img = images.find((i) => i.id === entry.imageId);
            const isSelected = entry.imageId === selectedImageId;
            return (
              <tr
                key={entry.imageId}
                className={`border-b border-zinc-100 ${isSelected ? "bg-[#006D52]/5" : ""}`}
              >
                <td className="py-2 pr-3 font-medium text-zinc-800">
                  {onSelectImage ? (
                    <button
                      type="button"
                      className="text-left text-[#006D52] hover:underline"
                      onClick={() => onSelectImage(entry.imageId)}
                    >
                      {t("studio.correction.history.genLabel", {
                        version: String(entry.generationVersion),
                      })}
                    </button>
                  ) : (
                    t("studio.correction.history.genLabel", {
                      version: String(entry.generationVersion),
                    })
                  )}
                </td>
                <td className="py-2 pr-3">
                  {entry.consistencyScore ?? "—"}
                  {entry.improvementScore !== null ? (
                    <span className="ml-1 text-emerald-700">
                      ({entry.improvementScore > 0 ? "+" : ""}
                      {entry.improvementScore})
                    </span>
                  ) : null}
                </td>
                <td className="py-2 pr-3">v{img?.promptVersion ?? "—"}</td>
                <td className="py-2 pr-3">{entry.correctionCount}</td>
                <td className="py-2 text-zinc-600">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
