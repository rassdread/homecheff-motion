"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { MotionRenderReadiness } from "@/types/motion-studio-intelligence";

type Props = {
  open: boolean;
  readiness: MotionRenderReadiness;
  onRenderAnyway: () => void;
  onReviewScenes: () => void;
  onClose: () => void;
};

export function MotionPreRenderQaModal({
  open,
  readiness,
  onRenderAnyway,
  onReviewScenes,
  onClose,
}: Props) {
  const t = useActiveTranslator();
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
    >
      <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900">{t("motion.qa.preRender.title")}</h3>
        <p className="mt-3 text-sm text-zinc-600">{t("motion.qa.preRender.body")}</p>
        <p className="mt-2 text-sm font-medium text-amber-900">
          {t(readiness.summaryMessageKey as never)}
        </p>
        <ul className="mt-3 space-y-1 text-xs text-zinc-600">
          {readiness.scenesNeedingReview > 0 ?
            <li>
              {t("motion.qa.preRender.scenesReview", {
                count: String(readiness.scenesNeedingReview),
              })}
            </li>
          : null}
          {readiness.criticalDriftCount > 0 ?
            <li>
              {t("motion.qa.preRender.driftCritical", {
                count: String(readiness.criticalDriftCount),
              })}
            </li>
          : null}
          {readiness.scenesMissingImages > 0 ?
            <li>
              {t("motion.qa.preRender.missingImages", {
                count: String(readiness.scenesMissingImages),
              })}
            </li>
          : null}
        </ul>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            {t("motion.qa.preRender.cancel")}
          </button>
          <button
            type="button"
            onClick={onReviewScenes}
            className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1]"
          >
            {t("motion.qa.preRender.reviewScenes")}
          </button>
          <button
            type="button"
            onClick={onRenderAnyway}
            className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("motion.qa.preRender.renderAnyway")}
          </button>
        </div>
      </div>
    </div>
  );
}
