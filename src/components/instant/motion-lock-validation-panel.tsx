"use client";

import { useCallback, useState } from "react";
import type { MotionLockProjectReport } from "@/types/motion-lock-layer";

type AssemblyDiagnosticsPayload = {
  motionLockReport?: MotionLockProjectReport | null;
  error?: string;
};

type Props = {
  projectId: string;
};

function verdictColor(passed: boolean, enforcementApplied: boolean): string {
  if (enforcementApplied) {
    return "text-amber-800 bg-amber-50 border-amber-200";
  }
  return passed ? "text-emerald-800 bg-emerald-50 border-emerald-200" : "text-red-800 bg-red-50 border-red-200";
}

function segmentLabel(report: MotionLockProjectReport["segments"][number]): string {
  const verdict = report.sampling?.segmentVerdict;
  if (report.enforcementApplied) {
    return "FAIL → corrected";
  }
  if (verdict === "WARN") {
    return "WARN";
  }
  if (verdict === "FAIL") {
    return "FAIL";
  }
  if (report.validationPassed) {
    return "PASS";
  }
  return "FAIL";
}

export function MotionLockValidationPanel({ projectId }: Props) {
  const [report, setReport] = useState<MotionLockProjectReport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/admin/instant-premium/projects/${encodeURIComponent(projectId)}/assembly-diagnostics`,
        { credentials: "include" }
      );
      const body = (await res.json().catch(() => ({}))) as AssemblyDiagnosticsPayload;
      if (!res.ok) {
        setLoadError(body.error ?? "Failed to load motion lock report.");
        return;
      }
      setReport(body.motionLockReport ?? null);
    } catch {
      setLoadError("Failed to load motion lock report.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return (
    <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/80 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-violet-950">Motion Lock Validation (Sprint G/H)</p>
        <button
          type="button"
          onClick={() => void loadReport()}
          disabled={loading}
          className="rounded-full border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-900 disabled:opacity-50"
        >
          {loading ? "Loading…" : report ? "Refresh" : "Load validation"}
        </button>
      </div>
      {loadError ? <p className="mt-2 text-red-700">{loadError}</p> : null}
      {!report && !loadError ? (
        <p className="mt-2 text-violet-800">
          Dense sampling (11 points) runs during final assembly when BrandLockedAssets are present.
        </p>
      ) : null}
      {report ? (
        <div className="mt-3 space-y-2">
          <p className="text-violet-900">
            {report.segmentsChecked} segment(s) checked · {report.segmentsCorrected} corrected ·{" "}
            {report.assetsLocked} asset(s) locked · {report.generatedAt}
          </p>
          <ul className="space-y-1">
            {report.segments.map((seg) => (
              <li
                key={seg.segmentId}
                className={`rounded border px-2 py-1.5 ${verdictColor(seg.validationPassed, seg.enforcementApplied)}`}
              >
                <span className="font-medium">Segment {seg.segmentIndex + 1}</span>
                {" · "}
                <span>{segmentLabel(seg)}</span>
                {seg.tracking ? (
                  <span className="mt-1 block text-[10px] opacity-90">
                    Tracking: {seg.tracking.trackingMode}
                    {seg.tracking.trackedSamples > 0
                      ? ` · ${seg.tracking.trackedSamples} samples`
                      : ""}
                    {seg.tracking.perspectiveWarpApplied ? " · warp applied" : ""}
                  </span>
                ) : null}
                {seg.sampling ? (
                  <span className="mt-1 block text-[10px] opacity-90">
                    Samples: {seg.sampling.sampleCount} · PASS: {seg.sampling.passCount} · WARN:{" "}
                    {seg.sampling.warnCount} · FAIL: {seg.sampling.failCount}
                    {seg.enforcementApplied ? " · Corrected: YES" : ""}
                  </span>
                ) : null}
                {seg.validation.assetsMissing.length > 0 ? (
                  <span className="block text-[10px] opacity-80">
                    missing: {seg.validation.assetsMissing.join(", ")}
                  </span>
                ) : null}
                {seg.validation.assetsDegraded.length > 0 ? (
                  <span className="block text-[10px] opacity-80">
                    degraded: {seg.validation.assetsDegraded.join(", ")}
                  </span>
                ) : null}
                <span className="block text-[10px] opacity-70">
                  worst confidence{" "}
                  {((seg.sampling?.worstConfidence ?? seg.validation.confidence) * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
