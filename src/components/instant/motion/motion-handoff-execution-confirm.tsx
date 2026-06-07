"use client";

import Link from "next/link";
import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import type { InstantMode } from "@/lib/instant-premium-mode-types";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type { MotionHandoffExecutionPrefill } from "@/types/motion-handoff-execution-prefill";

type Props = {
  storyboardId: string;
  storyboardTitle: string;
  prefill: MotionHandoffExecutionPrefill;
  onContinue: (instantMode: InstantMode) => void;
  busy?: boolean;
};

export function MotionHandoffExecutionConfirm({
  storyboardId,
  storyboardTitle,
  prefill,
  onContinue,
  busy = false,
}: Props) {
  const t = useActiveTranslator();
  const [adjustMode, setAdjustMode] = useState(false);
  const [selectedMode, setSelectedMode] = useState<InstantMode>(prefill.instantMode);

  return (
    <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 text-left shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-900">
        {t("motion.handoff.executionPrefill.confirmTitle")}
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        {t("motion.handoff.executionPrefill.confirmBody", { title: storyboardTitle })}
      </p>

      <div className="mt-5 rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
          {t("motion.handoff.executionPrefill.preparedApproach")}
        </p>
        <p className="mt-2 text-sm font-semibold text-zinc-900">
          {t(prefill.executionModeLabelKey as TranslationKey)}
        </p>
        <p className="mt-1 text-xs text-zinc-700">
          {t(prefill.approachSummaryKey as TranslationKey)}
        </p>
        <p className="mt-2 text-xs text-zinc-600">
          {t("motion.handoff.executionPrefill.durationEstimate", {
            seconds: String(prefill.totalDurationSeconds),
          })}
          {" · "}
          {t("motion.handoff.executionPrefill.sceneImages", {
            present: String(prefill.sceneImagePresentCount),
            missing: String(prefill.sceneImageMissingCount),
          })}
        </p>
        {prefill.usesMultipleSteps ?
          <p className="mt-2 text-xs text-zinc-700">
            {t("motion.handoff.executionPrefill.multipleSteps")}
          </p>
        : null}
      </div>

      {adjustMode ?
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold text-zinc-800">
            {t("motion.handoff.executionPrefill.adjustModeTitle")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["story", "transition"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSelectedMode(mode)}
                className={`rounded-full px-4 py-2 text-xs font-semibold ${
                  selectedMode === mode
                    ? "bg-[#0067B1] text-white"
                    : "border border-zinc-200 bg-white text-zinc-700"
                }`}
              >
                {t(
                  mode === "story"
                    ? "motion.handoff.executionPrefill.mode.storyVideo"
                    : "motion.handoff.executionPrefill.mode.actionChain"
                )}
              </button>
            ))}
          </div>
        </div>
      : null}

      {prefill.warnings.length > 0 ?
        <ul className="mt-4 space-y-1.5 text-xs text-amber-900">
          {prefill.warnings.map((warning) => (
            <li key={warning.id}>
              ⚠ {t(warning.messageKey as TranslationKey, warning.messageParams)}
            </li>
          ))}
        </ul>
      : null}

      {prefill.missingImages.length > 0 ?
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
          <p className="text-xs font-semibold text-amber-950">
            {t("motion.handoff.executionPrefill.missingImagesTitle")}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-amber-900">
            {prefill.missingImages.slice(0, 5).map((item) => (
              <li key={item.id}>
                {item.sceneTitle}: {t(item.roleLabelKey as TranslationKey)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-amber-800">
            {t("motion.handoff.executionPrefill.addImagesFirst")}
          </p>
        </div>
      : null}

      {prefill.fallbackActive && prefill.fallbackLabelKey ?
        <p className="mt-3 text-xs text-amber-800">
          {t(prefill.fallbackLabelKey as TranslationKey)}
        </p>
      : null}

      <p className="mt-4 text-xs font-medium text-zinc-800">
        {prefill.readyToRender
          ? t("motion.handoff.executionPrefill.readyToRender")
          : t("motion.handoff.executionPrefill.notReadyToRender")}
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onContinue(selectedMode)}
          className="rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("motion.handoff.executionPrefill.continue")}
        </button>
        <Link
          href={studioWorkspaceHref(storyboardId)}
          className="rounded-full border border-zinc-200 px-5 py-2.5 text-center text-sm font-semibold text-zinc-700"
        >
          {t("motion.handoff.executionPrefill.backToStudio")}
        </Link>
        {!adjustMode ?
          <button
            type="button"
            disabled={busy}
            onClick={() => setAdjustMode(true)}
            className="text-sm font-medium text-[#0067B1] hover:underline"
          >
            {t("motion.handoff.executionPrefill.adjustApproach")}
          </button>
        : null}
      </div>
    </div>
  );
}
