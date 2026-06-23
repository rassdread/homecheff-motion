"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildMotionQualityUserFeedback } from "@/lib/motion-quality-user-feedback";
import type { MotionPresetEngineSnapshot } from "@/types/motion-preset-engine";

type Props = {
  snapshot: MotionPresetEngineSnapshot | null;
  analyzing?: boolean;
};

export function MotionPresetEnginePanel({ snapshot, analyzing }: Props) {
  const t = useActiveTranslator();

  const feedback = useMemo(() => {
    if (!snapshot) {
      return null;
    }
    return buildMotionQualityUserFeedback({
      qualityScore: snapshot.qualityValidation.qualityScore,
      analysisCached: snapshot.complexityEstimate.analysisCached,
    });
  }, [snapshot]);

  if (!snapshot) {
    return null;
  }

  const { requirementEvaluation, complexityEstimate, qualityValidation } = snapshot;

  return (
    <section
      className="mb-4 rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-3 sm:px-4"
      data-testid="motion-preset-engine-panel"
    >
      <p className="text-sm font-semibold text-sky-950">
        {t("motionEngine.panel.title" as never)}
      </p>
      {analyzing ? (
        <p className="mt-1 text-xs text-sky-800">{t("motionEngine.panel.analyzing" as never)}</p>
      ) : feedback ? (
        <p className="mt-1 text-xs text-sky-900/80">{t(feedback.overallMessageKey as never)}</p>
      ) : null}

      {feedback ? (
        <ul className="mt-2 space-y-1 text-[11px] text-sky-950/90">
          <li>• {t(feedback.identityMessageKey as never)}</li>
          <li>• {t(feedback.motionMessageKey as never)}</li>
          <li>• {t(feedback.presetMessageKey as never)}</li>
          {feedback.tips.map((tipKey) => (
            <li key={tipKey} className="text-amber-900">
              • {t(tipKey as never)}
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-white/80 px-2 py-2">
          <dt className="font-medium text-zinc-500">{t("motionEngine.pricing.analysis" as never)}</dt>
          <dd className="mt-1 text-base font-bold text-zinc-900">
            {complexityEstimate.estimatedAnalysisCredits}
            {complexityEstimate.analysisCached ?
              <span className="ml-1 text-[10px] font-normal text-emerald-700">
                {t("motionEngine.pricing.cached" as never)}
              </span>
            : null}
          </dd>
        </div>
        <div className="rounded-lg bg-white/80 px-2 py-2">
          <dt className="font-medium text-zinc-500">{t("motionEngine.pricing.render" as never)}</dt>
          <dd className="mt-1 text-base font-bold text-zinc-900">
            {complexityEstimate.estimatedRenderCredits}
          </dd>
        </div>
        <div className="rounded-lg bg-white/80 px-2 py-2">
          <dt className="font-medium text-zinc-500">{t("motionEngine.pricing.total" as never)}</dt>
          <dd className="mt-1 text-base font-bold text-zinc-900">
            {complexityEstimate.estimatedTotalCredits}
          </dd>
        </div>
      </dl>

      {requirementEvaluation.missingRequirements.length > 0 ? (
        <p className="mt-3 text-xs font-medium text-amber-900">
          {t("motionEngine.panel.missingRequired" as never)}
        </p>
      ) : null}

      {qualityValidation.warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[11px] text-amber-900">
          {qualityValidation.warnings.map((key) => (
            <li key={key}>• {t(key as never)}</li>
          ))}
        </ul>
      ) : requirementEvaluation.missingRequirements.length === 0 ? (
        <p className="mt-2 text-[11px] text-emerald-800">
          {t("motionEngine.panel.ready" as never)}
        </p>
      ) : null}
    </section>
  );
}
