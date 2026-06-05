"use client";

import { BundleVersionBadges } from "@/components/videos/bundle-version-badges";
import { useActiveTranslator } from "@/i18n/client";
import { formatSelectedVersionSummaryLabel } from "@/lib/bundle-rich-summary";
import type { BundleVersionBadge } from "@/lib/bundle-version-badges";

type Props = {
  languageLabel: string;
  versionLabel: string;
  durationSeconds: number | null;
  status: string;
  badges: BundleVersionBadge[];
};

export function BundleSelectedVersionBar({
  languageLabel,
  versionLabel,
  durationSeconds,
  status,
  badges,
}: Props) {
  const t = useActiveTranslator();
  const selectedLabel = formatSelectedVersionSummaryLabel(languageLabel, versionLabel);

  const statusKey =
    status === "completed"
      ? "videos.status.completed"
      : status === "failed"
        ? "videos.status.failed"
        : status === "rendering"
          ? "videos.status.rendering"
          : status === "generating"
            ? "videos.status.generating"
            : "videos.status.queued";

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-2.5 py-2">
      <p className="text-[11px] font-medium text-zinc-800">{selectedLabel}</p>
      <p className="mt-0.5 text-[11px] text-zinc-600">
        {durationSeconds != null && Number.isFinite(durationSeconds)
          ? t("videos.bundle.duration", { seconds: String(Math.round(durationSeconds)) })
          : "~—"}
        {" · "}
        {t(statusKey as never)}
      </p>
      <BundleVersionBadges badges={badges} className="mt-1.5" />
    </div>
  );
}
