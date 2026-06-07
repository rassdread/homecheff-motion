"use client";

import { useMemo } from "react";
import { StudioAiSuggestionCard } from "@/components/studio/studio-ai-suggestion-card";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { loadAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import { buildCreationAssistantView } from "@/lib/studio-creation-assistant";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  CreationAssistantProjectStatus,
  CreationAssistantTask,
} from "@/types/studio-creation-assistant";

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

function statusCardClass(status: CreationAssistantProjectStatus): string {
  if (status === "ready_for_render") {
    return "border-emerald-200 bg-emerald-50/70";
  }
  if (status === "almost_ready") {
    return "border-amber-200 bg-amber-50/70";
  }
  if (status === "building") {
    return "border-sky-200 bg-sky-50/70";
  }
  return "border-zinc-200 bg-zinc-50/80";
}

function categoryLabelKey(category: CreationAssistantTask["category"]): TranslationKey {
  switch (category) {
    case "asset":
      return "studio.creationAssistant.category.asset";
    case "image":
      return "studio.creationAssistant.category.image";
    case "audio":
      return "studio.creationAssistant.category.audio";
    case "story":
      return "studio.creationAssistant.category.story";
    case "render":
      return "studio.creationAssistant.category.render";
    case "fix":
      return "studio.creationAssistant.category.fix";
    default:
      return "studio.creationAssistant.category.general";
  }
}

function actionLabelKey(task: CreationAssistantTask): TranslationKey {
  if (task.actionKind === "createNew") {
    return "studio.productionPlan.guidance.createNew";
  }
  if (task.actionKind === "openLibrary") {
    return "studio.productionPlan.guidance.openLibrary";
  }
  if (task.actionKind === "useSuggestion") {
    return "studio.execution.action.useSuggestion";
  }
  return "studio.creationAssistant.action.open";
}

function TaskCard({
  task,
  onSwitchTool,
}: {
  task: CreationAssistantTask;
  onSwitchTool?: (tool: StudioToolId) => void;
}) {
  const t = useActiveTranslator();

  if (task.actionKind === "useSuggestion" && task.suggestedLabel) {
    return (
      <StudioAiSuggestionCard
        titleKey={categoryLabelKey(task.category)}
        issueKey={task.messageKey as TranslationKey}
        currentLabel="—"
        suggestedLabel={task.suggestedLabel}
        canApply={Boolean(task.suggestedAssetId)}
        onOpen={task.toolId && onSwitchTool ? () => onSwitchTool(task.toolId!) : undefined}
      />
    );
  }

  return (
    <article className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {t(categoryLabelKey(task.category))}
      </p>
      <p className="mt-1 text-zinc-800">
        {t(task.messageKey as TranslationKey, task.messageParams)}
      </p>
      {task.toolId && onSwitchTool ?
        <button
          type="button"
          onClick={() => onSwitchTool(task.toolId!)}
          className="mt-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold text-[#0067B1]"
        >
          {t(actionLabelKey(task))}
        </button>
      : null}
    </article>
  );
}

function TaskSection({
  titleKey,
  tasks,
  onSwitchTool,
  emptyKey,
  variant = "default",
}: {
  titleKey: TranslationKey;
  tasks: CreationAssistantTask[];
  onSwitchTool?: (tool: StudioToolId) => void;
  emptyKey?: TranslationKey;
  variant?: "default" | "blocker" | "completed";
}) {
  const t = useActiveTranslator();

  if (tasks.length === 0 && !emptyKey) {
    return null;
  }

  const borderClass =
    variant === "blocker" ? "border-red-200 bg-red-50/40"
    : variant === "completed" ? "border-emerald-200 bg-emerald-50/30"
    : "border-zinc-200 bg-zinc-50/50";

  return (
    <section className={`rounded-2xl border p-4 ${borderClass}`}>
      <h3 className="text-sm font-semibold text-zinc-900">{t(titleKey)}</h3>
      {tasks.length === 0 && emptyKey ?
        <p className="mt-2 text-sm text-zinc-500">{t(emptyKey)}</p>
      : <ul className="mt-3 space-y-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard task={task} onSwitchTool={onSwitchTool} />
            </li>
          ))}
        </ul>
      }
    </section>
  );
}

export function StudioWorkspaceCreationAssistantPanel({
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

  const view = useMemo(() => {
    const assetDecisionRegistry = loadAssetDecisionRegistry({ storyboardId: storyboard.id });
    return buildCreationAssistantView({
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: projectMemory ?? undefined,
      styleProfile,
      directorProfile,
      currentIdea: storyboard.aiDirectorPrompt,
      assetDecisionRegistry,
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

  const { completionProgress: progress } = view;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("studio.creationAssistant.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">{t("studio.creationAssistant.subtitle")}</p>
      </div>

      <section className={`rounded-2xl border p-4 ${statusCardClass(progress.projectStatus)}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
          {t("studio.creationAssistant.progress.title")}
        </p>
        <p className="mt-1 text-xl font-semibold text-zinc-900">
          {t(progress.projectStatusKey as TranslationKey)}
        </p>
        <p className="mt-1 text-sm text-zinc-700">
          {t("studio.creationAssistant.progress.summary", {
            percent: String(progress.percent),
            domains: String(progress.domainsPassed),
            total: String(progress.domainsTotal),
            score: String(progress.readinessScore),
          })}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-[#0067B1] transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </section>

      {view.blockers.length > 0 ?
        <TaskSection
          titleKey="studio.creationAssistant.section.blockers"
          tasks={view.blockers}
          onSwitchTool={onSwitchTool}
          variant="blocker"
        />
      : null}

      <TaskSection
        titleKey="studio.creationAssistant.section.now"
        tasks={view.nowTasks}
        onSwitchTool={onSwitchTool}
        emptyKey="studio.creationAssistant.empty.now"
      />

      <TaskSection
        titleKey="studio.creationAssistant.section.next"
        tasks={view.nextTasks}
        onSwitchTool={onSwitchTool}
        emptyKey="studio.creationAssistant.empty.next"
      />

      <TaskSection
        titleKey="studio.creationAssistant.section.optional"
        tasks={view.optionalTasks}
        onSwitchTool={onSwitchTool}
        emptyKey="studio.creationAssistant.empty.optional"
      />

      <TaskSection
        titleKey="studio.creationAssistant.section.completed"
        tasks={view.completedItems}
        onSwitchTool={onSwitchTool}
        emptyKey="studio.creationAssistant.empty.completed"
        variant="completed"
      />
    </div>
  );
}
