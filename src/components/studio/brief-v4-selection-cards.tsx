"use client";

import { BriefSelectionCards } from "@/components/studio/brief-selection-cards";
import { useActiveTranslator } from "@/i18n/client";
import { toggleBriefSelection } from "@/lib/studio-production-brief-selection";
import type { StudioProductionBriefV4Selections } from "@/types/studio-production-brief-v4";

type Props = {
  selections: StudioProductionBriefV4Selections;
  onChange: (next: StudioProductionBriefV4Selections) => void;
};

export function BriefV4SelectionCards({ selections, onChange }: Props) {
  const t = useActiveTranslator();

  const toggle = <K extends "emotions" | "visualStyles">(key: K, opt: StudioProductionBriefV4Selections[K][number]) => {
    onChange({
      ...selections,
      [key]: toggleBriefSelection(selections[key] as string[], opt) as StudioProductionBriefV4Selections[K],
    });
  };

  return (
    <div className="space-y-4" data-testid="brief-v4-selection-cards">
      <BriefSelectionCards
        selections={selections}
        onChange={(next) => onChange({ ...selections, ...next })}
      />
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("studio.briefV4.group.emotion" as never)}</p>
        <div className="flex flex-wrap gap-2">
          {(["joy", "trust", "excitement", "calm", "urgency", "nostalgia"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle("emotions", opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                selections.emotions.includes(opt) ? "border-[#006D52] bg-[#006D52] text-white" : "border-zinc-200 bg-white text-zinc-700"
              }`}
            >
              {t(`studio.briefV4.emotions.${opt}` as never)}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("studio.briefV4.group.style" as never)}</p>
        <div className="flex flex-wrap gap-2">
          {(["cinematic", "pixar", "anime", "manga", "cartoon", "realistic", "fantasy"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle("visualStyles", opt)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                selections.visualStyles.includes(opt) ? "border-[#006D52] bg-[#006D52] text-white" : "border-zinc-200 bg-white text-zinc-700"
              }`}
            >
              {t(`studio.briefV4.visualStyles.${opt}` as never)}
            </button>
          ))}
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-violet-50/80 p-3 text-sm">
        <input
          type="checkbox"
          checked={selections.aiEverythingMode}
          onChange={(e) => onChange({ ...selections, aiEverythingMode: e.target.checked })}
        />
        <span>
          <span className="font-semibold text-violet-950">{t("studio.briefV4.aiEverything.title" as never)}</span>
          <span className="mt-0.5 block text-xs text-violet-800">{t("studio.briefV4.aiEverything.desc" as never)}</span>
        </span>
      </label>
    </div>
  );
}
