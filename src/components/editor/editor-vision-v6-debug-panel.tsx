"use client";

import { buildVisionAnalysisLifecycleDebug } from "@/lib/editor-vision-analysis-run";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";
import type { EditorVisionV6Meta } from "@/types/homecheff-visual-editor";
import type { EditorDetectionMeta } from "@/types/homecheff-visual-editor";
import { EditorVisionDetectionExplanationPanel } from "@/components/editor/editor-vision-detection-explanation-panel";
import { EditorProjectRestoreAuditPanel } from "@/components/editor/editor-project-restore-audit-panel";
import { EditorOpenTimingAuditPanel } from "@/components/editor/editor-open-timing-audit-panel";

type Props = {
  visionV6Meta?: EditorVisionV6Meta;
  detectionMeta?: EditorDetectionMeta;
  visionAnalysisRun?: EditorVisionAnalysisRunMeta | null;
  document?: import("@/types/homecheff-visual-editor").EditorCanvasDocument;
};

export function EditorVisionV6DebugPanel({
  visionV6Meta,
  detectionMeta,
  visionAnalysisRun,
  document,
}: Props) {
  if (!visionV6Meta?.illustrationAnalysis && !visionAnalysisRun) {
    return null;
  }

  const lifecycle = document ? buildVisionAnalysisLifecycleDebug(document, visionAnalysisRun) : null;

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-xs text-violet-950">
      <p className="font-semibold">Vision V6 — Illustration part analysis</p>
      {visionAnalysisRun ? (
        <dl className="mt-2 space-y-1 border-b border-violet-200 pb-2">
          <div>
            <dt className="inline font-medium">Active runId: </dt>
            <dd className="inline font-mono">{visionAnalysisRun.runId}</dd>
          </div>
          <div>
            <dt className="inline font-medium">analysisId: </dt>
            <dd className="inline font-mono">{visionAnalysisRun.analysisId}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Status: </dt>
            <dd className="inline">{visionAnalysisRun.status}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Started: </dt>
            <dd className="inline">{visionAnalysisRun.startedAt}</dd>
          </div>
          {visionAnalysisRun.completedAt ? (
            <div>
              <dt className="inline font-medium">Completed: </dt>
              <dd className="inline">{visionAnalysisRun.completedAt}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline font-medium">Pipeline calls: </dt>
            <dd className="inline">{visionAnalysisRun.pipelineCalls}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Duplicate runs: </dt>
            <dd className="inline">{visionAnalysisRun.duplicateRunCount}</dd>
          </div>
          {visionAnalysisRun.sourceOrder.length > 0 ? (
            <div>
              <dt className="inline font-medium">Source order: </dt>
              <dd className="inline">{visionAnalysisRun.sourceOrder.join(" → ")}</dd>
            </div>
          ) : null}
          {lifecycle ? (
            <div className="mt-2 rounded border border-violet-200 bg-white/70 p-2">
              <p className="font-medium">Lifecycle</p>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(lifecycle, null, 2)}</pre>
            </div>
          ) : null}
        </dl>
      ) : null}
      {visionV6Meta ? (
        <>
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="inline font-medium">Detection backend: </dt>
              <dd className="inline">{detectionMeta?.backend ?? "—"}</dd>
            </div>
            <div>
              <dt className="inline font-medium">RT-DETR count: </dt>
              <dd className="inline">{visionV6Meta.rtdetrCount}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Vision parts: </dt>
              <dd className="inline">{visionV6Meta.visionPartCount}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Merged layers: </dt>
              <dd className="inline">{visionV6Meta.mergedLayerCount}</dd>
            </div>
            <div>
              <dt className="inline font-medium">OpenAI parts: </dt>
              <dd className="inline">{visionV6Meta.openAiPartsUsed ? "yes" : "template"}</dd>
            </div>
          </dl>
          {visionV6Meta.layerSources.length > 0 ? (
            <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto">
              {visionV6Meta.layerSources.slice(0, 12).map((row) => (
                <li key={row.layerId}>
                  {row.label} — <span className="text-violet-700">{row.source}</span>
                  {row.estimated ? " ~" : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <EditorVisionDetectionExplanationPanel evidenceAudit={visionV6Meta.evidenceAudit} />
        </>
      ) : null}
      <EditorProjectRestoreAuditPanel document={document} />
      <EditorOpenTimingAuditPanel />
    </div>
  );
}
