"use client";

import { useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { StudioCharacterPrefillReviewCard } from "@/components/studio/studio-character-prefill-review-card";
import { useActiveTranslator } from "@/i18n/client";
import { buildCharacterIdentityPrefillFromPrompt } from "@/lib/studio-character-identity-prompt-prefill";
import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";
import type { CharacterIdentityPrefillResult } from "@/types/studio-character-identity-prefill";

type Props = {
  locale: "en" | "nl";
  prompt: string;
  onPromptChange: (value: string) => void;
  usageContext: string;
  onUsageContextChange: (value: string) => void;
  brandRules: string;
  onBrandRulesChange: (value: string) => void;
  analysisResult: CharacterIdentityPrefillResult | null;
  onAnalysisResult: (result: CharacterIdentityPrefillResult | null) => void;
  onApplyProposal: (prefill: Partial<CharacterIdentityFormValues>, voiceHint: string) => void;
  proposalApplied: boolean;
  onAdjustFocus?: () => void;
};

export function StudioCharacterPromptPrefillPanel({
  locale,
  prompt,
  onPromptChange,
  usageContext,
  onUsageContextChange,
  brandRules,
  onBrandRulesChange,
  analysisResult,
  onAnalysisResult,
  onApplyProposal,
  proposalApplied,
  onAdjustFocus,
}: Props) {
  const t = useActiveTranslator();
  const [error, setError] = useState("");

  const runAnalysis = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError(t("studio.characters.promptPrefill.error.noPrompt"));
      return;
    }
    setError("");
    onAnalysisResult(
      buildCharacterIdentityPrefillFromPrompt({
        input: { prompt: trimmed, usageContext, brandRules },
        locale,
      })
    );
  };

  return (
    <AppCard className="space-y-4 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.characters.promptPrefill.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.characters.promptPrefill.lead")}</p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-zinc-800">
          {t("studio.characters.promptPrefill.promptLabel")}
        </span>
        <textarea
          value={prompt}
          onChange={(e) => {
            onPromptChange(e.target.value);
            onAnalysisResult(null);
          }}
          rows={5}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder={t("studio.characters.promptPrefill.promptPlaceholder")}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">
            {t("studio.characters.promptPrefill.usageLabel")}
          </span>
          <input
            value={usageContext}
            onChange={(e) => onUsageContextChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder={t("studio.characters.promptPrefill.usagePlaceholder")}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-800">
            {t("studio.characters.promptPrefill.brandRulesLabel")}
          </span>
          <input
            value={brandRules}
            onChange={(e) => onBrandRulesChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder={t("studio.characters.promptPrefill.brandRulesPlaceholder")}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!prompt.trim()}
        onClick={runAnalysis}
        className="rounded-full bg-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {t("studio.characters.promptPrefill.analyze")}
      </button>

      {analysisResult ?
        <StudioCharacterPrefillReviewCard
          result={analysisResult}
          proposalApplied={proposalApplied}
          onApplyProposal={() =>
            onApplyProposal(analysisResult.prefill, analysisResult.voiceDirectionHint)
          }
          onAdjust={() => onAdjustFocus?.()}
        />
      : null}

      {error ?
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      : null}
    </AppCard>
  );
}
