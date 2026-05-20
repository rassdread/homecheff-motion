"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  ANIMATION_MOOD_IDS,
  ANIMATION_MOOD_PRESETS,
  type AnimationMoodId,
} from "@/lib/animation-mood-presets";

type Props = {
  value: AnimationMoodId | null;
  onChange: (mood: AnimationMoodId | null) => void;
};

export function AnimationMoodPanel({ value, onChange }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          {t("instant.creatorStep.mood")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t("instant.mood.intro")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            value === null
              ? "border-violet-500 bg-violet-100 text-violet-950"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-violet-300"
          }`}
        >
          {t("instant.mood.auto")}
        </button>
        {ANIMATION_MOOD_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              value === id
                ? "border-violet-500 bg-violet-100 text-violet-950"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-violet-300"
            }`}
          >
            {t(ANIMATION_MOOD_PRESETS[id].labelKey as never)}
          </button>
        ))}
      </div>
    </div>
  );
}
