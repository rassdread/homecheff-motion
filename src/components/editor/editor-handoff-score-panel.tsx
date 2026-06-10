"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { computeStudioHandoffScore, handoffScoreColor } from "@/lib/editor-v6-handoff-score";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
};

export function EditorHandoffScorePanel({ document }: Props) {
  const t = useActiveTranslator();
  const score = useMemo(() => computeStudioHandoffScore(document), [document]);
  const color = handoffScoreColor(score.score);

  const colorClass =
    color === "emerald" ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : color === "amber" ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <div className={`rounded-2xl border p-4 ${colorClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t("editor.v6.handoff.title" as never)}</p>
        <span className="text-lg font-bold">{score.score}%</span>
      </div>
      <p className="mt-1 text-xs opacity-90">{t(score.labelKey as never)}</p>
      <ul className="mt-3 space-y-1 text-xs">
        {score.checks.map((check) => (
          <li key={check.id}>
            {check.ok ? "✓" : "○"} {t(check.labelKey as never)}
          </li>
        ))}
      </ul>
      {score.warnings.length > 0 ?
        <ul className="mt-2 space-y-1 text-xs font-medium">
          {score.warnings.map((w) => (
            <li key={w.id}>⚠ {t(w.labelKey as never)}</li>
          ))}
        </ul>
      : null}
    </div>
  );
}
