"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scenes: StudioSceneDetail[];
  activeSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onAddScene?: () => void;
  canModify: boolean;
};

export function StudioWorkspaceSceneSidebar({
  scenes,
  activeSceneId,
  onSelectScene,
  onAddScene,
  canModify,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          {t("studio.workspace.scenes")}
        </p>
        {canModify && onAddScene ?
          <button
            type="button"
            onClick={onAddScene}
            aria-label={t("studio.workspace.addScene")}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[#006D52] text-lg font-semibold leading-none text-white"
          >
            +
          </button>
        : null}
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {scenes.length === 0 ?
          <li className="px-2 py-6 text-center">
            <p className="text-sm font-medium text-zinc-800">{t("studio.workspace.emptyScenesTitle")}</p>
            <p className="mt-1 text-xs text-zinc-500">{t("studio.workspace.emptyScenesHint")}</p>
          </li>
        : scenes.map((scene, index) => {
            const selected = scene.id === activeSceneId;
            const thumb =
              scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId)?.thumbnailUrl ??
              scene.sceneImages[0]?.thumbnailUrl;
            return (
              <li key={scene.id}>
                <button
                  type="button"
                  onClick={() => onSelectScene(scene.id)}
                  className={`flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition ${
                    selected
                      ? "bg-[#006D52]/10 ring-1 ring-[#006D52]/30"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-zinc-900">
                      {scene.title || t("studio.textBeatsPreview.untitledScene")}
                    </span>
                    <span className="block truncate text-[10px] text-zinc-500">
                      {scene.durationSeconds}s · {scene.characters.length}{" "}
                      {t("studio.workspace.charactersShort")}
                    </span>
                  </span>
                  {thumb ?
                    <span
                      className="h-10 w-14 shrink-0 rounded-lg bg-zinc-100 bg-cover bg-center"
                      style={{ backgroundImage: `url(${thumb})` }}
                    />
                  : null}
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
