"use client";

import { useCallback, useMemo, useState } from "react";
import { StudioAssetCreateEntryChoice } from "@/components/studio/studio-asset-create-entry-choice";
import { StudioAssetPrefillReviewCard } from "@/components/studio/studio-asset-prefill-review-card";
import { useActiveTranslator } from "@/i18n/client";
import { useLocale } from "@/i18n/client";
import { StudioAssetCreationFlowProgress } from "@/components/studio/studio-asset-creation-flow-progress";
import { buildAssetIdentityPrefillFromPrompt } from "@/lib/studio-asset-identity-prefill";
import { writeSkipAssetCreationWizard } from "@/lib/studio-asset-creation-preference";
import type {
  AssetCreateEntryPath,
  AssetCreationWizardStep,
  StudioAssetKind,
} from "@/types/studio-asset-creation";

export type AssetCreationWizardResult = {
  kind: StudioAssetKind;
  entryPath: AssetCreateEntryPath;
  proposalApplied: boolean;
  proposal: ReturnType<typeof buildAssetIdentityPrefillFromPrompt> | null;
};

type Props = {
  initialKind?: StudioAssetKind;
  lockKind?: boolean;
  onComplete: (result: AssetCreationWizardResult) => void;
  onSkipToClassic: () => void;
};

const KIND_OPTIONS: StudioAssetKind[] = ["character", "prop", "location", "world"];

const STEP_ORDER: AssetCreationWizardStep[] = ["kind", "entry", "proposal", "builder"];

export function StudioAssetCreationWizard({
  initialKind = "character",
  lockKind = false,
  onComplete,
  onSkipToClassic,
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const [kind, setKind] = useState<StudioAssetKind>(initialKind);
  const [step, setStep] = useState<AssetCreationWizardStep>(lockKind ? "entry" : "kind");
  const [entryPath, setEntryPath] = useState<AssetCreateEntryPath | null>(null);
  const [promptText, setPromptText] = useState("");
  const [promptUsage, setPromptUsage] = useState("");
  const [promptBrandRules, setPromptBrandRules] = useState("");
  const [proposal, setProposal] = useState<ReturnType<typeof buildAssetIdentityPrefillFromPrompt> | null>(
    null
  );
  const [proposalApplied, setProposalApplied] = useState(false);
  const [skipWizardRemember, setSkipWizardRemember] = useState(false);

  const needsProposalStep = useMemo(
    () => entryPath === "prompt_only" || entryPath === "image_and_prompt",
    [entryPath]
  );

  const handleEntrySelect = useCallback(
    (path: AssetCreateEntryPath) => {
      setEntryPath(path);
      if (path === "prompt_only" || path === "image_and_prompt") {
        setStep("proposal");
      } else {
        onComplete({
          kind,
          entryPath: path,
          proposalApplied: false,
          proposal: null,
        });
      }
    },
    [kind, onComplete]
  );

  const handleAnalyzePrompt = useCallback(() => {
    if (!promptText.trim()) {
      return;
    }
    const next = buildAssetIdentityPrefillFromPrompt({
      kind,
      prompt: promptText,
      usageContext: promptUsage,
      brandRules: promptBrandRules,
      locale: locale === "nl" ? "nl" : "en",
    });
    setProposal(next);
    setProposalApplied(false);
  }, [kind, promptText, promptUsage, promptBrandRules, locale]);

  const handleApplyProposal = useCallback(() => {
    setProposalApplied(true);
  }, []);

  const handleContinueFromProposal = useCallback(() => {
    if (!entryPath) {
      return;
    }
    onComplete({
      kind,
      entryPath,
      proposalApplied,
      proposal,
    });
  }, [kind, entryPath, proposalApplied, proposal, onComplete]);

  const handleSkip = useCallback(() => {
    if (skipWizardRemember) {
      writeSkipAssetCreationWizard(true);
    }
    onSkipToClassic();
  }, [skipWizardRemember, onSkipToClassic]);

  return (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">{t("studio.assetCreation.wizard.title")}</h2>
          <p className="mt-1 text-sm text-zinc-600">{t("studio.assetCreation.wizard.lead")}</p>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm font-medium text-[#006D52] hover:underline"
        >
          {t("studio.assetCreation.wizard.skipClassic")}
        </button>
      </div>

      <StudioAssetCreationFlowProgress phase="wizard" wizardStep={step} />

      {step === "kind" && !lockKind ?
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-900">
            {t("studio.assetCreation.wizard.kindQuestion")}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {KIND_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setKind(option);
                  setStep("entry");
                }}
                className="rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm font-semibold hover:border-[#0067B1]/40"
              >
                {t(`studio.assetCreation.kind.${option}` as never)}
              </button>
            ))}
          </div>
        </div>
      : null}

      {step === "entry" ?
        <StudioAssetCreateEntryChoice onSelect={handleEntrySelect} />
      : null}

      {step === "proposal" && needsProposalStep ?
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-zinc-900">
            {t("studio.assetCreation.proposal.promptLabel")}
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              placeholder={t("studio.assetCreation.proposal.promptPlaceholder")}
            />
          </label>
          <label className="block text-sm text-zinc-700">
            {t("studio.assetCreation.proposal.usageLabel")}
            <input
              value={promptUsage}
              onChange={(e) => setPromptUsage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleAnalyzePrompt}
            className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("studio.assetCreation.proposal.analyze")}
          </button>
          {proposal ?
            <StudioAssetPrefillReviewCard
              proposal={proposal}
              applied={proposalApplied}
              onApply={handleApplyProposal}
              onDismiss={() => setProposal(null)}
            />
          : null}
          <button
            type="button"
            onClick={handleContinueFromProposal}
            disabled={Boolean(proposal) && !proposalApplied}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t("studio.assetCreation.wizard.continueToBuilder")}
          </button>
        </div>
      : null}

      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={skipWizardRemember}
          onChange={(e) => setSkipWizardRemember(e.target.checked)}
        />
        {t("studio.assetCreation.wizard.rememberSkip")}
      </label>
    </div>
  );
}
