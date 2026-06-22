"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { EditorVisionAnalysisProgressState } from "@/hooks/use-editor-vision-analysis-progress";
import { EditorVisionHierarchyPanel } from "@/components/editor/editor-vision-hierarchy-panel";
import type {
  EditorVisionAnalysisLifecycleDebug,
  EditorVisionAnalysisRunMeta,
} from "@/lib/editor-vision-analysis-run";
import type { PremiumVisionAnalysisGateResult } from "@/lib/editor-vision-analysis-tier";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";
import type { PremiumAnalysisUiStatus } from "@/hooks/use-editor-vision-analysis-run";
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
  showPremiumAnalyzeCta?: boolean;
  premiumGate?: PremiumVisionAnalysisGateResult;
  onPremiumAnalyze?: () => void;
  premiumAnalysisStatus?: PremiumAnalysisUiStatus;
  premiumFailureReason?: string | null;
  runMeta?: EditorVisionAnalysisRunMeta | null;
  lifecycleDebug?: EditorVisionAnalysisLifecycleDebug;
  analysisProgress?: EditorVisionAnalysisProgressState;
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
  showPremiumAnalyzeCta = false,
  premiumGate,
  onPremiumAnalyze,
  premiumAnalysisStatus = "idle",
  premiumFailureReason = null,
  runMeta,
  lifecycleDebug,
  analysisProgress,
  taxonomyType = "unknown",
  className = "",
  variant = "light",
}: Props) {
  const t = useActiveTranslator();
  const progress = analysisProgress;
  const loadingEmpty = (analysisPending || analysisInProgress) && hierarchy.length === 0;
  const showHierarchy = hierarchy.length > 0;
  const showInlineProgress = Boolean(
    progress?.showProgress &&
      (analysisPending || analysisInProgress) &&
      showHierarchy &&
      premiumAnalysisStatus !== "failed"
  );
  const premiumAnalyzing =
    premiumAnalysisStatus === "running" || (analysisInProgress && showPremiumAnalyzeCta);
  const showPremiumFailed = premiumAnalysisStatus === "failed";
  const showPremiumComplete = premiumAnalysisStatus === "complete";
  const showPremiumCompleteNoParts = premiumAnalysisStatus === "complete_no_extra_parts";
  const premiumAllowed = premiumGate?.allowed ?? false;
  const premiumCredits = premiumGate?.requiredCredits ?? PREMIUM_VISION_ANALYSIS_CREDITS;

  const premiumFailureUserMessage = (() => {
    if (premiumFailureReason === "insufficient_credits") {
      return t("editor.visionAnalysis.premiumInsufficientCredits" as never, {
        count: premiumCredits,
      });
    }
    if (
      premiumFailureReason === "analysis_failed" ||
      premiumFailureReason === "premium_analysis_failed" ||
      premiumFailureReason === "premium_tier_not_stamped" ||
      premiumFailureReason === "acceptance_rejected"
    ) {
      return t("editor.visionAnalysis.premiumFailedRefunded" as never);
    }
    return null;
  })();
  const showBasicCompleteBanner =
    showPremiumAnalyzeCta &&
    showHierarchy &&
    !analysisInProgress &&
    !analysisPending &&
    !premiumAnalyzing;
  const isDev = process.env.NODE_ENV !== "production";

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

  const premiumButtonClass =
    variant === "studio"
      ? "border-white/30 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
      : "border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100 disabled:opacity-50";

  const renderPremiumAnalyzeButton = (classNameExtra = "") => {
    if (!onPremiumAnalyze) {
      return null;
    }
    return (
      <div className={classNameExtra}>
        {premiumGate?.adminTestLabel ? (
          <p
            className={`mb-2 text-[11px] font-medium ${
              variant === "studio" ? "text-emerald-200" : "text-emerald-700"
            }`}
          >
            {premiumGate.adminTestLabel}
          </p>
        ) : null}
        <button
          type="button"
          disabled={!premiumAllowed || premiumAnalyzing}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${premiumButtonClass}`}
          onClick={onPremiumAnalyze}
          data-testid="editor-premium-analyze-button"
        >
          {premiumAnalyzing
            ? t("editor.visionAnalysis.premiumAnalyzeInProgress" as never)
            : t("editor.visionAnalysis.premiumAnalyzeWithCredits" as never, {
                count: premiumCredits,
              })}
        </button>
        <p
          className={`mt-2 text-[11px] leading-relaxed ${
            variant === "studio" ? "text-white/75" : "text-zinc-600"
          }`}
        >
          {!premiumGate?.adminTestLabel
            ? premiumAllowed
              ? t("editor.visionAnalysis.premiumAnalyzeHintWithCredits" as never, {
                  count: premiumCredits,
                })
              : t("editor.visionAnalysis.premiumInsufficientCredits" as never, {
                  count: premiumCredits,
                })
            : null}
        </p>
      </div>
    );
  };

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
        {renderPremiumAnalyzeButton("mt-3")}
      </section>
    );
  }

  if (!showHierarchy) {
    return null;
  }

  return (
    <section className={shellClass} data-testid="editor-vision-parts-panel">
      {showInlineProgress ? progressBanner : null}
      {showBasicCompleteBanner ? (
        <div
          className={`mb-3 rounded-xl border px-3 py-2 ${
            variant === "studio"
              ? "border-sky-300/40 bg-sky-500/15 text-white"
              : "border-sky-200 bg-sky-50 text-sky-950"
          }`}
          data-testid="editor-basic-analysis-complete-banner"
        >
          <p className="text-xs font-semibold">{t("editor.visionAnalysis.basicCompleteTitle" as never)}</p>
          <p className="mt-1 text-[11px] leading-relaxed opacity-90">
            {t("editor.visionAnalysis.basicCompleteLead" as never)}
          </p>
        </div>
      ) : null}
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
      {showPremiumComplete ? (
        <p
          className="mb-2 text-[11px] font-medium text-emerald-700"
          data-testid="editor-premium-analysis-complete-label"
        >
          {t("editor.visionAnalysis.premiumCompleteLabel" as never)}
        </p>
      ) : null}
      {showPremiumCompleteNoParts ? (
        <p
          className="mb-2 text-[11px] font-medium text-sky-700"
          data-testid="editor-premium-analysis-no-parts-label"
        >
          {t("editor.visionAnalysis.premiumCompleteNoParts" as never)}
        </p>
      ) : null}
      {showPremiumFailed ? (
        <div
          className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-900"
          data-testid="editor-premium-analysis-failed-label"
        >
          <p className="font-semibold">{t("editor.visionAnalysis.premiumFailed" as never)}</p>
          {premiumFailureUserMessage ? (
            <p className="mt-1 leading-relaxed">{premiumFailureUserMessage}</p>
          ) : null}
          {isDev && premiumFailureReason ? (
            <p className="mt-1 font-mono text-[10px] opacity-80">{premiumFailureReason}</p>
          ) : null}
        </div>
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
      {(showPremiumAnalyzeCta || needsDeepAnalysis) && renderPremiumAnalyzeButton("mt-3")}
      {showSourceDebug && lifecycleDebug ? (
        <details className="mt-3 rounded border border-violet-200 bg-violet-50/50 p-2 text-[10px] text-violet-900">
          <summary className="cursor-pointer font-medium">Vision run lifecycle</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(lifecycleDebug, null, 2)}</pre>
          {lifecycleDebug.visibleTreeDebug ? (
            <div className="mt-2 rounded border border-violet-300 bg-white/80 p-2">
              <p className="font-semibold">Visible parts tree</p>
              <p>rawPartsCount: {lifecycleDebug.visibleTreeDebug.rawPartsCount}</p>
              <p>visibleTreeNodeCount: {lifecycleDebug.visibleTreeDebug.visibleTreeNodeCount}</p>
              <p>datasourceUsed: {lifecycleDebug.visibleTreeDebug.datasourceUsed}</p>
              <p>droppedPartsCount: {lifecycleDebug.visibleTreeDebug.droppedPartsCount}</p>
              {lifecycleDebug.visibleTreeDebug.rawFoundLabels?.length ? (
                <p>rawFound: {lifecycleDebug.visibleTreeDebug.rawFoundLabels.join(", ")}</p>
              ) : null}
              {lifecycleDebug.visibleTreeDebug.droppedPartLabels.length > 0 ? (
                <p>dropped: {lifecycleDebug.visibleTreeDebug.droppedPartLabels.join(", ")}</p>
              ) : null}
            </div>
          ) : null}
        </details>
      ) : null}
    </section>
  );
}
