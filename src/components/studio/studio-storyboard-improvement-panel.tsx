"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { StoryboardImprovementSummary } from "@/types/studio-improvement";

type StudioStoryboardImprovementPanelProps = {
  summary: StoryboardImprovementSummary | null;
  loading?: boolean;
  autoSelectImprovedImage: boolean;
  onAutoSelectChange: (value: boolean) => void;
  onRegenerateSelected: (sceneIds: string[]) => void;
  bulkBusy?: boolean;
  bulkProgress?: string;
};

export function StudioStoryboardImprovementPanel({
  summary,
  loading,
  autoSelectImprovedImage,
  onAutoSelectChange,
  onRegenerateSelected,
  bulkBusy,
  bulkProgress,
}: StudioStoryboardImprovementPanelProps) {
  const t = useActiveTranslator();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const weakScenes = useMemo(
    () =>
      (summary?.scenes ?? []).filter((s) => s.regeneration.action !== "ok"),
    [summary]
  );

  if (loading) {
    return <p className="text-sm text-zinc-500">{t("studio.improve.loading")}</p>;
  }

  if (!summary) {
    return <p className="text-sm text-zinc-500">{t("studio.improve.storyboardHint")}</p>;
  }

  const toggle = (sceneId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-zinc-900">{t("studio.improve.panelTitle")}</h2>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={autoSelectImprovedImage}
          onChange={(e) => onAutoSelectChange(e.target.checked)}
        />
        {t("studio.improve.autoSelectLabel")}
      </label>
      {weakScenes.length === 0 ? (
        <p className="text-sm text-emerald-800">{t("studio.improve.allScenesOk")}</p>
      ) : (
        <ul className="space-y-2">
          {weakScenes.map((scene) => (
            <li
              key={scene.sceneId}
              className="flex items-start gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(scene.sceneId)}
                onChange={() => toggle(scene.sceneId)}
                className="mt-1"
              />
              <div>
                <p className="font-semibold text-zinc-900">
                  {t("studio.improve.sceneLine", {
                    order: String(scene.order + 1),
                    title: scene.sceneTitle || t("studio.correction.unnamedScene"),
                  })}
                </p>
                <p className="text-xs text-zinc-600">
                  Vision {scene.visionScore ?? "—"} · Consistency {scene.consistencyScore ?? "—"}
                </p>
                <p className="text-xs text-amber-900">{scene.regeneration.reason}</p>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  {t(`studio.improve.action.${scene.regeneration.action}`)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {bulkProgress ? (
        <p className="text-sm font-semibold text-[#006D52]">{bulkProgress}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={bulkBusy || selected.size === 0}
          onClick={() => onRegenerateSelected([...selected])}
          className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {bulkBusy ? t("studio.improve.bulkRunning") : t("studio.improve.bulkRegenerate")}
        </button>
        <button
          type="button"
          disabled={bulkBusy}
          onClick={() => setSelected(new Set())}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          {t("studio.improve.bulkCancel")}
        </button>
      </div>
    </div>
  );
}
