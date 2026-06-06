"use client";

import Link from "next/link";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import { useActiveTranslator } from "@/i18n/client";
import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";
import type { CharacterVoiceAssignment } from "@/types/studio-character-voice";
import { MotionCharacterPerformancePreview } from "@/components/instant/motion/motion-character-performance-preview";
import type { CharacterPerformanceAssignment } from "@/types/studio-character-performance";
import type { MotionMusicHandoffPlan } from "@/types/studio-music-director";
import type { MotionSoundHandoffPlan } from "@/types/studio-sound-director";
import type { MotionAudioProductionHandoffPlan } from "@/types/studio-audio-production-director";
import type { MotionAudioAssetHandoffPlan } from "@/types/studio-audio-asset-director";
import type { MotionVoiceMetadata, MotionVoiceSegmentHandoff } from "@/types/studio-voice-execution";
import type { MotionVoiceIdentityHandoffPlan } from "@/types/studio-voice-identity";
import type { MotionMediaAssetHandoffPlan } from "@/types/studio-media-asset";
import type { MotionAssetPlacementHandoffPlan } from "@/types/studio-asset-placement";
import type { MotionCharacterBlockingHandoffPlan } from "@/types/studio-character-blocking";
import { VOICE_IDENTITY_LANGUAGES } from "@/types/studio-voice-identity";

type Props = {
  intelligence: MotionStudioIntelligenceSnapshot;
  storyboardId: string | null;
  voiceMetadata?: MotionVoiceMetadata | null;
  subtitleAvailability?: boolean;
  characterVoiceAssignments?: CharacterVoiceAssignment[] | null;
  characterPerformanceProfiles?: CharacterPerformanceAssignment[] | null;
  storedHandoff?: unknown;
  voiceSegments?: MotionVoiceSegmentHandoff[] | null;
  musicPlan?: MotionMusicHandoffPlan | null;
  soundPlan?: MotionSoundHandoffPlan | null;
  audioProductionPlan?: MotionAudioProductionHandoffPlan | null;
  audioAssetPlan?: MotionAudioAssetHandoffPlan | null;
  voiceIdentityPlan?: MotionVoiceIdentityHandoffPlan | null;
  mediaAssetPlan?: MotionMediaAssetHandoffPlan | null;
  assetPlacementPlan?: MotionAssetPlacementHandoffPlan | null;
  characterBlockingPlan?: MotionCharacterBlockingHandoffPlan | null;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function MotionImportSummaryBanner({
  intelligence,
  storyboardId,
  voiceMetadata,
  subtitleAvailability,
  characterVoiceAssignments,
  characterPerformanceProfiles,
  storedHandoff,
  voiceSegments,
  musicPlan,
  soundPlan,
  audioProductionPlan,
  audioAssetPlan,
  voiceIdentityPlan,
  mediaAssetPlan,
  assetPlacementPlan,
  characterBlockingPlan,
  onRefresh,
  refreshing,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-xl border border-[#0067B1]/25 bg-gradient-to-r from-[#0067B1]/8 to-[#006D52]/5 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0067B1]">
            {t("motion.qa.importSummary.title")}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {t("motion.qa.importSummary.body", {
              title: intelligence.storyboardTitle,
              scenes: String(intelligence.sceneCount),
              characters: String(intelligence.charactersUsed.length),
              identity: String(intelligence.overallCharacterIdentityScore ?? "—"),
              vision: String(intelligence.overallVisionScore ?? "—"),
              consistency: String(intelligence.overallConsistencyScore ?? "—"),
            })}
          </p>
          <p className="mt-2 text-xs text-zinc-700">
            {t("motion.qa.importSummary.execution", {
              world: intelligence.worldName ?? "—",
              director: intelligence.promptStyleProfile ?? "—",
              characters: String(intelligence.charactersUsed.length),
              locations: String(intelligence.locationsUsed.length),
              props: String(intelligence.propsUsed.length),
              readiness:
                intelligence.executionReadiness ?
                  `${intelligence.executionReadiness.score} (${intelligence.executionReadiness.tier})`
                : intelligence.legacyHandoff ? t("motion.qa.importSummary.executionLegacy")
                : "—",
            })}
          </p>
          {(intelligence.executionWarningCount ?? 0) > 0 ?
            <p className="mt-1 text-xs text-amber-800">
              {t("motion.qa.importSummary.executionWarnings", {
                count: String(intelligence.executionWarningCount),
              })}
            </p>
          : null}
          {(() => {
            const voice = voiceMetadata ?? null;
            const summary = intelligence.voiceSummary;
            if (!voice && !summary) {
              return null;
            }
            const ready = voice?.ready ?? summary?.ready ?? false;
            const lang = (voice?.language ?? summary?.language ?? "—").toUpperCase();
            const duration = Math.round(
              voice?.durationSeconds ?? summary?.durationSeconds ?? 0
            );
            const subs =
              subtitleAvailability ?? summary?.subtitleAvailable ?? false;
            return (
              <p className="mt-2 text-xs text-zinc-700">
                {t("motion.qa.importSummary.voice", {
                  ready: ready
                    ? t("motion.qa.importSummary.voiceReady")
                    : t("motion.qa.importSummary.voiceNotReady"),
                  language: lang,
                  duration: String(duration),
                  subtitles: subs
                    ? t("motion.qa.importSummary.subtitlesAvailable")
                    : t("motion.qa.importSummary.subtitlesNone"),
                })}
              </p>
            );
          })()}
          {characterVoiceAssignments && characterVoiceAssignments.length > 0 ?
            <ul className="mt-2 space-y-0.5 text-xs text-zinc-700">
              {characterVoiceAssignments.map((row) => (
                <li key={row.characterId}>
                  {row.characterName}: {t(row.presetLabelKey as never)}
                </li>
              ))}
            </ul>
          : null}
          {musicPlan?.enabled && musicPlan.sceneMusicCues.length > 0 ?
            <div className="mt-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">
                {t("motion.qa.importSummary.musicTitle")}:{" "}
                {t(musicPlan.profileLabelKey as never)}
              </p>
              <ul className="mt-1 space-y-0.5">
                {musicPlan.sceneMusicCues.map((cue) => (
                  <li key={cue.sceneId}>
                    {cue.order + 1}. {cue.title || t("motion.qa.importSummary.musicScene")} —{" "}
                    <span className="capitalize">{cue.narrativeLabel}</span>
                  </li>
                ))}
              </ul>
            </div>
          : null}
          {soundPlan?.enabled && soundPlan.sceneSoundCues.length > 0 ?
            <div className="mt-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">
                {t("motion.qa.importSummary.soundTitle")}:{" "}
                {t(soundPlan.profileLabelKey as never)}
              </p>
              <ul className="mt-1 space-y-0.5">
                {soundPlan.sceneSoundCues.map((cue) => {
                  const labels = [
                    ...cue.environmentSounds.slice(0, 2),
                    ...cue.characterSounds.slice(0, 1),
                    ...cue.transitionSounds.filter((s) => s !== "none").slice(0, 1),
                  ].map((id) => t(`studio.sound.id.${id}` as never));
                  return (
                    <li key={cue.sceneId}>
                      {cue.order + 1}. {cue.title || t("motion.qa.importSummary.soundScene")}:{" "}
                      {labels.join(" · ") || "—"}
                    </li>
                  );
                })}
              </ul>
            </div>
          : null}
          {audioProductionPlan?.enabled && audioProductionPlan.sceneCues.length > 0 ?
            <div className="mt-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">
                {t("motion.qa.importSummary.audioTitle")}: {audioProductionPlan.audioFocusSummary}
              </p>
              <ul className="mt-1 space-y-0.5">
                {audioProductionPlan.sceneCues.map((cue) => (
                  <li key={cue.sceneId}>
                    {t("motion.qa.importSummary.audioSceneLine", {
                      order: String(cue.order + 1),
                      title: cue.title || t("motion.qa.importSummary.audioScene"),
                      focus: t(`studio.audio.focus.${cue.audioFocus}` as never),
                      voice: String(cue.voicePriority),
                      music: String(cue.musicPriority),
                      sound: String(cue.soundPriority),
                    })}
                  </li>
                ))}
              </ul>
            </div>
          : null}
          {audioAssetPlan?.enabled && audioAssetPlan.scenePackages.length > 0 ?
            <div className="mt-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">
                {t("motion.qa.importSummary.audioAssetTitle")}: {audioAssetPlan.assetSummary}
              </p>
              <ul className="mt-1 space-y-0.5">
                {audioAssetPlan.scenePackages.map((pkg) => (
                  <li key={pkg.sceneId}>
                    {t("motion.qa.importSummary.audioAssetSceneLine", {
                      order: String(pkg.order + 1),
                      title: pkg.title || t("motion.qa.importSummary.audioAssetScene"),
                      voice: pkg.voiceAssets.map((a) => a.assetName).join(", ") || "—",
                      music: pkg.musicAssets.map((a) => a.assetName).join(", ") || "—",
                      sfx: [...pkg.ambienceAssets, ...pkg.sfxAssets]
                        .map((a) => a.assetName)
                        .join(", ") || "—",
                    })}
                  </li>
                ))}
              </ul>
            </div>
          : null}
          {voiceIdentityPlan?.enabled && voiceIdentityPlan.resolvedVoiceProfiles.length > 0 ?
            <div className="mt-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">
                {t("motion.qa.importSummary.voiceIdentityTitle")}: {voiceIdentityPlan.identitySummary}
              </p>
              <ul className="mt-1 space-y-1">
                {[...new Map(
                  voiceIdentityPlan.resolvedVoiceProfiles.map((p) => [p.characterId, p])
                ).values()].map((profile) => {
                  const locked = voiceIdentityPlan.lockedVoiceAssignments.find(
                    (a) => a.characterId === profile.characterId
                  )?.voiceLock;
                  return (
                    <li key={profile.characterId}>
                      <span className="font-medium">{profile.characterName}</span>
                      {locked ?
                        <span className="ml-1 text-indigo-700">
                          ({t("motion.qa.importSummary.voiceIdentityLocked")})
                        </span>
                      : null}
                      <ul className="ml-3 mt-0.5 space-y-0.5">
                        {VOICE_IDENTITY_LANGUAGES.filter((lang) => {
                          const row = voiceIdentityPlan.resolvedVoiceProfiles.find(
                            (r) => r.characterId === profile.characterId && r.language === lang
                          );
                          return row?.voiceEnabled || row?.voiceProfile;
                        }).map((lang) => {
                          const row = voiceIdentityPlan.resolvedVoiceProfiles.find(
                            (r) => r.characterId === profile.characterId && r.language === lang
                          );
                          return (
                            <li key={`${profile.characterId}-${lang}`}>
                              {lang.toUpperCase()}: {row?.displayLabel ?? "—"}
                            </li>
                          );
                        })}
                        {VOICE_IDENTITY_LANGUAGES.every((lang) => {
                          const row = voiceIdentityPlan.resolvedVoiceProfiles.find(
                            (r) => r.characterId === profile.characterId && r.language === lang
                          );
                          return !row?.voiceEnabled && !row?.voiceProfile;
                        }) ?
                          <li>
                            {profile.language.toUpperCase()}: {profile.displayLabel}
                          </li>
                        : null}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>
          : null}
          {assetPlacementPlan?.enabled && assetPlacementPlan.scenePlacements.length > 0 ?
            <div className="mt-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">
                {t("motion.qa.importSummary.assetPlacementTitle")}
                {assetPlacementPlan.visualHierarchySummary.primarySubject ?
                  `: ${assetPlacementPlan.visualHierarchySummary.primarySubject}`
                : null}
              </p>
              <ul className="mt-1 space-y-1">
                {assetPlacementPlan.scenePlacements.slice(0, 4).map((scenePlacement) => (
                  <li key={scenePlacement.sceneId}>
                    <span className="font-medium">
                      {scenePlacement.order + 1}.{" "}
                      {scenePlacement.primarySubject ||
                        t("motion.qa.importSummary.assetPlacementScene")}
                    </span>
                    <ul className="ml-3 mt-0.5 space-y-0.5">
                      {scenePlacement.characterPlacements.slice(0, 2).map((row) => (
                        <li key={`${scenePlacement.sceneId}-${row.characterId}`}>
                          {t("motion.qa.importSummary.assetPlacementCharacterLine", {
                            name: row.characterName,
                            zone: row.zone,
                            depth: row.depth,
                            scale: row.scale,
                          })}
                        </li>
                      ))}
                      {scenePlacement.propPlacements.slice(0, 1).map((row) => (
                        <li key={`${scenePlacement.sceneId}-${row.propId}`}>
                          {t("motion.qa.importSummary.assetPlacementPropLine", {
                            name: row.propName,
                            zone: row.zone,
                            depth: row.depth,
                          })}
                        </li>
                      ))}
                      {scenePlacement.brandPlacements
                        .filter((b) => b.placementKind === "logo")
                        .slice(0, 1)
                        .map((row) => (
                          <li key={`${scenePlacement.sceneId}-${row.brandId}`}>
                            {t("motion.qa.importSummary.assetPlacementBrandLine", {
                              name: row.brandName,
                              zone: row.zone,
                            })}
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          : null}
          {characterBlockingPlan?.enabled && characterBlockingPlan.sceneBlockings.length > 0 ?
            <div className="mt-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">
                {t("motion.qa.importSummary.characterBlockingTitle")}
              </p>
              <ul className="mt-1 space-y-1">
                {characterBlockingPlan.sceneBlockings.slice(0, 4).map((sceneBlocking) => (
                  <li key={sceneBlocking.sceneId}>
                    <span className="font-medium">
                      {sceneBlocking.order + 1}.{" "}
                      {sceneBlocking.blockingSummary ||
                        t("motion.qa.importSummary.characterBlockingScene")}
                    </span>
                    <ul className="ml-3 mt-0.5 space-y-0.5">
                      {sceneBlocking.characterActions.slice(0, 3).map((row) => {
                        const pose = sceneBlocking.characterPoses.find(
                          (p) => p.characterId === row.characterId
                        );
                        return (
                          <li key={`${sceneBlocking.sceneId}-${row.characterId}`}>
                            {t("motion.qa.importSummary.characterBlockingActionLine", {
                              name: row.characterName,
                              action: row.action,
                              pose: pose?.pose ?? "NEUTRAL",
                            })}
                          </li>
                        );
                      })}
                      {sceneBlocking.interaction.interactionType !== "NONE" ?
                        <li>
                          {t("motion.qa.importSummary.characterBlockingInteractionLine", {
                            type: sceneBlocking.interaction.interactionType,
                            participants: sceneBlocking.interaction.participantNames.join(", "),
                          })}
                        </li>
                      : null}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          : null}
          {mediaAssetPlan?.enabled && mediaAssetPlan.assetReferences.length > 0 ?
            <div className="mt-2 text-xs text-zinc-700">
              <p className="font-medium text-zinc-800">
                {t("motion.qa.importSummary.mediaAssetTitle")}: {mediaAssetPlan.registrySummary}
              </p>
              {mediaAssetPlan.assetUsageSummary ?
                <p className="mt-0.5">{mediaAssetPlan.assetUsageSummary}</p>
              : null}
              <ul className="mt-1 space-y-0.5">
                {mediaAssetPlan.characterBundles.slice(0, 4).map((bundle) => (
                  <li key={bundle.characterId}>
                    {bundle.characterName}:{" "}
                    {t("motion.qa.importSummary.mediaAssetCharacterLine", {
                      refs: String(bundle.referenceImages.length),
                      voices: String(bundle.voiceAssets.length),
                    })}
                  </li>
                ))}
              </ul>
            </div>
          : null}
          {characterPerformanceProfiles && characterPerformanceProfiles.length > 0 ?
            <ul className="mt-2 space-y-0.5 text-xs text-zinc-700">
              {characterPerformanceProfiles
                .filter((p) => p.performanceEnabled)
                .map((row) => (
                  <li key={`perf-${row.characterId}`}>
                    {t("motion.qa.importSummary.performanceLine", {
                      name: row.characterName,
                      style: row.styleLabel,
                    })}
                  </li>
                ))}
            </ul>
          : null}
          <MotionCharacterPerformancePreview
            storedHandoff={storedHandoff}
            characterPerformanceProfiles={characterPerformanceProfiles}
            voiceSegments={voiceSegments}
          />
          {intelligence.partialData || intelligence.legacyHandoff ?
            <p className="mt-1 text-xs text-amber-800">{t("motion.qa.importSummary.partial")}</p>
          : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {storyboardId ?
            <Link
              href={studioWorkspaceHref(storyboardId)}
              className="rounded-full border border-[#0067B1]/40 px-3 py-1 text-xs font-semibold text-[#0067B1]"
            >
              {t("motion.qa.importSummary.openStoryboard")}
            </Link>
          : null}
          {onRefresh ?
            <button
              type="button"
              disabled={refreshing}
              onClick={onRefresh}
              className="rounded-full border border-[#0067B1]/40 px-3 py-1 text-xs font-semibold text-[#0067B1] disabled:opacity-50"
            >
              {refreshing ? t("motion.handoff.refreshing") : t("motion.handoff.refreshFromStudio")}
            </button>
          : null}
        </div>
      </div>
    </div>
  );
}
