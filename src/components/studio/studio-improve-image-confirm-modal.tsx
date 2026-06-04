"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { RegenerationRecommendation } from "@/types/studio-improvement";

type StudioImproveImageConfirmModalProps = {
  open: boolean;
  recommendation: RegenerationRecommendation | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function StudioImproveImageConfirmModal({
  open,
  recommendation,
  onCancel,
  onConfirm,
  busy,
}: StudioImproveImageConfirmModalProps) {
  const t = useActiveTranslator();
  if (!open) {
    return null;
  }

  const isMock =
    typeof process.env.NEXT_PUBLIC_STUDIO_SCENE_IMAGE_PROVIDER === "string" &&
    process.env.NEXT_PUBLIC_STUDIO_SCENE_IMAGE_PROVIDER === "mock";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
    >
      <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900">
          {t("studio.improve.confirmTitle")}
        </h3>
        <p className="mt-3 text-sm text-zinc-600">{t("studio.improve.confirmBody")}</p>
        {recommendation ? (
          <p className="mt-2 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
            {recommendation.reason}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-amber-800">
          {isMock ? t("studio.improve.costNoteMock") : t("studio.improve.costNoteLive")}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            {t("studio.improve.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? t("studio.improve.regenerating") : t("studio.improve.confirmRegenerate")}
          </button>
        </div>
      </div>
    </div>
  );
}
