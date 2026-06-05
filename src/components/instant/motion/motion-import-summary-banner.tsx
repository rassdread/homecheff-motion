"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";
import type { CharacterVoiceAssignment } from "@/types/studio-character-voice";
import { MotionCharacterPerformancePreview } from "@/components/instant/motion/motion-character-performance-preview";
import type { CharacterPerformanceAssignment } from "@/types/studio-character-performance";
import type { MotionMusicHandoffPlan } from "@/types/studio-music-director";
import type { MotionVoiceMetadata, MotionVoiceSegmentHandoff } from "@/types/studio-voice-execution";

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
              href={`/studio/storyboards/${encodeURIComponent(storyboardId)}`}
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
