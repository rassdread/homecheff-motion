"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { resolveEditorStudioEntry } from "@/lib/editor-studio-entry";

type Props = {
  editorSessionId: string;
};

export function EditorStudioEntryBanner({ editorSessionId }: Props) {
  const t = useActiveTranslator();
  const entry = useMemo(() => resolveEditorStudioEntry(editorSessionId), [editorSessionId]);

  if (!entry) {
    return null;
  }

  const cutoutCount = entry.cutoutUrls.length;
  const layerCount = entry.document.objects.length;

  return (
    <div className="mx-auto mb-4 w-full max-w-5xl rounded-2xl border border-[#0067B1]/25 bg-[#0067B1]/5 px-4 py-3 sm:px-5">
      <p className="text-sm font-semibold text-slate-900">
        {t("editor.v7.studio.generic" as never)}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {entry.document.name} · {layerCount} layers
        {cutoutCount > 0 ? ` · ${cutoutCount} cutouts` : ""}
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/editor?session=${encodeURIComponent(entry.sessionId)}`}
          className="font-medium text-[#0067B1] hover:underline"
        >
          {t("editor.start.recent")}
        </Link>
        {cutoutCount > 0 ?
          <Link
            href={`/animate/instant?editorSession=${encodeURIComponent(entry.sessionId)}`}
            className="font-medium text-[#0067B1] hover:underline"
          >
            {t("suite.flow.animateInMotion")}
          </Link>
        : null}
      </div>
    </div>
  );
}
