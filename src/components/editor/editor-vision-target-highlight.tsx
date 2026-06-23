"use client";

import { resolveVisionTargetHighlightGeometry } from "@/lib/vision-target-highlight";
import {
  visionTargetGeometryStyle,
  visionTargetHighlightColors,
} from "@/lib/vision-target-highlight-overlay";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { VisionTargetNodeV2 } from "@/types/vision-target-picker";

type Props = {
  document: EditorCanvasDocument;
  imageUrl: string;
  hoveredNode: VisionTargetNodeV2 | null;
  selectedNodes: VisionTargetNodeV2[];
  onImageLoad?: () => void;
};

function HighlightLayer({
  node,
  document,
  variant,
}: {
  node: VisionTargetNodeV2;
  document: EditorCanvasDocument;
  variant: "hover" | "selected";
}) {
  const geometry = resolveVisionTargetHighlightGeometry(document, node);
  const style = visionTargetGeometryStyle(geometry, variant);
  const colors = visionTargetHighlightColors(variant);

  if (style.kind === "polygon" || style.kind === "quad") {
    if (!style.path) {
      return null;
    }
    return (
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={style.path}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={variant === "selected" ? 0.45 : 0.35}
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 2px ${colors.glow})` }}
        />
      </svg>
    );
  }

  const bounds = style.bounds ?? geometry.bounds;
  return (
    <div
      className="pointer-events-none absolute rounded-md border"
      style={{
        left: `${bounds.x * 100}%`,
        top: `${bounds.y * 100}%`,
        width: `${bounds.width * 100}%`,
        height: `${bounds.height * 100}%`,
        backgroundColor: colors.fill,
        borderColor: colors.stroke,
        boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.45), 0 0 10px ${colors.glow}`,
      }}
    />
  );
}

export function EditorVisionTargetHighlight({
  document,
  imageUrl,
  hoveredNode,
  selectedNodes,
  onImageLoad,
}: Props) {
  const hoverIsSelected =
    hoveredNode !== null && selectedNodes.some((node) => node.id === hoveredNode.id);

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/15 bg-zinc-900/20 shadow-inner"
      data-testid="vision-target-highlight"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full object-contain"
        onLoad={() => onImageLoad?.()}
      />
      {selectedNodes.map((node) => (
        <HighlightLayer key={`selected_${node.id}`} node={node} document={document} variant="selected" />
      ))}
      {hoveredNode && !hoverIsSelected ?
        <HighlightLayer node={hoveredNode} document={document} variant="hover" />
      : null}
    </div>
  );
}
