"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildMotionVersionCatalogForProject,
  type MotionVersionCatalog,
} from "@/lib/motion-version-catalog";
import type {
  AnimationProjectDetailResponse,
  DraftLineageResponse,
} from "@/types/animation-api";

type Props = {
  detail: AnimationProjectDetailResponse;
  draftConcepts?: Array<{
    id: string;
    displayTitle?: string;
    draftLineage?: DraftLineageResponse | null;
  }>;
};

function languageSection(
  catalog: MotionVersionCatalog,
  code: string,
  t: ReturnType<typeof useActiveTranslator>
) {
  const slots = catalog.slotsByLanguage[code] ?? [];
  if (!slots.length) {
    return null;
  }
  const label = slots[0]?.languageLabel ?? code.toUpperCase();
  return (
    <div key={code} className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{label}</p>
      <ul className="mt-2 space-y-1">
        {slots.map((slot) => (
          <li key={slot.selectionKey} className="flex flex-wrap items-center gap-2 text-sm text-zinc-800">
            <span>{slot.displayLabel}</span>
            <span className="text-xs text-zinc-500">({slot.status})</span>
            <Link
              href={`/videos/${encodeURIComponent(slot.projectId)}?lang=${encodeURIComponent(code)}&ver=${encodeURIComponent(`v${slot.versionNumber}`)}`}
              className="text-xs font-medium text-emerald-800 underline"
            >
              {t("projects.bundle.openVersion")}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProjectBundleOverviewPanel({ detail, draftConcepts = [] }: Props) {
  const t = useActiveTranslator();

  const catalog = useMemo(
    () =>
      buildMotionVersionCatalogForProject({
        projectId: detail.id,
        title: detail.title,
        exportOutputUrl: detail.exports[0]?.outputVideoUrl ?? null,
        exportStatus: detail.exports[0]?.status ?? null,
        projectStatus: detail.status,
        projectCleanUrl: detail.instantCleanFinalVideoUrl ?? null,
        renderVersions: (detail.renderVersions ?? []).map((row) => ({
          id: row.id,
          renderVersionNumber: row.renderVersionNumber,
          status: row.status,
          isDefault: row.isDefault,
          versionNote: row.versionNote,
          finalVideoUrl: row.finalVideoUrl,
          cleanVideoUrl: row.cleanVideoUrl,
          createdAt: row.createdAt,
        })),
        languageExports: (detail.languageExports ?? []).map((row) => ({
          id: row.id,
          languageCode: row.languageCode,
          languageLabel: row.languageLabel,
          status: row.status,
          outputVideoUrl: row.outputVideoUrl,
          sourceCleanVideoUrl: row.sourceCleanVideoUrl,
          version: row.version,
          isDefault: row.isDefault,
          versionNote: row.versionNote,
          createdAt: row.createdAt,
        })),
      }),
    [detail]
  );

  const bundleLabel = detail.bundleName?.trim() || detail.title?.trim() || t("videos.untitledProject");

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-semibold text-zinc-900">{t("projects.bundle.overviewTitle")}</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {t("projects.bundle.overviewSubtitle", { name: bundleLabel })}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {catalog.languages.map((lang) => languageSection(catalog, lang.code, t))}
      </div>
      {draftConcepts.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("projects.bundle.draftsTitle")}
          </p>
          <ul className="mt-2 space-y-2">
            {draftConcepts.map((draft) => (
              <li key={draft.id} className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm">
                <Link href={`/videos/${encodeURIComponent(draft.id)}/edit-version`} className="font-medium text-amber-950 underline">
                  {draft.displayTitle ?? t("videos.untitledProject")}
                </Link>
                {draft.draftLineage ? (
                  <p className="mt-0.5 text-xs text-amber-900/90">
                    {draft.draftLineage.sourceLanguageLabel} {draft.draftLineage.sourceVersionDisplay}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
