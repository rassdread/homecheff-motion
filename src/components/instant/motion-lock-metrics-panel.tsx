"use client";

import { useCallback, useState } from "react";
import type { MotionLockAggregateMetrics } from "@/types/motion-lock-metrics";

type MetricsPayload = {
  metrics?: MotionLockAggregateMetrics;
  error?: string;
};

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function MotionLockMetricsPanel() {
  const [metrics, setMetrics] = useState<MotionLockAggregateMetrics | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/instant-premium/motion-lock-metrics", {
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as MetricsPayload;
      if (!res.ok) {
        setLoadError(body.error ?? "Failed to load motion lock metrics.");
        return;
      }
      setMetrics(body.metrics ?? null);
    } catch {
      setLoadError("Failed to load motion lock metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  const workflowRows = metrics
    ? Object.entries(metrics.workflowBreakdown).sort((a, b) => b[1].corrected - a[1].corrected)
    : [];

  return (
    <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/80 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-indigo-950">Motion Lock Metrics (Sprint H/I)</p>
        <button
          type="button"
          onClick={() => void loadMetrics()}
          disabled={loading}
          className="rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs font-medium text-indigo-900 disabled:opacity-50"
        >
          {loading ? "Loading…" : metrics ? "Refresh" : "Load metrics"}
        </button>
      </div>
      {loadError ? <p className="mt-2 text-red-700">{loadError}</p> : null}
      {!metrics && !loadError ? (
        <p className="mt-2 text-indigo-800">
          Production telemetry from Motion Lock runs — dense sampling correction rates per workflow.
        </p>
      ) : null}
      {metrics ? (
        <div className="mt-3 space-y-2 text-indigo-950">
          <p>Projects checked: {metrics.projectsChecked}</p>
          <p>Segments checked: {metrics.segmentsChecked}</p>
          <p>Segments corrected: {metrics.segmentsCorrected}</p>
          <p>Correction rate: {formatPercent(metrics.correctionRate)}</p>
          <p className="text-indigo-800">
            Passed {metrics.segmentsPassed} · Warned {metrics.segmentsWarned} · Failed{" "}
            {metrics.segmentsFailed}
          </p>
          {metrics.trackingModeUsage ? (
            <div className="mt-2 rounded border border-indigo-100 bg-white p-2">
              <p className="font-medium">Tracked assets</p>
              <p className="mt-1">
                Quad interpolation: {metrics.trackingModeUsage.quad_interpolation} · Static:{" "}
                {metrics.trackingModeUsage.static}
              </p>
              <p>
                Dynamic warps: {metrics.dynamicWarpCount ?? 0} · Tracking success:{" "}
                {formatPercent(metrics.quadTrackingSuccessRate ?? 0)}
              </p>
            </div>
          ) : null}
          {workflowRows.length > 0 ? (
            <div className="mt-2 rounded border border-indigo-100 bg-white p-2">
              <p className="font-medium">Workflow breakdown</p>
              <ul className="mt-1 space-y-1">
                {workflowRows.map(([workflow, row]) => (
                  <li key={workflow}>
                    {workflow}: {row.corrected} corrected ({row.checked} checked)
                    {row.trackedPercent != null && row.trackedPercent > 0
                      ? ` · Tracked: ${row.trackedPercent.toFixed(0)}%`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-indigo-700">No workflow breakdown yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
