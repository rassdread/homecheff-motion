"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listEditorAnalysisTimings } from "@/lib/editor-analysis-performance";
import { getEditorOpenStage } from "@/lib/editor-open-timing";
import {
  bumpProgressAfterRtdetrTiming,
  bumpProgressAfterVisionPartsTiming,
  EDITOR_VISION_HYDRATION_SAFE_PROGRESS,
  isVisionPartsApiStage,
  resolveEditorVisionAnalysisProgress,
  type EditorVisionAnalysisProgressSnapshot,
} from "@/lib/editor-vision-analysis-progress";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";
import { traceVisionPipeline } from "@/lib/editor-vision-trace";

export type EditorVisionAnalysisProgressState = EditorVisionAnalysisProgressSnapshot & {
  showProgress: boolean;
  stageTimings: ReturnType<typeof listEditorAnalysisTimings>;
};

const HYDRATION_SAFE_PROGRESS_STATE: EditorVisionAnalysisProgressState = {
  ...EDITOR_VISION_HYDRATION_SAFE_PROGRESS,
  showProgress: false,
  stageTimings: [],
};

function snapshotFieldsEqual(
  a: EditorVisionAnalysisProgressSnapshot,
  b: EditorVisionAnalysisProgressSnapshot
): boolean {
  return (
    a.percent === b.percent &&
    a.stage === b.stage &&
    a.labelKey === b.labelKey &&
    a.showProgress === b.showProgress
  );
}

export function useEditorVisionAnalysisProgress(input: {
  runMeta?: EditorVisionAnalysisRunMeta | null;
  cachedResult: boolean;
  analysisPending: boolean;
  analysisInProgress: boolean;
  premiumAnalysisActive?: boolean;
  sessionId?: string;
  mounted?: boolean;
}): EditorVisionAnalysisProgressState {
  const mounted = input.mounted ?? true;
  const lastProgressRef = useRef<EditorVisionAnalysisProgressSnapshot | null>(null);
  const monotonicPercentRef = useRef(EDITOR_VISION_HYDRATION_SAFE_PROGRESS.percent);
  const visionPartsStartedAtRef = useRef<number | null>(null);
  const [visionPartsElapsedMs, setVisionPartsElapsedMs] = useState(0);
  const [openStage, setOpenStage] = useState<ReturnType<typeof getEditorOpenStage>>("photo_loading");
  const [snapshot, setSnapshot] = useState<EditorVisionAnalysisProgressSnapshot>(
    EDITOR_VISION_HYDRATION_SAFE_PROGRESS
  );

  useEffect(() => {
    monotonicPercentRef.current = EDITOR_VISION_HYDRATION_SAFE_PROGRESS.percent;
    queueMicrotask(() => {
      setSnapshot(EDITOR_VISION_HYDRATION_SAFE_PROGRESS);
    });
  }, [input.sessionId]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    queueMicrotask(() => {
      setOpenStage(getEditorOpenStage());
    });
  }, [mounted]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    if (isVisionPartsApiStage(input.runMeta)) {
      if (visionPartsStartedAtRef.current == null) {
        visionPartsStartedAtRef.current = Date.now();
      }
      return;
    }
    if (input.runMeta?.status === "complete" || input.runMeta?.status === "failed") {
      visionPartsStartedAtRef.current = null;
    }
  }, [input.runMeta, mounted]);

  useEffect(() => {
    if (!mounted || !isVisionPartsApiStage(input.runMeta)) {
      return;
    }
    const id = window.setInterval(() => {
      if (visionPartsStartedAtRef.current != null) {
        setVisionPartsElapsedMs(Date.now() - visionPartsStartedAtRef.current);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [input.runMeta, mounted]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const id = window.setInterval(() => setOpenStage(getEditorOpenStage()), 300);
    return () => window.clearInterval(id);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    setSnapshot((previous) => {
      let next = resolveEditorVisionAnalysisProgress({
        openStage,
        runMeta: input.runMeta,
        cachedResult: input.cachedResult,
        visionPartsElapsedMs,
        previousPercent: monotonicPercentRef.current,
        previousSnapshot: previous,
        premiumAnalysisActive: input.premiumAnalysisActive,
      });
      const rtdetrRecorded =
        Boolean(input.sessionId) &&
        listEditorAnalysisTimings(input.sessionId!).some((row) => row.stage === "rtdetr_detect");
      const visionPartsRecorded =
        Boolean(input.sessionId) &&
        listEditorAnalysisTimings(input.sessionId!).some((row) => row.stage === "vision_parts_api");
      next = bumpProgressAfterRtdetrTiming({
        snapshot: next,
        rtdetrRecorded,
        analysisPending: input.analysisPending,
        analysisInProgress: input.analysisInProgress,
        runMeta: input.runMeta,
      });
      next = bumpProgressAfterVisionPartsTiming({
        snapshot: next,
        visionPartsRecorded,
        analysisPending: input.analysisPending,
        analysisInProgress: input.analysisInProgress,
        runMeta: input.runMeta,
        visionPartsElapsedMs,
      });
      if (snapshotFieldsEqual(previous, next)) {
        return previous;
      }
      monotonicPercentRef.current = next.percent;
      return next;
    });
  }, [
    mounted,
    openStage,
    input.runMeta,
    input.cachedResult,
    visionPartsElapsedMs,
    input.sessionId,
    input.analysisPending,
    input.analysisInProgress,
    input.premiumAnalysisActive,
  ]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    const prev = lastProgressRef.current;
    if (
      !prev ||
      prev.percent !== snapshot.percent ||
      prev.stage !== snapshot.stage ||
      prev.labelKey !== snapshot.labelKey
    ) {
      traceVisionPipeline("PROGRESS_UPDATE", {
        openStage,
        progressPercent: snapshot.percent,
        progressStage: snapshot.stage,
        runId: input.runMeta?.runId,
        analysisId: input.runMeta?.analysisId,
        analysisStatus: input.runMeta?.status ?? "none",
        pipelineStage: input.runMeta?.lastStage ?? "none",
        showProgress: snapshot.showProgress && (input.analysisPending || input.analysisInProgress),
      });
      lastProgressRef.current = snapshot;
    }
  }, [snapshot, openStage, input.runMeta, input.analysisPending, input.analysisInProgress, mounted]);

  const showProgress =
    mounted &&
    snapshot.showProgress &&
    (input.analysisPending || input.analysisInProgress);

  const stageTimings = useMemo(() => {
    if (!mounted || !input.sessionId) {
      return [];
    }
    return listEditorAnalysisTimings(input.sessionId).filter((row) =>
      ["rtdetr_detect", "style_dna_analyze", "vision_parts_api", "bootstrap_total"].includes(row.stage)
    );
  }, [mounted, input.sessionId, input.runMeta?.status, input.runMeta?.lastStage]);

  if (!mounted) {
    return HYDRATION_SAFE_PROGRESS_STATE;
  }

  return {
    ...snapshot,
    showProgress,
    stageTimings,
  };
}
