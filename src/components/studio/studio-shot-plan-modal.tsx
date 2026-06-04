"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { ShotPlanRecommendation } from "@/lib/studio-auto-shot-planner";

type Props = {
  open: boolean;
  plan: ShotPlanRecommendation[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function StudioShotPlanModal({ open, plan, busy, onClose, onConfirm }: Props) {
  const t = useActiveTranslator();
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shot-plan-title"
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <header className="border-b border-zinc-100 px-5 py-4">
          <h2 id="shot-plan-title" className="text-lg font-semibold text-zinc-900">
            {t("studio.intelligence.shotPlan.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{t("studio.intelligence.shotPlan.subtitle")}</p>
        </header>
        <ul className="max-h-[50vh] overflow-y-auto px-5 py-3 text-sm">
          {plan.map((row) => (
            <li
              key={row.sceneId}
              className="mb-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2"
            >
              <p className="font-semibold text-zinc-900">
                {t("studio.director.timeline.scene", { index: row.order + 1 })}
                <span className="ml-2 font-normal text-zinc-500">
                  {t(`studio.intelligence.arc.${row.arcPhase}` as TranslationKey)}
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-700">
                {t(`studio.director.shot.${row.shotType}` as TranslationKey)} ·{" "}
                {t(`studio.director.movement.${row.cameraMovement}` as TranslationKey)} ·{" "}
                {t(`studio.director.energy.${row.sceneEnergy}` as TranslationKey)}
              </p>
            </li>
          ))}
        </ul>
        <footer className="flex flex-wrap gap-2 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            {t("studio.intelligence.shotPlan.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? t("studio.intelligence.shotPlan.applying") : t("studio.intelligence.shotPlan.apply")}
          </button>
        </footer>
      </div>
    </div>
  );
}
