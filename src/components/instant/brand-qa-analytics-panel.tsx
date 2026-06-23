"use client";

import { useCallback, useState } from "react";
import type { BrandQaAggregateReport, BrandQaDiagnosticResult } from "@/types/brand-qa-analytics";
import { humanizeRecommendation } from "@/lib/brand-qa-recommendation-engine";

type AnalyticsPayload = {
  report?: BrandQaAggregateReport;
  exportUrl?: string;
  error?: string;
};

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function BrandQaAnalyticsPanel() {
  const [report, setReport] = useState<BrandQaAggregateReport | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [diagWorkflow, setDiagWorkflow] = useState("logo_placement");
  const [diagSurface, setDiagSurface] = useState("billboard");
  const [diagResult, setDiagResult] = useState<BrandQaDiagnosticResult | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/instant-premium/brand-qa-analytics", {
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as AnalyticsPayload;
      if (!res.ok) {
        setLoadError(body.error ?? "Failed to load Brand QA analytics.");
        return;
      }
      setReport(body.report ?? null);
      setExportUrl(body.exportUrl ?? null);
    } catch {
      setLoadError("Failed to load Brand QA analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  const runDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    try {
      const res = await fetch("/api/admin/instant-premium/brand-qa-diagnostics", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workflowType: diagWorkflow,
          surfaceType: diagSurface,
          sampleCount: 500,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        result?: BrandQaDiagnosticResult;
        error?: string;
      };
      if (!res.ok) {
        setLoadError(body.error ?? "Diagnostics failed.");
        return;
      }
      setDiagResult(body.result ?? null);
    } catch {
      setLoadError("Diagnostics failed.");
    } finally {
      setDiagLoading(false);
    }
  }, [diagSurface, diagWorkflow]);

  const workflowRows = report
    ? Object.entries(report.workflowBreakdown).sort((a, b) => b[1].corrected - a[1].corrected)
    : [];
  const surfaceRows = report
    ? Object.entries(report.surfaceTypeBreakdown).sort((a, b) => b[1].correctionRate - a[1].correctionRate)
    : [];
  const trackingRows = report
    ? Object.entries(report.trackingModeBreakdown).filter(([k]) => k !== "improvement_vs_static")
    : [];

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-emerald-950">Brand QA Analytics (Sprint J)</p>
        <div className="flex gap-2">
          {exportUrl ? (
            <a
              href={exportUrl}
              className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-900"
            >
              Export JSON
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loading}
            className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-900 disabled:opacity-50"
          >
            {loading ? "Loading…" : report ? "Refresh" : "Load analytics"}
          </button>
        </div>
      </div>
      {loadError ? <p className="mt-2 text-red-700">{loadError}</p> : null}
      {!report && !loadError ? (
        <p className="mt-2 text-emerald-800">
          Aggregates Motion Lock metrics — no new renders, no AI calls.
        </p>
      ) : null}
      {report ? (
        <div className="mt-3 space-y-3 text-emerald-950">
          <div>
            <p>Projects checked: {report.projectsChecked}</p>
            <p>Segments checked: {report.segmentsChecked}</p>
            <p>Segments corrected: {report.segmentsCorrected}</p>
            <p>Correction rate: {pct(report.overallCorrectionRate)}</p>
          </div>
          {report.recommendations.length > 0 ? (
            <div className="rounded border border-emerald-100 bg-white p-2">
              <p className="font-medium">Recommendations</p>
              <ul className="mt-1 list-disc pl-4">
                {report.recommendations.map((row) => (
                  <li key={row}>{humanizeRecommendation(row.split(":").pop() ?? row)}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.highRiskSurfaces.length > 0 ? (
            <p className="text-amber-900">
              High-risk surfaces: {report.highRiskSurfaces.join(", ")}
            </p>
          ) : null}
          {workflowRows.length > 0 ? (
            <div className="rounded border border-emerald-100 bg-white p-2">
              <p className="font-medium">Workflow breakdown</p>
              <ul className="mt-1 space-y-1">
                {workflowRows.map(([workflow, row]) => (
                  <li key={workflow}>
                    {workflow}: {row.corrected}/{row.checked} corrected ({pct(row.correctionRate)}) ·{" "}
                    {humanizeRecommendation(row.recommendation)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {surfaceRows.length > 0 ? (
            <div className="rounded border border-emerald-100 bg-white p-2">
              <p className="font-medium">Surface breakdown</p>
              <ul className="mt-1 space-y-1">
                {surfaceRows.map(([surface, row]) => (
                  <li key={surface}>
                    {surface}: {pct(row.correctionRate)} · {humanizeRecommendation(row.recommendation)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {trackingRows.length > 0 ? (
            <div className="rounded border border-emerald-100 bg-white p-2">
              <p className="font-medium">Tracking comparison</p>
              <ul className="mt-1 space-y-1">
                {trackingRows.map(([mode, row]) => (
                  <li key={mode}>
                    {mode}: {pct(row.correctionRate)} ({row.corrected}/{row.checked})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {report.beforeAfterDynamicTracking.length > 0 ? (
            <div className="rounded border border-emerald-100 bg-white p-2">
              <p className="font-medium">Before / after dynamic tracking</p>
              <ul className="mt-1 space-y-1">
                {report.beforeAfterDynamicTracking.map((row) => (
                  <li key={row.workflowType}>
                    {row.workflowType}: before {pct(row.beforeDynamicTracking)} → after{" "}
                    {pct(row.afterDynamicTracking)} ({row.improvementPercent.toFixed(0)}% improvement)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 rounded border border-emerald-100 bg-white p-2">
        <p className="font-medium text-emerald-950">Brand QA Diagnostics</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={diagWorkflow}
            onChange={(e) => setDiagWorkflow(e.target.value)}
            className="rounded border border-emerald-200 px-2 py-1 text-xs"
            placeholder="workflowType"
          />
          <input
            value={diagSurface}
            onChange={(e) => setDiagSurface(e.target.value)}
            className="rounded border border-emerald-200 px-2 py-1 text-xs"
            placeholder="surfaceType"
          />
          <button
            type="button"
            onClick={() => void runDiagnostics()}
            disabled={diagLoading}
            className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900 disabled:opacity-50"
          >
            {diagLoading ? "Running…" : "Run diagnostics"}
          </button>
        </div>
        {diagResult ? (
          <p className="mt-2 text-emerald-900">
            {diagResult.workflowType} / {diagResult.surfaceType} (n={diagResult.sampleCount}): pass{" "}
            {pct(diagResult.passRate)}, correction {pct(diagResult.correctionRate)} ·{" "}
            {humanizeRecommendation(diagResult.recommendation)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
