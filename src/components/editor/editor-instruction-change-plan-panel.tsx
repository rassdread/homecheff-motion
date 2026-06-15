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
import { buildChangePlanItemDisplay, enrichChangePlanItemWithPrecision } from "@/lib/editor-instruction-target-precision";
import { styleAttributeLabelKey } from "@/lib/editor-style-actions";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { EditorTargetPrecisionPanel } from "@/components/editor/editor-target-precision-panel";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onGenerateFromPlan: () => void;
  generating?: boolean;
  onTargetOnlyChange: (enabled: boolean) => void;
};

export function EditorInstructionChangePlanPanel({
  document,
  onDocumentChange,
  onGenerateFromPlan,
  generating = false,
  onTargetOnlyChange,
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
          {t("editor.instructionStudio.v2.changePlan.summaryTitle" as never)}
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
                  {item.entryType === "style" ?
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        {index + 1}. {t(styleAttributeLabelKey(item.styleAttribute) as never)}
                      </p>
                      <p className="mt-0.5 text-sm">→ {item.instruction}</p>
                    </>
                  : (() => {
                      const enriched = enrichChangePlanItemWithPrecision(item, document);
                      const display = buildChangePlanItemDisplay(enriched);
                      return (
                        <>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                            {display.title}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-zinc-900">
                            {t(display.onlyPartKey as never, {
                              part: display.onlyPartLabel,
                            } as never)}
                          </p>
                          <p className="mt-0.5 text-sm text-zinc-800">
                            {item.action === "change_color" && item.color
                              ? `${t(actionLabelKey(item.action) as never)} → ${item.color}`
                              : display.accessoryActionKey
                                ? t(display.accessoryActionKey as never)
                                : display.changeSummary}
                          </p>
                          {display.protectedList ?
                            <p className="mt-1 text-xs text-zinc-600">
                              {t("editor.instructionStudio.v2.precision.protectedInline" as never, {
                                list: display.protectedList,
                              } as never)}
                            </p>
                          : null}
                        </>
                      );
                    })()}
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

      {plan.some((item) => item.entryType !== "style") ?
        <div className="mt-4">
          <EditorTargetPrecisionPanel
            document={document}
            changePlanItem={
              (() => {
                const objectItem = plan.find(
                  (entry): entry is import("@/types/editor-instruction-studio").EditorInstructionChangePlanItem =>
                    entry.entryType !== "style"
                );
                return objectItem
                  ? enrichChangePlanItemWithPrecision(objectItem, document)
                  : undefined;
              })()
            }
            onTargetOnlyChange={onTargetOnlyChange}
          />
        </div>
      : null}

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
