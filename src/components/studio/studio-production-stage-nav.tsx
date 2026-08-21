"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  STAGE_LABEL_KEYS,
  STAGE_STATUS_LABEL_KEYS,
  STUDIO_PRODUCTION_STAGE_IDS,
  type StudioProductionStageId,
  type StudioStageReadinessStatus,
  type StudioStageStatus,
} from "@/lib/studio-production-stages";

type Props = {
  activeStage: StudioProductionStageId;
  stageStatuses: StudioStageStatus[];
  onStageChange: (stageId: StudioProductionStageId) => void;
  disabled?: boolean;
};

function statusGlyph(status: StudioStageReadinessStatus): string {
  switch (status) {
    case "READY":
      return "✓";
    case "NEEDS_ATTENTION":
      return "!";
    case "IN_PROGRESS":
      return "•";
    case "NOT_STARTED":
    default:
      return "○";
  }
}

export function StudioProductionStageNav({
  activeStage,
  stageStatuses,
  onStageChange,
  disabled = false,
}: Props) {
  const t = useActiveTranslator();
  const statusById = new Map(stageStatuses.map((s) => [s.stageId, s.status]));

  return (
    <nav
      className="w-full border-b border-zinc-200 bg-white/90 px-3 py-2 sm:px-6"
      aria-label={t("studio.productionStage.navLabel")}
      data-testid="studio-production-stage-nav"
    >
      <ul className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STUDIO_PRODUCTION_STAGE_IDS.map((stageId) => {
          const status = statusById.get(stageId) ?? "NOT_STARTED";
          const selected = activeStage === stageId;
          const labelKey = STAGE_LABEL_KEYS[stageId] as TranslationKey;
          const statusKey = STAGE_STATUS_LABEL_KEYS[status] as TranslationKey;
          return (
            <li key={stageId} className="shrink-0">
              <button
                type="button"
                disabled={disabled}
                aria-current={selected ? "step" : undefined}
                aria-label={`${t(labelKey)} — ${t(statusKey)}`}
                onClick={() => onStageChange(stageId)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  selected
                    ? "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1]"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                } disabled:opacity-50`}
                data-testid={`studio-stage-${stageId}`}
                data-stage-status={status}
              >
                <span aria-hidden className="text-sm font-bold leading-none">
                  {statusGlyph(status)}
                </span>
                <span>{t(labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
