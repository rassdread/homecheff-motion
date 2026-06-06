"use client";

import {
  StudioSourceBadge,
  type StudioSourceBadgeKind,
} from "@/components/studio/studio-source-badge";
import type { MotionSceneSourceBadge } from "@/lib/motion-scene-source-badges";

function toStudioSourceKind(badge: MotionSceneSourceBadge): StudioSourceBadgeKind {
  switch (badge) {
    case "studio":
      return "studio_source";
    case "manual_image":
    case "manual_text":
      return "motion_override";
    case "text_protected":
      return "protected";
    default:
      return "studio_source";
  }
}

type Props = {
  badges: MotionSceneSourceBadge[];
  className?: string;
};

export function MotionSceneSourceBadges({ badges, className = "" }: Props) {
  const unique = [...new Set(badges.map(toStudioSourceKind))];
  if (unique.length === 0) {
    return null;
  }
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {unique.map((kind) => (
        <StudioSourceBadge key={kind} kind={kind} />
      ))}
    </div>
  );
}
