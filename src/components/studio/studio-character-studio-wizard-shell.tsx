"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { EditorMascotTransformationWizard } from "@/components/editor/editor-mascot-transformation-wizard";
import { EditorLogoPlacementWizard } from "@/components/editor/editor-logo-placement-wizard";
import { EditorReferenceRoleFlow } from "@/components/editor/editor-reference-role-flow";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { loadAssistantEditorFusionBootstrap } from "@/lib/assistant-prefill-storage";
import {
  buildCharacterStudioHubHref,
  characterStudioFlowDefinition,
  fusionIntentForCharacterStudioFlow,
  isCharacterStudioFlowId,
} from "@/lib/character-studio-hub";
import { resolveReferenceIntakeConfig } from "@/lib/editor-reference-role-intake";
import { brand } from "@/lib/brand";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { CharacterStudioFlowId } from "@/types/character-studio-hub";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  flowId: CharacterStudioFlowId;
};

export function StudioCharacterStudioWizardShell({ flowId }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const searchParams = useSearchParams();
  const def = characterStudioFlowDefinition(flowId);
  const fusionBootstrap = useMemo(
    () => (typeof window !== "undefined" ? loadAssistantEditorFusionBootstrap() : null),
    []
  );

  const fusionIntent = fusionIntentForCharacterStudioFlow(flowId);
  const referenceConfig = useMemo(() => {
    if (def.kind !== "fusion_wizard" || !fusionIntent) {
      return null;
    }
    return resolveReferenceIntakeConfig({
      workflow: "combine",
      intent: fusionIntent,
    });
  }, [def.kind, fusionIntent]);

  const goHub = () => router.push(buildCharacterStudioHubHref());

  const noopComplete = (_document: EditorCanvasDocument) => {
    /* Character Studio mode — never auto-open editor */
  };

  return (
    <StudioAuthGate
      authTitleKey="characterStudio.auth.title"
      authBodyKey="characterStudio.auth.body"
    >
      <main className={`${studioVisual.pageRoot} ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <p className={studioVisual.eyebrowOnDark}>{t("characterStudio.hub.eyebrow" as never)}</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            {t(def.titleKey as never)}
          </h1>
          <p className="mt-2 text-sm text-white/80">{t(def.descriptionKey as never)}</p>

          {def.kind === "mascot_wizard" ?
            <EditorMascotTransformationWizard
              initialTarget={def.mascotInitialTarget}
              initialSourceType={def.mascotSourceType ?? "mascot"}
              assistantBootstrap={fusionBootstrap}
              onBack={goHub}
            />
          : def.kind === "logo_wizard" ?
            <EditorLogoPlacementWizard
              initialTargetObjectId={searchParams.get("targetObjectId") ?? undefined}
              onBack={goHub}
            />
          : referenceConfig ?
            <EditorReferenceRoleFlow
              key={`character-studio-${flowId}-${fusionIntent}`}
              config={referenceConfig}
              combineIntent={fusionIntent}
              assistantFusionBootstrap={fusionBootstrap}
              onBack={goHub}
              onClose={goHub}
              onComplete={noopComplete}
              hideEditorHandoff
            />
          : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}

export function parseCharacterStudioFlowParam(
  value: string | null
): CharacterStudioFlowId | null {
  if (!value || !isCharacterStudioFlowId(value)) {
    return null;
  }
  const def = characterStudioFlowDefinition(value);
  if (def.kind === "studio_motion") {
    return null;
  }
  return value;
}
