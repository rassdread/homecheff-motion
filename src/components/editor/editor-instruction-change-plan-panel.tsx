"use client";

import { useActiveTranslator } from "@/i18n/client";
import { actionLabelKey } from "@/lib/editor-instruction-actions";
import {
  clearChangePlan,
  duplicateChangePlanEntry,
  listChangePlanEntries,
  removeChangePlanItem,
  reorderChangePlanItem,
} from "@/lib/editor-instruction-change-plan";
import { styleAttributeLabelKey } from "@/lib/editor-style-actions";
import { studioVisual } from "@/lib/studio-visual-tokens";
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
  const plan = listChangePlanEntries(document);

  return (
    <section
      className={`p-4 ${studioVisual.editorSurface}`}
      data-testid="instruction-change-plan-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">
          {t("editor.instructionStudio.v2.changePlan.title" as never)}
        </h2>
        {plan.length > 0 ?
          <button
            type="button"
            className="text-xs text-zinc-600 underline hover:text-zinc-900"
            onClick={() => onDocumentChange(clearChangePlan(document))}
          >
            {t("editor.instructionStudio.v2.changePlan.clear" as never)}
          </button>
        : null}
      </div>

      {plan.length === 0 ?
        <p className="mt-3 text-xs text-zinc-500">
          {t("editor.instructionStudio.v2.workspace.changePlanEmpty" as never)}
        </p>
      : (
        <ol className="mt-3 space-y-2">
          {plan.map((item, index) => (
            <li
              key={item.id}
              className="rounded-lg border border-zinc-200/90 bg-white/90 px-3 py-2 text-sm text-zinc-800"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    {index + 1}.{" "}
                    {item.entryType === "style"
                      ? t(styleAttributeLabelKey(item.styleAttribute) as never)
                      : item.objectLabel}
                  </p>
                  <p className="mt-0.5 text-sm">
                    →{" "}
                    {item.entryType === "style"
                      ? item.instruction
                      : `${t(actionLabelKey(item.action) as never)} — ${item.instruction}`}
                  </p>
                </div>
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="text-[10px] text-zinc-500 hover:text-zinc-800"
                    aria-label="Move up"
                    onClick={() =>
                      onDocumentChange(reorderChangePlanItem(document, item.id, "up"))
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-[10px] text-zinc-500 hover:text-zinc-800"
                    aria-label="Move down"
                    onClick={() =>
                      onDocumentChange(reorderChangePlanItem(document, item.id, "down"))
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-[10px] text-[#0067B1] hover:underline"
                    onClick={() =>
                      onDocumentChange(duplicateChangePlanEntry(document, item.id))
                    }
                  >
                    {t("editor.instructionStudio.v2.changePlan.duplicate" as never)}
                  </button>
                  <button
                    type="button"
                    className="text-[10px] text-red-600 hover:underline"
                    onClick={() => onDocumentChange(removeChangePlanItem(document, item.id))}
                  >
                    {t("editor.instructionStudio.v2.changePlan.remove" as never)}
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        disabled={generating || plan.length === 0}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#006D52] to-[#0067B1] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        onClick={onGenerateFromPlan}
      >
        {t("editor.instructionStudio.v2.changePlan.generate" as never)}
      </button>
    </section>
  );
}
