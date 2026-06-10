"use client";

import { useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { uploadEditorSourceImage } from "@/lib/editor-image-upload";
import {
  attachMagicReplacePreview,
  buildMagicReplacePreview,
  MAGIC_REPLACE_PROMPT_EXAMPLES,
} from "@/lib/editor-v6-magic-replace";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  layer: EditorCanvasLayer;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  onApply: (input: { prompt?: string; replacementImageUrl?: string }) => void;
};

export function EditorMagicReplacePanel({ document, layer, onDocumentChange, onApply }: Props) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [replacementUrl, setReplacementUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const preview = buildMagicReplacePreview(layer, { prompt, replacementImageUrl: replacementUrl });

  const handlePreview = () => {
    onDocumentChange(attachMagicReplacePreview(document, preview));
  };

  const handleApply = () => {
    onApply({ prompt: prompt.trim() || undefined, replacementImageUrl: replacementUrl || undefined });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadEditorSourceImage(file);
      setReplacementUrl(uploaded.workingImageUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
      <p className="text-sm font-semibold text-sky-900">{t("editor.v6.magicReplace.title" as never)}</p>
      <p className="mt-1 text-xs text-sky-800">{t("editor.v6.magicReplace.lead" as never)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MAGIC_REPLACE_PROMPT_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setPrompt(example)}
            className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs text-sky-900"
          >
            {example}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-xs font-medium text-sky-900">
        {t("editor.v6.magicReplace.prompt" as never)}
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2 text-sm"
          placeholder={t("editor.v6.magicReplace.promptPlaceholder" as never)}
        />
      </label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="mt-2 rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-medium text-sky-900"
      >
        {uploading ? t("editor.v6.magicReplace.uploading" as never) : t("editor.v6.magicReplace.upload" as never)}
      </button>
      {replacementUrl ?
        <p className="mt-2 truncate text-xs text-sky-700">{replacementUrl}</p>
      : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePreview}
          className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-900"
        >
          {t("editor.v6.magicReplace.preview" as never)}
        </button>
        <button
          type="button"
          disabled={!preview.ready}
          onClick={handleApply}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("editor.v6.magicReplace.apply" as never)}
        </button>
      </div>
      {document.productivityState?.magicReplacePreview ?
        <p className="mt-2 text-xs text-sky-800">{t(preview.messageKey as never)}</p>
      : null}
    </div>
  );
}
