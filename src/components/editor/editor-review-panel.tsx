"use client";

import Link from "next/link";
import { SuiteFlowActions } from "@/components/suite/suite-flow-actions";
import { buildEditorSaveNextActions } from "@/lib/suite-flow-handoffs";
import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildEditorDownloadFilename, markEditorDocumentDraftSaved } from "@/lib/editor-canvas-session";
import { exportEditorCanvasWithPlacements } from "@/lib/editor-placement-export";
import { buildEditorReviewSummary } from "@/lib/editor-review";
import { persistEditorSave, resolveEditorSaveMode } from "@/lib/editor-library-persist";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  onContinueEditing: () => void;
  onSaved: (document: EditorCanvasDocument) => void;
  onDiscard: () => void;
};

export function EditorReviewPanel({ document, onContinueEditing, onSaved, onDiscard }: Props) {
  const t = useActiveTranslator();
  const summary = useMemo(() => buildEditorReviewSummary(document), [document]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const handleDownload = async () => {
    setBusy("download");
    const exported = await exportEditorCanvasWithPlacements(document);
    if (exported.dataUrl) {
      const link = window.document.createElement("a");
      link.href = exported.dataUrl;
      link.download = buildEditorDownloadFilename(document).replace(/\.png$/, "-preview.png");
      link.click();
    } else if (document.backgroundUrl) {
      const link = window.document.createElement("a");
      link.href = document.backgroundUrl;
      link.download = buildEditorDownloadFilename(document);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
    setMessage(t("editor.review.downloadDone"));
    setBusy(null);
  };

  const handleSave = async (action: Parameters<typeof resolveEditorSaveMode>[1]) => {
    setBusy(action);
    const mode = resolveEditorSaveMode(document, action);
    const result = await persistEditorSave(document, summary.payload, mode);
    const saved = markEditorDocumentDraftSaved({
      ...document,
      workflowStep: "save_asset",
      status: action === "draft" ? "draft_saved" : "draft_saved",
    });
    onSaved(saved);
    setMessage(t(result.messageKey as never));
    setBusy(null);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t("editor.review.breadcrumb")}</p>
      <h2 className="mt-1 text-xl font-bold text-slate-900">{t("editor.review.title")}</h2>
      <p className="mt-1 text-sm text-zinc-600">{t("editor.review.lead")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("editor.review.preview")}</p>
          <div className="mt-2 aspect-video overflow-hidden rounded-lg bg-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={document.backgroundUrl} alt="" className="h-full w-full object-contain" />
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500">{t("editor.review.assetName")}</dt>
            <dd className="font-medium text-zinc-900">{summary.name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500">{t("editor.review.identityScore")}</dt>
            <dd className="font-medium text-zinc-900">{summary.identityScore}%</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500">{t("editor.review.placementScore")}</dt>
            <dd className="font-medium text-zinc-900">{summary.placementScore}%</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500">{t("editor.review.semanticLayers")}</dt>
            <dd className="font-medium text-zinc-900">{summary.semanticLayerCount}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500">{t("editor.review.placements")}</dt>
            <dd className="font-medium text-zinc-900">{summary.placementCount}</dd>
          </div>
          {summary.bodyDesignerSummary ?
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">{t("editor.review.bodyDesigner")}</dt>
              <dd className="font-medium text-zinc-900">{summary.bodyDesignerSummary}</dd>
            </div>
          : null}
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500">{t("editor.review.lineage")}</dt>
            <dd className="font-medium text-zinc-900">{summary.lineageLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-zinc-500">{t("editor.review.destination")}</dt>
            <dd className="font-medium text-zinc-900">{t(`editor.review.destination.${summary.saveDestination}` as never)}</dd>
          </div>
        </dl>
      </div>

      {summary.warnings.length > 0 ?
        <ul className="mt-4 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {summary.warnings.map((w) => (
            <li key={w.id}>{t(w.messageKey as never, w.params as never)}</li>
          ))}
        </ul>
      : null}

      {message ?
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p>
      : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {summary.saveDestination === "canonical_base" ?
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleSave("canonical")}
            className="min-h-11 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("editor.review.saveCanonical")}
          </button>
        : null}
        {summary.saveDestination === "animation_ready" ?
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleSave("animation_ready")}
            className="min-h-11 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {t("editor.review.saveAnimationReady")}
          </button>
        : null}
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void handleSave("official")}
          className="min-h-11 rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {t("editor.review.saveOfficial")}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void handleSave("draft")}
          className="min-h-11 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("editor.review.saveDraft")}
        </button>
        {document.sourceAssetId ?
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleSave("edited_copy")}
            className="min-h-11 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
          >
            {t("editor.review.saveEditedCopy")}
          </button>
        : null}
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void handleSave("new")}
          className="min-h-11 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("editor.review.saveNewAsset")}
        </button>
        <button
          type="button"
          disabled={busy === "download"}
          onClick={() => void handleDownload()}
          className="min-h-11 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("editor.review.download")}
        </button>
        <button
          type="button"
          onClick={onContinueEditing}
          className="min-h-11 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
        >
          {t("editor.review.continueEditing")}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="min-h-11 rounded-full px-4 py-2 text-sm font-semibold text-red-700"
        >
          {t("editor.review.discard")}
        </button>
        <Link href="/library" className="min-h-11 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">
          {t("editor.review.openLibrary")}
        </Link>
      </div>

      <div className="mt-4">
        <SuiteFlowActions
          titleKey="suite.flow.editorSavedTitle"
          actions={buildEditorSaveNextActions({ sessionId: document.sessionId, assetId: document.sourceAssetId })}
        />
      </div>
    </div>
  );
}
