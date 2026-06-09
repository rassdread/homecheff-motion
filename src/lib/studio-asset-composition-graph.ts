import type { AssetReferencePlacement } from "@/types/studio-asset-generation-workbench";
import type { CompositionGraphNode, SemanticLayerState } from "@/types/studio-asset-generation-workbench";
import { SEMANTIC_LAYER_IDS } from "@/types/studio-asset-generation-workbench";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";

export function defaultSemanticLayers(): SemanticLayerState[] {
  return SEMANTIC_LAYER_IDS.map((id) => ({
    id,
    locked: id === "character" || id === "brand_elements",
    hidden: false,
    replaceable: id === "clothing" || id === "environment" || id === "background",
  }));
}

export function buildCompositionGraphFromDraft(draft: AssetWizardDraft): CompositionGraphNode[] {
  const sourceName = draft.sourceReferenceName || draft.name || "Character";
  const characterNode: CompositionGraphNode = {
    id: "character-root",
    label: sourceName,
    kind: "character",
    children: [],
  };

  const clothingChildren: CompositionGraphNode[] = [];
  const propChildren: CompositionGraphNode[] = [];

  for (const placement of draft.referencePlacements) {
    const target = placement.placementTarget;
    const node: CompositionGraphNode = {
      id: placement.id,
      label: placement.sourceName || placement.placementType,
      kind: "placement",
      children: [],
      placementId: placement.id,
    };

    if (
      target === "apron_center" ||
      target === "chest" ||
      target === "sleeve" ||
      target === "hat_front" ||
      target === "back"
    ) {
      const clothingLabel =
        target === "hat_front" ? "Hat" : target === "apron_center" ? "Apron" : "Clothing";
      let clothing = clothingChildren.find((c) => c.label === clothingLabel);
      if (!clothing) {
        clothing = { id: `clothing-${clothingLabel}`, label: clothingLabel, kind: "clothing", children: [] };
        clothingChildren.push(clothing);
      }
      clothing.children.push(node);
    } else if (target === "packaging_front" || target === "object_surface") {
      const propLabel = placement.objectTarget?.objectLabel ?? "Object";
      let prop = propChildren.find((p) => p.label === propLabel);
      if (!prop) {
        prop = { id: `prop-${propLabel}`, label: propLabel, kind: "prop", children: [] };
        propChildren.push(prop);
      }
      prop.children.push(node);
    } else {
      characterNode.children.push(node);
    }
  }

  characterNode.children.push(...clothingChildren, ...propChildren);
  return [characterNode];
}

export function formatCompositionGraphPreview(nodes: CompositionGraphNode[], depth = 0): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    lines.push(`${"  ".repeat(depth)}${node.label}`);
    lines.push(...formatCompositionGraphPreview(node.children, depth + 1));
  }
  return lines;
}

export function buildCompositionGraphPromptBlock(draft: AssetWizardDraft): string {
  const graph = buildCompositionGraphFromDraft(draft);
  if (graph.length === 0 || draft.referencePlacements.length === 0) {
    return "";
  }
  const tree = formatCompositionGraphPreview(graph).join("\n");
  const lockedLayers = draft.semanticLayers.filter((l) => l.locked).map((l) => l.id.replace(/_/g, " "));
  return [
    "Composition graph:",
    tree,
    lockedLayers.length ? `Locked layers: ${lockedLayers.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
