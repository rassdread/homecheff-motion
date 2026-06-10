"use client";

import { editorSelectionOutlineSvgPoints } from "@/lib/editor-object-mask";
import type { EditorObjectPart } from "@/types/homecheff-visual-editor";

type Props = {
  parts: EditorObjectPart[];
  hoveredPartId: string | null;
  selectedPartId: string | null;
};

export function EditorPartSelectionOverlay({ parts, hoveredPartId, selectedPartId }: Props) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      {parts
        .filter((p) => p.visible)
        .map((part) => {
          const points = part.polygon?.length
            ? editorSelectionOutlineSvgPoints(part.polygon)
            : null;
          if (!points) return null;
          const hovered = hoveredPartId === part.id;
          const selected = selectedPartId === part.id;
          const stroke = selected ? "#7c3aed" : hovered ? "#a78bfa" : "transparent";
          const fill = selected ? "rgba(124,58,237,0.12)" : hovered ? "rgba(167,139,250,0.08)" : "transparent";
          if (!hovered && !selected) return null;
          return (
            <polygon
              key={part.id}
              points={points}
              fill={fill}
              stroke={stroke}
              strokeWidth={selected ? 0.35 : 0.25}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
    </svg>
  );
}
