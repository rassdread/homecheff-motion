"use client";

import { useCallback, useState } from "react";
import { StudioAssetPrefillReviewCard } from "@/components/studio/studio-asset-prefill-review-card";
import { useActiveTranslator } from "@/i18n/client";
import { buildAssetIdentityPrefillFromImages } from "@/lib/studio-asset-identity-prefill";
import type { AssetPromptPrefillProposal, StudioAssetKind } from "@/types/studio-asset-creation";

type Props = {
  kind: StudioAssetKind;
  fileName?: string;
  onApply: (proposal: AssetPromptPrefillProposal) => void;
  onProposalReady?: (proposal: AssetPromptPrefillProposal) => void;
};

export function StudioAssetImagePrefillHint({ kind, fileName, onApply, onProposalReady }: Props) {
  const t = useActiveTranslator();
  const [proposal, setProposal] = useState<AssetPromptPrefillProposal | null>(null);
  const [applied, setApplied] = useState(false);

  const handleAnalyze = useCallback(() => {
    const next = buildAssetIdentityPrefillFromImages({
      kind,
      fileNames: fileName ? [fileName] : [],
    });
    setProposal(next);
    setApplied(false);
    onProposalReady?.(next);
  }, [kind, fileName, onProposalReady]);

  if (!fileName) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <button
        type="button"
        onClick={handleAnalyze}
        className="rounded-full border border-[#0067B1]/40 px-3 py-1.5 text-xs font-semibold text-[#0067B1]"
      >
        {t("studio.assetCreation.imageStep.analyze")}
      </button>
      {proposal ?
        <StudioAssetPrefillReviewCard
          proposal={proposal}
          applied={applied}
          onApply={() => {
            setApplied(true);
            onApply(proposal);
          }}
          onDismiss={() => setProposal(null)}
        />
      : null}
    </div>
  );
}
