"use client";

import { useEffect, useRef } from "react";
import { StudioWizardSourceReferenceBanner } from "@/components/studio/studio-wizard-source-reference-banner";
import { useActiveTranslator } from "@/i18n/client";
import { ANIMATION_PREPARATION_ACTIONS } from "@/lib/studio-asset-animation-readiness";
import { seedAnimationReadinessAnalysis } from "@/lib/studio-asset-wizard-preparation-flow";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  onDraftChange: (patch: DraftPatch) => void;
};

export function StudioWizardAnimationReadinessStep({ draft, onDraftChange }: Props) {
  const t = useActiveTranslator();
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current || !draft.sourceVisionAnalysis || draft.animationReadinessAnalysis) {
      return;
    }
    seededRef.current = true;
    onDraftChange(seedAnimationReadinessAnalysis(draft));
  }, [draft, onDraftChange]);

  const analysis = draft.animationReadinessAnalysis;

  const toggleAction = (actionId: string) => {
    const selected = new Set(draft.animationPreparationActions);
    if (selected.has(actionId)) {
      selected.delete(actionId);
    } else {
      selected.add(actionId);
    }
    onDraftChange({
      animationPreparationActions: [...selected],
      animationReadinessConfirmed: false,
    });
  };

  return (
    <div className="space-y-5">
      <StudioWizardSourceReferenceBanner draft={draft} />

      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.assetCreation.animationReadiness.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.assetCreation.animationReadiness.lead")}</p>
      </div>

      {analysis ?
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("studio.assetCreation.animationReadiness.scoreLabel")}
            </p>
            <p className="mt-1 text-3xl font-bold text-[#0067B1]">{analysis.score}%</p>
            <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">{t("studio.assetCreation.animationReadiness.check.identity")}</dt>
                <dd className="font-semibold">{analysis.checks.identityConfidence}%</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("studio.assetCreation.animationReadiness.check.fullBody")}</dt>
                <dd className="font-semibold">
                  {analysis.checks.fullBodyVisible
                    ? t("studio.assetCreation.animationReadiness.yes")
                    : t("studio.assetCreation.animationReadiness.no")}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("studio.assetCreation.animationReadiness.check.arms")}</dt>
                <dd className="font-semibold">
                  {analysis.checks.armsVisible
                    ? t("studio.assetCreation.animationReadiness.yes")
                    : t("studio.assetCreation.animationReadiness.no")}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{t("studio.assetCreation.animationReadiness.check.legs")}</dt>
                <dd className="font-semibold">
                  {analysis.checks.legsVisible
                    ? t("studio.assetCreation.animationReadiness.yes")
                    : t("studio.assetCreation.animationReadiness.no")}
                </dd>
              </div>
            </dl>
          </div>

          {analysis.issues.length > 0 ?
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm">
              <p className="font-semibold text-amber-900">{t("studio.assetCreation.animationReadiness.issuesTitle")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                {analysis.issues.map((issue) => (
                  <li key={issue.id}>{t(issue.messageKey as never)}</li>
                ))}
              </ul>
            </div>
          : null}

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold text-zinc-900">
              {t("studio.assetCreation.animationReadiness.actionsTitle")}
            </p>
            <div className="space-y-2">
              {ANIMATION_PREPARATION_ACTIONS.map((action) => {
                const recommended = analysis.recommendedActions.includes(action.id);
                const selected = draft.animationPreparationActions.includes(action.id);
                return (
                  <label
                    key={action.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                      selected ? "border-[#0067B1] bg-[#0067B1]/5" : "border-zinc-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleAction(action.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-semibold text-zinc-900">{t(action.labelKey as never)}</span>
                      {recommended ?
                        <span className="ml-2 text-xs font-medium text-[#0067B1]">
                          {t("studio.assetCreation.animationReadiness.recommended")}
                        </span>
                      : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        </>
      : null}

      <button
        type="button"
        disabled={!analysis}
        onClick={() => onDraftChange({ animationReadinessConfirmed: true })}
        className="min-h-[48px] rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {t("studio.assetCreation.animationReadiness.confirm")}
      </button>
    </div>
  );
}
