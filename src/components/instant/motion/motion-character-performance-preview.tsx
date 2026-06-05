"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildMotionPerformanceFramePlan } from "@/lib/build-motion-performance-frame-plan";
import { readMotionPerformanceExportFromHandoffJson } from "@/lib/motion-performance-export";
import { parseMotionHandoffPayloadForStorage } from "@/lib/studio-motion-handoff-storage";
import type { CharacterPerformanceAssignment } from "@/types/studio-character-performance";
import type { MotionVoiceSegmentHandoff } from "@/types/studio-voice-execution";

type Props = {
  storedHandoff: unknown;
  characterPerformanceProfiles?: CharacterPerformanceAssignment[] | null;
  voiceSegments?: MotionVoiceSegmentHandoff[] | null;
  previewDurationSeconds?: number;
};

export function MotionCharacterPerformancePreview({
  storedHandoff,
  characterPerformanceProfiles,
  voiceSegments,
  previewDurationSeconds = 8,
}: Props) {
  const t = useActiveTranslator();

  const handoff = useMemo(() => parseMotionHandoffPayloadForStorage(storedHandoff), [storedHandoff]);
  const exportMeta = useMemo(
    () => readMotionPerformanceExportFromHandoffJson(storedHandoff),
    [storedHandoff]
  );

  const profiles =
    characterPerformanceProfiles ??
    handoff?.characterPerformanceProfiles ??
    [];

  const enabled = profiles.filter((p) => p.performanceEnabled);
  if (enabled.length === 0) {
    return null;
  }

  const plan = handoff
    ? buildMotionPerformanceFramePlan({
        handoff: {
          ...handoff,
          voiceSegments: voiceSegments ?? handoff.voiceSegments ?? [],
        },
        videoDurationSeconds: previewDurationSeconds,
      })
    : null;

  const activeFrames =
    plan?.frames.filter((f) => f.activeSpeaker).slice(0, 6) ?? [];

  return (
    <div className="mt-3 rounded-lg border border-emerald-200/60 bg-emerald-50/40 px-3 py-2">
      <p className="text-xs font-semibold text-emerald-900">
        {t("motion.qa.performancePreview.title")}
      </p>
      <p className="mt-0.5 text-[11px] text-emerald-800">
        {t("motion.qa.performancePreview.subtitle")}
      </p>
      <ul className="mt-2 space-y-1 text-xs text-zinc-800">
        {enabled.map((row) => (
          <li key={row.characterId}>
            <span className="font-medium">{row.characterName}</span>
            {" — "}
            {t("motion.qa.performancePreview.profileLine", { style: row.styleLabel })}
          </li>
        ))}
      </ul>
      {activeFrames.length > 0 ?
        <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-zinc-600">
          {activeFrames.map((f, i) => (
            <li key={`${f.characterId}-${f.time}-${i}`}>
              {t("motion.qa.performancePreview.tickLine", {
                time: String(f.time),
                name: f.characterName,
                mouth: f.mouthState,
                smile: String(f.smileStrength),
                scene: String(f.sceneIndex + 1),
              })}
            </li>
          ))}
        </ul>
      : null}
      {(exportMeta?.warnings?.length ?? 0) > 0 ?
        <ul className="mt-2 space-y-0.5 text-[10px] text-amber-800">
          {exportMeta!.warnings.slice(0, 4).map((w, i) => (
            <li key={`${w.code}-${i}`}>{w.message}</li>
          ))}
        </ul>
      : null}
      {exportMeta?.lastOverlay ?
        <p className="mt-1 text-[10px] text-zinc-500">
          {exportMeta.lastOverlay.applied
            ? t("motion.qa.performancePreview.overlayApplied")
            : t("motion.qa.performancePreview.overlayPending")}
        </p>
      : null}
    </div>
  );
}
