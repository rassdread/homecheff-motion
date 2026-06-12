"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";

export type EditorUploadClassLabel =
  | "logo"
  | "product"
  | "person"
  | "background"
  | "branding"
  | "character";

type ClassifiedUpload = {
  url: string;
  label: EditorUploadClassLabel;
  confidence: number;
};

function classifyUrl(url: string): EditorUploadClassLabel {
  const lower = url.toLowerCase();
  if (/logo|brand|mark/.test(lower)) return "logo";
  if (/person|face|portrait|chef|model/.test(lower)) return "person";
  if (/product|food|dish|item/.test(lower)) return "product";
  if (/bg|background|scene|kitchen|garden/.test(lower)) return "background";
  if (/character|mascot|avatar/.test(lower)) return "character";
  return "branding";
}

type Props = {
  uploadUrls: string[];
  onConfirm: (classified: ClassifiedUpload[]) => void;
  onBack?: () => void;
};

export function EditorUploadClassifyGate({ uploadUrls, onConfirm, onBack }: Props) {
  const t = useActiveTranslator();
  const classified = useMemo(
    () =>
      uploadUrls.map((url) => ({
        url,
        label: classifyUrl(url),
        confidence: 0.75,
      })),
    [uploadUrls]
  );

  return (
    <section className="space-y-4" data-testid="editor-upload-classify-gate">
      <h2 className="text-lg font-semibold text-zinc-900">{t("editor.classify.title" as never)}</h2>
      <p className="text-sm text-zinc-600">{t("editor.classify.lead" as never)}</p>
      <ul className="space-y-2">
        {classified.map((item) => (
          <li key={item.url} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
            <span className="truncate text-zinc-500">{item.url.split("/").pop()}</span>
            <span className="font-semibold text-[#006D52]">{t(`editor.classify.label.${item.label}` as never)}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        {onBack ?
          <button type="button" onClick={onBack} className="rounded-full border px-4 py-2 text-sm font-semibold">
            {t("editor.flow.back" as never)}
          </button>
        : null}
        <button
          type="button"
          onClick={() => onConfirm(classified)}
          className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
        >
          {t("editor.classify.continue" as never)}
        </button>
      </div>
    </section>
  );
}
