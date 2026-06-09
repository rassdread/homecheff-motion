import type { EditorCanvasDocument, EditorPlacementItem } from "@/types/homecheff-visual-editor";

export type EditorPlacementQaItem = {
  placementId: string;
  label: string;
  status: "pass" | "warning" | "fail";
  messageKey: string;
};

export type EditorPlacementQaResult = {
  items: EditorPlacementQaItem[];
  passCount: number;
  warningCount: number;
  failCount: number;
};

function placementInsideTargetBounds(
  placement: EditorPlacementItem,
  document: EditorCanvasDocument
): boolean {
  if (!placement.linkedObjectId || placement.customTarget) {
    return true;
  }
  const target = document.objects.find((o) => o.id === placement.linkedObjectId);
  if (!target) {
    return false;
  }
  const halfW = ((placement.canvasWidth ?? 0.2) * (placement.canvasTransform.scale ?? 1)) / 2;
  const halfH = ((placement.canvasHeight ?? 0.15) * (placement.canvasTransform.scale ?? 1)) / 2;
  const x = placement.canvasTransform.x;
  const y = placement.canvasTransform.y;
  return (
    x - halfW >= target.bounds.x - 0.05 &&
    x + halfW <= target.bounds.x + target.bounds.width + 0.05 &&
    y - halfH >= target.bounds.y - 0.05 &&
    y + halfH <= target.bounds.y + target.bounds.height + 0.05
  );
}

export function auditEditorPlacements(document: EditorCanvasDocument): EditorPlacementQaResult {
  const items: EditorPlacementQaItem[] = document.placements.map((placement) => {
    const label = `${placement.placementType} — ${placement.sourceName}`;
    if (!placement.previewUrl?.trim() || !placement.storageKey?.trim()) {
      return {
        placementId: placement.id,
        label,
        status: "fail" as const,
        messageKey: "editor.placement.qa.missingSource",
      };
    }
    if (!placement.linkedObjectId && !placement.customTarget) {
      return {
        placementId: placement.id,
        label,
        status: "warning" as const,
        messageKey: "editor.placement.qa.missingTarget",
      };
    }
    if (placement.linkedObjectId) {
      const target = document.objects.find((o) => o.id === placement.linkedObjectId);
      if (!target) {
        return {
          placementId: placement.id,
          label,
          status: "fail" as const,
          messageKey: "editor.placement.qa.targetMissing",
        };
      }
      if (!target.visible) {
        return {
          placementId: placement.id,
          label,
          status: "warning" as const,
          messageKey: "editor.placement.qa.targetHidden",
        };
      }
    }
    if (
      (placement.importance === "exact" || placement.importance === "required") &&
      !placement.canvasLocked
    ) {
      return {
        placementId: placement.id,
        label,
        status: "warning" as const,
        messageKey: "editor.placement.qa.shouldLock",
      };
    }
    if (!placementInsideTargetBounds(placement as EditorPlacementItem, document)) {
      return {
        placementId: placement.id,
        label,
        status: "warning" as const,
        messageKey: "editor.placement.qa.outsideTarget",
      };
    }
    if (
      placement.exactnessMode === "pixel_overlay" &&
      !["logo", "badge", "label", "sticker", "poster"].includes(placement.placementType)
    ) {
      return {
        placementId: placement.id,
        label,
        status: "warning" as const,
        messageKey: "editor.placement.qa.exactnessMismatch",
      };
    }
    return {
      placementId: placement.id,
      label,
      status: "pass" as const,
      messageKey: "editor.placement.qa.ready",
    };
  });

  return {
    items,
    passCount: items.filter((i) => i.status === "pass").length,
    warningCount: items.filter((i) => i.status === "warning").length,
    failCount: items.filter((i) => i.status === "fail").length,
  };
}

export function editorPlacementQaSummaryKey(result: EditorPlacementQaResult): string {
  if (result.failCount > 0) {
    return "editor.placement.qa.summaryFail";
  }
  if (result.warningCount > 0) {
    return "editor.placement.qa.summaryWarning";
  }
  return "editor.placement.qa.summaryPass";
}
