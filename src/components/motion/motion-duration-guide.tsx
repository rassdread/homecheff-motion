"use client";

import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  value?: 3 | 5 | 8;
  onChange?: (duration: 3 | 5 | 8) => void;
};

const DURATIONS = [3, 5, 8] as const;

export function MotionDurationGuide({ value = 5, onChange }: Props) {
  const t = useActiveTranslator();

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4" data-testid="motion-duration-guide">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t("motion.duration.title" as never)}</p>
      <p className="text-sm text-zinc-600">{t("motion.duration.lead" as never)}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange?.(d)}
            className={`rounded-xl border p-3 text-left transition ${
              value === d ? "border-emerald-400 bg-emerald-50" : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <span className="text-lg font-bold text-zinc-900">{d}s</span>
            <p className="mt-1 text-xs text-zinc-600">{t(`motion.duration.${d}` as never)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
