"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudioLibraryCard } from "@/components/studio/studio-library-card";
import { useActiveTranslator } from "@/i18n/client";
import {
  fetchRecentLibraryAdditions,
} from "@/lib/library-consistency-client";
import {
  libraryBrowseHrefForCategory,
  projectOpenHref,
} from "@/lib/library-consistency";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

export function StudioLibraryRecentSection() {
  const t = useActiveTranslator();
  const [records, setRecords] = useState<LibraryConsistencyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const items = await fetchRecentLibraryAdditions(12);
      if (!cancelled) {
        setRecords(items);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || records.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
      data-testid="library-recent-section"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">
          {t("library.consistency.recentTitle" as never)}
        </h2>
        <Link
          href="/studio/assets/browse"
          className="text-sm font-semibold text-[#006D52] hover:underline"
        >
          {t("library.consistency.browseAll" as never)}
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {records.map((record) => {
          const projectHref = projectOpenHref(record.projectId, record.sourceModule);
          const metaChips: string[] = [];
          if (record.motionReady) metaChips.push("Motion ready");
          if (record.characterType) metaChips.push(record.characterType);
          if (record.fusionArchetype) metaChips.push(record.fusionArchetype);
          if (record.generationType === "motion_output") metaChips.push("Motion");
          if (record.generationType === "publish_export") metaChips.push("Publish");
          return (
            <div key={record.id} className="space-y-2">
              <StudioLibraryCard
                as="div"
                title={record.assetName}
                typeLabel={t(`library.consistency.category.${record.category}` as never)}
                modifiedLabel={new Date(record.updatedAt ?? record.createdAt).toLocaleString()}
                thumbnailUrl={record.thumbnailUrl}
              />
              {metaChips.length > 0 ?
                <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {metaChips.join(" · ")}
                </p>
              : null}
              {record.projectTitle ?
                <p className="px-1 text-[11px] text-slate-600">
                  {t("library.consistency.createdFrom" as never, {
                    project: record.projectTitle,
                  } as never)}
                </p>
              : null}
              <div className="flex flex-wrap gap-2 px-1">
                <Link
                  href={libraryBrowseHrefForCategory(record.category)}
                  className="text-[11px] font-semibold text-[#0067B1] hover:underline"
                >
                  {t("library.consistency.openInLibrary" as never)}
                </Link>
                {projectHref ?
                  <Link
                    href={projectHref}
                    className="text-[11px] font-semibold text-[#006D52] hover:underline"
                  >
                    {t("library.consistency.openProject" as never)}
                  </Link>
                : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
