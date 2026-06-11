"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { WorkflowStageView } from "@/lib/editor-workflow-orchestration";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  stages: WorkflowStageView[];
};

const STATUS_CLASS: Record<WorkflowStageView["status"], string> = {
  complete: "border-emerald-300 bg-emerald-50 text-emerald-900",
  current: "border-[#0067B1] bg-[#0067B1]/10 text-[#0067B1]",
  pending: "border-zinc-200 bg-white text-zinc-500",
  blocked: "border-amber-300 bg-amber-50 text-amber-900",
};

export function EditorWorkflowStatusBar({ stages }: Props) {
  const t = useActiveTranslator();
  return (
    <div
      className={`flex flex-wrap items-center gap-2 p-2 ${studioVisual.editorSurface}`}
      role="list"
      aria-label={t("editor.workflow.statusBar.title" as never)}
    >
      {stages.map((stage, index) => (
        <div key={stage.stage} className="flex items-center gap-2">
          <span
            role="listitem"
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_CLASS[stage.status]}`}
          >
            {t(stage.labelKey as never)}
            {stage.status === "complete" ? " ✓" : ""}
            {stage.status === "current" ? " •" : ""}
          </span>
          {index < stages.length - 1 ?
            <span className="text-zinc-300" aria-hidden>
              →
            </span>
          : null}
        </div>
      ))}
    </div>
  );
}
