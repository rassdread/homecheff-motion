"use client";

import { useActiveTranslator } from "@/i18n/client";
import { applySocialPreset, SOCIAL_PRESET_SPECS, socialExportDimensions } from "@/lib/editor-v6-social-kit";
import { EDITOR_SOCIAL_PRESETS, type EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
};

export function EditorSocialKitPanel({ document, onDocumentChange }: Props) {
  const t = useActiveTranslator();
  const active = document.productivityState?.socialPreset;

  return (
    <div className="rounded-2xl border border-pink-200 bg-pink-50/40 p-4">
      <p className="text-sm font-semibold text-pink-950">{t("editor.v6.social.title" as never)}</p>
      <p className="mt-1 text-xs text-pink-900">{t("editor.v6.social.lead" as never)}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {EDITOR_SOCIAL_PRESETS.map((preset) => {
          const dims = socialExportDimensions(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onDocumentChange(applySocialPreset(document, preset))}
              className={`rounded-xl border px-3 py-2 text-left text-xs ${
                active === preset
                  ? "border-pink-600 bg-pink-100 text-pink-950"
                  : "border-pink-200 bg-white text-pink-900"
              }`}
            >
              <span className="block font-semibold">{t(SOCIAL_PRESET_SPECS[preset].labelKey as never)}</span>
              <span className="text-[10px] opacity-80">
                {dims.width}×{dims.height}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
