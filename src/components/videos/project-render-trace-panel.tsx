"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildRenderGenerationTrace } from "@/lib/build-render-generation-trace";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

type Props = {
  detail: AnimationProjectDetailResponse;
  renderVersionId?: string | null;
  languageExportId?: string | null;
};

export function ProjectRenderTracePanel({
  detail,
  renderVersionId,
  languageExportId,
}: Props) {
  const t = useActiveTranslator();
  const steps = useMemo(
    () => buildRenderGenerationTrace(detail, { renderVersionId, languageExportId }),
    [detail, renderVersionId, languageExportId]
  );

  if (steps.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-bold text-zinc-900">{t("studio.renderTrace.title")}</h2>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.renderTrace.subtitle")}</p>
      <ol className="mt-4 space-y-0">
        {steps.map((step, index) => (
          <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < steps.length - 1 ?
              <span
                className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 bg-[#006D52]/20"
                aria-hidden
              />
            : null}
            <span
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                step.isCurrent
                  ? "bg-[#006D52] text-white ring-2 ring-[#006D52]/20"
                  : "border border-zinc-200 bg-white text-zinc-600"
              }`}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${step.isCurrent ? "text-[#006D52]" : "text-zinc-800"}`}
              >
                {t(step.labelKey as TranslationKey, step.params)}
              </p>
              {step.isCurrent && detail.studioSource?.storyboardId ?
                <Link
                  href={`/studio/storyboards/${detail.studioSource.storyboardId}`}
                  className="mt-1 inline-block text-xs font-semibold text-[#0067B1] hover:underline"
                >
                  {t("studio.renderTrace.openStudio")} →
                </Link>
              : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
