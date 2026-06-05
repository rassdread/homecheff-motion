"use client";

import { useMemo, useState } from "react";
import { StudioDirectorCardSelect } from "@/components/studio/director-v2/studio-director-card-select";
import { StudioDirectorInfoButton } from "@/components/studio/director-v2/studio-director-info-button";
import { buildAiDirectorDirection } from "@/lib/studio-ai-director-direction";
import {
  inferStoryPurposeForScene,
  STUDIO_DIRECTOR_V2_STORY_PURPOSES,
  storyPurposePatch,
  type StudioDirectorV2StoryPurpose,
} from "@/lib/studio-director-v2-story-purpose";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";
import { normalizeAiDirectorStyleStrength } from "@/lib/studio-ai-director-interpreter";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  flowScenes: StoryFlowSceneInput[];
  directorNotes: string;
  aiDirectorStyleStrength: string;
  canModify: boolean;
  onDirectorNotesChange: (notes: string) => void;
  onApplyPurpose: (purpose: StudioDirectorV2StoryPurpose) => void;
  onApplySuggestion: (patch: {
    shotType?: string;
    cameraMovement?: string;
    sceneEnergy?: StudioSceneDetail["sceneEnergy"];
    emotion?: string;
    camera?: string;
    title?: string;
    description?: string;
    action?: string;
  }) => void;
};

export function StudioDirectorSectionDirector({
  scene,
  sceneIndex,
  sceneCount,
  flowScenes,
  directorNotes,
  aiDirectorStyleStrength,
  canModify,
  onDirectorNotesChange,
  onApplyPurpose,
  onApplySuggestion,
}: Props) {
  const t = useActiveTranslator();
  const [busy, setBusy] = useState(false);
  const inferredPurpose = inferStoryPurposeForScene(sceneIndex, sceneCount);

  const handleSuggest = () => {
    setBusy(true);
    try {
      const direction = buildAiDirectorDirection({
        scenes: flowScenes,
        prompt: directorNotes,
        styleStrength: normalizeAiDirectorStyleStrength(aiDirectorStyleStrength),
      });
      const row = direction.plan.find((p) => p.sceneId === scene.id);
      if (row) {
        onApplySuggestion({
          shotType: row.shotType,
          cameraMovement: row.cameraMovement,
          sceneEnergy: row.sceneEnergy,
          emotion: scene.emotion || "focused",
          camera: row.legacyCamera ?? scene.camera,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const purposeLabel = useMemo(
    () =>
      STUDIO_DIRECTOR_V2_STORY_PURPOSES.map((purpose) => ({
        purpose,
        label: t(`studio.directorV2.purpose.${purpose}` as TranslationKey),
      })),
    [t]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-zinc-800" htmlFor="director-v2-scene-title">
            {t("studio.storyboards.field.sceneTitle")}
          </label>
          <input
            id="director-v2-scene-title"
            type="text"
            value={scene.title}
            disabled={!canModify}
            onChange={(e) => onApplySuggestion({ title: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-800" htmlFor="director-v2-scene-action">
            {t("studio.storyboards.field.action")}
          </label>
          <input
            id="director-v2-scene-action"
            type="text"
            value={scene.action}
            disabled={!canModify}
            onChange={(e) => onApplySuggestion({ action: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-zinc-800" htmlFor="director-v2-scene-desc">
          {t("studio.storyboards.field.description")}
        </label>
        <textarea
          id="director-v2-scene-desc"
          rows={2}
          value={scene.description}
          disabled={!canModify}
          onChange={(e) => onApplySuggestion({ description: e.target.value })}
          className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-60"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("studio.directorV2.director.storyPurpose")}
          </p>
          <StudioDirectorInfoButton infoKey="studio.directorV2.info.director.storyPurpose" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {purposeLabel.map(({ purpose, label }) => (
            <StudioDirectorCardSelect
              key={purpose}
              label={label}
              selected={inferredPurpose === purpose}
              disabled={!canModify}
              onSelect={() => {
                onApplyPurpose(purpose);
                const patch = storyPurposePatch(purpose);
                onApplySuggestion({
                  shotType: patch.shotType,
                  cameraMovement: patch.cameraMovement,
                  sceneEnergy: patch.sceneEnergy,
                  emotion: patch.emotion,
                  camera: patch.camera,
                });
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <label className="text-sm font-medium text-zinc-800" htmlFor="director-v2-notes">
            {t("studio.directorV2.director.notes")}
          </label>
          <StudioDirectorInfoButton infoKey="studio.directorV2.info.director.notes" />
        </div>
        <textarea
          id="director-v2-notes"
          value={directorNotes}
          disabled={!canModify}
          rows={2}
          placeholder={t("studio.aiDirector.promptPlaceholder")}
          onChange={(e) => onDirectorNotesChange(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-60"
        />
        <p className="mt-1 text-[10px] text-zinc-500">{t("studio.directorV2.director.notesHint")}</p>
      </div>

      <button
        type="button"
        disabled={!canModify || busy}
        onClick={handleSuggest}
        className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? t("button.loading") : t("studio.directorV2.director.suggestDirection")}
      </button>
    </div>
  );
}
