"use client";

import { useMemo } from "react";
import { buildCharacterBlockingForSceneDetail } from "@/lib/studio-character-blocking-director";
import { buildSceneCompositionForScene } from "@/lib/studio-scene-composition-director";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
};

export function StudioDirectorSectionAdvanced({ scene }: Props) {
  const t = useActiveTranslator();

  const composition = useMemo(() => buildSceneCompositionForScene(scene), [scene]);
  const blocking = useMemo(() => buildCharacterBlockingForSceneDetail(scene), [scene]);

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          {t("studio.directorV2.advanced.composition")}
        </p>
        <p className="mt-1 font-medium text-zinc-800">
          {composition.compositionType.replace(/_/g, " ")} · {composition.visualFocus.kind}
        </p>
        {composition.compositionWarnings.length > 0 ? (
          <ul className="mt-2 list-inside list-disc text-xs text-amber-800">
            {composition.compositionWarnings.slice(0, 4).map((w) => (
              <li key={w.code}>{w.messageKey}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-zinc-600">{t("studio.directorV2.advanced.noWarnings")}</p>
        )}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          {t("studio.directorV2.advanced.blocking")}
        </p>
        <p className="mt-1 text-zinc-800">{blocking.blockingSummary}</p>
        <p className="mt-1 text-xs text-zinc-600">
          {blocking.characterActions.length} {t("studio.directorV2.advanced.actions")} ·{" "}
          {blocking.interaction.interactionType.replace(/_/g, " ")}
        </p>
      </div>
      <p className="text-xs text-zinc-500">{t("studio.directorV2.advanced.readOnlyHint")}</p>
    </div>
  );
}
