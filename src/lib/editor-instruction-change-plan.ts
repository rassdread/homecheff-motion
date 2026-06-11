import { isBrandingAction } from "@/lib/editor-instruction-actions";
import type {
  EditorInstructionChangePlanItem,
  EditorInstructionDynamicAction,
  EditorInstructionObjectCategory,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function createChangePlanItemId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function summarizeChangePlanItem(
  selection: Pick<
    EditorInstructionSelection,
    "objectLabel" | "action" | "replacement" | "customPrompt" | "brandingPlacementHint"
  > & { color?: string }
): string {
  const target = selection.objectLabel.trim();
  switch (selection.action) {
    case "change_color":
      return `Change color of ${target}${selection.color ? ` to ${selection.color}` : ""}`;
    case "add_logo":
      return `Add logo to ${target}${selection.brandingPlacementHint ? ` (${selection.brandingPlacementHint})` : ""}`;
    case "replace_logo":
      return `Replace logo on ${target}`;
    case "replace":
      return `Replace ${target} with ${selection.replacement?.trim() || "described item"}`;
    default:
      return `${selection.action.replace(/_/g, " ")} on ${target}`;
  }
}

export type ChangePlanValidation = {
  ok: boolean;
  reasonKey?: string;
};

export function validateChangePlanItemInput(
  selection: Partial<EditorInstructionSelection> & { color?: string },
  document: EditorCanvasDocument
): ChangePlanValidation {
  if (!selection.objectKey || !selection.action || !selection.category) {
    return { ok: false, reasonKey: "editor.instructionStudio.v2.changePlan.incompleteSelection" };
  }
  if (isBrandingAction(selection.action)) {
    const logoId = selection.logoReferenceId;
    const hasLogo =
      Boolean(logoId) &&
      (document.instructionStudioState?.brandReferences ?? []).some((r) => r.id === logoId);
    if (!hasLogo) {
      return { ok: false, reasonKey: "editor.instructionStudio.v2.changePlan.logoRequired" };
    }
  }
  if (selection.action === "change_color" && !selection.color?.trim() && !selection.replacement?.trim()) {
    return { ok: false, reasonKey: "editor.instructionStudio.v2.changePlan.colorRequired" };
  }
  if (selection.action === "replace" && !selection.replacement?.trim() && !selection.customPrompt?.trim()) {
    return { ok: false, reasonKey: "editor.instructionStudio.v2.changePlan.replacementRequired" };
  }
  return { ok: true };
}

export function buildChangePlanItemFromSelection(
  selection: EditorInstructionSelection & { color?: string },
  order: number
): EditorInstructionChangePlanItem {
  return {
    id: createChangePlanItemId(),
    objectId: selection.objectKey,
    objectLabel: selection.objectLabel,
    objectCategory: selection.category,
    action: selection.action,
    instruction: summarizeChangePlanItem(selection),
    replacement: selection.replacement,
    color: selection.color,
    customPrompt: selection.customPrompt,
    logoReferenceId: selection.logoReferenceId,
    styleReferenceId: selection.styleReferenceId,
    productReferenceId: selection.productReferenceId,
    brandingPlacementHint: selection.brandingPlacementHint,
    strength: selection.sliders.changeStrength,
    preserveStyle: selection.sliders.preserveStyle,
    preserveBrand: selection.sliders.brandPreservation,
    order,
    status: "pending",
  };
}

export function listChangePlan(document: EditorCanvasDocument): EditorInstructionChangePlanItem[] {
  return [...(document.instructionStudioState?.changePlan ?? [])].sort((a, b) => a.order - b.order);
}

export function appendChangePlanItem(
  document: EditorCanvasDocument,
  item: EditorInstructionChangePlanItem
): EditorCanvasDocument {
  const plan = listChangePlan(document);
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      changePlan: [...plan, item],
    },
    updatedAt: new Date().toISOString(),
  };
}

export function removeChangePlanItem(document: EditorCanvasDocument, itemId: string): EditorCanvasDocument {
  const plan = listChangePlan(document).filter((i) => i.id !== itemId);
  return {
    ...document,
    instructionStudioState: { ...document.instructionStudioState, changePlan: reindexPlan(plan) },
    updatedAt: new Date().toISOString(),
  };
}

export function clearChangePlan(document: EditorCanvasDocument): EditorCanvasDocument {
  return {
    ...document,
    instructionStudioState: { ...document.instructionStudioState, changePlan: [] },
    updatedAt: new Date().toISOString(),
  };
}

function reindexPlan(plan: EditorInstructionChangePlanItem[]): EditorInstructionChangePlanItem[] {
  return plan.map((item, index) => ({ ...item, order: index }));
}

export function reorderChangePlanItem(
  document: EditorCanvasDocument,
  itemId: string,
  direction: "up" | "down"
): EditorCanvasDocument {
  const plan = listChangePlan(document);
  const index = plan.findIndex((i) => i.id === itemId);
  if (index < 0) {
    return document;
  }
  const swap = direction === "up" ? index - 1 : index + 1;
  if (swap < 0 || swap >= plan.length) {
    return document;
  }
  const next = [...plan];
  [next[index], next[swap]] = [next[swap]!, next[index]!];
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      changePlan: reindexPlan(next),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function patchChangePlanItem(
  document: EditorCanvasDocument,
  itemId: string,
  patch: Partial<EditorInstructionChangePlanItem>
): EditorCanvasDocument {
  const plan = listChangePlan(document).map((item) =>
    item.id === itemId ? { ...item, ...patch } : item
  );
  return {
    ...document,
    instructionStudioState: { ...document.instructionStudioState, changePlan: plan },
    updatedAt: new Date().toISOString(),
  };
}

export function groupChangePlanByObject(
  plan: EditorInstructionChangePlanItem[]
): Array<{ objectLabel: string; objectCategory: EditorInstructionObjectCategory; items: EditorInstructionChangePlanItem[] }> {
  const groups = new Map<string, EditorInstructionChangePlanItem[]>();
  for (const item of plan) {
    const key = item.objectId;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([, items]) => ({
    objectLabel: items[0]!.objectLabel,
    objectCategory: items[0]!.objectCategory,
    items: items.sort((a, b) => a.order - b.order),
  }));
}

export function changePlanToSelection(item: EditorInstructionChangePlanItem): EditorInstructionSelection {
  return {
    objectKey: item.objectId,
    objectLabel: item.objectLabel,
    category: item.objectCategory,
    action: item.action,
    replacement: item.replacement,
    customPrompt: item.customPrompt,
    sliders: {
      preserveStyle: item.preserveStyle,
      changeStrength: item.strength,
      brandPreservation: item.preserveBrand,
      creativity: 35,
    },
    logoReferenceId: item.logoReferenceId,
    styleReferenceId: item.styleReferenceId,
    productReferenceId: item.productReferenceId,
    brandingPlacementHint: item.brandingPlacementHint,
  };
}
