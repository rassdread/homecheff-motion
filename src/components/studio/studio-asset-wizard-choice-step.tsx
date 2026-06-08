"use client";

import { useMemo } from "react";
import { StudioWizardChoiceGrid } from "@/components/studio/studio-wizard-choice-grid";
import { useActiveTranslator } from "@/i18n/client";
import type { WizardChoiceStepDef } from "@/lib/studio-asset-wizard-choices";
import {
  buildWizardSummaryPrompt,
  deriveWizardDraftText,
} from "@/lib/studio-asset-wizard-summary-prompt";
import { syncChoiceDraft, type AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

type Props = {
  kind: StudioAssetKind;
  def: WizardChoiceStepDef;
  draft: AssetWizardDraft;
  onDraftChange: (patch: Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft)) => void;
};

export function StudioAssetWizardChoiceStep({ kind, def, draft, onDraftChange }: Props) {
  const t = useActiveTranslator();

  const summaryLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const [stepId, optionId] of Object.entries(draft.choices)) {
      labels[`${stepId}.${optionId}`] = t(
        `studio.assetCreation.choices.${stepId}.${optionId}` as never
      );
    }
    return labels;
  }, [draft.choices, t]);

  const handleSelect = (optionId: string) => {
    onDraftChange((d) => {
      const choices = { ...d.choices, [def.id]: optionId };
      const summaryPrompt = buildWizardSummaryPrompt(kind, choices, d.customTexts, summaryLabels);
      const derived = deriveWizardDraftText(kind, choices, d.customTexts, summaryPrompt, d.name);
      return syncChoiceDraft(d, {
        choices,
        summaryPrompt,
        name: derived.name,
        description: derived.description,
      });
    });
  };

  const handleCustomText = (text: string) => {
    onDraftChange((d) => {
      const customTexts = { ...d.customTexts, [def.id]: text };
      const summaryPrompt = buildWizardSummaryPrompt(kind, d.choices, customTexts, summaryLabels);
      const derived = deriveWizardDraftText(kind, d.choices, customTexts, summaryPrompt, d.name);
      return syncChoiceDraft(d, {
        customTexts,
        summaryPrompt,
        name: derived.name,
        description: derived.description,
      });
    });
  };

  const disabledIds =
    def.id === "character_voice" ? ["my_voice"] : [];

  return (
    <div className="space-y-4">
      <StudioWizardChoiceGrid
        def={def}
        selectedId={draft.choices[def.id] ?? null}
        customText={draft.customTexts[def.id] ?? ""}
        onSelect={handleSelect}
        onCustomTextChange={handleCustomText}
        disabledOptionIds={disabledIds}
        disabledHintKey={
          def.id === "character_voice" ? "studio.assetCreation.choices.character_voice.myVoiceHint" : undefined
        }
      />
      {draft.summaryPrompt ?
        <div className="rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
            {t("studio.assetCreation.summary.liveLabel")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-800">{draft.summaryPrompt}</p>
        </div>
      : null}
    </div>
  );
}
