"use client";

import { getProjectRestoreAudit } from "@/lib/editor-project-restore";
import { resolveEditorDocumentOrigin, resolveHcProjectOrigin } from "@/lib/editor-project-origin";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document?: EditorCanvasDocument;
};

export function EditorProjectRestoreAuditPanel({ document }: Props) {
  const audit = getProjectRestoreAudit();
  const hcId = document?.instructionStudioState?.hcProjectId ?? audit?.hcProjectId ?? null;
  const hc = hcId ? loadHomeCheffProject(hcId) : null;

  return (
    <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-950">
      <p className="font-semibold">Project Restore Audit</p>
      <dl className="mt-2 space-y-1 font-mono text-[10px]">
        <div>
          <dt className="inline font-sans font-medium">sessionId: </dt>
          <dd className="inline">{document?.sessionId ?? audit?.sessionId ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline font-sans font-medium">hcProjectId: </dt>
          <dd className="inline">{hcId ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline font-sans font-medium">projectOrigin: </dt>
          <dd className="inline">
            {document ? resolveEditorDocumentOrigin(document) : audit?.projectOrigin ?? "—"}
            {hc ? ` (hc: ${resolveHcProjectOrigin(hc)})` : ""}
          </dd>
        </div>
        <div>
          <dt className="inline font-sans font-medium">localExists: </dt>
          <dd className="inline">{String(audit?.localExists ?? Boolean(document))}</dd>
        </div>
        <div>
          <dt className="inline font-sans font-medium">serverExists: </dt>
          <dd className="inline">
            {audit?.serverExists == null ? "—" : String(audit.serverExists)}
          </dd>
        </div>
        <div>
          <dt className="inline font-sans font-medium">restoreAttempted: </dt>
          <dd className="inline">{String(audit?.restoreAttempted ?? false)}</dd>
        </div>
        <div>
          <dt className="inline font-sans font-medium">restoreBlockedReason: </dt>
          <dd className="inline">{audit?.restoreBlockedReason ?? "—"}</dd>
        </div>
        <div>
          <dt className="inline font-sans font-medium">analysisStatus: </dt>
          <dd className="inline">
            {document?.visionAnalysisRun?.status ?? audit?.analysisStatus ?? "idle"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
