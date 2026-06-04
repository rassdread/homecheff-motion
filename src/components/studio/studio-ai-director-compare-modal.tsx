"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { ShotPlanRecommendation } from "@/lib/studio-auto-shot-planner";

type Props = {
  open: boolean;
  currentPlan: ShotPlanRecommendation[];
  aiPlan: ShotPlanRecommendation[];
  directorProfileLabel: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function PlanColumn({
  title,
  plan,
}: {
  title: string;
  plan: ShotPlanRecommendation[];
}) {
  const t = useActiveTranslator();
  return (
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <ul className="mt-2 max-h-[45vh] space-y-2 overflow-y-auto text-xs">
        {plan.map((row) => (
          <li key={row.sceneId} className="rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1.5">
            <p className="font-medium text-zinc-800">
              {t("studio.director.timeline.scene", { index: row.order + 1 })}
            </p>
            <p className="text-zinc-600">
              {t(`studio.director.shot.${row.shotType}` as TranslationKey)} ·{" "}
              {t(`studio.director.movement.${row.cameraMovement}` as TranslationKey)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StudioAiDirectorCompareModal({
  open,
  currentPlan,
  aiPlan,
  directorProfileLabel,
  busy,
  onClose,
  onConfirm,
}: Props) {
  const t = useActiveTranslator();
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <header className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {t("studio.aiDirector.compare.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {t("studio.aiDirector.compare.subtitle", { profile: directorProfileLabel })}
          </p>
        </header>
        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row">
          <PlanColumn title={t("studio.aiDirector.compare.current")} plan={currentPlan} />
          <PlanColumn title={t("studio.aiDirector.compare.aiPlan")} plan={aiPlan} />
        </div>
        <footer className="flex flex-wrap gap-2 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            {t("studio.aiDirector.compare.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? t("studio.aiDirector.compare.applying") : t("studio.aiDirector.compare.apply")}
          </button>
        </footer>
      </div>
    </div>
  );
}
