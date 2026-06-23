"use client";

import { useMemo } from "react";
import {
  buildFusionIntelligenceAuditReport,
  buildFusionIntelligenceDiagnosticExport,
} from "@/lib/fusion-intelligence-audit";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
};

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-2 text-xs last:border-0">
      <span className="font-medium text-zinc-600">{label}</span>
      <span className="font-semibold text-zinc-900">{value}/100</span>
    </div>
  );
}

export function FusionIntelligenceAuditPanel({ document }: Props) {
  const report = useMemo(() => buildFusionIntelligenceAuditReport({ document }), [document]);
  const exportPayload = useMemo(() => buildFusionIntelligenceDiagnosticExport(report), [report]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `fusion-intelligence-audit-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm"
      data-testid="fusion-intelligence-audit-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Fusion Intelligence Audit</h3>
          <p className="text-xs text-zinc-500">
            Workflow: {report.workflow} · Quality score {report.qualityScore.totalFusionQualityScore}/100
          </p>
        </div>
        <button
          type="button"
          onClick={exportJson}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          data-testid="fusion-intelligence-audit-export"
        >
          Export JSON
        </button>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Coverage scores</p>
          <ScoreRow label="Vision" value={report.qualityScore.breakdown.visionCoverage} />
          <ScoreRow label="Prompt" value={report.qualityScore.breakdown.promptCoverage} />
          <ScoreRow label="Blueprint" value={report.qualityScore.breakdown.blueprintCoverage} />
          <ScoreRow label="Provider" value={report.qualityScore.breakdown.providerCoverage} />
          <ScoreRow label="Character" value={report.qualityScore.breakdown.characterCoverage} />
          <ScoreRow label="Branding" value={report.qualityScore.breakdown.brandCoverage} />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Prompt coverage</p>
          <p className="text-2xl font-bold text-indigo-700">{report.promptCoverage.promptCoveragePercent}%</p>
          <p className="mt-2 text-xs text-zinc-600">
            {report.promptCoverage.availableItems.filter((i) => i.usedInPrompt).length}/
            {report.promptCoverage.availableItems.length || "—"} traits in prompt
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Data trace</p>
          <ul className="mt-1 space-y-1 text-xs text-zinc-700">
            {report.dataTrace.steps.map((step) => (
              <li key={step.stage}>
                {step.stage}: {step.used ? "used" : step.lost ? "lost" : step.ignored ? "ignored" : "pending"}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <details className="mt-3 text-xs text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-800">Source coverage</summary>
        <ul className="mt-2 space-y-1">
          {report.sourceCoverage.sources.map((source) => (
            <li key={source.source}>
              {source.source}: {source.populated ? "populated" : "empty"}
              {source.lostAt.length ? ` · lost: ${source.lostAt.join(", ")}` : ""}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
