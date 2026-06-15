"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { CharacterEngineSummary, CharacterMotionReadinessResult } from "@/types/character-engine";

type Props = {
  summary: CharacterEngineSummary;
  motionReadiness?: CharacterMotionReadinessResult;
  showContinue?: boolean;
  onContinue?: () => void;
  continueLabelKey?: string;
  testId?: string;
};

export function StudioCharacterAnalysisCard({
  summary,
  motionReadiness,
  showContinue,
  onContinue,
  continueLabelKey = "characterCluster.continue",
  testId,
}: Props) {
  const t = useActiveTranslator();
  const readiness = motionReadiness ?? { ready: summary.motionReady, score: summary.readinessScore };

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4"
      data-testid={testId ?? "character-analysis-card"}
    >
      <h2 className="text-sm font-semibold text-zinc-900">{t(summary.titleKey as never)}</h2>
      <p className="mt-1 text-xs text-zinc-500">{t("characterEngine.summary.analysisComplete" as never)}</p>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("characterEngine.summary.type" as never)}
          </dt>
          <dd className="font-medium text-zinc-900">{summary.characterType}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("characterEngine.summary.completeness" as never)}
          </dt>
          <dd className="font-medium text-zinc-900">{t(summary.completenessLabelKey as never)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase text-zinc-500">
            {t("characterEngine.summary.readiness" as never)}
          </dt>
          <dd className="font-medium text-zinc-900">
            {t("characterEngine.summary.readinessScore" as never, {
              score: String(readiness.score),
            } as never)}
            {readiness.ready ?
              <span className="ml-1 text-[#006D52]">({t("characterEngine.summary.motionReady" as never)})</span>
            : null}
          </dd>
        </div>
      </dl>

      {summary.detectedLines.length > 0 ?
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("characterEngine.summary.detected" as never)}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-zinc-700">
            {summary.detectedLines.map((line) => (
              <li key={line.id} className="flex items-center gap-2">
                <span className="text-[#006D52]">✓</span>
                {t(line.labelKey as never)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      {summary.missingLines.length > 0 ?
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {t("characterEngine.summary.missing" as never)}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-zinc-700">
            {summary.missingLines.map((line) => (
              <li key={line.id} className="flex items-center gap-2">
                <span className="text-amber-600">✗</span>
                {t(line.labelKey as never)}
              </li>
            ))}
          </ul>
        </div>
      : null}

      <p className="mt-3 text-sm text-zinc-600">{t(summary.leadKey as never)}</p>

      {showContinue && onContinue ?
        <button
          type="button"
          className="mt-3 rounded-xl bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
          onClick={onContinue}
        >
          {t(continueLabelKey as never)}
        </button>
      : null}
    </section>
  );
}
