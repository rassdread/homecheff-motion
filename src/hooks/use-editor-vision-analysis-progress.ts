"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listEditorAnalysisTimings } from "@/lib/editor-analysis-performance";
import { getEditorOpenStage } from "@/lib/editor-open-timing";
import {
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

export function useEditorVisionAnalysisProgress(input: {
  runMeta?: EditorVisionAnalysisRunMeta | null;
  cachedResult: boolean;
  analysisPending: boolean;
  analysisInProgress: boolean;
  sessionId?: string;
}): EditorVisionAnalysisProgressState {
  const lastProgressRef = useRef<EditorVisionAnalysisProgressSnapshot | null>(null);
  const visionPartsStartedAtRef = useRef<number | null>(null);
  const [visionPartsElapsedMs, setVisionPartsElapsedMs] = useState(0);
  const [openStage, setOpenStage] = useState(getEditorOpenStage());
  const [snapshot, setSnapshot] = useState<EditorVisionAnalysisProgressSnapshot>(() =>
    resolveEditorVisionAnalysisProgress({
      openStage: getEditorOpenStage(),
      cachedResult: false,
    })
  );

  useEffect(() => {
    if (isVisionPartsApiStage(input.runMeta)) {
      if (visionPartsStartedAtRef.current == null) {
        visionPartsStartedAtRef.current = Date.now();
      }
      return;
    }
    if (input.runMeta?.status === "complete" || input.runMeta?.status === "failed") {
      visionPartsStartedAtRef.current = null;
    }
  }, [input.runMeta]);

  useEffect(() => {
    if (!isVisionPartsApiStage(input.runMeta)) {
      return;
    }
    const id = window.setInterval(() => {
      if (visionPartsStartedAtRef.current != null) {
        setVisionPartsElapsedMs(Date.now() - visionPartsStartedAtRef.current);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [input.runMeta]);

  useEffect(() => {
    const id = window.setInterval(() => setOpenStage(getEditorOpenStage()), 300);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSnapshot((previous) =>
        resolveEditorVisionAnalysisProgress({
          openStage,
          runMeta: input.runMeta,
          cachedResult: input.cachedResult,
          visionPartsElapsedMs,
          previousPercent: previous.percent,
        })
      );
    });
  }, [openStage, input.runMeta, input.cachedResult, visionPartsElapsedMs]);

  useEffect(() => {
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
  }, [snapshot, openStage, input.runMeta, input.analysisPending, input.analysisInProgress]);

  const showProgress =
    snapshot.showProgress && (input.analysisPending || input.analysisInProgress);

  const stageTimings = useMemo(() => {
    if (!input.sessionId) {
      return [];
    }
    return listEditorAnalysisTimings(input.sessionId).filter((row) =>
      ["rtdetr_detect", "style_dna_analyze", "vision_parts_api", "bootstrap_total"].includes(row.stage)
    );
  }, [input.sessionId, input.runMeta?.status, input.runMeta?.lastStage]);

  return {
    ...snapshot,
    showProgress,
    stageTimings,
  };
}
