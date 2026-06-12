"use client";

import { useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { persistHcWorkflowV2WithSync } from "@/lib/hc-workflow-persist";
import {
  buildAiEverythingPipelinePlan,
  buildAutoConceptForRequirement,
  checkAiEverythingCredits,
  storeAiEverythingStateInHc,
  type AiEverythingPipelinePlan,
} from "@/lib/studio-ai-everything-pipeline";
import {
  generateBriefAssetImage,
  persistGeneratedBriefAssetToHc,
} from "@/lib/studio-brief-asset-generation";
import type { BriefWizardKind } from "@/components/studio/studio-brief-asset-wizard-panel";
import type { StudioProductionBrief } from "@/types/studio-production-brief";
import type { StudioProductionBriefV4Selections } from "@/types/studio-production-brief-v4";
import type { StudioStoryPlan } from "@/types/studio-production-brief-v3";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Props = {
  brief: StudioProductionBrief;
  selections: StudioProductionBriefV4Selections;
  hcProject: HomeCheffProjectPackage | null;
  storyPlan: StudioStoryPlan | null;
  availableCredits?: number;
  onPlanReady: (plan: AiEverythingPipelinePlan, storyPlan: StudioStoryPlan) => void;
  onComplete: (href: string) => void;
};

export function StudioAiEverythingPanel({
  brief,
  selections,
  hcProject,
  storyPlan,
  availableCredits = 99,
  onPlanReady,
  onComplete,
}: Props) {
  const t = useActiveTranslator();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<AiEverythingPipelinePlan | null>(null);
  const [progress, setProgress] = useState("");

  const runPipeline = async () => {
    setBusy(true);
    setError("");
    setProgress(t("studio.aiEverything.analyzing" as never));

    const pipelinePlan = buildAiEverythingPipelinePlan({ brief, selections });
    setPlan(pipelinePlan);
    onPlanReady(pipelinePlan, pipelinePlan.storyPlan);

    const gate = checkAiEverythingCredits(pipelinePlan, availableCredits);
    if (!gate.ok) {
      setError(gate.message);
      setBusy(false);
      return;
    }

    if (!hcProject) {
      setError(t("studio.aiEverything.hcRequired" as never));
      setBusy(false);
      return;
    }

    let nextHc = storeAiEverythingStateInHc(hcProject, pipelinePlan);
    persistHcWorkflowV2WithSync(nextHc, {});

    const visualReqs = pipelinePlan.assetRequirements.filter(
      (r) => r.status === "missing" && ["character", "location", "prop", "world"].includes(r.kind)
    );

    for (const req of visualReqs) {
      setProgress(t("studio.aiEverything.generating" as never, { asset: req.label } as never));
      const concept = buildAutoConceptForRequirement(req, brief.idea);
      const gen = await generateBriefAssetImage({
        kind: req.kind as BriefWizardKind,
        concept,
        projectId: nextHc.id,
      });
      if (!gen.ok) {
        setError(gen.error);
        setBusy(false);
        return;
      }
      nextHc = persistGeneratedBriefAssetToHc(nextHc, gen.asset);
      persistHcWorkflowV2WithSync(nextHc, {});
    }

    setProgress(t("studio.aiEverything.opening" as never));
    onComplete(`/studio/storyboards/new?hcProject=${encodeURIComponent(nextHc.id)}&aiEverything=1`);
    setBusy(false);
  };

  return (
    <AppCard className="border-violet-200 bg-violet-50/60 p-4">
      <h3 className="text-base font-semibold text-violet-950">{t("studio.aiEverything.title" as never)}</h3>
      <p className="mt-1 text-sm text-violet-900/80">{t("studio.aiEverything.lead" as never)}</p>

      {plan ?
        <dl className="mt-3 grid gap-2 text-xs text-violet-900 sm:grid-cols-3">
          <div>
            <dt className="font-medium">{t("studio.aiEverything.credits" as never)}</dt>
            <dd>{plan.estimatedCredits}</dd>
          </div>
          <div>
            <dt className="font-medium">{t("studio.aiEverything.wait" as never)}</dt>
            <dd>~{plan.estimatedWaitMinutes} min</dd>
          </div>
          <div>
            <dt className="font-medium">{t("studio.aiEverything.scenes" as never)}</dt>
            <dd>{plan.storyPlan.scenes.length}</dd>
          </div>
        </dl>
      : null}

      {storyPlan ?
        <p className="mt-2 text-xs text-emerald-800">
          {t("studio.aiEverything.storyReady" as never, { count: String(storyPlan.scenes.length) } as never)}
        </p>
      : null}

      {error ?
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">{error}</p>
      : null}
      {progress && busy ?
        <p className="mt-2 text-xs text-violet-800">{progress}</p>
      : null}

      <GradientButton type="button" className="mt-4 w-full" disabled={busy} onClick={() => void runPipeline()}>
        {busy ? t("button.loading") : t("studio.aiEverything.generateAll" as never)}
      </GradientButton>
    </AppCard>
  );
}
