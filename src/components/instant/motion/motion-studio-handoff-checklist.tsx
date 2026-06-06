"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";
import type { MotionMusicHandoffPlan } from "@/types/studio-music-director";
import type { MotionSoundHandoffPlan } from "@/types/studio-sound-director";
import type { MotionVoiceMetadata } from "@/types/studio-voice-execution";

type Props = {
  intelligence: MotionStudioIntelligenceSnapshot;
  voiceMetadata?: MotionVoiceMetadata | null;
  musicPlan?: MotionMusicHandoffPlan | null;
  soundPlan?: MotionSoundHandoffPlan | null;
  hasTextBeats?: boolean;
};

type ChecklistItem = {
  key: "story" | "characters" | "voice" | "music" | "sound" | "textBeats";
  ready: boolean;
};

export function MotionStudioHandoffChecklist({
  intelligence,
  voiceMetadata,
  musicPlan,
  soundPlan,
  hasTextBeats = true,
}: Props) {
  const t = useActiveTranslator();

  const items: ChecklistItem[] = [
    { key: "story", ready: intelligence.sceneCount > 0 },
    { key: "characters", ready: intelligence.charactersUsed.length > 0 },
    {
      key: "voice",
      ready: Boolean(voiceMetadata?.ready ?? intelligence.voiceSummary?.ready),
    },
    {
      key: "music",
      ready: Boolean(
        musicPlan?.enabled &&
          (musicPlan.sceneMusicCues?.length > 0 || musicPlan.narrativeSummary?.trim())
      ),
    },
    {
      key: "sound",
      ready: Boolean(soundPlan?.enabled && soundPlan.sceneSoundCues?.length > 0),
    },
    { key: "textBeats", ready: hasTextBeats },
  ];

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
        {t("motion.handoff.checklist.title")}
      </p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-xs text-zinc-800">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                item.ready ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-500"
              }`}
              aria-hidden
            >
              {item.ready ? "✓" : "·"}
            </span>
            <span>{t(`motion.handoff.checklist.${item.key}`)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-zinc-600">{t("motion.handoff.checklist.hint")}</p>
    </div>
  );
}
