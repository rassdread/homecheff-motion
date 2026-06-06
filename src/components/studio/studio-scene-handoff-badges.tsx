"use client";

import { StudioSourceBadge, type StudioSourceBadgeKind } from "@/components/studio/studio-source-badge";
import type { StudioSceneDetail } from "@/types/studio-api";

function resolveStudioSourceBadges(scene: StudioSceneDetail): StudioSourceBadgeKind[] {
  const badges: StudioSourceBadgeKind[] = ["studio_source"];
  if (scene.title?.trim() || scene.description?.trim() || scene.action?.trim()) {
    badges.push("protected");
  }
  if (scene.shotType?.trim() || scene.cameraMovement?.trim() || scene.action?.trim()) {
    badges.push("generated");
  }
  return [...new Set(badges)];
}

type Props = {
  scene: StudioSceneDetail;
  className?: string;
};

export function StudioSceneHandoffBadges({ scene, className = "" }: Props) {
  const badges = resolveStudioSourceBadges(scene);
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge) => (
        <StudioSourceBadge key={badge} kind={badge} />
      ))}
    </div>
  );
}
