"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioCharacterStudioHub } from "@/components/studio/studio-character-studio-hub";
import {
  StudioCharacterStudioWizardShell,
  parseCharacterStudioFlowParam,
} from "@/components/studio/studio-character-studio-wizard-shell";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  buildCharacterStudioFlowHref,
  characterStudioFlowDefinition,
  isCharacterStudioFlowId,
} from "@/lib/character-studio-hub";
import { StudioConsumerExperienceBridge } from "@/components/studio/studio-consumer-experience-bridge";

function CharacterStudioPrepareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const flowParam = searchParams.get("flow");
  const fromExperience = searchParams.get("fromExperience") === "1";

  useEffect(() => {
    if (!flowParam || !isCharacterStudioFlowId(flowParam)) {
      return;
    }
    // S.6G: owned Quick flows enter guided funnel first (unless returning from it).
    if (
      !fromExperience &&
      (searchParams.get("mode") ?? "quick").toLowerCase() === "quick" &&
      (flowParam === "outfit" ||
        flowParam === "character_fusion" ||
        flowParam === "mascot_transform" ||
        flowParam === "logo_placement" ||
        flowParam === "motion_ready" ||
        flowParam === "full_body")
    ) {
      const params = new URLSearchParams({
        flow: flowParam,
        mode: "quick",
      });
      router.replace(`/studio/experience?${params.toString()}`);
      return;
    }
    const def = characterStudioFlowDefinition(flowParam);
    if (def.kind === "studio_motion") {
      router.replace(buildCharacterStudioFlowHref(flowParam));
    }
  }, [flowParam, router, fromExperience, searchParams]);

  if (flowParam && isCharacterStudioFlowId(flowParam)) {
    const def = characterStudioFlowDefinition(flowParam);
    if (def.kind === "studio_motion") {
      return null;
    }
    const parsed = parseCharacterStudioFlowParam(flowParam);
    if (parsed) {
      return (
        <>
          <StudioConsumerExperienceBridge />
          <StudioCharacterStudioWizardShell flowId={parsed} />
        </>
      );
    }
  }

  return (
    <StudioAuthGate>
      <StudioConsumerExperienceBridge />
      <StudioCharacterStudioHub />
    </StudioAuthGate>
  );
}

export default function CharacterStudioPreparePage() {
  return (
    <Suspense fallback={null}>
      <CharacterStudioPrepareContent />
    </Suspense>
  );
}
