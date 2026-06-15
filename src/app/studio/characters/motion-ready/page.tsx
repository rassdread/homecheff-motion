"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudioMotionReadyCharacterWizard } from "@/components/studio/studio-motion-ready-character-wizard";

function MotionReadyCharacterPageContent() {
  const searchParams = useSearchParams();
  return (
    <StudioMotionReadyCharacterWizard
      projectId={searchParams.get("hcProject") ?? searchParams.get("projectId")}
      projectTitle={searchParams.get("projectTitle")}
      storyboardId={searchParams.get("storyboardId")}
      sceneId={searchParams.get("sceneId")}
      sourceImage={searchParams.get("sourceImage")}
      sourceAsset={searchParams.get("sourceAsset")}
      sourceName={searchParams.get("sourceName")}
      returnTo={searchParams.get("returnTo")}
      requirementId={searchParams.get("requirementId")}
    />
  );
}

export default function MotionReadyCharacterPage() {
  return (
    <Suspense fallback={null}>
      <MotionReadyCharacterPageContent />
    </Suspense>
  );
}
