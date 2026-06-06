"use client";

import { useMemo } from "react";
import { StudioDirectorInspectorColumn } from "@/components/studio/director-v2/studio-director-inspector-column";
import { StudioSceneHandoffBadges } from "@/components/studio/studio-scene-handoff-badges";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildStudioTextBeats, studioSceneDetailToBeatSource } from "@/lib/build-studio-text-beats";
import { buildMusicDirectorPlan } from "@/lib/studio-music-director";
import { buildSoundDirectorPlan } from "@/lib/studio-sound-director";
import { buildVoiceIdentityPlan } from "@/lib/studio-voice-identity-director";
import { analyzeStoryIntelligence } from "@/lib/studio-story-intelligence";
import { storyboardToFlowInput } from "@/lib/studio-movie-director-quality";
import {
  buildAssetReadiness,
  buildProductionWarnings,
  computeReadinessScore,
} from "@/lib/studio-production-readiness";
import { buildSceneCompositionForScene } from "@/lib/studio-scene-composition-director";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  saving: boolean;
};

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="mt-1.5 text-xs text-zinc-800">{children}</div>
    </div>
  );
}

export function StudioWorkspaceInspectorPanel({
  storyboard,
  scene,
  sceneIndex,
  sceneCount,
  styleProfile,
  directorProfile,
  saving,
}: Props) {
  const t = useActiveTranslator();

  const storyHealth = useMemo(() => {
    const flow = storyboardToFlowInput(storyboard);
    return analyzeStoryIntelligence(flow, directorProfile);
  }, [storyboard, directorProfile]);

  const composition = useMemo(() => buildSceneCompositionForScene(scene), [scene]);

  const textBeats = useMemo(
    () =>
      buildStudioTextBeats({
        scene: studioSceneDetailToBeatSource(scene),
        sceneIndex,
        sceneCount,
        storyboardTitle: storyboard.title,
        storyboardDescription: storyboard.description,
        aiDirectorNotes: storyboard.aiDirectorPrompt,
      }),
    [scene, sceneIndex, sceneCount, storyboard]
  );

  const musicPlan = useMemo(() => buildMusicDirectorPlan(storyboard), [storyboard]);
  const soundPlan = useMemo(() => buildSoundDirectorPlan(storyboard), [storyboard]);
  const voicePlan = useMemo(() => buildVoiceIdentityPlan(storyboard), [storyboard]);

  const assetReadiness = useMemo(() => buildAssetReadiness(storyboard), [storyboard]);
  const warnings = useMemo(() => buildProductionWarnings(storyboard), [storyboard]);

  const readinessScore = useMemo(() => {
    const blockingCount = warnings.filter((w) => w.severity === "blocking").length;
    const warningCount = warnings.filter((w) => w.severity === "warning").length;
    return computeReadinessScore({
      assetItems: assetReadiness,
      warningCount,
      blockingCount,
    });
  }, [assetReadiness, warnings]);

  const sceneMusicCue = musicPlan.sceneCues.find((c) => c.sceneId === scene.id);
  const sceneSoundCue = soundPlan.sceneCues.find((c) => c.sceneId === scene.id);

  const handoffReady = assetReadiness.filter((a) => a.level === "ready").length;
  const handoffTotal = assetReadiness.length;

  const tightSpaceWarning = composition.compositionWarnings.some(
    (w) => w.code.includes("tight") || w.code.includes("crowd")
  );

  return (
    <div className="space-y-4">
      <StudioSceneHandoffBadges scene={scene} />
      <StudioDirectorInspectorColumn
        scene={scene}
        sceneIndex={sceneIndex}
        sceneCount={sceneCount}
        saving={saving}
      />

      <SummaryBlock title={t("studio.workspace.inspector.storyHealth")}>
        <p>
          {t("studio.intelligence.healthScore", { score: String(storyHealth.storyHealthScore) })}
        </p>
        <p className="mt-1 text-zinc-600">
          {t("studio.workspace.inspector.readinessScore")}: <strong>{readinessScore}</strong>/100
        </p>
      </SummaryBlock>

      <SummaryBlock title={t("studio.workspace.inspector.consistency")}>
        <p>
          {t("studio.workspace.inspector.shotDiversity", {
            score: String(storyHealth.shotDiversityScore),
          })}
        </p>
      </SummaryBlock>

      <SummaryBlock title={t("studio.workspace.inspector.voiceSummary")}>
        <p>{voicePlan.identitySummary || "—"}</p>
        <p className="mt-1 text-zinc-600">
          {voicePlan.lockedAssignments.length} {t("studio.workspace.inspector.voiceLocked")}
        </p>
      </SummaryBlock>

      <SummaryBlock title={t("studio.workspace.inspector.musicSummary")}>
        {sceneMusicCue ?
          <p>
            {sceneMusicCue.cueType.replace(/_/g, " ")} · {sceneMusicCue.energyTarget} ·{" "}
            {musicPlan.narrativeSummary}
          </p>
        : <p>{t("studio.workspace.inspector.noSceneCue")}</p>}
      </SummaryBlock>

      <SummaryBlock title={t("studio.workspace.inspector.soundSummary")}>
        {sceneSoundCue ?
          <p>{sceneSoundCue.environmentSounds.join(", ").replace(/_/g, " ") || "—"}</p>
        : <p>{t("studio.workspace.inspector.noSceneSound")}</p>}
      </SummaryBlock>

      <SummaryBlock title={t("studio.workspace.inspector.textSummary")}>
        <p>
          {textBeats.beatLines.length} {t("studio.workspace.inspector.beatLines")} ·{" "}
          {textBeats.headlineBeats.length > 0 ? t("studio.workspace.inspector.hasHeadline") : t("studio.workspace.inspector.noHeadline")}
        </p>
      </SummaryBlock>

      <SummaryBlock title={t("studio.workspace.inspector.handoffSummary")}>
        <p>
          {handoffReady}/{handoffTotal} {t("studio.workspace.inspector.assetsReady")}
        </p>
      </SummaryBlock>

      {composition.compositionWarnings.length > 0 ?
        <SummaryBlock title={t("studio.workspace.inspector.qaIssues")}>
          <ul className="list-inside list-disc space-y-0.5 text-amber-800">
            {composition.compositionWarnings.slice(0, 4).map((w) => (
              <li key={w.code}>{t(w.messageKey as TranslationKey)}</li>
            ))}
          </ul>
        </SummaryBlock>
      : null}

      {warnings.length > 0 ?
        <SummaryBlock title={t("studio.workspace.inspector.warnings")}>
          <ul className="list-inside list-disc space-y-0.5">
            {warnings.slice(0, 5).map((w) => (
              <li key={w.code}>{t(w.messageKey as TranslationKey)}</li>
            ))}
          </ul>
        </SummaryBlock>
      : null}

      {tightSpaceWarning ?
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-900">
          {t("studio.workspace.inspector.tightSpace")}
        </p>
      : null}
    </div>
  );
}
