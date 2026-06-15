"use client";

import Link from "next/link";
import { useActiveTranslator } from "@/i18n/client";

type Props = {
  librarySaved?: boolean;
  libraryAssetId?: string | null;
  projectHref?: string | null;
  onMakeVariant?: () => void;
};

export function LibraryGenerationSuccessBanner({
  librarySaved = true,
  libraryAssetId,
  projectHref,
  onMakeVariant,
}: Props) {
  const t = useActiveTranslator();

  if (!librarySaved) {
    return null;
  }

  return (
    <section
      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      data-testid="library-generation-success-banner"
    >
      <p className="font-semibold">{t("library.consistency.savedSuccess" as never)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/studio/assets"
          className="rounded-lg bg-[#006D52] px-3 py-1.5 text-xs font-semibold text-white"
        >
          {t("library.consistency.viewInLibrary" as never)}
        </Link>
        {projectHref ?
          <Link
            href={projectHref}
            className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900"
          >
            {t("library.consistency.useInProject" as never)}
          </Link>
        : null}
        {onMakeVariant ?
          <button
            type="button"
            className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900"
            onClick={onMakeVariant}
          >
            {t("library.consistency.makeVariant" as never)}
          </button>
        : null}
      </div>
      {libraryAssetId ?
        <p className="mt-2 text-[11px] text-emerald-800/80">{libraryAssetId}</p>
      : null}
    </section>
  );
}
