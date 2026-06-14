"use client";

import type { EditorVisionV6Meta } from "@/types/homecheff-visual-editor";
import type { EditorDetectionMeta } from "@/types/homecheff-visual-editor";

type Props = {
  visionV6Meta?: EditorVisionV6Meta;
  detectionMeta?: EditorDetectionMeta;
};

export function EditorVisionV6DebugPanel({ visionV6Meta, detectionMeta }: Props) {
  if (!visionV6Meta?.illustrationAnalysis) {
    return null;
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-xs text-violet-950">
      <p className="font-semibold">Vision V6 — Illustration part analysis</p>
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
    </div>
  );
}
