"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  lifecycleBadgeClassName,
  type VersionLifecycleDisplay,
} from "@/lib/language-version-display";

type Props = {
  lifecycle: VersionLifecycleDisplay;
  className?: string;
};

export function VersionLifecycleBadge({ lifecycle, className = "" }: Props) {
  const t = useActiveTranslator();

  if (lifecycle !== "current" && lifecycle !== "archived") {
    return null;
  }

  const labelKey =
    lifecycle === "current"
      ? "projectDetail.versions.currentBadge"
      : "projectDetail.versions.archivedBadge";

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${lifecycleBadgeClassName(lifecycle)} ${className}`}
    >
      {t(labelKey as never)}
    </span>
  );
}

type VersionNoteProps = {
  note: string | null | undefined;
  className?: string;
};

export function VersionNoteDisplay({ note, className = "" }: VersionNoteProps) {
  const t = useActiveTranslator();
  const trimmed = note?.trim();
  if (!trimmed) {
    return null;
  }

  return (
    <div className={`rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs ${className}`}>
      <p className="font-medium text-zinc-500">{t("projectDetail.versions.noteLabel")}</p>
      <p className="mt-0.5 text-zinc-800">{trimmed}</p>
    </div>
  );
}
