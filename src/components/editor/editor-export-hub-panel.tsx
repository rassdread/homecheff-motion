"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { appendLibraryExport, categoryForExportProfile } from "@/lib/editor-library-categories";
import { buildMotionReadyExportBundle } from "@/lib/editor-motion-ready-export";
import { buildPrintReadyExportBundle } from "@/lib/editor-print-export";
import { assessPosterUpscaleNeeds } from "@/lib/editor-poster-upscale";
import { buildProductionReadyExportBundle } from "@/lib/editor-production-export";
import { formatEpsLimitationNote } from "@/lib/production-output-profiles";
import type { EditorCanvasDocument, EditorExportProfileId } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onDocumentChange: (document: EditorCanvasDocument) => void;
  advancedOpen?: boolean;
};

export function EditorExportHubPanel({ document, onDocumentChange, advancedOpen = false }: Props) {
  const t = useActiveTranslator();
  const [profile, setProfile] = useState<EditorExportProfileId>("production_ready");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const runExport = async () => {
    setBusy(true);
    setMessage("");
    try {
      const route =
        profile === "motion_ready"
          ? "/api/editor/export/motion-ready"
          : profile === "print_ready"
            ? "/api/editor/export/print"
            : "/api/editor/export/production";
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ document }),
      });
      const body = (await res.json()) as { ok?: boolean; bundle?: unknown; upscale?: unknown };
      if (!body.ok) {
        setMessage(t("editor.v5.export.failed" as never));
        return;
      }
      const next = appendLibraryExport(document, {
        category: categoryForExportProfile(profile),
        label: `${document.name} — ${profile}`,
        profile,
        format: profile,
        metadata: { advanced: advancedOpen },
      });
      onDocumentChange(next);
      setMessage(t("editor.v5.export.ready" as never));
    } catch {
      setMessage(t("editor.v5.export.failed" as never));
    } finally {
      setBusy(false);
    }
  };

  const motionBundle = buildMotionReadyExportBundle(document);
  const printBundle = buildPrintReadyExportBundle(document);
  const productionBundle = buildProductionReadyExportBundle(document);
  const upscale = assessPosterUpscaleNeeds(document, 1920, 1080);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{t("editor.v5.export.title" as never)}</p>
      <p className="mt-1 text-xs text-zinc-600">{t("editor.v5.export.lead" as never)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["production_ready", "motion_ready", "print_ready"] as EditorExportProfileId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setProfile(id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              profile === id ? "bg-[#0067B1] text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {t(`editor.v5.export.profile.${id}` as never)}
          </button>
        ))}
      </div>
      {advancedOpen ?
        <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-[11px] text-zinc-600">
          {profile === "print_ready" ?
            <>
              <p>
                {printBundle.pixelWidth}×{printBundle.pixelHeight}px @ {printBundle.settings.dpi} DPI
              </p>
              <p className="mt-1">{formatEpsLimitationNote()}</p>
            </>
          : profile === "motion_ready" ?
            <p>
              {motionBundle.cutouts.length} cutouts · {motionBundle.includesHierarchy ? "hierarchy" : "flat"}
            </p>
          : <p>
              {productionBundle.settings.width}×{productionBundle.settings.height} ·{" "}
              {productionBundle.formats.join(", ")}
            </p>}
        </div>
      : null}
      {profile === "print_ready" ?
        <p className="mt-2 text-xs text-amber-800">{t(upscale.messageKey as never)}</p>
      : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void runExport()}
        className="mt-4 rounded-lg bg-[#006D52] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? t("editor.v5.export.working" as never) : t("editor.v5.export.saveAndDownload" as never)}
      </button>
      {message ? <p className="mt-2 text-xs text-emerald-800">{message}</p> : null}
    </div>
  );
}
