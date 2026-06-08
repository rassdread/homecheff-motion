"use client";

import { useEffect, useMemo, useState } from "react";
import { StudioWizardChoiceGrid } from "@/components/studio/studio-wizard-choice-grid";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { fetchAssetDerivationSources } from "@/lib/studio-asset-derivation-client";
import { buildSourceTransformChoiceDef } from "@/lib/studio-asset-transformation-options";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { buildSourceTransformSummaryPrompt } from "@/lib/studio-asset-wizard-source-flow";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  kind: StudioAssetKind;
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
  onChangeSource: () => void;
};

export function StudioWizardSourceTransformStep({ kind, draft, onDraftChange, onChangeSource }: Props) {
  const t = useActiveTranslator();
  const [sources, setSources] = useState<AssetDerivationSourceListItem[]>([]);

  useEffect(() => {
    void fetchAssetDerivationSources().then((res) => {
      if (res.ok) {
        setSources(res.data.sources);
      }
    });
  }, []);

  const def = useMemo(() => buildSourceTransformChoiceDef(kind, sources), [kind, sources]);

  if (!def) {
    return null;
  }

  const handleSelect = (id: string) => {
    onDraftChange((d) => {
      const next = {
        ...d,
        sourceTransformChoice: id,
        referenceMode: "generate" as const,
      };
      const summaryPrompt = buildSourceTransformSummaryPrompt({
        ...next,
        sourceTransformChoice: id,
      });
      return { ...next, summaryPrompt, referenceGenerationStatus: "idle" as const };
    });
  };

  const handleCustom = (text: string) => {
    onDraftChange((d) => {
      const next = { ...d, sourceTransformCustom: text };
      const summaryPrompt = buildSourceTransformSummaryPrompt(next);
      return { ...next, summaryPrompt };
    });
  };

  return (
    <div className="space-y-4">
      <StudioWizardSourceReferenceBanner draft={draft} />
      <p className="text-sm text-zinc-700">{t("studio.assetCreation.sourceTransform.lead")}</p>
      <StudioWizardChoiceGrid
        def={def}
        selectedId={draft.sourceTransformChoice}
        customText={draft.sourceTransformCustom}
        onSelect={handleSelect}
        onCustomTextChange={handleCustom}
      />
      {draft.sourceTransformChoice === "custom" || draft.sourceTransformCustom ?
        <label className="block text-sm font-medium text-zinc-800">
          {t("studio.assetCreation.sourceTransform.promptLabel")}
          <textarea
            className="mt-2 min-h-[96px] w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            value={draft.sourceTransformCustom}
            onChange={(e) => handleCustom(e.target.value)}
            placeholder={t("studio.assetCreation.sourceTransform.promptPlaceholder")}
          />
        </label>
      : null}
      {draft.summaryPrompt ?
        <div className="rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
            {t("studio.assetCreation.summary.liveLabel")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-800">{draft.summaryPrompt}</p>
        </div>
      : null}
      <button
        type="button"
        onClick={onChangeSource}
        className="min-h-[44px] text-sm font-medium text-[#0067B1] hover:underline"
      >
        {t("studio.assetCreation.sourceTransform.changeSource")}
      </button>
    </div>
  );
}
