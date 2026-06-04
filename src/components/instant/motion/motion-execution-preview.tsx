"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioSceneExecutionPackage } from "@/types/studio-scene-execution";

type Props = {
  sceneLabel: string;
  executionPackage: StudioSceneExecutionPackage;
  executionPrompt?: string;
};

export function MotionExecutionPreview({
  sceneLabel,
  executionPackage,
  executionPrompt,
}: Props) {
  const t = useActiveTranslator();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-emerald-900">
          {t("motion.execution.preview.title", { scene: sceneLabel })}
        </span>
        <span className="text-xs text-zinc-500">{open ? "▲" : "▼"}</span>
      </button>
      {open ?
        <div className="space-y-3 border-t border-emerald-200/60 px-4 py-3 text-xs text-zinc-800">
          <ExecutionBlock
            label={t("motion.execution.preview.generatedPrompt")}
            body={executionPackage.prompt || executionPrompt || "—"}
          />
          <ExecutionBlock
            label={t("motion.execution.preview.director")}
            body={[
              executionPackage.shotType,
              executionPackage.cameraMovement,
              executionPackage.sceneEnergy,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
          <ExecutionBlock
            label={t("motion.execution.preview.characters")}
            body={executionPackage.characterRules}
          />
          <ExecutionBlock
            label={t("motion.execution.preview.world")}
            body={executionPackage.worldRules}
          />
          <ExecutionBlock
            label={t("motion.execution.preview.continuity")}
            body={executionPackage.continuityRules}
          />
          {executionPackage.aiDirectorNotes ?
            <ExecutionBlock
              label={t("motion.execution.preview.aiDirector")}
              body={executionPackage.aiDirectorNotes}
            />
          : null}
          {executionPrompt && executionPrompt !== executionPackage.prompt ?
            <ExecutionBlock
              label={t("motion.execution.preview.finalPrompt")}
              body={executionPrompt}
            />
          : null}
        </div>
      : null}
    </div>
  );
}

function ExecutionBlock({ label, body }: { label: string; body: string }) {
  if (!body.trim()) {
    return null;
  }
  return (
    <div>
      <p className="font-semibold text-emerald-900">{label}</p>
      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/80 p-2 font-mono text-[11px] leading-relaxed text-zinc-700">
        {body.trim()}
      </pre>
    </div>
  );
}
