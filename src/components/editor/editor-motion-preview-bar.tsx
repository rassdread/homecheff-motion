"use client";

import { useActiveTranslator } from "@/i18n/client";
import { attachMotionPreview } from "@/lib/editor-v6-motion-preview";
import { EDITOR_V6_MOTION_PREVIEW_PRESETS, type EditorCanvasDocument, type EditorV6MotionPreviewPreset } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  layerId: string;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onPreviewChange: (active: boolean) => void;
};

const PRESET_LABEL_KEYS: Record<EditorV6MotionPreviewPreset, string> = {
  float: "editor.v6.motion.float",
  rotate: "editor.v6.motion.rotate",
  pulse: "editor.v6.motion.pulse",
  bounce: "editor.v6.motion.bounce",
  orbit: "editor.v6.motion.orbit",
  reveal: "editor.v6.motion.reveal",
  wave: "editor.v6.motion.wave",
};

export function EditorMotionPreviewBar({ document, layerId, onDocumentChange, onPreviewChange }: Props) {
  const t = useActiveTranslator();
  const activePreset = document.productivityState?.motionPreviewLayerId === layerId
    ? document.productivityState.motionPreviewPreset
    : undefined;

  const selectPreset = (preset: EditorV6MotionPreviewPreset) => {
    onDocumentChange(attachMotionPreview(document, layerId, preset));
    onPreviewChange(true);
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">
        {t("editor.v6.motion.title" as never)}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {EDITOR_V6_MOTION_PREVIEW_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => selectPreset(preset)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              activePreset === preset
                ? "bg-violet-600 text-white"
                : "border border-violet-200 bg-white text-violet-900"
            }`}
          >
            {t(PRESET_LABEL_KEYS[preset] as never)}
          </button>
        ))}
      </div>
    </div>
  );
}
