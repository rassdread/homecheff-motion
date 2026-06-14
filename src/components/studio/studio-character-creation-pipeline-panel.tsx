"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { useActiveTranslator } from "@/i18n/client";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { clearWizardGeneratedReferenceOutput } from "@/lib/studio-asset-wizard-source-reference";
import {
  canRunCharacterCreationPipeline,
  createPipelineJob,
  jobFromPipelineResult,
  loadActiveCharacterPipelineJob,
  loadRecentCharacterGenerations,
  persistCharacterPipelineJob,
  runCharacterCreationPipeline,
} from "@/lib/studio-character-generation-pipeline";
import { studioWorkspaceHref } from "@/lib/studio-workspace-href";
import type {
  CharacterPipelineBadgeStatus,
  CharacterPipelineJob,
  CharacterPipelineResult,
  CharacterPipelineStepId,
} from "@/types/studio-character-generation-pipeline";
import { CHARACTER_PIPELINE_STEP_IDS } from "@/types/studio-character-generation-pipeline";

type DraftPatch = Partial<AssetWizardDraft> | ((d: AssetWizardDraft) => AssetWizardDraft);

type Props = {
  draft: AssetWizardDraft;
  onDraftChange?: (patch: DraftPatch) => void;
  storyboardId?: string | null;
  decisionId?: string | null;
  onComplete?: (result: CharacterPipelineResult) => void;
  showRecent?: boolean;
  className?: string;
};

function StatusBadge({ status }: { status: CharacterPipelineBadgeStatus }) {
  const t = useActiveTranslator();
  const styles: Record<CharacterPipelineBadgeStatus, string> = {
    queued: "bg-zinc-100 text-zinc-700",
    running: "bg-blue-100 text-[#0067B1]",
    completed: "bg-emerald-100 text-emerald-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {t(`studio.characters.pipeline.badge.${status}` as never)}
    </span>
  );
}

function GenerationCard({
  job,
  previewUrl,
}: {
  job: CharacterPipelineJob;
  previewUrl?: string;
}) {
  const t = useActiveTranslator();
  const activeIndex = CHARACTER_PIPELINE_STEP_IDS.indexOf(job.activeStepId);
  const running = job.status === "running" || job.status === "queued";
  const progress = running
    ? Math.min(95, ((activeIndex + 1) / CHARACTER_PIPELINE_STEP_IDS.length) * 100)
    : job.status === "completed"
      ? 100
      : Math.max(10, ((activeIndex + 1) / CHARACTER_PIPELINE_STEP_IDS.length) * 100);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" role="status" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.characters.pipeline.cardTitle")}
        </p>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3 flex gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          {previewUrl ?
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          : (
            <span className="text-2xl opacity-40">👤</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{job.name}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-[#0067B1] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {CHARACTER_PIPELINE_STEP_IDS.map((stepId, index) => {
          const state =
            job.status === "failed" && index === activeIndex
              ? "failed"
              : index < activeIndex || job.status === "completed"
                ? "done"
                : index === activeIndex && running
                  ? "active"
                  : "pending";
          return (
            <li
              key={stepId}
              className={`flex items-center gap-2 text-sm ${
                state === "active"
                  ? "font-semibold text-[#0067B1]"
                  : state === "done"
                    ? "text-emerald-700"
                    : state === "failed"
                      ? "text-red-700"
                      : "text-zinc-400"
              }`}
            >
              <span className="w-14 shrink-0 text-xs font-medium uppercase text-zinc-500">
                {t("studio.characters.pipeline.stepLabel" as never, {
                  current: String(index + 1),
                  total: String(CHARACTER_PIPELINE_STEP_IDS.length),
                })}
              </span>
              <span className="w-5 text-center">
                {state === "done" ? "✓" : state === "active" ? "…" : state === "failed" ? "✕" : "○"}
              </span>
              {t(`studio.characters.pipeline.step.${stepId}` as never)}
            </li>
          );
        })}
      </ol>

      {job.error ?
        <p className="mt-3 text-sm text-red-700">{job.error}</p>
      : null}
    </div>
  );
}

function ResultActions({
  result,
  onMakeVariant,
}: {
  result: CharacterPipelineResult;
  onMakeVariant: () => void;
}) {
  const t = useActiveTranslator();
  const storyHref = result.storyboardId ? studioWorkspaceHref(result.storyboardId) : "/studio";

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={storyHref}
        className="min-h-[40px] rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
      >
        {t("studio.characters.pipeline.action.useInStory")}
      </Link>
      <Link
        href={`/editor?characterId=${encodeURIComponent(result.characterId)}`}
        className="min-h-[40px] rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
      >
        {t("studio.characters.pipeline.action.openEditor")}
      </Link>
      <Link
        href={`/studio/characters/${encodeURIComponent(result.characterId)}`}
        className="min-h-[40px] rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
      >
        {t("studio.characters.pipeline.action.viewInLibrary")}
      </Link>
      <button
        type="button"
        onClick={onMakeVariant}
        className="min-h-[40px] rounded-full border border-[#0067B1]/30 bg-[#0067B1]/5 px-4 py-2 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/10"
      >
        {t("studio.characters.pipeline.action.makeVariant")}
      </button>
    </div>
  );
}

function RecentGenerationsList({ jobs }: { jobs: CharacterPipelineJob[] }) {
  const t = useActiveTranslator();
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.characters.pipeline.recentTitle")}
      </h3>
      <ul className="space-y-2">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white">
              {job.previewUrl ?
                // eslint-disable-next-line @next/next/no-img-element
                <img src={job.previewUrl} alt="" className="h-full w-full object-cover" />
              : (
                <span className="text-lg opacity-40">👤</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">{job.name}</p>
              <p className="text-xs text-zinc-500">
                <ClientFormattedDateTime iso={job.createdAt} dateStyle="short" timeStyle="short" />
              </p>
            </div>
            <StatusBadge status={job.status} />
            {job.characterId ?
              <Link
                href={`/studio/characters/${encodeURIComponent(job.characterId)}`}
                className="shrink-0 text-xs font-semibold text-[#0067B1] hover:underline"
              >
                {t("studio.characters.pipeline.recentOpen")}
              </Link>
            : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StudioCharacterCreationPipelinePanel({
  draft,
  onDraftChange,
  storyboardId,
  decisionId,
  onComplete,
  showRecent = true,
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const [running, setRunning] = useState(false);
  const [job, setJob] = useState<CharacterPipelineJob | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const active = loadActiveCharacterPipelineJob();
    return active?.status === "running" ? active : null;
  });
  const [result, setResult] = useState<CharacterPipelineResult | null>(null);
  const [recentJobs, setRecentJobs] = useState<CharacterPipelineJob[]>(() =>
    typeof window === "undefined" ? [] : loadRecentCharacterGenerations()
  );

  const canRun = useMemo(() => canRunCharacterCreationPipeline(draft), [draft]);
  const previewUrl =
    result?.imageUrl ?? job?.previewUrl ?? draft.generatedReferencePreviewUrl ?? draft.referenceImageUrl;

  const handleProgress = useCallback(
    (params: {
      stepId: CharacterPipelineStepId;
      status: CharacterPipelineBadgeStatus;
      previewUrl?: string;
    }) => {
      setJob((current) => {
        if (!current) {
          return current;
        }
        const next: CharacterPipelineJob = {
          ...current,
          activeStepId: params.stepId,
          status: params.status === "completed" ? "completed" : "running",
          previewUrl: params.previewUrl ?? current.previewUrl,
        };
        persistCharacterPipelineJob(next);
        return next;
      });
    },
    []
  );

  const handleRun = useCallback(async () => {
    if (running || !canRun) {
      return;
    }
    setRunning(true);
    setResult(null);
    const nextJob = createPipelineJob(draft, storyboardId);
    setJob(nextJob);
    persistCharacterPipelineJob({ ...nextJob, status: "running" });

    try {
      const pipelineResult = await runCharacterCreationPipeline({
        draft,
        onProgress: handleProgress,
        onDraftChange: onDraftChange ? (patch) => onDraftChange(patch) : undefined,
        storyboardId,
        decisionId,
      });
      const completedJob = jobFromPipelineResult(nextJob, pipelineResult);
      setJob(completedJob);
      setResult(pipelineResult);
      persistCharacterPipelineJob(completedJob);
      setRecentJobs(loadRecentCharacterGenerations());
      onComplete?.(pipelineResult);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("studio.characters.pipeline.error.generic");
      const failedJob = jobFromPipelineResult(
        nextJob,
        {
          characterId: "",
          name: nextJob.name,
          imageUrl: "",
          attachedToProject: false,
        },
        message
      );
      setJob(failedJob);
      persistCharacterPipelineJob(failedJob);
      setRecentJobs(loadRecentCharacterGenerations());
    } finally {
      setRunning(false);
    }
  }, [running, canRun, draft, storyboardId, decisionId, onDraftChange, handleProgress, onComplete, t]);

  const handleMakeVariant = useCallback(() => {
    setResult(null);
    setJob(null);
    onDraftChange?.({
      ...clearWizardGeneratedReferenceOutput(draft),
      referenceGenerationStatus: "idle",
    });
  }, [draft, onDraftChange]);

  const showCard = running || job !== null;
  const showResult = result !== null && job?.status === "completed";

  return (
    <div className={`space-y-4 ${className}`}>
      <button
        type="button"
        disabled={running || !canRun}
        onClick={() => void handleRun()}
        className="min-h-[48px] w-full rounded-full bg-[#0067B1] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
      >
        {running
          ? t("studio.characters.pipeline.buttonRunning")
          : t("studio.characters.pipeline.buttonCreate")}
      </button>

      {!canRun && !showCard ?
        <p className="text-sm text-amber-700">{t("studio.characters.pipeline.hint.notReady")}</p>
      : null}

      {showCard && job ?
        <GenerationCard job={job} previewUrl={previewUrl} />
      : null}

      {showResult && result ?
        <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
          <h3 className="text-base font-semibold text-zinc-900">
            {t("studio.characters.pipeline.resultTitle")}
          </h3>
          {previewUrl ?
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="max-h-80 w-full object-contain" />
            </div>
          : null}
          <p className="text-sm font-medium text-zinc-900">{result.name}</p>
          <ResultActions result={result} onMakeVariant={handleMakeVariant} />
          <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800">
            <p>{t("studio.characters.pipeline.savedToLibrary")}</p>
            <Link
              href="/studio/characters"
              className="mt-1 inline-block font-semibold text-[#0067B1] hover:underline"
            >
              {t("studio.characters.pipeline.openLibrary")}
            </Link>
          </div>
          {result.attachedToProject ?
            <p className="text-sm font-medium text-[#0067B1]">
              {t("studio.characters.pipeline.attachedToProject")}
            </p>
          : null}
        </section>
      : null}

      {showRecent ?
        <RecentGenerationsList jobs={recentJobs} />
      : null}
    </div>
  );
}
