"use client";

import { useMemo } from "react";
import { buildCharacterBlockingForSceneDetail } from "@/lib/studio-character-blocking-director";
import { buildSceneCompositionForScene } from "@/lib/studio-scene-composition-director";
import { buildDirectorScenePreviewText } from "@/lib/studio-scene-director-preview";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  aiDirectorNotes: string;
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
};

export function StudioDirectorSectionAdvanced({
  scene,
  sceneIndex,
  sceneCount,
  aiDirectorNotes,
  styleProfile,
  directorProfile,
}: Props) {
  const t = useActiveTranslator();

  const composition = useMemo(() => buildSceneCompositionForScene(scene), [scene]);
  const blocking = useMemo(() => buildCharacterBlockingForSceneDetail(scene), [scene]);

  const motionSummary = useMemo(
    () => buildDirectorScenePreviewText(scene, directorProfile),
    [scene, directorProfile]
  );

  const promptOutput = useMemo(
    () =>
      buildScenePromptFromInput(
        studioSceneDetailToPromptInput(scene, styleProfile, directorProfile)
      ),
    [scene, styleProfile, directorProfile]
  );

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
              <li key={w.code}>{t(w.messageKey as TranslationKey)}</li>
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
      <div className="rounded-xl border border-[#006D52]/20 bg-[#006D52]/5 p-3">
        <p className="text-xs font-semibold uppercase text-[#006D52]">
          {t("studio.directorV2.advanced.motionInstructions")}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-800">
          {motionSummary.trim() || "—"}
        </p>
        {aiDirectorNotes.trim() ?
          <p className="mt-2 text-[10px] text-zinc-500">
            {t("studio.directorV2.director.notes")}: {aiDirectorNotes.trim().slice(0, 120)}
            {aiDirectorNotes.trim().length > 120 ? "…" : ""}
          </p>
        : null}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          {t("studio.directorV2.advanced.promptInspector")}
        </p>
        <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-xs text-zinc-800">
          {promptOutput.prompt}
        </p>
        <p className="mt-1 text-[10px] text-zinc-500">
          {t("studio.prompt.quality.label")}: {promptOutput.metadata.qualityScore}/100
        </p>
      </div>
    </div>
  );
}
