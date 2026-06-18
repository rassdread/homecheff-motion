"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { StudioCopilotPlacement } from "@/types/studio-copilot-layout";

type Props = {
  placement: StudioCopilotPlacement;
  onPlacementChange: (placement: StudioCopilotPlacement) => void;
  compact?: boolean;
};

const PLACEMENTS: StudioCopilotPlacement[] = ["side", "wide", "dock", "focus"];

export function StudioCopilotHeader({ placement, onPlacementChange, compact = false }: Props) {
  const t = useActiveTranslator();

  return (
    <header
      className={`shrink-0 border-b border-zinc-100 bg-gradient-to-r from-[#006D52]/5 to-[#0067B1]/5 ${compact ? "px-3 py-2" : "px-4 py-3"}`}
      data-testid="studio-copilot-header"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={`font-bold text-zinc-900 ${compact ? "text-xs" : "text-sm"}`}>
            {t("studioCopilot.title" as never)}
          </h2>
          {!compact ? (
            <p className="text-[11px] text-zinc-500">{t("studioCopilot.subtitle" as never)}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1" role="tablist" aria-label={t("studioCopilot.placement.label" as never)}>
          {PLACEMENTS.map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={placement === mode}
              className={`rounded-full border px-2 py-1 text-[10px] font-medium transition-colors ${
                placement === mode
                  ? "border-[#0067B1]/40 bg-[#0067B1]/10 text-[#0067B1]"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
              data-testid={`studio-copilot-placement-${mode}`}
              onClick={() => onPlacementChange(mode)}
            >
              {t(`studioCopilot.placement.${mode}` as never)}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
