"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildStyleAttributeRecords } from "@/lib/editor-style-attribute-feed";
import { styleAttributeLabelKey } from "@/lib/editor-style-actions";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { EditorStyleAttributeRecord } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { EditorStyleAttribute } from "@/types/editor-instruction-studio";

type Props = {
  document: EditorCanvasDocument;
  styleTraitLabels: Array<{ id: string; label: string }>;
  selectedAttribute: EditorStyleAttribute | null;
  expandedAttribute: EditorStyleAttribute | null;
  onSelect: (attribute: EditorStyleAttribute) => void;
  onToggleExpand: (attribute: EditorStyleAttribute) => void;
};

export function EditorInstructionStyleTraitList({
  document,
  styleTraitLabels,
  selectedAttribute,
  expandedAttribute,
  onSelect,
  onToggleExpand,
}: Props) {
  const t = useActiveTranslator();
  const attributes = useMemo(
    () => document.styleAttributes ?? buildStyleAttributeRecords(document),
    [document]
  );

  const prioritized = useMemo(() => {
    const detected = new Set(
      styleTraitLabels.map((trait) => trait.label.toLowerCase())
    );
    const score = (attr: EditorStyleAttributeRecord) => {
      const label = attr.label.toLowerCase();
      if (attr.detectedFromAnalysis) {
        return 3;
      }
      if ([...detected].some((d) => label.includes(d) || d.includes(label))) {
        return 2;
      }
      return 1;
    };
    return [...attributes].sort((a, b) => score(b) - score(a));
  }, [attributes, styleTraitLabels]);

  return (
    <section className={`mt-3 p-3 ${studioVisual.editorSurface}`} data-testid="instruction-style-trait-list">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
        {t("editor.instructionStudio.v2.workspace.styleIdentity" as never)}
      </h2>
      <ul className="mt-2 space-y-1.5">
        {prioritized.map((attr) => {
          const selected = selectedAttribute === attr.attribute;
          const expanded = expandedAttribute === attr.attribute;
          return (
            <li key={attr.id}>
              <button
                type="button"
                data-testid={`style-card-${attr.attribute}`}
                data-selected={selected ? "true" : "false"}
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
                  selected
                    ? "border-[#006D52]/45 bg-[#006D52]/8 shadow-[0_0_12px_rgba(0,109,82,0.12)]"
                    : "border-zinc-200/90 bg-white/80 hover:border-[#006D52]/25 hover:bg-white"
                }`}
                onClick={() => {
                  onSelect(attr.attribute);
                  onToggleExpand(attr.attribute);
                }}
              >
                <span className="mt-0.5 shrink-0 text-xs text-zinc-500" aria-hidden>
                  {expanded ? "▼" : "▶"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-900">
                    {t(styleAttributeLabelKey(attr.attribute) as never)}
                  </span>
                  {attr.detectedFromAnalysis ?
                    <span className="mt-0.5 block text-[11px] text-emerald-700">
                      {t("editor.instructionStudio.v2.workspace.detectedTrait" as never)}
                    </span>
                  : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
