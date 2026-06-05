"use client";

import { useMemo, useState } from "react";
import {
  buildStudioTextBeats,
  studioSceneDetailToBeatSource,
} from "@/lib/build-studio-text-beats";
import { syncLegacyFieldFromBeats } from "@/lib/story-text-beats";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
};

export function StudioTextBeatsPreviewPanel({ storyboard }: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(true);

  const preview = useMemo(() => {
    const scenes = [...storyboard.scenes].sort((a, b) => a.order - b.order);
    const sceneCount = scenes.length;
    const aiDirectorNotes = storyboard.aiDirectorPrompt?.trim() ?? "";

    return scenes.map((scene, sceneIndex) => {
      const built = buildStudioTextBeats({
        scene: studioSceneDetailToBeatSource(scene),
        sceneIndex,
        sceneCount,
        storyboardTitle: storyboard.title,
        storyboardDescription: storyboard.description,
        aiDirectorNotes,
      });
      const headline =
        syncLegacyFieldFromBeats(built.headlineBeats) ||
        syncLegacyFieldFromBeats(built.titleBeats);
      const subheadline = syncLegacyFieldFromBeats(built.subtitleBeats);
      return {
        order: scene.order,
        title: scene.title.trim() || t("studio.textBeatsPreview.untitledScene"),
        headline,
        subheadline,
        heroText: built.heroText,
        finaleText: built.heroFinaleText,
        beatLines: built.beatLines,
        isLast: sceneIndex === sceneCount - 1,
      };
    });
  }, [storyboard, t]);

  const hasContent = preview.some(
    (row) => row.headline || row.subheadline || row.heroText || row.finaleText
  );

  return (
    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-amber-950">
            {t("studio.textBeatsPreview.title")}
          </p>
          <p className="mt-0.5 text-xs text-amber-900/80">{t("studio.textBeatsPreview.hint")}</p>
        </div>
        <span className="text-xs text-zinc-500">{open ? "▲" : "▼"}</span>
      </button>
      {open ?
        <div className="space-y-3 border-t border-amber-200/60 px-4 py-3">
          {!hasContent ?
            <p className="text-sm text-zinc-600">{t("studio.textBeatsPreview.empty")}</p>
          : preview.map((row) => (
              <div key={row.order} className="rounded-xl bg-white/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("studio.textBeatsPreview.sceneLabel", { n: String(row.order + 1) })}
                  {row.title ? ` — ${row.title}` : ""}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                  {row.headline ?
                    <li>
                      → {t("studio.textBeatsPreview.headline")}:{" "}
                      <span className="font-medium">{row.headline}</span>
                    </li>
                  : null}
                  {row.subheadline ?
                    <li>
                      → {t("studio.textBeatsPreview.subheadline")}:{" "}
                      <span className="font-medium">{row.subheadline}</span>
                    </li>
                  : null}
                  {row.heroText && !row.isLast ?
                    <li>
                      → {t("studio.textBeatsPreview.hero")}:{" "}
                      <span className="font-medium">{row.heroText}</span>
                    </li>
                  : null}
                  {row.isLast && row.finaleText ?
                    <li>
                      → {t("studio.textBeatsPreview.finale")}:{" "}
                      <span className="font-medium">{row.finaleText}</span>
                    </li>
                  : null}
                  {row.beatLines.length > 0 ?
                    <li className="text-xs text-zinc-600">
                      {t("studio.textBeatsPreview.beatLines")}: {row.beatLines.join(" · ")}
                    </li>
                  : null}
                </ul>
              </div>
            ))
          }
        </div>
      : null}
    </div>
  );
}
