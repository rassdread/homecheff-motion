"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  resolveInstantRecoveryActionVisibility,
  type InstantRecoveryActionSnapshot,
} from "@/lib/instant-recovery-actions";

export type InstantRecoveryActionButtonsProps = {
  snapshot: InstantRecoveryActionSnapshot | null | undefined;
  repairBusy?: boolean;
  repairStageLabel?: string | null;
  repairUpdatedAt?: string | null;
  textRerenderBusy?: boolean;
  forceRebuildBusy?: boolean;
  isAdmin?: boolean;
  onVideoRepair?: () => void;
  onTextRerender?: () => void;
  onForceRebuild?: () => void;
  className?: string;
  buttonClassName?: string;
};

export function InstantRecoveryActionButtons({
  snapshot,
  repairBusy = false,
  repairStageLabel = null,
  repairUpdatedAt = null,
  textRerenderBusy = false,
  forceRebuildBusy = false,
  isAdmin = false,
  onVideoRepair,
  onTextRerender,
  onForceRebuild,
  className = "",
  buttonClassName = "rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60",
}: InstantRecoveryActionButtonsProps) {
  const t = useActiveTranslator();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const visibility = resolveInstantRecoveryActionVisibility(snapshot);

  const hasPrimary =
    (visibility.showVideoRepair && onVideoRepair) ||
    (visibility.showTextRerender && onTextRerender);

  if (!hasPrimary && !(isAdmin && visibility.showAdminForceRebuild && onForceRebuild)) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {visibility.showVideoRepair && onVideoRepair ?
        <div className="space-y-1">
          <button
            type="button"
            disabled={repairBusy}
            onClick={onVideoRepair}
            className={`${buttonClassName} border-emerald-300 bg-emerald-50 text-emerald-950`}
          >
            {repairBusy ? t("instant.videoRepair.busy") : t("instant.videoRepair.cta")}
          </button>
          {repairBusy && repairStageLabel ? (
            <p className="text-[11px] font-medium text-emerald-900">{repairStageLabel}</p>
          ) : null}
          {repairBusy && repairUpdatedAt ? (
            <p className="text-[10px] text-zinc-500">
              {new Date(repairUpdatedAt).toLocaleString()}
            </p>
          ) : null}
          <p className="text-[11px] leading-snug text-zinc-600">{t("instant.videoRepair.hint")}</p>
        </div>
      : null}

      {visibility.showTextRerender && onTextRerender ?
        <div className="space-y-1">
          <button
            type="button"
            disabled={textRerenderBusy}
            onClick={onTextRerender}
            className={`${buttonClassName} border-sky-300 bg-sky-50 text-sky-950`}
          >
            {textRerenderBusy ? t("instant.textRerender.busy") : t("instant.textRerender.cta")}
          </button>
          <p className="text-[11px] leading-snug text-zinc-600">{t("instant.textRerender.hint")}</p>
        </div>
      : null}

      {isAdmin && visibility.showAdminForceRebuild && onForceRebuild ?
        <div className="border-t border-zinc-200 pt-2">
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="text-[11px] font-medium text-zinc-600 underline decoration-zinc-400"
          >
            {t("instant.advancedOptions.title")}
          </button>
          {advancedOpen ?
            <div className="mt-2 space-y-1">
              <button
                type="button"
                disabled={forceRebuildBusy}
                onClick={onForceRebuild}
                className={`${buttonClassName} border-zinc-300 bg-white text-zinc-800`}
              >
                {forceRebuildBusy ? t("instant.forceRebuild.busy") : t("instant.forceRebuild.cta")}
              </button>
              <p className="text-[11px] leading-snug text-zinc-500">{t("instant.forceRebuild.hint")}</p>
            </div>
          : null}
        </div>
      : null}
    </div>
  );
}
