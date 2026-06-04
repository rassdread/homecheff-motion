"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { StudioJobType } from "@/types/studio-job";

type StudioJobCostConfirmModalProps = {
  open: boolean;
  jobType: StudioJobType | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function StudioJobCostConfirmModal({
  open,
  jobType,
  onCancel,
  onConfirm,
  busy,
}: StudioJobCostConfirmModalProps) {
  const t = useActiveTranslator();
  if (!open || !jobType) {
    return null;
  }

  const isMock =
    typeof process.env.NEXT_PUBLIC_STUDIO_SCENE_IMAGE_PROVIDER === "string" &&
    process.env.NEXT_PUBLIC_STUDIO_SCENE_IMAGE_PROVIDER === "mock";

  const usesCredits =
    jobType === "generate_scene_images" ||
    jobType === "analyze_vision" ||
    jobType === "improve_weak_scenes";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
    >
      <div className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-zinc-900">
          {t(`studio.jobs.confirmTitle.${jobType}`)}
        </h3>
        <p className="mt-3 text-sm text-zinc-600">{t("studio.jobs.confirmBody")}</p>
        {usesCredits ? (
          <p className="mt-3 text-xs text-amber-800">
            {isMock ? t("studio.jobs.costNoteMock") : t("studio.jobs.costNoteLive")}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            {t("studio.jobs.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-full bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? t("studio.jobs.starting") : t("studio.jobs.confirmStart")}
          </button>
        </div>
      </div>
    </div>
  );
}
