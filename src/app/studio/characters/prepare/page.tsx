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

function CharacterStudioPrepareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const flowParam = searchParams.get("flow");

  useEffect(() => {
    if (!flowParam || !isCharacterStudioFlowId(flowParam)) {
      return;
    }
    const def = characterStudioFlowDefinition(flowParam);
    if (def.kind === "studio_motion") {
      router.replace(buildCharacterStudioFlowHref(flowParam));
    }
  }, [flowParam, router]);

  if (flowParam && isCharacterStudioFlowId(flowParam)) {
    const def = characterStudioFlowDefinition(flowParam);
    if (def.kind === "studio_motion") {
      return null;
    }
    const parsed = parseCharacterStudioFlowParam(flowParam);
    if (parsed) {
      return <StudioCharacterStudioWizardShell flowId={parsed} />;
    }
  }

  return (
    <StudioAuthGate>
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
