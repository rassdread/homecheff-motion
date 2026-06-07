"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildCreativeReview } from "@/lib/studio-creative-review";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { CreativeReviewItem, CreativeReviewStoryPhase } from "@/types/studio-creative-review";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot | null;
  styleProfile?: string;
  directorProfile?: string;
  onSwitchTool?: (tool: StudioToolId) => void;
};

function levelCardClass(level: "ready" | "almost_ready" | "needs_work"): string {
  if (level === "ready") {
    return "border-emerald-200 bg-emerald-50/70";
  }
  if (level === "almost_ready") {
    return "border-amber-200 bg-amber-50/70";
  }
  return "border-red-200 bg-red-50/70";
}

function phaseStatusLabel(status: CreativeReviewStoryPhase["reviewStatus"]): TranslationKey {
  if (status === "strong") {
    return "studio.creativeReview.phase.strong";
  }
  if (status === "weak") {
    return "studio.creativeReview.phase.weak";
  }
  return "studio.creativeReview.phase.missing";
}

function ReviewList({
  titleKey,
  items,
  onSwitchTool,
  emptyKey,
}: {
  titleKey: TranslationKey;
  items: CreativeReviewItem[];
  onSwitchTool?: (tool: StudioToolId) => void;
  emptyKey?: TranslationKey;
}) {
  const t = useActiveTranslator();

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-zinc-900">{t(titleKey)}</h3>
      {items.length === 0 ?
        emptyKey ?
          <p className="text-sm text-zinc-500">{t(emptyKey)}</p>
        : null
      : <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700"
            >
              <p>{t(item.messageKey as TranslationKey, item.messageParams)}</p>
              {item.toolId && onSwitchTool ?
                <button
                  type="button"
                  onClick={() => onSwitchTool(item.toolId!)}
                  className="mt-1 text-xs font-semibold text-[#0067B1]"
                >
                  {t("studio.creativeReview.openTool")}
                </button>
              : null}
            </li>
          ))}
        </ul>
      }
    </section>
  );
}

export function StudioWorkspaceCreativeReviewPanel({
  storyboard,
  characters,
  locations,
  props,
  worlds,
  projectMemory,
  styleProfile,
  directorProfile,
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();

  const review = useMemo(
    () =>
      buildCreativeReview({
        storyboard,
        characters,
        locations,
        props,
        worlds,
        projectMemory: projectMemory ?? undefined,
        styleProfile,
        directorProfile,
        currentIdea: storyboard.aiDirectorPrompt,
      }),
    [
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory,
      styleProfile,
      directorProfile,
    ]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t("studio.creativeReview.title")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.creativeReview.subtitle")}</p>
      </div>

      <section
        className={`rounded-2xl border p-4 ${levelCardClass(review.qualitySummary.level)}`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
          {t("studio.creativeReview.quality.title")}
        </p>
        <p className="mt-1 text-2xl font-semibold text-zinc-900">
          {review.qualitySummary.score}/100
        </p>
        <p className="mt-1 text-sm text-zinc-700">
          {t(
            review.qualitySummary.summaryKey as TranslationKey,
            review.qualitySummary.summaryParams
          )}
        </p>
      </section>

      <ReviewList
        titleKey="studio.creativeReview.section.strengths"
        items={review.strengths}
        onSwitchTool={onSwitchTool}
        emptyKey="studio.creativeReview.empty.strengths"
      />

      <ReviewList
        titleKey="studio.creativeReview.section.weaknesses"
        items={review.weaknesses}
        onSwitchTool={onSwitchTool}
        emptyKey="studio.creativeReview.empty.weaknesses"
      />

      <ReviewList
        titleKey="studio.creativeReview.section.missing"
        items={review.missingElements}
        onSwitchTool={onSwitchTool}
        emptyKey="studio.creativeReview.empty.missing"
      />

      <ReviewList
        titleKey="studio.creativeReview.section.recommendations"
        items={review.improvementSuggestions}
        onSwitchTool={onSwitchTool}
        emptyKey="studio.creativeReview.empty.recommendations"
      />

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.creativeReview.story.title")}
        </h3>
        <p className="mt-1 text-xs text-zinc-600">
          {t("studio.creativeReview.story.score", { score: String(review.storyReview.score) })}
        </p>
        <ul className="mt-3 space-y-2">
          {review.storyReview.phases.map((phase) => (
            <li
              key={phase.phase}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            >
              <span className="font-medium text-zinc-900">
                {t(phase.labelKey as TranslationKey)}
              </span>
              <span className="text-xs font-semibold text-zinc-600">
                {t(phaseStatusLabel(phase.reviewStatus))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {review.opportunities.length > 0 ?
        <ReviewList
          titleKey="studio.creativeReview.section.opportunities"
          items={review.opportunities}
          onSwitchTool={onSwitchTool}
        />
      : null}
    </div>
  );
}
