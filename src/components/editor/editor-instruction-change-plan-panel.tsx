"use client";

import { useActiveTranslator } from "@/i18n/client";
import { actionLabelKey } from "@/lib/editor-instruction-actions";
import {
  clearChangePlan,
  groupChangePlanByObject,
  listChangePlan,
  removeChangePlanItem,
  reorderChangePlanItem,
} from "@/lib/editor-instruction-change-plan";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onGenerateFromPlan: () => void;
  generating?: boolean;
};

export function EditorInstructionChangePlanPanel({
  document,
  onDocumentChange,
  onGenerateFromPlan,
  generating = false,
}: Props) {
  const t = useActiveTranslator();
  const plan = listChangePlan(document);
  const groups = groupChangePlanByObject(plan);

  if (plan.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-emerald-900">
          {t("editor.instructionStudio.v2.changePlan.title" as never)}
        </h2>
        <button
          type="button"
          className="text-xs text-emerald-800 underline"
          onClick={() => onDocumentChange(clearChangePlan(document))}
        >
          {t("editor.instructionStudio.v2.changePlan.clear" as never)}
        </button>
      </div>
      <ul className="mt-3 space-y-3">
        {groups.map((group) => (
          <li key={group.objectLabel}>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              {group.objectLabel}
            </p>
            <ul className="mt-1 space-y-1">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-white/80 px-2 py-1.5 text-sm text-zinc-800"
                >
                  <span>
                    {t(actionLabelKey(item.action) as never)} — {item.instruction}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="text-[10px] text-zinc-500"
                      aria-label="Move up"
                      onClick={() =>
                        onDocumentChange(reorderChangePlanItem(document, item.id, "up"))
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-zinc-500"
                      aria-label="Move down"
                      onClick={() =>
                        onDocumentChange(reorderChangePlanItem(document, item.id, "down"))
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-red-600"
                      onClick={() => onDocumentChange(removeChangePlanItem(document, item.id))}
                    >
                      {t("editor.instructionStudio.v2.changePlan.remove" as never)}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={generating || plan.length === 0}
        className="mt-3 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        onClick={onGenerateFromPlan}
      >
        {t("editor.instructionStudio.v2.changePlan.generate" as never)}
      </button>
    </section>
  );
}
