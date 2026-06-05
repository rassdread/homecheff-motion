"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { BundleFolderId } from "@/lib/bundle-folder";
import type { FolderLibrarySummary } from "@/lib/bundle-rich-summary";
import { BundleCountLines } from "@/components/videos/bundle-count-lines";

type Props = {
  folderId: BundleFolderId;
  summary: FolderLibrarySummary;
};

export function FolderLibraryHeader({ folderId, summary }: Props) {
  const t = useActiveTranslator();
  const folderLabelKey =
    folderId === "all" ? null : (`videos.folder.${folderId}` as const);

  return (
    <section className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
      <p className="text-sm font-semibold text-emerald-950">
        {folderLabelKey ? t(folderLabelKey as never) : t("videos.folder.all")}
      </p>
      <p className="mt-1 text-xs text-emerald-900/90">
        {t("videos.folderLibrary.summary", {
          videos: String(summary.videoCount),
          versions: String(summary.totalVersions),
        })}
      </p>
      <BundleCountLines
        className="mt-2 text-xs text-emerald-900/80"
        lines={[summary.languageLine, summary.sourceLine]}
      />
    </section>
  );
}
