"use client";

import { useActiveTranslator } from "@/i18n/client";
import { toggleBriefSelection } from "@/lib/studio-production-brief-selection";
import type { StudioProductionBriefSelections } from "@/types/studio-production-brief-v3";

type CardGroupProps<K extends keyof StudioProductionBriefSelections> = {
  groupKey: K;
  labelKey: string;
  options: StudioProductionBriefSelections[K][number][];
  selections: StudioProductionBriefSelections;
  onChange: (next: StudioProductionBriefSelections) => void;
};

function CardGroup<K extends keyof StudioProductionBriefSelections>({
  groupKey,
  labelKey,
  options,
  selections,
  onChange,
}: CardGroupProps<K>) {
  const t = useActiveTranslator();
  const selected = selections[groupKey] as string[];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t(labelKey as never)}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={String(opt)}
              type="button"
              onClick={() =>
                onChange({
                  ...selections,
                  [groupKey]: toggleBriefSelection(selected, opt) as StudioProductionBriefSelections[K],
                })
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active ? "border-[#006D52] bg-[#006D52] text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
              }`}
            >
              {t(`studio.briefV3.${groupKey}.${opt}` as never)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  selections: StudioProductionBriefSelections;
  onChange: (next: StudioProductionBriefSelections) => void;
};

export function BriefSelectionCards({ selections, onChange }: Props) {
  return (
    <div className="space-y-4" data-testid="brief-selection-cards">
      <CardGroup
        groupKey="goals"
        labelKey="studio.briefV3.group.goal"
        options={["sell", "explain", "promote", "story", "social", "education"]}
        selections={selections}
        onChange={onChange}
      />
      <CardGroup
        groupKey="tones"
        labelKey="studio.briefV3.group.tone"
        options={["emotional", "inspiring", "funny", "serious", "energetic", "luxury"]}
        selections={selections}
        onChange={onChange}
      />
      <CardGroup
        groupKey="narrative"
        labelKey="studio.briefV3.group.narrative"
        options={["narrator", "characters", "both"]}
        selections={selections}
        onChange={onChange}
      />
      <CardGroup
        groupKey="pace"
        labelKey="studio.briefV3.group.pace"
        options={["slow", "normal", "fast"]}
        selections={selections}
        onChange={onChange}
      />
      <CardGroup
        groupKey="length"
        labelKey="studio.briefV3.group.length"
        options={["short", "medium", "long"]}
        selections={selections}
        onChange={onChange}
      />
      <CardGroup
        groupKey="audience"
        labelKey="studio.briefV3.group.audience"
        options={["consumers", "business", "youth", "seniors", "general"]}
        selections={selections}
        onChange={onChange}
      />
    </div>
  );
}
