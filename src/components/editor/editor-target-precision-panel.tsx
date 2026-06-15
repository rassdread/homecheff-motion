"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  buildChangePlanItemDisplay,
  buildTargetPrecisionContext,
  resolveTargetOnlyEdit,
} from "@/lib/editor-instruction-target-precision";
import { accessoryAddActionLabelKey } from "@/lib/editor-instruction-accessory-actions";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type {
  EditorInstructionChangePlanItem,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  selection?: EditorInstructionSelection & { color?: string };
  changePlanItem?: EditorInstructionChangePlanItem;
  onTargetOnlyChange: (enabled: boolean) => void;
};

export function EditorTargetPrecisionPanel({
  document,
  selection,
  changePlanItem,
  onTargetOnlyChange,
}: Props) {
  const t = useActiveTranslator();
  const targetOnly = resolveTargetOnlyEdit(document);

  const display =
    changePlanItem
      ? buildChangePlanItemDisplay(changePlanItem)
      : selection
        ? (() => {
            const ctx = buildTargetPrecisionContext(document, selection, { targetOnly });
            let changeSummary = ctx.requestedChange;
            if (selection.action === "change_color" && selection.color) {
              changeSummary = `Color → ${selection.color}`;
            }
            if (selection.action === "accessory_add" && selection.accessoryType) {
              changeSummary = t(accessoryAddActionLabelKey(selection.accessoryType) as never);
            }
            return {
              title: ctx.targetLabel.toUpperCase(),
              onlyPartKey: "editor.instructionStudio.v2.precision.onlyPart",
              onlyPartLabel: ctx.targetLabel,
              changeSummary,
              mayChangeList: ctx.protectionPlan.targetParts.join(", "),
              protectedList: ctx.protectionPlan.protectedParts.join(", "),
              identityList: ctx.protectionPlan.lockedIdentityFeatures.slice(0, 5).join(", "),
              backgroundLocked: ctx.protectionPlan.lockedBackground,
              styleList: ctx.protectionPlan.lockedStyle.slice(0, 4).join(", "),
              estimatedSelection: ctx.estimatedSelection,
            };
          })()
        : null;

  if (!display) {
    return null;
  }

  return (
    <section
      className={`rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3 text-xs text-zinc-700 ${studioVisual.editorSurface}`}
      data-testid="instruction-target-precision-panel"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.instructionStudio.v2.precision.previewTitle" as never)}
      </p>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
        {t("editor.instructionStudio.v2.precision.mayChangeLabel" as never)}
      </p>
      <p className="mt-1 text-sm font-medium text-emerald-900" data-testid="precision-may-change">
        {display.mayChangeList}
      </p>
      <p className="mt-0.5 text-sm text-zinc-800">{display.changeSummary}</p>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.instructionStudio.v2.precision.protectedLabel" as never)}
      </p>
      <p className="mt-1 text-sm text-zinc-800" data-testid="precision-protected-parts">
        {display.protectedList}
      </p>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.instructionStudio.v2.precision.identityLabel" as never)}
      </p>
      <p className="mt-1 text-sm text-zinc-800">{display.identityList}</p>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.instructionStudio.v2.precision.backgroundLabel" as never)}
      </p>
      <p className="mt-1 text-sm text-zinc-800">
        {display.backgroundLocked
          ? t("editor.instructionStudio.v2.precision.backgroundLocked" as never)
          : t("editor.instructionStudio.v2.precision.backgroundEditable" as never)}
      </p>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {t("editor.instructionStudio.v2.precision.styleLabel" as never)}
      </p>
      <p className="mt-1 text-sm text-zinc-800">{display.styleList}</p>

      <label className="mt-3 flex items-start gap-2 text-sm text-zinc-800">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={targetOnly}
          onChange={(e) => onTargetOnlyChange(e.target.checked)}
          data-testid="instruction-target-only-toggle"
        />
        <span>{t("editor.instructionStudio.v2.precision.targetOnlyToggle" as never)}</span>
      </label>

      {display.estimatedSelection ?
        <p
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          data-testid="instruction-precision-estimated-warning"
        >
          {t("editor.instructionStudio.v2.precision.estimatedWarning" as never)}
        </p>
      : null}
    </section>
  );
}
