"use client";

import { PublishMediaEmptyCtaRow } from "@/components/publish/publish-media-empty-cta-row";
import { useActiveTranslator } from "@/i18n/client";
import {
  buildProductionSummaries,
  countActiveSoundEffects,
  isProductionSectionActive,
  loadPublishProductionFromProject,
  productionNeedsEmptyStateCtas,
} from "@/lib/publish-media-production";
import type { PublishProject } from "@/types/publish-overlay";
import type { PublishProductionSectionId } from "@/types/publish-media-production";

type Props = {
  project: PublishProject;
  onJumpToMedia?: (section: PublishProductionSectionId) => void;
};

export function PublishMediaReviewSummary({ project, onJumpToMedia }: Props) {
  const t = useActiveTranslator();
  const production = loadPublishProductionFromProject(project);
  const summaries = buildProductionSummaries(production);
  const showEmptyCtas = productionNeedsEmptyStateCtas(production);

  return (
    <div className="space-y-4" data-testid="publish-media-review-summary">
      <ul className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm">
        {summaries.map((row) => {
          let detail = row.detail;
          if (row.section === "soundEffects" && row.active) {
            detail = t("publish.media.review.sfxActive" as never, {
              count: String(countActiveSoundEffects(production)),
            } as never);
          } else if (row.section === "textOverlays" && row.active) {
            detail = t("publish.media.review.overlaysActive" as never, {
              count: String(production.textOverlays.items.length),
            } as never);
          } else if (detail.startsWith("publish.")) {
            detail = t(detail as never);
          }

          return (
            <li key={row.section} className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold text-zinc-800">{t(row.label as never)}</span>
              <span className={row.active ? "text-[#0067B1]" : "text-zinc-500"}>{detail}</span>
            </li>
          );
        })}
      </ul>

      {showEmptyCtas && onJumpToMedia ?
        <PublishMediaEmptyCtaRow
          onSelect={onJumpToMedia}
          missingSections={(
            ["voice", "music", "soundEffects", "subtitles", "textOverlays"] as PublishProductionSectionId[]
          ).filter((section) => !isProductionSectionActive(production, section))}
        />
      : null}
    </div>
  );
}
