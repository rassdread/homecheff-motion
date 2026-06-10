"use client";

import { useActiveTranslator } from "@/i18n/client";
import { applyPosterTemplate, POSTER_TEMPLATE_SPECS, posterPixelDimensions } from "@/lib/editor-v6-poster-builder";
import { EDITOR_POSTER_TEMPLATES, type EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

export function EditorPosterBuilderPanel({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const active = document.productivityState?.posterTemplate;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
      <p className="text-sm font-semibold text-amber-950">{t("editor.v6.poster.title" as never)}</p>
      <p className="mt-1 text-xs text-amber-900">{t("editor.v6.poster.lead" as never)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EDITOR_POSTER_TEMPLATES.map((template) => {
          const dims = posterPixelDimensions(template);
          return (
            <button
              key={template}
              type="button"
              onClick={() => onDocumentChange(applyPosterTemplate(document, template))}
              className={`rounded-xl border px-3 py-2 text-left text-xs ${
                active === template
                  ? "border-amber-600 bg-amber-100 text-amber-950"
                  : "border-amber-200 bg-white text-amber-900"
              }`}
            >
              <span className="block font-semibold">{t(POSTER_TEMPLATE_SPECS[template].labelKey as never)}</span>
              <span className="text-[10px] opacity-80">
                {dims.width}×{dims.height}px
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
