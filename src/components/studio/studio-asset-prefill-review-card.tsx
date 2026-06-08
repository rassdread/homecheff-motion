"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { AssetPromptPrefillProposal } from "@/types/studio-asset-creation";

type Props = {
  proposal: AssetPromptPrefillProposal;
  applied: boolean;
  onApply: () => void;
  onDismiss: () => void;
};

export function StudioAssetPrefillReviewCard({ proposal, applied, onApply, onDismiss }: Props) {
  const t = useActiveTranslator();
  const confidencePct = Math.round(proposal.confidence * 100);

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-5">
      <h3 className="text-sm font-bold text-violet-950">{t("studio.assetCreation.proposal.title")}</h3>
      <p className="mt-1 text-xs text-violet-800">{t("studio.assetCreation.proposal.lead")}</p>
      <p className="mt-3 text-xs text-violet-900">
        {t("studio.assetCreation.proposal.confidence", { percent: confidencePct })}
      </p>
      {proposal.missingFields.length > 0 ?
        <p className="mt-2 text-xs text-amber-900">
          {t("studio.assetCreation.proposal.missing", {
            fields: proposal.missingFields.join(", "),
          })}
        </p>
      : null}
      {proposal.conflicts?.length ?
        <ul className="mt-2 space-y-1 text-xs text-amber-900">
          {proposal.conflicts.map((c) => (
            <li key={c.field}>
              {t("studio.assetCreation.proposal.conflict", {
                field: c.field,
                image: c.imageValue,
                prompt: c.promptValue,
              })}
            </li>
          ))}
        </ul>
      : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApply}
          disabled={applied}
          className="min-h-[40px] rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {applied ? t("studio.assetCreation.proposal.applied") : t("studio.assetCreation.proposal.apply")}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-[40px] rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-900"
        >
          {t("studio.assetCreation.proposal.dismiss")}
        </button>
      </div>
    </div>
  );
}
