"use client";

import Link from "next/link";
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { VersionIdentityEditor } from "@/components/videos/version-identity-editor";
import { formatVersionIdentityWillCreateLabel } from "@/lib/version-identity";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";
import type { VersionIdentityLanguageCode } from "@/lib/version-identity";
import type { DraftLineageResponse } from "@/types/animation-api";

type Props = {
  lineage: DraftLineageResponse;
  targetLanguage: VersionIdentityLanguageCode;
  onTargetLanguageChange: (code: VersionIdentityLanguageCode) => void;
  versionName: string;
  onVersionNameChange: (value: string) => void;
  bundleCatalog?: MotionVersionCatalog | null;
  disabled?: boolean;
  showSourceLink?: boolean;
};

export function ConceptVersionIdentitySection({
  lineage,
  targetLanguage,
  onTargetLanguageChange,
  versionName,
  onVersionNameChange,
  bundleCatalog = null,
  disabled = false,
  showSourceLink = true,
}: Props) {
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const willCreateLabel = formatVersionIdentityWillCreateLabel(
    targetLanguage,
    versionName,
    locale === "en" ? "en" : "nl"
  );

  return (
    <div className="mb-6 space-y-4">
      <div className="rounded-xl border border-[#0067B1]/25 bg-[#0067B1]/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]/80">
          {t("projects.draft.basedOn")}
        </p>
        <p className="mt-1 text-sm font-medium text-[#0067B1]">
          {lineage.sourceProjectTitle} → {lineage.sourceVersionDisplay}
        </p>
        <p className="mt-2 text-sm font-medium text-[#0067B1]">{willCreateLabel}</p>
        {lineage.copiedAt ? (
          <p className="mt-1 text-xs text-[#0067B1]/80">
            {t("projects.draft.lineageCopiedAt", {
              date: new Date(lineage.copiedAt).toLocaleString(),
            })}
          </p>
        ) : null}
        {showSourceLink ? (
          <Link
            href={`/videos/${encodeURIComponent(lineage.sourceProjectId)}`}
            className="mt-2 inline-block text-xs font-medium text-[#0067B1] underline"
          >
            {t("projects.draft.viewSource")}
          </Link>
        ) : null}
      </div>

      <VersionIdentityEditor
        lineage={lineage}
        targetLanguage={targetLanguage}
        onTargetLanguageChange={onTargetLanguageChange}
        versionName={versionName}
        onVersionNameChange={onVersionNameChange}
        bundleCatalog={bundleCatalog}
        disabled={disabled}
      />
    </div>
  );
}
