"use client";

import { useMemo, useState } from "react";
import { EditorVisionTargetHighlight } from "@/components/editor/editor-vision-target-highlight";
import { EditorVisionTargetPickerV2 } from "@/components/editor/editor-vision-target-picker-v2";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";
import {
  buildVisionTargetTreeFromDocument,
  findVisionTargetNode,
} from "@/lib/vision-target-picker-v2";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

type Props = {
  document: EditorCanvasDocument;
  selectedTargetIds: string[];
  onSelectionChange: (targetIds: string[]) => void;
};

/** P0.6 — Outfit flow uses existing Vision Target Picker V2 + highlight. */
export function EditorOutfitVisionTargetPanel({
  document,
  selectedTargetIds,
  onSelectionChange,
}: Props) {
  const t = useActiveTranslator();
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  const visionTargetTree = useMemo(
    () => buildVisionTargetTreeFromDocument(document),
    [document]
  );

  const hoveredVisionNode = useMemo(() => {
    if (!hoveredTargetId) {
      return null;
    }
    return findVisionTargetNode(visionTargetTree.roots, hoveredTargetId);
  }, [hoveredTargetId, visionTargetTree.roots]);

  const selectedVisionNodes = useMemo(
    () =>
      selectedTargetIds
        .map((id) => findVisionTargetNode(visionTargetTree.roots, id))
        .filter((node): node is NonNullable<typeof node> => node !== null),
    [selectedTargetIds, visionTargetTree.roots]
  );

  return (
    <section
      className={`mt-4 space-y-4 rounded-2xl border p-4 ${studioVisual.editorSurface}`}
      data-testid="outfit-vision-target-panel"
    >
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("characterStudio.outfit.visionTitle" as never)}
        </h3>
        <p className="mt-1 text-xs text-zinc-600">
          {t("characterStudio.outfit.visionLead" as never)}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <EditorVisionTargetPickerV2
          document={document}
          selectedTargetIds={selectedTargetIds}
          onSelectionChange={onSelectionChange}
          onHoverTargetId={setHoveredTargetId}
          multiSelect
          outfitMode
        />
        <EditorVisionTargetHighlight
          document={document}
          imageUrl={document.backgroundUrl}
          hoveredNode={hoveredVisionNode}
          selectedNodes={selectedVisionNodes}
        />
      </div>
    </section>
  );
}
