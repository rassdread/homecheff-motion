"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorVisionAnalysisProgressState } from "@/hooks/use-editor-vision-analysis-progress";
import { EditorVisionHierarchyPanel } from "@/components/editor/editor-vision-hierarchy-panel";
import type {
  EditorVisionAnalysisLifecycleDebug,
  EditorVisionAnalysisRunMeta,
} from "@/lib/editor-vision-analysis-run";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

type Props = {
  hierarchy: EditorVisionHierarchyNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: EditorVisionHierarchyNode) => void;
  showSourceDebug?: boolean;
  analysisPending?: boolean;
  analysisInProgress?: boolean;
  analysisComplete?: boolean;
  showEmptyState?: boolean;
  isPartialResult?: boolean;
  cachedResult?: boolean;
  needsDeepAnalysis?: boolean;
  onDeepAnalyze?: () => void;
  runMeta?: EditorVisionAnalysisRunMeta | null;
  lifecycleDebug?: EditorVisionAnalysisLifecycleDebug;
  analysisProgress?: EditorVisionAnalysisProgressState;
  onReanalyze?: () => void;
  taxonomyType?: "human" | "animal" | "mascot" | "unknown";
  className?: string;
  variant?: "light" | "studio";
};

export function EditorVisionPartsPanel({
  hierarchy,
  selectedNodeId,
  onSelectNode,
  showSourceDebug = false,
  analysisPending = false,
  analysisInProgress = false,
  analysisComplete = false,
  showEmptyState = false,
  isPartialResult = false,
  cachedResult = false,
  needsDeepAnalysis = false,
  onDeepAnalyze,
  runMeta,
  lifecycleDebug,
  analysisProgress,
  onReanalyze,
  taxonomyType = "unknown",
  className = "",
  variant = "light",
}: Props) {
  const t = useActiveTranslator();
  const progress = analysisProgress;
  const loadingEmpty = (analysisPending || analysisInProgress) && hierarchy.length === 0;
  const showHierarchy = hierarchy.length > 0;
  const showInlineProgress = Boolean(
    progress?.showProgress && (analysisPending || analysisInProgress) && showHierarchy
  );

  const shellClass =
    variant === "studio"
      ? `rounded-2xl border border-white/15 bg-white/95 p-3 shadow-sm ${className}`
      : `rounded-2xl border border-zinc-200 bg-white p-3 ${className}`;

  const loadingClass =
    variant === "studio"
      ? "rounded-2xl border border-white/20 bg-[#003d6b]/55 p-4 text-white shadow-sm backdrop-blur-sm"
      : "rounded-2xl border border-violet-200 bg-violet-50/70 p-4 text-violet-950";

  const emptyClass =
    variant === "studio"
      ? "rounded-2xl border border-white/20 bg-[#003d6b]/40 p-4 text-white shadow-sm backdrop-blur-sm"
      : "rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-800";

  const progressBanner =
    progress && (loadingEmpty || showInlineProgress) ? (
      <div
        className={`${showInlineProgress ? "mb-3" : "mb-3"} ${
          showInlineProgress
            ? variant === "studio"
              ? "rounded-xl border border-white/20 bg-[#003d6b]/45 px-3 py-2 text-white backdrop-blur-sm"
              : "rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2 text-violet-950"
            : ""
        }`}
        data-testid={showInlineProgress ? "editor-vision-analysis-progress-banner" : undefined}
      >
        <div
          className={`h-2 overflow-hidden rounded-full ${
            variant === "studio" ? "bg-white/20" : "bg-violet-200"
          }`}
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid="editor-vision-analysis-progress-bar"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ease-out ${
              variant === "studio" ? "bg-white" : "bg-violet-600"
            }`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p
          className={`mt-2 text-sm font-semibold ${variant === "studio" ? "text-white" : ""}`}
          data-testid="editor-vision-analysis-progress-label"
        >
          {t("editor.open.progressPercent" as never, {
            percent: progress.percent,
            stage: t(progress.labelKey as never),
          })}
        </p>
        {runMeta?.lastStage ? (
          <p className={`mt-1 text-[10px] ${variant === "studio" ? "text-white/60" : "text-violet-700"}`}>
            {runMeta.lastStage}
          </p>
        ) : null}
      </div>
    ) : null;

  if (loadingEmpty) {
    const stageLabel = progress
      ? t(progress.labelKey as never)
      : t("editor.open.stage.analysisPreparing" as never);

    return (
      <section className={loadingClass} data-testid="editor-vision-parts-loading">
        {progressBanner ?? (
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${
                variant === "studio" ? "border-white/70" : "border-violet-500"
              }`}
              aria-hidden
            />
            <h3 className={`text-sm font-semibold ${variant === "studio" ? "text-white" : ""}`}>
              {stageLabel}
            </h3>
          </div>
        )}
        <p
          className={`mt-2 text-sm leading-relaxed ${
            variant === "studio" ? "text-white/85" : "text-violet-900/90"
          }`}
        >
          {t("editor.open.progressHint" as never)}
        </p>
        {runMeta?.bootstrapTimedOut ? (
          <p
            className={`mt-2 text-xs ${variant === "studio" ? "text-amber-200" : "text-amber-800"}`}
          >
            {t("editor.visionAnalysis.bootstrapTimeout" as never)}
          </p>
        ) : null}
        {runMeta?.lastStage ? (
          <p className={`mt-2 text-[10px] ${variant === "studio" ? "text-white/60" : "text-violet-700"}`}>
            {runMeta.lastStage}
          </p>
        ) : null}
        {showSourceDebug && progress?.stageTimings.length ? (
          <details className="mt-3 rounded border border-white/20 bg-black/10 p-2 text-[10px]">
            <summary className="cursor-pointer font-medium">Stage timings</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(progress.stageTimings, null, 2)}
            </pre>
          </details>
        ) : null}
      </section>
    );
  }

  if ((showEmptyState || (analysisComplete && !showHierarchy) || runMeta?.status === "failed") && !showHierarchy) {
    return (
      <section className={emptyClass} data-testid="editor-vision-parts-empty">
        <h3 className={`text-sm font-semibold ${variant === "studio" ? "text-white" : ""}`}>
          {t("editor.visionAnalysis.emptyTitle" as never)}
        </h3>
        <p
          className={`mt-2 text-sm leading-relaxed ${
            variant === "studio" ? "text-white/85" : "text-zinc-600"
          }`}
        >
          {t("editor.visionAnalysis.emptyLead" as never)}
        </p>
        {onReanalyze ? (
          <button
            type="button"
            className={`mt-3 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              variant === "studio"
                ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            }`}
            onClick={onReanalyze}
          >
            {t("editor.isolation.reanalyze" as never)}
          </button>
        ) : null}
      </section>
    );
  }

  if (!showHierarchy) {
    return null;
  }

  return (
    <section className={shellClass} data-testid="editor-vision-parts-panel">
      {showInlineProgress ? progressBanner : null}
      {cachedResult ? (
        <p className="mb-2 text-[11px] font-medium text-sky-700">
          {t("editor.visionAnalysis.lastAnalyzedLabel" as never)}
        </p>
      ) : null}
      {isPartialResult ? (
        <p className="mb-2 text-[11px] font-medium text-amber-700">
          {t("editor.visionAnalysis.partialLabel" as never)}
        </p>
      ) : null}
      {runMeta?.bootstrapTimedOut ? (
        <p className="mb-2 text-[11px] font-medium text-amber-700">
          {t("editor.visionAnalysis.bootstrapTimeout" as never)}
        </p>
      ) : null}
      {!showInlineProgress && analysisInProgress && showHierarchy ? (
        <p
          className={`mb-2 text-[10px] ${variant === "studio" ? "text-white/70" : "text-violet-700"}`}
        >
          {t("editor.visionAnalysis.finalizingLabel" as never)}
        </p>
      ) : null}
      <EditorVisionHierarchyPanel
        hierarchy={hierarchy}
        selectedNodeId={selectedNodeId}
        onSelectNode={onSelectNode}
        showSourceDebug={showSourceDebug}
        taxonomyType={taxonomyType}
      />
      {needsDeepAnalysis && onDeepAnalyze ? (
        <button
          type="button"
          className={`mt-3 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            variant === "studio"
              ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
              : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
          }`}
          onClick={onDeepAnalyze}
        >
          {t("editor.visionAnalysis.deepAnalyze" as never)}
        </button>
      ) : null}
      {showSourceDebug && lifecycleDebug ? (
        <details className="mt-3 rounded border border-violet-200 bg-violet-50/50 p-2 text-[10px] text-violet-900">
          <summary className="cursor-pointer font-medium">Vision run lifecycle</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(lifecycleDebug, null, 2)}</pre>
        </details>
      ) : null}
    </section>
  );
}
