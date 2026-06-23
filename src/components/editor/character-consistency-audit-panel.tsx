"use client";

import { useMemo } from "react";
import {
  buildCharacterConsistencyAuditReport,
} from "@/lib/character-consistency-audit";
import { buildCharacterConsistencyDiagnosticExport } from "@/lib/character-consistency-score";
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

export function CharacterConsistencyAuditPanel({ document }: Props) {
  const report = useMemo(() => buildCharacterConsistencyAuditReport({ document }), [document]);
  const exportPayload = useMemo(
    () => buildCharacterConsistencyDiagnosticExport(report.score),
    [report.score]
  );

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `character-consistency-audit-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const driftItems = report.drift.items.filter((item) => item.drift);

  return (
    <div
      className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm"
      data-testid="character-consistency-audit-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Character Consistency Audit</h3>
          <p className="text-xs text-zinc-500">
            Workflow: {report.workflow} · Score {report.score.characterConsistencyScore}/100
          </p>
        </div>
        <button
          type="button"
          onClick={exportJson}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          data-testid="character-consistency-audit-export"
        >
          Export JSON
        </button>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Scores</p>
          <ScoreRow label="Attribute" value={report.score.breakdown.attributeCoverage} />
          <ScoreRow label="Prompt" value={report.score.breakdown.promptCoverage} />
          <ScoreRow label="Blueprint" value={report.score.breakdown.blueprintCoverage} />
          <ScoreRow label="Payload" value={report.score.breakdown.payloadCoverage} />
          <ScoreRow label="Mascot" value={report.score.breakdown.mascotCoverage} />
          <ScoreRow label="Clothing" value={report.score.breakdown.clothingCoverage} />
          <ScoreRow label="Accessories" value={report.score.breakdown.accessoryCoverage} />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Drift report</p>
          {driftItems.length === 0 ?
            <p className="text-xs text-emerald-700">Geen character drift gedetecteerd.</p>
          : (
            <ul className="space-y-1 text-xs text-amber-800">
              {driftItems.slice(0, 6).map((item) => (
                <li key={`${item.attribute}_${item.availableValue}`}>
                  {item.attribute}: {item.availableValue} — niet in prompt
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-zinc-600">
            Prompt coverage: {report.promptCoverage.coveragePercent}%
            {report.promptCoverage.genericPromptLoss ? " · generieke prompt gedetecteerd" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
