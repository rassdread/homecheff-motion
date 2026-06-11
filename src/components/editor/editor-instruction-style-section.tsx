"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  appendStyleChangePlanItem,
  buildStyleChangePlanItem,
} from "@/lib/editor-instruction-change-plan";
import {
  EDITOR_STYLE_ACTIONS,
  styleAttributeLabelKey,
} from "@/lib/editor-style-actions";
import {
  buildStyleAttributeRecords,
  syncDocumentStyleAttributes,
} from "@/lib/editor-style-attribute-feed";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import {
  DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
  EDITOR_STYLE_ATTRIBUTES,
  type EditorStyleAttribute,
} from "@/types/editor-instruction-studio";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onStatus?: (message: string) => void;
};

export function EditorInstructionStyleSection({
  document,
  onDocumentChange,
  onStatus,
}: Props) {
  const t = useActiveTranslator();

  useEffect(() => {
    if ((document.styleAttributes?.length ?? 0) >= EDITOR_STYLE_ATTRIBUTES.length) {
      return;
    }
    onDocumentChange(syncDocumentStyleAttributes(document));
  }, [document, document.sessionId, document.styleAttributes?.length, onDocumentChange]);

  const attributes = useMemo(
    () => document.styleAttributes ?? buildStyleAttributeRecords(document),
    [document]
  );
  const [selectedAttribute, setSelectedAttribute] = useState<EditorStyleAttribute>("color_palette");
  const [selectedActionId, setSelectedActionId] = useState(
    EDITOR_STYLE_ACTIONS.color_palette[0]!.id
  );

  const actions = EDITOR_STYLE_ACTIONS[selectedAttribute] ?? [];

  const handleAdd = () => {
    const action = actions.find((a) => a.id === selectedActionId) ?? actions[0];
    if (!action) {
      return;
    }
    const order = document.instructionStudioState?.changePlan?.length ?? 0;
    const item = buildStyleChangePlanItem({
      styleAttribute: selectedAttribute,
      action,
      strength: DEFAULT_EDITOR_INSTRUCTION_SLIDERS.changeStrength,
      order,
    });
    onDocumentChange(appendStyleChangePlanItem(document, item));
    onStatus?.(t("editor.instructionStudio.v2.style.added" as never));
  };

  return (
    <section className="mt-4 rounded-xl border border-[#006D52]/20 bg-[#006D52]/5 px-3 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
        {t("editor.instructionStudio.v2.style.sectionTitle" as never)}
      </h3>

      <label className="mt-3 block text-xs font-medium text-zinc-600">
        {t("editor.instructionStudio.v2.style.attributeLabel" as never)}
        <select
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          value={selectedAttribute}
          onChange={(e) => {
            const next = e.target.value as EditorStyleAttribute;
            setSelectedAttribute(next);
            setSelectedActionId(EDITOR_STYLE_ACTIONS[next][0]?.id ?? "");
          }}
        >
          {attributes.map((attr) => (
            <option key={attr.id} value={attr.attribute}>
              {t(styleAttributeLabelKey(attr.attribute) as never)}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-xs font-medium text-zinc-600">
        {t("editor.instructionStudio.actionLabel" as never)}
        <select
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          value={selectedActionId}
          onChange={(e) => setSelectedActionId(e.target.value)}
        >
          {actions.map((action) => (
            <option key={action.id} value={action.id}>
              {t(action.labelKey as never)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={handleAdd}
        className="mt-3 w-full rounded-xl border border-[#006D52]/40 bg-white px-4 py-2 text-sm font-semibold text-[#006D52]"
      >
        {t("editor.instructionStudio.v2.style.addToPlan" as never)}
      </button>
    </section>
  );
}
