"use client";

import { useCallback, useState } from "react";
import { StudioAssetPrefillReviewCard } from "@/components/studio/studio-asset-prefill-review-card";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { buildAssetIdentityPrefillFromPrompt } from "@/lib/studio-asset-identity-prefill";
import type { AssetPromptPrefillProposal, StudioAssetKind } from "@/types/studio-asset-creation";

type Props = {
  kind: StudioAssetKind;
  initialProposal?: AssetPromptPrefillProposal | null;
  initialApplied?: boolean;
  onApply: (proposal: AssetPromptPrefillProposal) => void;
};

export function StudioAssetPromptPrefillStep({
  kind,
  initialProposal = null,
  initialApplied = false,
  onApply,
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [promptText, setPromptText] = useState("");
  const [promptUsage, setPromptUsage] = useState("");
  const [promptBrandRules, setPromptBrandRules] = useState("");
  const [proposal, setProposal] = useState<AssetPromptPrefillProposal | null>(initialProposal);
  const [applied, setApplied] = useState(initialApplied);

  const handleAnalyze = useCallback(() => {
    if (!promptText.trim()) {
      return;
    }
    setProposal(
      buildAssetIdentityPrefillFromPrompt({
        kind,
        prompt: promptText,
        usageContext: promptUsage,
        brandRules: promptBrandRules,
        locale: locale === "nl" ? "nl" : "en",
      })
    );
    setApplied(false);
  }, [kind, promptText, promptUsage, promptBrandRules, locale]);

  const handleApply = useCallback(() => {
    if (!proposal) {
      return;
    }
    setApplied(true);
    onApply(proposal);
  }, [proposal, onApply]);

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-bold text-zinc-900">{t("studio.assetCreation.promptStep.title")}</h3>
      <textarea
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
        rows={4}
        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        placeholder={t("studio.assetCreation.proposal.promptPlaceholder")}
      />
      <input
        value={promptUsage}
        onChange={(e) => setPromptUsage(e.target.value)}
        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        placeholder={t("studio.assetCreation.proposal.usageLabel")}
      />
      <button
        type="button"
        onClick={handleAnalyze}
        className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
      >
        {t("studio.assetCreation.proposal.analyze")}
      </button>
      {proposal ?
        <StudioAssetPrefillReviewCard
          proposal={proposal}
          applied={applied}
          onApply={handleApply}
          onDismiss={() => setProposal(null)}
        />
      : null}
    </div>
  );
}
