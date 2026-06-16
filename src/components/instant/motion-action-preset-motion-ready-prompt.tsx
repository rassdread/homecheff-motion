"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import { buildCharacterClusterHref } from "@/lib/character-cluster-routes";

type Props = {
  characterName?: string | null;
  onDismiss?: () => void;
  onContinue?: () => void;
};

export function MotionActionPresetMotionReadyPrompt({
  characterName,
  onDismiss,
  onContinue,
}: Props) {
  const t = useActiveTranslator();
  const motionReadyHref = buildCharacterClusterHref("motion-ready", {
    returnTo: "/animate/instant",
  });

  return (
    <div
      className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950"
      data-testid="motion-action-preset-motion-ready-prompt"
    >
      <p className="font-semibold text-amber-900">
        {t("instant.actionPresets.motionReady.title" as never)}
      </p>
      <p className="mt-1">
        {characterName
          ? t("instant.actionPresets.motionReady.bodyNamed" as never, { name: characterName })
          : t("instant.actionPresets.motionReady.body" as never)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={motionReadyHref}
          className={`${studioVisual.btnGradientPrimary} px-3 py-1.5 text-xs`}
          data-testid="motion-action-preset-motion-ready-link"
        >
          {t("instant.actionPresets.motionReady.prepare" as never)}
        </Link>
        <button
          type="button"
          className={`${studioVisual.btnOutline} px-3 py-1.5 text-xs`}
          data-testid="motion-action-preset-motion-ready-continue"
          onClick={onContinue ?? onDismiss}
        >
          {t("instant.actionPresets.motionReady.continue" as never)}
        </button>
      </div>
    </div>
  );
}
