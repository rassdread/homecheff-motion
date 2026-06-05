"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { BundleVersionBadges } from "@/components/videos/bundle-version-badges";
import {
  badgeContextForProject,
  resolveBundleVersionBadges,
} from "@/lib/bundle-version-badges";
import { buildBundleSlotOpenHref } from "@/lib/bundle-selected-version";
import {
  buildMotionVersionCatalogForProject,
  type MotionVersionCatalog,
  type MotionVersionSlot,
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
  selectedSlot?: MotionVersionSlot | null;
  catalog?: MotionVersionCatalog;
};

function slotBadges(detail: AnimationProjectDetailResponse, slot: MotionVersionSlot) {
  const ctx = badgeContextForProject({
    id: slot.projectId,
    studioSourceStoryboardId: detail.studioSource?.storyboardId ?? null,
    hasStudioHandoff: Boolean(detail.studioSource?.storyboardId),
    instantMode: detail.instantMode,
    imageCount: detail.images?.length ?? 0,
    status: slot.status,
    renderVersionCount: detail.renderVersions?.length ?? 0,
    languageExportCount: detail.languageExports?.length ?? 0,
  });
  const resolved = resolveBundleVersionBadges(ctx);
  if (slot.kind === "language_export" && !resolved.some((b) => b.id === "text_only")) {
    return [...resolved, { id: "text_only" as const, labelKey: "videos.badge.textOnly" }];
  }
  return resolved;
}

function languageSection(
  catalog: MotionVersionCatalog,
  code: string,
  selectedSelectionKey: string | null,
  detail: AnimationProjectDetailResponse,
  t: ReturnType<typeof useActiveTranslator>
) {
  const slots = catalog.slotsByLanguage[code] ?? [];
  if (!slots.length) {
    return null;
  }
  const label = slots[0]?.languageLabel ?? code.toUpperCase();
  return (
    <div key={code} className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
        {label} ({slots.length})
      </p>
      <ul className="mt-2 space-y-2">
        {slots.map((slot) => {
          const active = slot.selectionKey === selectedSelectionKey;
          const href = buildBundleSlotOpenHref(slot);
          return (
            <li
              key={slot.selectionKey}
              className={`rounded-md px-2 py-1.5 ${active ? "border border-emerald-200 bg-emerald-50/80" : "border border-transparent"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {active ?
                  <span className="text-xs font-semibold text-emerald-800" aria-hidden>
                    ✓
                  </span>
                : null}
                <span className="text-sm font-medium text-zinc-900">{slot.displayLabel}</span>
                <span className="text-xs text-zinc-500">({slot.status})</span>
              </div>
              <BundleVersionBadges badges={slotBadges(detail, slot)} className="mt-1" />
              <Link
                href={href}
                className="mt-1 inline-block text-xs font-medium text-emerald-800 underline"
              >
                {active ? t("projects.bundle.currentVersion") : t("projects.bundle.openVersion")}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ProjectBundleOverviewPanel({
  detail,
  draftConcepts = [],
  selectedSlot = null,
  catalog: catalogProp,
}: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);

  const catalog = useMemo(
    () =>
      catalogProp ??
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
    [detail, catalogProp]
  );

  const bundleLabel = detail.bundleName?.trim() || detail.title?.trim() || t("videos.untitledProject");
  const selectedKey = selectedSlot?.selectionKey ?? null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left sm:px-5"
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-zinc-900">
          {t("projects.bundle.overviewTitle")}
        </span>
        <span className="text-sm text-zinc-500" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ?
        <div className="border-t border-zinc-100 px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="mt-2 text-sm text-zinc-600">
            {t("projects.bundle.overviewSubtitle", { name: bundleLabel })}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {catalog.languages.map((lang) =>
              languageSection(catalog, lang.code, selectedKey, detail, t)
            )}
          </div>
          {draftConcepts.length > 0 ?
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {t("projects.bundle.draftsTitle")}
              </p>
              <ul className="mt-2 space-y-2">
                {draftConcepts.map((draft) => (
                  <li
                    key={draft.id}
                    className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm"
                  >
                    <Link
                      href={`/videos/${encodeURIComponent(draft.id)}/edit-version`}
                      className="font-medium text-amber-950 underline"
                    >
                      {draft.displayTitle ?? t("videos.untitledProject")}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          : null}
        </div>
      : null}
    </section>
  );
}
