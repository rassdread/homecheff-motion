"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { DraftLineageResponse } from "@/types/animation-api";

type Props = {
  lineage: DraftLineageResponse;
  variant?: "compact" | "render";
};

export function DraftVersionPreview({ lineage, variant = "compact" }: Props) {
  const t = useActiveTranslator();
  const isRender = variant === "render";

  return (
    <div
      className={
        isRender
          ? "rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm"
          : "mt-2 rounded-lg border border-[#0067B1]/15 bg-white/60 px-3 py-2 text-xs"
      }
    >
      <p className={isRender ? "font-semibold text-emerald-950" : "font-medium text-[#0067B1]"}>
        {t("projects.draft.isConcept")}
      </p>
      <dl className={`mt-2 grid gap-1 ${isRender ? "text-sm text-emerald-950" : "text-[#0067B1]"}`}>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium">{t("projects.renderPreview.current")}</dt>
          <dd>
            {lineage.sourceLanguageLabel} {lineage.sourceVersionDisplay}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium">{t("projects.renderPreview.result")}</dt>
          <dd>
            {lineage.sourceLanguageLabel} {lineage.nextVersionDisplay}
          </dd>
        </div>
        {lineage.bundleDisplayName ? (
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium">{t("projects.renderPreview.bundle")}</dt>
            <dd>{lineage.bundleDisplayName}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
