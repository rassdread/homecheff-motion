"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  runMotionVisionPreviewAnalysis,
  type MotionVisionPreviewReference,
} from "@/lib/motion-vision-analysis-client";
import type { MotionReferenceVisionSignals } from "@/lib/motion-reference-vision-signals";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";

export type UseMotionVisionAnalysisInput = {
  references: MotionVisionPreviewReference[];
  enabled?: boolean;
};

export function useMotionVisionAnalysis(input: UseMotionVisionAnalysisInput) {
  const [visionSignals, setVisionSignals] = useState<MotionReferenceVisionSignals[]>([]);
  const [detectionsByReferenceId, setDetectionsByReferenceId] = useState<
    Record<string, ObjectDetection[]>
  >({});
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const fingerprint = useMemo(
    () =>
      input.references
        .map(
          (r) =>
            `${r.id}:${r.imageUrl ?? ""}:${Boolean(r.visionAnalysis)}:${Boolean(r.motionReady)}`
        )
        .join("|"),
    [input.references]
  );

  const isActive = input.enabled !== false && input.references.length > 0;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    void (async () => {
      setAnalyzing(true);
      setError(null);
      try {
        const result = await runMotionVisionPreviewAnalysis({ references: input.references });
        if (runIdRef.current !== runId) {
          return;
        }
        setVisionSignals(result.signals);
        setDetectionsByReferenceId(result.detectionsByReferenceId);
      } catch (e) {
        if (runIdRef.current !== runId) {
          return;
        }
        setError(e instanceof Error ? e.message : "vision_preview_failed");
      } finally {
        if (runIdRef.current === runId) {
          setAnalyzing(false);
        }
      }
    })();
  }, [fingerprint, isActive, input.references]);

  return {
    visionSignals: isActive ? visionSignals : [],
    detectionsByReferenceId: isActive ? detectionsByReferenceId : {},
    analyzing: isActive && analyzing,
    error: isActive ? error : null,
    ready: isActive && !analyzing && visionSignals.length > 0,
  };
}
