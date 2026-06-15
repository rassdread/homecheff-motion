import { normalizePartKey } from "@/lib/editor-instruction-target-precision";
import {
  EDITOR_ACCESSORY_TYPES,
  type EditorAccessoryType,
  type EditorInstructionChangePlanItem,
  type EditorInstructionObjectCategory,
  type EditorInstructionObjectV2,
  type EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const ACCESSORY_ELIGIBLE_KEYS = new Set([
  "head",
  "face",
  "eyes",
  "hair",
  "body",
  "jacket",
  "character",
  "mascot",
]);

const ACCESSORY_PROMPT_EN: Record<Exclude<EditorAccessoryType, "custom">, string> = {
  hat: "a hat",
  pet: "a small pet",
  beanie: "a beanie",
  sunglasses: "black sunglasses",
  glasses: "glasses",
  headphones: "headphones",
  necklace: "a necklace",
  jewelry: "jewelry",
};

const TARGET_ACCESSORY_TYPES: Record<string, EditorAccessoryType[]> = {
  eyes: ["sunglasses", "glasses", "custom"],
  face: ["sunglasses", "glasses", "headphones", "custom"],
  head: ["hat", "beanie", "pet", "headphones", "custom"],
  hair: ["hat", "beanie", "pet", "custom"],
  body: ["necklace", "jewelry", "custom"],
  jacket: ["necklace", "jewelry", "custom"],
  character: [...EDITOR_ACCESSORY_TYPES],
  mascot: [...EDITOR_ACCESSORY_TYPES],
};

export function accessoryTypeLabelKey(type: EditorAccessoryType): string {
  return `editor.instructionStudio.v2.accessory.type.${type}`;
}

export function accessoryAddActionLabelKey(type: EditorAccessoryType): string {
  if (type === "custom") {
    return "editor.instructionStudio.v2.accessory.addCustom";
  }
  return `editor.instructionStudio.v2.accessory.add.${type}`;
}

export function resolveTargetPartKeys(
  label: string,
  partId?: string,
  category?: EditorInstructionObjectCategory
): string[] {
  return [
    normalizePartKey(label),
    partId ? normalizePartKey(partId) : "",
    category ? normalizePartKey(category) : "",
  ].filter(Boolean);
}

export function isAccessoryEligibleTarget(input: {
  label: string;
  partId?: string;
  category?: EditorInstructionObjectCategory;
}): boolean {
  const keys = resolveTargetPartKeys(input.label, input.partId, input.category);
  if (keys.some((key) => ACCESSORY_ELIGIBLE_KEYS.has(key))) {
    return true;
  }
  if (input.category === "character") {
    return true;
  }
  return /\b(head|face|eyes|hair|body|jacket|character|mascot)\b/i.test(input.label);
}

export function isAccessoryEligibleObject(object: EditorInstructionObjectV2): boolean {
  return isAccessoryEligibleTarget({
    label: object.label,
    partId: object.layerId,
    category: object.category,
  });
}

function primaryTargetKey(label: string, partId?: string, category?: EditorInstructionObjectCategory): string {
  const keys = resolveTargetPartKeys(label, partId, category);
  for (const key of keys) {
    if (TARGET_ACCESSORY_TYPES[key]) {
      return key;
    }
  }
  if (category === "character") {
    return "character";
  }
  return keys[0] ?? normalizePartKey(label);
}

export function resolveAccessoryTypesForTarget(input: {
  label: string;
  partId?: string;
  category?: EditorInstructionObjectCategory;
}): EditorAccessoryType[] {
  const key = primaryTargetKey(input.label, input.partId, input.category);
  return TARGET_ACCESSORY_TYPES[key] ?? ["custom"];
}

export function resolveAccessoryPlacement(label: string, partId?: string): string {
  const key = normalizePartKey(partId ?? label);
  if (key === "eyes" || key === "face") {
    return "face/eyes area";
  }
  if (key === "head" || key === "hair") {
    return "top of the head";
  }
  if (key === "body" || key === "jacket" || key === "character" || key === "mascot") {
    return "upper body";
  }
  if (/\beyes?\b/i.test(label)) {
    return "face/eyes area";
  }
  if (/\b(head|hair)\b/i.test(label)) {
    return "top of the head";
  }
  return "selected area";
}

export function buildAccessoryDescription(
  accessoryType: EditorAccessoryType,
  customDescription?: string
): string {
  if (accessoryType === "custom") {
    return customDescription?.trim() || "custom accessory";
  }
  return ACCESSORY_PROMPT_EN[accessoryType];
}

export function buildAccessoryAddPrompt(input: {
  targetLabel: string;
  targetPartId?: string;
  accessoryType: EditorAccessoryType;
  customDescription?: string;
}): string {
  const placement = resolveAccessoryPlacement(input.targetLabel, input.targetPartId);
  const accessory = buildAccessoryDescription(input.accessoryType, input.customDescription);
  return `Add ${accessory} to the selected ${placement}. Position the accessory naturally on the ${placement}.`;
}

export function buildAccessoryProtectionSuffix(): string {
  return (
    "Do not change face identity, skin or mascot color, clothing, pose, background, existing props, or illustration style."
  );
}

export function summarizeAccessoryChangePlanItem(input: {
  targetLabel: string;
  accessoryType: EditorAccessoryType;
  customDescription?: string;
}): string {
  const accessory = buildAccessoryDescription(input.accessoryType, input.customDescription);
  const placement = resolveAccessoryPlacement(input.targetLabel);
  return `${accessory} on ${placement}. ${buildAccessoryProtectionSuffix()}`;
}

export function buildAccessorySelectionPatch(
  accessoryType: EditorAccessoryType,
  customDescription?: string
): Partial<EditorInstructionSelection> {
  return {
    action: "accessory_add",
    accessoryType,
    customPrompt:
      accessoryType === "custom" ? customDescription?.trim() : undefined,
    replacement: accessoryType !== "custom" ? buildAccessoryDescription(accessoryType) : undefined,
  };
}

export function patchChangePlanItemForAccessory(
  item: EditorInstructionChangePlanItem,
  document: EditorCanvasDocument
): EditorInstructionChangePlanItem {
  if (item.action !== "accessory_add" || !item.accessoryType) {
    return item;
  }
  const requestedChange = buildAccessoryAddPrompt({
    targetLabel: item.objectLabel,
    targetPartId: item.targetPartId,
    accessoryType: item.accessoryType,
    customDescription: item.customPrompt,
  });
  return {
    ...item,
    requestedChange: `${requestedChange} ${buildAccessoryProtectionSuffix()}`,
    instruction: `${requestedChange} ${buildAccessoryProtectionSuffix()}`,
    targetOnly: item.targetOnly !== false,
  };
}
