"use client";

import Link from "next/link";
import {
  formatAdminProjectMode,
  getAdminProjectHref,
  shortProjectId,
} from "@/lib/admin-project-href";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import type { AdminProjectDisplay } from "@/types/admin-project-display";

type AdminProjectCellProps = {
  project: AdminProjectDisplay | null;
  showMeta?: boolean;
  compact?: boolean;
};

export function AdminProjectCell({
  project,
  showMeta = true,
  compact = false,
}: AdminProjectCellProps) {
  const t = useActiveTranslator();
  const [locale] = useLocale();

  if (!project?.projectId) {
    return (
      <span className="text-xs italic text-zinc-400">
        {t("admin.renderAnalytics.projectUnknown")}
      </span>
    );
  }

  const title = project.projectTitle?.trim() || t("admin.renderAnalytics.unnamedProject");
  const mode = formatAdminProjectMode(project);
  const dateLocale = locale === "nl" ? "nl-NL" : "en-US";
  const dateStr =
    project.createdAt ?
      new Date(project.createdAt).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-2.5"}`}>
      <div
        className={`shrink-0 overflow-hidden rounded-md bg-zinc-100 ${
          compact ? "h-8 w-12" : "h-10 w-[4.5rem]"
        }`}
      >
        {project.thumbnailUrl ?
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        : <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
            —
          </div>
        }
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-zinc-900">{title}</p>
        <p className="font-mono text-[10px] text-zinc-500" title={project.projectId}>
          {shortProjectId(project.projectId)}
        </p>
        {showMeta ?
          <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-zinc-500">
            {project.status ?
              <span>{project.status}</span>
            : null}
            <span>{mode}</span>
            {dateStr ?
              <span>{dateStr}</span>
            : null}
            {project.ownerEmail ?
              <span className="max-w-[140px] truncate" title={project.ownerEmail}>
                {project.ownerEmail}
              </span>
            : null}
            {!project.isKnown ?
              <span className="text-amber-700">{t("admin.renderAnalytics.projectDeleted")}</span>
            : null}
          </p>
        : null}
      </div>
    </div>
  );
}

type AdminProjectOpenActionProps = {
  project: AdminProjectDisplay | null;
};

export function AdminProjectOpenAction({ project }: AdminProjectOpenActionProps) {
  const t = useActiveTranslator();

  if (!project?.projectId) {
    return (
      <span className="text-[10px] text-zinc-400">{t("admin.renderAnalytics.notAvailable")}</span>
    );
  }

  const { href, studioHref } = getAdminProjectHref(project);
  if (!href) {
    return (
      <span className="text-[10px] text-zinc-400">{t("admin.renderAnalytics.notAvailable")}</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="text-[10px] font-medium text-emerald-800 underline-offset-2 hover:underline"
      >
        {t("admin.renderAnalytics.openProject")}
      </Link>
      {studioHref ?
        <Link
          href={studioHref}
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] text-zinc-600 underline-offset-2 hover:underline"
        >
          Studio
        </Link>
      : null}
    </div>
  );
}
