"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";
import { projectOpenHref } from "@/lib/library-consistency";
import { buildLibraryRelationBadges } from "@/lib/library-consistency-browse";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";

type Props = {
  record: LibraryConsistencyRecord;
};

export function StudioLibraryConsistencyRelationBadges({ record }: Props) {
  const t = useActiveTranslator();
  const badges = buildLibraryRelationBadges(record);
  const projectHref = projectOpenHref(record.projectId, record.sourceModule);

  if (badges.length === 0 && !record.projectTitle) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="library-consistency-relation-badges">
      {record.projectTitle ?
        <span
          className="inline-flex rounded-full border border-[#006D52]/25 bg-[#006D52]/8 px-2 py-0.5 text-[10px] font-semibold text-[#006D52]"
          data-testid="library-badge-from-project"
        >
          {t("library.consistency.badge.fromProject" as never, { project: record.projectTitle } as never)}
        </span>
      : null}
      {badges
        .filter((badge) => badge.id.startsWith("used-"))
        .map((badge) => (
          <span
            key={badge.id}
            className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
            data-testid={`library-badge-${badge.id}`}
          >
            {t(badge.labelKey as never)}
          </span>
        ))}
      {projectHref ?
        <Link
          href={projectHref}
          className="text-[10px] font-semibold text-[#0067B1] hover:underline"
          data-testid="library-badge-open-project"
        >
          {t("library.consistency.openProject" as never)}
        </Link>
      : null}
    </div>
  );
}
