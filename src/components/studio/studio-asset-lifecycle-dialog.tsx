"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { AssetRemoveMode } from "@/types/studio-asset-lifecycle";

type Props = {
  open: boolean;
  mode: AssetRemoveMode;
  usageCount: number;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function StudioAssetLifecycleDialog({
  open,
  mode,
  usageCount,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const t = useActiveTranslator();

  if (!open) {
    return null;
  }

  const messageKey =
    usageCount > 0 && mode === "delete"
      ? "studio.assetsHub.lifecycle.confirmUsed"
      : mode === "hide"
        ? "studio.assetsHub.lifecycle.confirmHide"
        : mode === "archive"
          ? "studio.assetsHub.lifecycle.confirmArchive"
          : "studio.assetsHub.lifecycle.confirmDelete";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h3 className="text-base font-semibold text-slate-900">
          {t(`studio.assetsHub.lifecycle.title.${mode}` as never)}
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          {t(messageKey as never, { count: String(usageCount) })}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-[44px] rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-800"
          >
            {t("studio.assetsHub.lifecycle.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold text-white ${
              mode === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-slate-800 hover:bg-slate-900"
            }`}
          >
            {loading ? t("button.loading") : t(`studio.assetsHub.lifecycle.action.${mode}` as never)}
          </button>
        </div>
      </div>
    </div>
  );
}
