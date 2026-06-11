"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { checkGenerationAccess } from "@/lib/editor-generation-gate";
import { fusionPlanCostOptions } from "@/lib/editor-fusion-generation-settings";
import type { EditorUserAccessSnapshot, EstimateEditorGenerationCostOptions, EditorGenerationWorkflow } from "@/types/editor-generation-access";
import type { EditorFusionPlan } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  document?: EditorCanvasDocument;
  user: EditorUserAccessSnapshot;
  workflow?: EditorGenerationWorkflow;
  options?: EstimateEditorGenerationCostOptions;
  preferAd?: boolean;
  useCredits?: boolean;
};

function formatDisclosure(
  t: ReturnType<typeof useActiveTranslator>,
  key: string,
  params?: Record<string, string | number>
): string {
  let text = t(key as never);
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }
  return text;
}

export function EditorGenerationCostPanel({
  document,
  user,
  workflow,
  options,
  preferAd,
  useCredits,
}: Props) {
  const t = useActiveTranslator();
  const fusionPlan = document?.instructionStudioState?.fusionPlan;

  const decision = useMemo(() => {
    const resolvedWorkflow = workflow ?? fusionPlan?.intent;
    if (!resolvedWorkflow) {
      return null;
    }
    const resolvedOptions =
      options ?? (fusionPlan ? fusionPlanCostOptions(fusionPlan, document) : {});
    return checkGenerationAccess({
      user,
      workflow: resolvedWorkflow,
      options: resolvedOptions,
      preferAd,
      useCredits,
    });
  }, [document, fusionPlan, options, preferAd, useCredits, user, workflow]);

  if (!decision) {
    return null;
  }

  const { cost } = decision;
  const disclosure = formatDisclosure(t, decision.disclosureKey, decision.disclosureParams);

  return (
    <section
      className={`space-y-2 rounded-xl border px-4 py-3 text-sm ${studioVisual.editorSurface} ${
        decision.allowed ? "border-emerald-200 bg-emerald-50/40" : "border-amber-200 bg-amber-50/50"
      }`}
      data-testid="editor-generation-cost-panel"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.generation.cost.title" as never)}
      </p>
      <p className="font-medium text-zinc-900">
        {t("editor.generation.cost.willGenerate" as never, { count: cost.generationCount } as never)}
      </p>
      <p className="text-zinc-700">{disclosure}</p>
      {cost.reason ?
        <p className="text-xs text-amber-800">{cost.reason}</p>
      : null}
      {!decision.allowed && decision.blockedReason ?
        <p className="text-xs font-semibold text-amber-900">
          {t(`editor.generation.blocked.${decision.blockedReason}` as never)}
        </p>
      : null}
    </section>
  );
}
