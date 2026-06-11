"use client";

import { useActiveTranslator } from "@/i18n/client";
import { fusionIntentDefinition } from "@/lib/editor-image-fusion-catalog";
import { fusionPlanSummaryLines } from "@/lib/editor-fusion-plan";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
};

export function EditorFusionPlanPanel({ document }: Props) {
  const t = useActiveTranslator();
  const plan = document.instructionStudioState?.fusionPlan;

  if (!plan) {
    return null;
  }

  const def = fusionIntentDefinition(plan.intent);
  const summary = fusionPlanSummaryLines(plan);

  return (
    <section
      className={`space-y-3 p-4 ${studioVisual.editorSurface}`}
      data-testid="editor-fusion-plan-panel"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
          {t("editor.fusion.plan.eyebrow" as never)}
        </p>
        <h3 className="mt-1 text-sm font-bold text-zinc-900">
          {t("editor.fusion.plan.title" as never)}
        </h3>
        <p className="mt-1 text-xs font-medium text-zinc-700">{t(def.labelKey as never)}</p>
      </div>

      <ol className="space-y-1.5 text-xs text-zinc-700">
        {summary.map((line) => (
          <li key={line} className="rounded-lg border border-zinc-200/90 bg-white/90 px-3 py-2">
            {line}
          </li>
        ))}
      </ol>

      {plan.items.length > 0 ?
        <ul className="space-y-1 text-xs text-zinc-600">
          {plan.items.map((item, index) => (
            <li key={item.id}>
              {index + 1}. {item.sourceObjectLabel} — {item.instruction ?? item.targetRole}
            </li>
          ))}
        </ul>
      : null}

      {plan.references.length > 0 ?
        <p className="text-[11px] text-zinc-500">
          {t("editor.fusion.plan.references" as never)}: {plan.references.map((r) => r.name).join(", ")}
        </p>
      : null}
    </section>
  );
}
