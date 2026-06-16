"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { AssistantMotionPrefill } from "@/types/assistant-prefill";

type Props = {
  motion: AssistantMotionPrefill;
};

export function MotionActionPresetSummaryCard({ motion }: Props) {
  const t = useActiveTranslator();
  if (!motion.actionPresetId) {
    return null;
  }

  return (
    <div
      className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-zinc-800"
      data-testid="motion-action-preset-summary"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
        {t("instant.actionPresets.summaryLabel" as never)}
      </p>
      <dl className="mt-2 space-y-1.5">
        <div>
          <dt className="font-semibold text-zinc-900">
            {t("instant.actionPresets.field.preset" as never)}
          </dt>
          <dd>{motion.presetTitle ?? motion.actionPresetId}</dd>
        </div>
        {motion.movementLabel ? (
          <div>
            <dt className="font-semibold text-zinc-900">
              {t("instant.actionPresets.field.movement" as never)}
            </dt>
            <dd>{motion.movementLabel}</dd>
          </div>
        ) : null}
        {motion.environmentLabel ? (
          <div>
            <dt className="font-semibold text-zinc-900">
              {t("instant.actionPresets.field.environment" as never)}
            </dt>
            <dd>{motion.environmentLabel}</dd>
          </div>
        ) : null}
        {motion.cameraMotion ? (
          <div>
            <dt className="font-semibold text-zinc-900">
              {t("instant.actionPresets.field.camera" as never)}
            </dt>
            <dd>{motion.cameraMotion}</dd>
          </div>
        ) : null}
      </dl>
      {motion.feasibilityNote ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-amber-950">
          <span className="font-semibold">{t("instant.actionPresets.noteLabel" as never)}</span>{" "}
          {motion.feasibilityNote}
        </p>
      ) : null}
    </div>
  );
}
