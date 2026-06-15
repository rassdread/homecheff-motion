"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { HcProjectImportPreview } from "@/lib/hc-project-file-io";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  open: boolean;
  preview: HcProjectImportPreview | null;
  errorKey?: string | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function HcProjectImportDialog({
  open,
  preview,
  errorKey = null,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const t = useActiveTranslator();

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid="hc-project-import-dialog"
    >
      <div className={`w-full max-w-lg p-5 shadow-lg ${studioVisual.cardElevated}`}>
        <h2 className="text-base font-bold text-zinc-900">{t("hcProject.file.importTitle" as never)}</h2>
        <p className="mt-2 text-sm text-zinc-600">{t("hcProject.file.importDescription" as never)}</p>

        {errorKey ?
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {t(errorKey as never)}
          </p>
        : null}

        {preview ?
          <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("hcProject.file.preview.title" as never)}
              </p>
              <p className="font-semibold text-zinc-900">{preview.title}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="font-medium">{t("hcProject.file.preview.type" as never)}:</span>{" "}
                {preview.projectType}
              </p>
              <p>
                <span className="font-medium">{t("hcProject.file.preview.status" as never)}:</span>{" "}
                {preview.workflowStatus}
              </p>
              <p>
                <span className="font-medium">{t("hcProject.file.preview.created" as never)}:</span>{" "}
                {new Date(preview.createdAt).toLocaleString()}
              </p>
              <p>
                <span className="font-medium">{t("hcProject.file.preview.version" as never)}:</span>{" "}
                {preview.sourceVersion}
              </p>
            </div>
            <p>
              <span className="font-medium">{t("hcProject.file.preview.assets" as never)}:</span>{" "}
              {t("hcProject.file.preview.assetSummary" as never, {
                count: preview.assetCount,
                remote: preview.remoteAssetCount,
              } as never)}
            </p>
            {preview.needsMigration ?
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                {t("hcProject.file.olderVersion" as never)}
              </p>
            : null}
            {preview.hasMissingAssets ?
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                {t("hcProject.file.missingAssetsWarning" as never)}
              </p>
            : null}
          </div>
        : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800 disabled:opacity-50"
          >
            {t("hcProject.file.cancel" as never)}
          </button>
          <button
            type="button"
            disabled={busy || !preview || Boolean(errorKey)}
            onClick={onConfirm}
            className="rounded-full bg-[#0067B1] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            data-testid="hc-project-import-confirm"
          >
            {t("hcProject.file.importAsNew" as never)}
          </button>
        </div>
      </div>
    </div>
  );
}
