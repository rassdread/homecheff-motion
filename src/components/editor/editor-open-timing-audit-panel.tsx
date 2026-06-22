"use client";

import {
  getEditorOpenTimingAudit,
  msSinceEditorOpenTiming,
} from "@/lib/editor-open-timing";

export function EditorOpenTimingAuditPanel() {
  const audit = getEditorOpenTimingAudit();

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-950">
      <p className="font-semibold">Editor Open Timing Audit</p>
      <dl className="mt-2 space-y-1 font-mono text-[10px]">
        <div>
          <dt className="inline font-sans font-medium">stage: </dt>
          <dd className="inline">{audit.stage}</dd>
        </div>
        {(
          [
            "imageSelectedAt",
            "localDocumentSavedAt",
            "routeStartedAt",
            "editorMountedAt",
            "imageVisibleAt",
            "analysisStartedAt",
            "provisionalReadyAt",
            "finalReadyAt",
          ] as const
        ).map((key) => (
          <div key={key}>
            <dt className="inline font-sans font-medium">{key}: </dt>
            <dd className="inline">{audit.timingIso[key] ?? "—"}</dd>
          </div>
        ))}
        <div>
          <dt className="inline font-sans font-medium">imageSelected→visible: </dt>
          <dd className="inline">
            {msSinceEditorOpenTiming("imageSelectedAt", "imageVisibleAt") ?? "—"} ms
          </dd>
        </div>
        <div>
          <dt className="inline font-sans font-medium">visible→analysis: </dt>
          <dd className="inline">
            {msSinceEditorOpenTiming("imageVisibleAt", "analysisStartedAt") ?? "—"} ms
          </dd>
        </div>
        <div>
          <dt className="inline font-sans font-medium">analysis→provisional: </dt>
          <dd className="inline">
            {msSinceEditorOpenTiming("analysisStartedAt", "provisionalReadyAt") ?? "—"} ms
          </dd>
        </div>
      </dl>
    </div>
  );
}
