"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { loadAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import {
  buildStoryArchitectSummary,
  buildStoryArchitecture,
} from "@/lib/studio-story-architecture";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  ProductionStoryStructurePhase,
  StoryStructurePhaseStatus,
} from "@/types/studio-production-plan";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StoryNarrativeMoment } from "@/types/studio-story-architecture";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

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

function storyStatusKey(status: StoryStructurePhaseStatus): TranslationKey {
  if (status === "strong") return "studio.productionPlan.story.status.strong";
  if (status === "present") return "studio.productionPlan.story.status.present";
  if (status === "weak") return "studio.productionPlan.story.status.weak";
  return "studio.productionPlan.story.status.missing";
}

function storyStatusClass(status: StoryStructurePhaseStatus): string {
  if (status === "strong") return "text-[#006D52]";
  if (status === "present") return "text-[#0067B1]";
  if (status === "weak") return "text-amber-800";
  return "text-zinc-500";
}

function StructureRow({ phase }: { phase: ProductionStoryStructurePhase }) {
  const t = useActiveTranslator();
  return (
    <li className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-xs">
      <span className="font-medium text-zinc-800">{t(phase.labelKey as TranslationKey)}</span>
      <span className={`font-semibold ${storyStatusClass(phase.status)}`}>
        {t(storyStatusKey(phase.status))}
      </span>
    </li>
  );
}

function MomentRow({ moment }: { moment: StoryNarrativeMoment }) {
  const t = useActiveTranslator();
  return (
    <li className="rounded-lg border border-indigo-100 bg-white/90 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-zinc-900">
          {t(moment.labelKey as TranslationKey)}
        </span>
        <span className={`text-xs font-semibold ${storyStatusClass(moment.status)}`}>
          {t(storyStatusKey(moment.status))}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-600">
        {t(moment.beatKey as TranslationKey, moment.beatParams)}
      </p>
    </li>
  );
}

export function StudioWorkspaceStoryArchitecturePanel({
  storyboard,
  characters,
  locations,
  props,
  worlds,
  projectMemory,
  styleProfile,
  directorProfile,
}: Props) {
  const t = useActiveTranslator();

  const architecture = useMemo(() => {
    const assetDecisionRegistry = loadAssetDecisionRegistry({ storyboardId: storyboard.id });
    return buildStoryArchitecture({
      userIdea: storyboard.aiDirectorPrompt ?? "",
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: projectMemory ?? undefined,
      assetDecisionRegistry,
      directorProfile,
      styleProfile,
    });
  }, [
    storyboard,
    characters,
    locations,
    props,
    worlds,
    projectMemory,
    styleProfile,
    directorProfile,
  ]);

  const summary = buildStoryArchitectSummary(architecture);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.storyArchitect.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.storyArchitect.subtitle")}</p>
      </div>

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.storyArchitect.section.foundation")}
        </h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("studio.storyArchitect.field.goal")}
            </dt>
            <dd className="mt-0.5 text-zinc-900">{architecture.storyGoal || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("studio.storyArchitect.field.theme")}
            </dt>
            <dd className="mt-0.5 text-zinc-900">
              {architecture.theme.startsWith("studio.") ?
                t(architecture.theme as TranslationKey)
              : architecture.theme}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("studio.storyArchitect.field.message")}
            </dt>
            <dd className="mt-0.5 text-zinc-900">{architecture.message || "—"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-indigo-900">
          {t(summary.labelKey as TranslationKey, summary.params)}
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.storyArchitect.section.structure")}
        </h3>
        <ul className="mt-3 space-y-1.5">
          {architecture.storyStructure.map((phase) => (
            <StructureRow key={phase.phase} phase={phase} />
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.storyArchitect.section.moments")}
        </h3>
        <p className="mt-0.5 text-xs text-zinc-600">{t("studio.storyArchitect.moments.hint")}</p>
        <ul className="mt-3 space-y-2">
          {architecture.storyMoments.map((moment) => (
            <MomentRow key={moment.id} moment={moment} />
          ))}
        </ul>
      </section>

      {architecture.recommendationKeys.length > 0 ?
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">
            {t("studio.storyArchitect.section.gaps")}
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {architecture.recommendationKeys.map((key) => (
              <li key={key}>→ {t(key as TranslationKey)}</li>
            ))}
          </ul>
        </section>
      : null}
    </div>
  );
}
