"use client";

import {
  STUDIO_HANDOFF_BADGE_I18N,
  resolveStudioSceneHandoffBadges,
  type StudioHandoffBadge,
} from "@/lib/studio-scene-handoff-badges";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneDetail } from "@/types/studio-api";

const BADGE_STYLE: Record<StudioHandoffBadge, string> = {
  studio_source: "bg-sky-100 text-sky-900 border-sky-200",
  text_beats: "bg-emerald-100 text-emerald-900 border-emerald-200",
  voice_plan: "bg-violet-100 text-violet-900 border-violet-200",
  music_plan: "bg-indigo-100 text-indigo-900 border-indigo-200",
  sound_plan: "bg-amber-100 text-amber-950 border-amber-200",
  motion_instructions: "bg-zinc-100 text-zinc-800 border-zinc-200",
};

type Props = {
  scene: StudioSceneDetail;
  className?: string;
};

export function StudioSceneHandoffBadges({ scene, className = "" }: Props) {
  const t = useActiveTranslator();
  const badges = resolveStudioSceneHandoffBadges(scene);
  if (badges.length === 0) {
    return null;
  }
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE_STYLE[badge]}`}
        >
          {t(STUDIO_HANDOFF_BADGE_I18N[badge] as never)}
        </span>
      ))}
    </div>
  );
}
