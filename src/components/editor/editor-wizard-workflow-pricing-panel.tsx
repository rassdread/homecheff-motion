"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { resolveWizardWorkflowPriceFromIntake } from "@/lib/wizard-workflow-pricing";
import {
  wizardIncludedFeatureLabelKey,
  wizardMakeActionLabelKey,
} from "@/lib/wizard-user-copy";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorReferenceIntakeState } from "@/types/editor-reference-role-flow";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

type Props = {
  intake: EditorReferenceIntakeState;
  combineIntent: EditorFusionIntent;
  isAdmin?: boolean;
};

/** Unified wizard pricing — one total price, no per-step analysis/render breakdown for users. */
export function EditorWizardWorkflowPricingPanel({ intake, combineIntent, isAdmin }: Props) {
  const t = useActiveTranslator();
  const price = useMemo(
    () => resolveWizardWorkflowPriceFromIntake({ intake, isAdmin }),
    [intake, isAdmin]
  );

  if (!price) {
    return null;
  }

  const actionLabel = t(wizardMakeActionLabelKey(combineIntent) as never);

  return (
    <section
      className={`space-y-4 rounded-xl border border-zinc-200 px-4 py-4 text-sm ${studioVisual.editorSurface}`}
      data-testid="wizard-workflow-pricing-panel"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("editor.wizardPricing.costTitle" as never)}
        </p>
        <p className="mt-1 text-base font-semibold text-zinc-900">
          {price.adminBypass
            ? t("editor.wizardPricing.adminFree" as never)
            : t("editor.wizardPricing.totalCost" as never, {
                credits: String(price.totalCredits),
              } as never)}
        </p>
        {!price.adminBypass && price.cachedAnalysesUsed > 0 ?
          <p className="mt-1 text-xs text-emerald-700">
            {t("editor.wizardPricing.cacheReuse" as never)}
          </p>
        : null}
      </div>

      <div>
        <p className="text-xs font-semibold text-zinc-700">
          {t("editor.wizardPricing.includedTitle" as never)}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-zinc-700">
          {price.includedFeatures.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span aria-hidden className="text-emerald-600">
                ✓
              </span>
              <span>{t(wizardIncludedFeatureLabelKey(feature) as never)}</span>
            </li>
          ))}
        </ul>
      </div>

      {isAdmin ?
        <dl className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600">
          <div className="flex justify-between gap-2">
            <dt>{t("editor.wizardPricing.admin.analysisCredits" as never)}</dt>
            <dd>{price.analysisCredits}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>{t("editor.wizardPricing.admin.renderCredits" as never)}</dt>
            <dd>{price.renderCredits}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>{t("editor.wizardPricing.admin.cachedAnalyses" as never)}</dt>
            <dd>{price.cachedAnalysesUsed}</dd>
          </div>
        </dl>
      : null}

      <p className="text-xs text-zinc-500" data-testid="wizard-make-button-hint">
        {price.adminBypass
          ? t("editor.wizardPricing.makeActionAdmin" as never, { action: actionLabel } as never)
          : t("editor.wizardPricing.makeAction" as never, {
              action: actionLabel,
              credits: String(price.totalCredits),
            } as never)}
      </p>
    </section>
  );
}

export function formatWizardMakeButtonLabel(input: {
  t: (key: never, params?: never) => string;
  combineIntent: EditorFusionIntent;
  totalCredits: number;
  adminBypass: boolean;
}): string {
  const actionLabel = input.t(wizardMakeActionLabelKey(input.combineIntent) as never);
  if (input.adminBypass) {
    return input.t("editor.wizardPricing.makeActionAdmin" as never, {
      action: actionLabel,
    } as never);
  }
  return input.t("editor.wizardPricing.makeAction" as never, {
    action: actionLabel,
    credits: String(input.totalCredits),
  } as never);
}
