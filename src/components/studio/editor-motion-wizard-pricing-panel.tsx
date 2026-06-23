"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  motionWizardIncludedFeatures,
  resolveMotionWizardGeneratePrice,
  type MotionWizardWorkflowId,
} from "@/lib/wizard-workflow-pricing";
import { wizardIncludedFeatureLabelKey } from "@/lib/wizard-user-copy";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  workflowId: MotionWizardWorkflowId;
  visionAnalysisComplete: boolean;
  isAdmin?: boolean;
};

export function EditorMotionWizardPricingPanel({
  workflowId,
  visionAnalysisComplete,
  isAdmin,
}: Props) {
  const t = useActiveTranslator();
  const price = useMemo(
    () =>
      resolveMotionWizardGeneratePrice({
        workflowId,
        userIsAdmin: Boolean(isAdmin),
      }),
    [workflowId, isAdmin]
  );

  const features = motionWizardIncludedFeatures();
  const actionLabel =
    workflowId === "full_body_extension"
      ? t("motionReady.wizard.pricing.actionFullBody" as never)
      : t("motionReady.wizard.pricing.actionMotionReady" as never);

  return (
    <section
      className={`space-y-4 rounded-xl border border-zinc-200 px-4 py-4 text-sm ${studioVisual.editorSurface}`}
      data-testid="motion-wizard-pricing-panel"
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
        {!price.adminBypass && visionAnalysisComplete ?
          <p className="mt-1 text-xs text-zinc-600">
            {t("editor.wizardPricing.cacheReuse" as never)}
          </p>
        : null}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("editor.wizardPricing.includedTitle" as never)}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-zinc-700">
          {features.map((feature) => (
            <li key={feature}>• {t(wizardIncludedFeatureLabelKey(feature) as never)}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-zinc-600">
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

export function formatMotionGenerateButtonLabel(input: {
  workflowId: MotionWizardWorkflowId;
  visionAnalysisComplete: boolean;
  isAdmin?: boolean;
  t: (key: string) => string;
}): string {
  const price = resolveMotionWizardGeneratePrice({
    workflowId: input.workflowId,
    userIsAdmin: Boolean(input.isAdmin),
  });
  const actionLabel =
    input.workflowId === "full_body_extension"
      ? input.t("motionReady.wizard.pricing.actionFullBody")
      : input.t("motionReady.wizard.pricing.actionMotionReady");
  if (price.adminBypass) {
    return input.t("editor.wizardPricing.makeActionAdmin").replace("{action}", actionLabel);
  }
  return input
    .t("editor.wizardPricing.makeAction")
    .replace("{action}", actionLabel)
    .replace("{credits}", String(price.totalCredits));
}
