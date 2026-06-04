"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";

type Props = {
  intelligence: MotionStudioIntelligenceSnapshot;
  storyboardId: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function MotionImportSummaryBanner({
  intelligence,
  storyboardId,
  onRefresh,
  refreshing,
}: Props) {
  const t = useActiveTranslator();

  return (
    <div className="rounded-xl border border-[#0067B1]/25 bg-gradient-to-r from-[#0067B1]/8 to-[#006D52]/5 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0067B1]">
            {t("motion.qa.importSummary.title")}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {t("motion.qa.importSummary.body", {
              title: intelligence.storyboardTitle,
              scenes: String(intelligence.sceneCount),
              characters: String(intelligence.charactersUsed.length),
              identity: String(intelligence.overallCharacterIdentityScore ?? "—"),
              vision: String(intelligence.overallVisionScore ?? "—"),
              consistency: String(intelligence.overallConsistencyScore ?? "—"),
            })}
          </p>
          <p className="mt-2 text-xs text-zinc-700">
            {t("motion.qa.importSummary.execution", {
              world: intelligence.worldName ?? "—",
              director: intelligence.promptStyleProfile ?? "—",
              characters: String(intelligence.charactersUsed.length),
              locations: String(intelligence.locationsUsed.length),
              props: String(intelligence.propsUsed.length),
              readiness:
                intelligence.executionReadiness ?
                  `${intelligence.executionReadiness.score} (${intelligence.executionReadiness.tier})`
                : intelligence.legacyHandoff ? t("motion.qa.importSummary.executionLegacy")
                : "—",
            })}
          </p>
          {(intelligence.executionWarningCount ?? 0) > 0 ?
            <p className="mt-1 text-xs text-amber-800">
              {t("motion.qa.importSummary.executionWarnings", {
                count: String(intelligence.executionWarningCount),
              })}
            </p>
          : null}
          {intelligence.partialData || intelligence.legacyHandoff ?
            <p className="mt-1 text-xs text-amber-800">{t("motion.qa.importSummary.partial")}</p>
          : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {storyboardId ?
            <Link
              href={`/studio/storyboards/${encodeURIComponent(storyboardId)}`}
              className="rounded-full border border-[#0067B1]/40 px-3 py-1 text-xs font-semibold text-[#0067B1]"
            >
              {t("motion.qa.importSummary.openStoryboard")}
            </Link>
          : null}
          {onRefresh ?
            <button
              type="button"
              disabled={refreshing}
              onClick={onRefresh}
              className="rounded-full border border-[#0067B1]/40 px-3 py-1 text-xs font-semibold text-[#0067B1] disabled:opacity-50"
            >
              {refreshing ? t("motion.handoff.refreshing") : t("motion.handoff.refreshFromStudio")}
            </button>
          : null}
        </div>
      </div>
    </div>
  );
}
