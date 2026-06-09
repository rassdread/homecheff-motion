"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { wizardChoiceDefAtIndex } from "@/lib/studio-asset-wizard-choices";
import { wizardStepLabelKeyForDraft } from "@/lib/studio-asset-wizard-source-flow";
import type { AssetCreationWizardStep, StudioAssetKind } from "@/types/studio-asset-creation";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";

const VISIBLE_LABELS: Record<AssetCreationWizardStep, string> = {
  kind: "studio.assetCreation.wizard.step.kind",
  entry: "studio.assetCreation.wizard.step.entry",
  derive_source: "studio.assetCreation.wizard.step.deriveSource",
  derive_target_kind: "studio.assetCreation.wizard.step.deriveTarget",
  derive_transform: "studio.assetCreation.wizard.step.deriveTransform",
  derive_preview: "studio.assetCreation.wizard.step.derivePreview",
  choice: "studio.assetCreation.wizard.step.choice",
  source_transform: "studio.assetCreation.wizard.step.sourceTransform",
  asset_vision: "studio.assetCreation.wizard.step.assetVision",
  identity_profile: "studio.assetCreation.wizard.step.identityProfile",
  character_evolution: "studio.assetCreation.wizard.step.characterEvolution",
  canonical_evolution_construction: "studio.assetCreation.wizard.step.canonicalEvolutionConstruction",
  character_style: "studio.assetCreation.wizard.step.characterStyle",
  reference_placement: "studio.assetCreation.wizard.step.referencePlacement",
  placement_preview: "studio.assetCreation.wizard.step.placementPreview",
  character_construction: "studio.assetCreation.wizard.step.characterConstruction",
  animation_readiness: "studio.assetCreation.wizard.step.animationReadiness",
  transform_prompt: "studio.assetCreation.wizard.step.transformPrompt",
  reference: "studio.assetCreation.wizard.step.reference",
  input: "studio.assetCreation.wizard.step.input",
  proposal: "studio.assetCreation.wizard.step.proposal",
  essentials: "studio.assetCreation.wizard.step.essentials",
  readiness: "studio.assetCreation.wizard.step.readiness",
  save: "studio.assetCreation.wizard.step.save",
};

type Props = {
  phase: "wizard" | "builder";
  wizardStep?: AssetCreationWizardStep;
  stepSequence?: AssetCreationWizardStep[];
  lockKind?: boolean;
  choiceFlowKind?: StudioAssetKind;
  choiceStepIndex?: number;
  wizardDraft?: AssetWizardDraft | null;
};

export function StudioAssetCreationFlowProgress({
  phase,
  wizardStep = "entry",
  stepSequence,
  lockKind = false,
  choiceFlowKind,
  choiceStepIndex,
  wizardDraft,
}: Props) {
  const t = useActiveTranslator();

  const steps = useMemo(() => {
    if (!stepSequence || stepSequence.length === 0) {
      return lockKind
        ? (["entry", "readiness", "save"] as AssetCreationWizardStep[])
        : (["kind", "entry", "readiness", "save"] as AssetCreationWizardStep[]);
    }
    return stepSequence;
  }, [stepSequence, lockKind]);

  const activeIndex = useMemo(() => {
    if (phase === "builder") {
      return steps.length - 1;
    }
    if (choiceStepIndex !== undefined && wizardStep === "choice") {
      return choiceStepIndex;
    }
    return Math.max(0, steps.indexOf(wizardStep));
  }, [phase, steps, wizardStep, choiceStepIndex]);

  const stepLabel = (step: AssetCreationWizardStep, index: number) => {
    if (wizardDraft) {
      const sourceLabel = wizardStepLabelKeyForDraft(step, wizardDraft);
      if (sourceLabel) {
        return t(sourceLabel as never);
      }
    }
    if (step === "choice" && choiceFlowKind) {
      let choiceIdx = 0;
      for (let i = 0; i < index; i++) {
        if (steps[i] === "choice") {
          choiceIdx++;
        }
      }
      const def = wizardChoiceDefAtIndex(choiceFlowKind, choiceIdx);
      if (def) {
        return t(def.titleKey as never);
      }
    }
    return t(VISIBLE_LABELS[step] as never);
  };

  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-1 text-[11px] font-semibold text-zinc-500">
      {steps.map((step, index) => {
        const active = phase === "builder" ? index <= steps.length - 1 : index <= activeIndex;
        const key = step === "choice" ? `choice-${index}` : step;
        return (
          <li key={key} className={active ? "text-[#0067B1]" : ""}>
            {stepLabel(step, index)}
            {index < steps.length - 1 ? " → " : ""}
          </li>
        );
      })}
    </ol>
  );
}
