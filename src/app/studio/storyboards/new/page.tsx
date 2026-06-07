"use client";

import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioProductionBriefFlow } from "@/components/studio/studio-production-brief-flow";

export default function StudioStoryboardNewPage() {
  return (
    <StudioAuthGate
      authTitleKey="studio.storyboards.authRequiredTitle"
      authBodyKey="studio.storyboards.authRequiredBody"
    >
      <StudioProductionBriefFlow />
    </StudioAuthGate>
  );
}
