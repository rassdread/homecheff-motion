"use client";

import { buildBodyGuideOverlayLayers } from "@/lib/editor-body-designer";
import type { CharacterBodyDesignerParams, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  params: CharacterBodyDesignerParams;
  layers: EditorCanvasLayer[];
};

export function EditorBodyGuideOverlay({ params, layers }: Props) {
  const guides = buildBodyGuideOverlayLayers(params, layers);
  return (
    <>
      {guides.map((guide) => (
        <div
          key={guide.id}
          className={`pointer-events-none absolute rounded-xl border-2 border-dashed ${
            guide.locked ? "border-purple-500/70 bg-purple-300/10" : "border-sky-500/60 bg-sky-300/10"
          }`}
          style={{
            left: `${guide.bounds.x * 100}%`,
            top: `${guide.bounds.y * 100}%`,
            width: `${guide.bounds.width * 100}%`,
            height: `${guide.bounds.height * 100}%`,
            zIndex: 2,
          }}
        />
      ))}
    </>
  );
}
