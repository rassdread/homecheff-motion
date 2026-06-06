"use client";

import { MOTION_SCENE_BADGE_I18N, type MotionSceneSourceBadge } from "@/lib/motion-scene-source-badges";
import { useActiveTranslator } from "@/i18n/client";

const BADGE_STYLE: Record<MotionSceneSourceBadge, string> = {
  studio: "bg-sky-100 text-sky-900 border-sky-200",
  manual_text: "bg-amber-100 text-amber-950 border-amber-200",
  manual_image: "bg-violet-100 text-violet-900 border-violet-200",
  text_protected: "bg-emerald-100 text-emerald-900 border-emerald-200",
};

type Props = {
  badges: MotionSceneSourceBadge[];
  className?: string;
};

export function MotionSceneSourceBadges({ badges, className = "" }: Props) {
  const t = useActiveTranslator();
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
          {t(MOTION_SCENE_BADGE_I18N[badge] as never)}
        </span>
      ))}
    </div>
  );
}
