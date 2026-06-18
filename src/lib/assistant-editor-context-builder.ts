import {
  buildHierarchyPath,
  findHierarchyNodeById,
  flattenVisibleHierarchyLabels,
  inferPartGroupFromNode,
} from "@/lib/assistant-editor-hierarchy-context";
import type {
  AssistantAssetType,
  AssistantEditorContextHint,
  AssistantV3ReasoningProfile,
} from "@/types/assistant-v3";
import type { VisionTaxonomyType } from "@/lib/editor-vision-taxonomy";
import type { EditorCanvasDocument, EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

export function resolveAssistantReasoningProfile(input: {
  pathname?: string;
  editorContext?: AssistantEditorContextHint | null;
}): AssistantV3ReasoningProfile {
  if (input.editorContext?.module === "editor" || input.pathname?.startsWith("/editor")) {
    return "editor";
  }
  if (input.pathname?.startsWith("/publish") || input.pathname?.startsWith("/projects")) {
    return "producer";
  }
  if (input.pathname?.startsWith("/animate") || input.pathname?.startsWith("/studio")) {
    return "producer";
  }
  return input.editorContext?.reasoningProfile ?? "producer";
}

export function buildAssistantEditorContextFromHierarchy(input: {
  document: Pick<EditorCanvasDocument, "name" | "editorFlowMode" | "visionV6Meta" | "visionHierarchy">;
  hierarchy: EditorVisionHierarchyNode[];
  selectedNodeId: string | null;
  selectedObjectLabel?: string | null;
}): AssistantEditorContextHint {
  const name = input.document.name?.trim() || "Editor asset";
  const isGlobeMan = /globe\s*man|globeman/i.test(name);
  const taxonomyType = input.document.visionV6Meta?.taxonomyType;
  const selectedAssetType: AssistantAssetType =
    isGlobeMan || taxonomyType === "mascot"
      ? "mascot"
      : taxonomyType === "human"
        ? "human"
        : taxonomyType === "animal"
          ? "animal"
          : "image";

  const selectedNode = findHierarchyNodeById(input.hierarchy, input.selectedNodeId);
  const path = buildHierarchyPath(input.hierarchy, input.selectedNodeId);
  const visibleHierarchy = flattenVisibleHierarchyLabels(input.hierarchy).slice(0, 48);

  return {
    documentName: name,
    module: "editor",
    workflow: input.document.editorFlowMode ?? "edit",
    reasoningProfile: "editor",
    selectedAssetName: isGlobeMan ? "Globe Man" : name,
    selectedAssetType,
    taxonomyType,
    selectedPartId: selectedNode?.partId ?? selectedNode?.id ?? null,
    selectedPartName: selectedNode?.label ?? input.selectedObjectLabel ?? null,
    selectedPartGroup: selectedNode ? inferPartGroupFromNode(selectedNode) : null,
    selectedHierarchyPath: path,
    visibleHierarchyLabels: visibleHierarchy,
    selectedParts: path.length > 0 ? path : visibleHierarchy.slice(0, 12),
  };
}
