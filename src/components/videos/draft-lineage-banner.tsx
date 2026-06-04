"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { DraftVersionPreview } from "@/components/videos/draft-version-preview";
import {
  formatDraftLineageBanner,
  formatDraftLineageShort,
  formatDraftWillCreateLabel,
} from "@/lib/draft-lineage";
import type { DraftLineageResponse } from "@/types/animation-api";

type Props = {
  lineage: DraftLineageResponse;
  variant?: "banner" | "card" | "full";
};

export function DraftLineageBanner({ lineage, variant = "banner" }: Props) {
  const t = useActiveTranslator();
  const mapped = {
    sourceProjectId: lineage.sourceProjectId,
    sourceProjectTitle: lineage.sourceProjectTitle,
    sourceLanguage: lineage.sourceLanguage,
    sourceLanguageLabel: lineage.sourceLanguageLabel,
    sourceVersion: lineage.sourceVersion,
    sourceVersionDisplay: lineage.sourceVersionDisplay,
    nextVersionNumber: lineage.nextVersionNumber,
    nextVersionDisplay: lineage.nextVersionDisplay,
    bundleDisplayName: lineage.bundleDisplayName,
    copiedAt: lineage.copiedAt,
  };

  if (variant === "card") {
    return (
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-[#0067B1]">{formatDraftLineageShort(mapped)}</p>
        <p className="text-xs text-[#0067B1]/85">{formatDraftWillCreateLabel(mapped)}</p>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-[#0067B1]/25 bg-[#0067B1]/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]/80">
            {t("projects.draft.basedOn")}
          </p>
          <p className="mt-1 text-sm font-medium text-[#0067B1]">
            {lineage.sourceProjectTitle} → {lineage.sourceVersionDisplay}
          </p>
          <p className="mt-2 text-sm font-medium text-[#0067B1]">
            {formatDraftWillCreateLabel(mapped)}
          </p>
          {lineage.copiedAt ? (
            <p className="mt-1 text-xs text-[#0067B1]/80">
              {t("projects.draft.lineageCopiedAt", {
                date: new Date(lineage.copiedAt).toLocaleString(),
              })}
            </p>
          ) : null}
          <Link
            href={`/videos/${encodeURIComponent(lineage.sourceProjectId)}`}
            className="mt-2 inline-block text-xs font-medium text-[#0067B1] underline"
          >
            {t("projects.draft.viewSource")}
          </Link>
        </div>
        <DraftVersionPreview lineage={lineage} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#0067B1]/25 bg-[#0067B1]/5 px-4 py-3">
      <p className="text-sm font-medium text-[#0067B1]">{formatDraftLineageBanner(mapped)}</p>
      <p className="mt-1 text-sm text-[#0067B1]">{formatDraftWillCreateLabel(mapped)}</p>
      {lineage.copiedAt ? (
        <p className="mt-1 text-xs text-[#0067B1]/80">
          {t("projects.draft.lineageCopiedAt", {
            date: new Date(lineage.copiedAt).toLocaleString(),
          })}
        </p>
      ) : null}
      <Link
        href={`/videos/${encodeURIComponent(lineage.sourceProjectId)}`}
        className="mt-2 inline-block text-xs font-medium text-[#0067B1] underline"
      >
        {t("projects.draft.viewSource")}
      </Link>
    </div>
  );
}
