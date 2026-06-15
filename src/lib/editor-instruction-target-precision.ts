import { resolveMascotExpansionKind } from "@/lib/editor-character-expansion";
import {
  buildAccessoryAddPrompt,
  buildAccessoryProtectionSuffix,
} from "@/lib/editor-instruction-accessory-actions";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import { resolveInstructionObjectBounds } from "@/lib/editor-instruction-object-bounds";
import type {
  EditorEditProtectionPlan,
  EditorInstructionChangePlanItem,
  EditorInstructionDynamicAction,
  EditorInstructionObjectBounds,
  EditorInstructionObjectSource,
  EditorInstructionObjectV2,
  EditorInstructionSelection,
  EditorInstructionVariantPrecisionVerification,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type TargetPrecisionContext = {
  targetPartId: string;
  targetLabel: string;
  targetBounds?: EditorInstructionObjectBounds;
  targetSource?: EditorInstructionObjectSource;
  actionType: EditorInstructionDynamicAction;
  requestedChange: string;
  lockedParts: string[];
  protectedParts: string[];
  negativePrompt: string;
  targetOnly: boolean;
  mascotDetected: boolean;
  estimatedSelection: boolean;
  protectionPlan: EditorEditProtectionPlan;
  strongerProtection: boolean;
};

const STRUCTURAL_LOCKS = [
  "pose",
  "proportions",
  "outline style",
  "shadow",
  "mascot identity",
  "character identity",
] as const;

const IDENTITY_LOCKS = [
  "face",
  "eyes",
  "mouth",
  "head",
  "skin/face area",
  "mascot identity",
  "character identity",
  "neutral white face/skin",
  "no human skin tone",
  "body proportions",
  "pose",
] as const;

const STYLE_LOCKS = [
  "outline style",
  "cartoon outline style",
  "illustration style",
  "color palette",
  "brand colors",
  "blue/green brand identity",
  "line weight",
  "visual identity",
] as const;

const MASCOT_BRAND_LOCKS = [
  "neutral white face/skin",
  "no human skin tone",
  "cartoon outline style",
  "body proportions",
  "blue/green brand identity",
] as const;

const DISPLAY_PART_PRIORITY = [
  "face",
  "head",
  "hair",
  "shirt",
  "tie",
  "pants",
  "shoes",
  "hands",
  "globe",
  "logo",
  "background",
] as const;

export type EditTargetRef = {
  objectId: string;
  objectLabel: string;
  targetPartId?: string;
};

export function normalizePartKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/^obj_/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function partKeysForObject(object: Pick<EditorInstructionObjectV2, "id" | "label">): string[] {
  return [normalizePartKey(object.id), normalizePartKey(object.label)];
}

function partKeysForTarget(target: EditTargetRef): Set<string> {
  const keys = [
    normalizePartKey(target.objectLabel),
    normalizePartKey(target.objectId),
    target.targetPartId ? normalizePartKey(target.targetPartId) : "",
  ].filter(Boolean);
  return new Set(keys);
}

export function isTargetPartMatch(
  object: Pick<EditorInstructionObjectV2, "id" | "label">,
  target: EditTargetRef
): boolean {
  const targetKeys = partKeysForTarget(target);
  return partKeysForObject(object).some((key) => targetKeys.has(key));
}

function isAnyTargetMatch(
  object: Pick<EditorInstructionObjectV2, "id" | "label">,
  targets: EditTargetRef[]
): boolean {
  return targets.some((target) => isTargetPartMatch(object, target));
}

export function isHomeCheffMascot(document: EditorCanvasDocument): boolean {
  return Boolean(resolveMascotExpansionKind(document));
}

function isBackgroundLabel(label: string): boolean {
  return normalizePartKey(label) === "background";
}

function isGlobeTarget(target: EditTargetRef): boolean {
  const keys = partKeysForTarget(target);
  return keys.has("globe") || keys.has("logo");
}

function isIdentityLabel(label: string): boolean {
  const key = normalizePartKey(label);
  return IDENTITY_LOCKS.some((lock) => normalizePartKey(lock) === key)
    || /face|skin|eyes|mouth|head|identity|proportion|pose/i.test(label);
}

function isStyleLabel(label: string): boolean {
  const key = normalizePartKey(label);
  return STYLE_LOCKS.some((lock) => normalizePartKey(lock) === key)
    || /outline|palette|brand|illustration|style|line weight/i.test(label);
}

export function buildEditProtectionPlan(
  document: EditorCanvasDocument,
  targets: EditTargetRef[]
): EditorEditProtectionPlan {
  const objects = listInstructionObjectsV2(document);
  const targetParts = targets.map((t) => t.objectLabel.trim()).filter(Boolean);
  const protectedObjects = objects.filter((object) => !isAnyTargetMatch(object, targets));

  const protectedParts = protectedObjects
    .map((object) => object.label.trim())
    .filter((label) => label && !isIdentityLabel(label) && !isStyleLabel(label) && !isBackgroundLabel(label));

  const lockedIdentityFeatures: string[] = [...IDENTITY_LOCKS];
  if (isHomeCheffMascot(document)) {
    for (const lock of MASCOT_BRAND_LOCKS) {
      if (!lockedIdentityFeatures.includes(lock)) {
        lockedIdentityFeatures.push(lock);
      }
    }
    const anyGlobeTarget = targets.some((t) => isGlobeTarget(t));
    if (!anyGlobeTarget) {
      if (!protectedParts.includes("Globe")) {
        protectedParts.push("Globe");
      }
      if (!protectedParts.includes("Logo")) {
        protectedParts.push("Logo");
      }
    }
  }

  const lockedStyle = [...STYLE_LOCKS];
  const backgroundTargeted = targets.some(
    (t) => isBackgroundLabel(t.objectLabel) || normalizePartKey(t.objectId) === "background"
  );
  const lockedBackground =
    !backgroundTargeted &&
    protectedObjects.some((object) => isBackgroundLabel(object.label) || object.category === "background");

  const protectedRegionBounds = protectedObjects
    .map((object) => ({
      label: object.label,
      bounds: resolveInstructionObjectBounds(object, document),
    }))
    .filter((region) => region.bounds.width > 0 && region.bounds.height > 0);

  const targetRegionBounds = targets
    .map((target) => {
      const object =
        objects.find((o) => isTargetPartMatch(o, target)) ??
        ({
          id: target.objectId,
          label: target.objectLabel,
          category: "other",
          confidence: 0.5,
          description: "",
          suggestedActions: [],
        } satisfies EditorInstructionObjectV2);
      return {
        label: target.objectLabel,
        bounds: resolveInstructionObjectBounds(object, document),
      };
    })
    .filter((region) => region.bounds.width > 0 && region.bounds.height > 0);

  return {
    targetParts,
    protectedParts: selectProtectedPartsForDisplay([
      ...protectedParts,
      ...protectedObjects.map((o) => o.label),
    ]),
    lockedIdentityFeatures: [...new Set(lockedIdentityFeatures)],
    lockedBackground,
    lockedStyle: [...new Set(lockedStyle)],
    protectedRegionBounds,
    targetRegionBounds,
  };
}

export function resolveLockedPartsForTarget(
  document: EditorCanvasDocument,
  target: EditTargetRef
): { lockedParts: string[]; protectedParts: string[] } {
  const plan = buildEditProtectionPlan(document, [target]);
  const lockedSet = new Set<string>([
    ...plan.protectedParts,
    ...plan.lockedIdentityFeatures,
    ...plan.lockedStyle,
    ...STRUCTURAL_LOCKS,
  ]);
  if (plan.lockedBackground) {
    lockedSet.add("background");
  }
  return {
    lockedParts: [...lockedSet],
    protectedParts: plan.protectedParts,
  };
}

export function selectProtectedPartsForDisplay(lockedParts: string[]): string[] {
  const normalized = new Map<string, string>();
  for (const part of lockedParts) {
    const key = normalizePartKey(part);
    if (!normalized.has(key)) {
      normalized.set(key, part);
    }
  }

  const ordered: string[] = [];
  for (const priority of DISPLAY_PART_PRIORITY) {
    const match = normalized.get(priority);
    if (match) {
      ordered.push(formatDisplayPartLabel(match));
      normalized.delete(priority);
    }
  }

  for (const label of normalized.values()) {
    if (STRUCTURAL_LOCKS.includes(label as (typeof STRUCTURAL_LOCKS)[number])) {
      continue;
    }
    if (MASCOT_BRAND_LOCKS.includes(label as (typeof MASCOT_BRAND_LOCKS)[number])) {
      continue;
    }
    if (isIdentityLabel(label) || isStyleLabel(label)) {
      continue;
    }
    ordered.push(formatDisplayPartLabel(label));
  }

  return ordered.slice(0, 8);
}

function formatDisplayPartLabel(label: string): string {
  if (label === "skin/face area") {
    return "Face";
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildRequestedChange(
  selection: Pick<
    EditorInstructionSelection,
    | "objectLabel"
    | "action"
    | "color"
    | "replacement"
    | "customPrompt"
    | "accessoryType"
    | "targetPartId"
  >
): string {
  const target = selection.objectLabel.trim();
  switch (selection.action) {
    case "change_color":
      return `Change the ${target.toLowerCase()} color${selection.color ? ` to ${selection.color}` : ""}.`;
    case "replace":
      return `Replace ${target} with ${selection.replacement?.trim() || "the described replacement"}.`;
    case "add_logo":
      return `Add logo to ${target}.`;
    case "replace_logo":
      return `Replace logo on ${target}.`;
    case "remove":
      return `Remove ${target}.`;
    case "change_clothing":
      return `Change clothing on ${target}.`;
    case "change_style":
      return `Adjust visual style of ${target}.`;
    case "change_background":
      return `Change the background.`;
    case "detach_asset":
      return `Extract ${target} as isolated asset.`;
    case "accessory_add":
      if (!selection.accessoryType) {
        return `Add accessory to ${target}.`;
      }
      return `${buildAccessoryAddPrompt({
        targetLabel: target,
        targetPartId: selection.targetPartId,
        accessoryType: selection.accessoryType,
        customDescription: selection.customPrompt,
      })} ${buildAccessoryProtectionSuffix()}`;
    default:
      if (selection.customPrompt?.trim()) {
        return selection.customPrompt.trim();
      }
      return `${selection.action.replace(/_/g, " ")} on ${target}.`;
  }
}

export function buildNegativePrompt(
  plan: EditorEditProtectionPlan,
  mascotDetected: boolean
): string {
  const parts = [
    ...plan.protectedParts,
    ...plan.lockedIdentityFeatures,
    ...plan.lockedStyle,
  ];
  if (plan.lockedBackground) {
    parts.push("background");
  }
  if (mascotDetected) {
    parts.push("face style", "human skin tone", "realistic skin", "mascot identity drift");
  }
  const unique = [...new Set(parts.map((p) => p.toLowerCase()))];
  return `Do not change ${unique.join(", ")}.`;
}

export function resolveStrongerProtection(document: EditorCanvasDocument): boolean {
  return document.instructionStudioState?.strongerProtection === true;
}

export function resolveTargetOnlyEdit(document: EditorCanvasDocument): boolean {
  return document.instructionStudioState?.targetOnlyEdit !== false;
}

export function buildTargetPrecisionContext(
  document: EditorCanvasDocument,
  selection: EditorInstructionSelection & { color?: string },
  options?: { targetOnly?: boolean; strongerProtection?: boolean }
): TargetPrecisionContext {
  const targetOnly = options?.targetOnly ?? resolveTargetOnlyEdit(document);
  const strongerProtection = options?.strongerProtection ?? resolveStrongerProtection(document);
  const target: EditTargetRef = {
    objectId: selection.objectKey,
    objectLabel: selection.objectLabel,
    targetPartId: selection.targetPartId,
  };
  const protectionPlan = buildEditProtectionPlan(document, [target]);
  const { lockedParts, protectedParts } = resolveLockedPartsForTarget(document, target);
  const mascotDetected = isHomeCheffMascot(document);

  const targetObject =
    listInstructionObjectsV2(document).find((o) => isTargetPartMatch(o, target)) ?? null;

  const targetBounds = targetObject
    ? resolveInstructionObjectBounds(targetObject, document)
    : undefined;

  return {
    targetPartId: selection.targetPartId ?? normalizePartKey(selection.objectKey),
    targetLabel: selection.objectLabel,
    targetBounds,
    targetSource: targetObject?.source,
    actionType: selection.action,
    requestedChange: buildRequestedChange(selection),
    lockedParts,
    protectedParts,
    negativePrompt: buildNegativePrompt(protectionPlan, mascotDetected),
    targetOnly,
    mascotDetected,
    estimatedSelection: Boolean(
      selection.estimatedSelection || targetBounds?.exact === false
    ),
    protectionPlan,
    strongerProtection,
  };
}

export function buildProtectionPlanFromChangePlan(
  document: EditorCanvasDocument,
  items: EditorInstructionChangePlanItem[]
): EditorEditProtectionPlan {
  const targets: EditTargetRef[] = items.map((item) => ({
    objectId: item.objectId,
    objectLabel: item.objectLabel,
    targetPartId: item.targetPartId,
  }));
  return buildEditProtectionPlan(document, targets);
}

export function buildTargetOnlyInstructionBlock(ctx: TargetPrecisionContext): string {
  if (!ctx.targetOnly) {
    return ctx.requestedChange;
  }

  const lines = [
    `Edit only the selected part(s): ${ctx.protectionPlan.targetParts.join(", ")}.`,
    ctx.requestedChange,
    `Editable: ${ctx.protectionPlan.targetParts.join(", ")}.`,
    `Protected parts: ${ctx.protectionPlan.protectedParts.join(", ")}.`,
    `Locked identity: ${ctx.protectionPlan.lockedIdentityFeatures.join(", ")}.`,
    ctx.protectionPlan.lockedBackground ? "Locked background: yes." : "Locked background: no.",
    `Locked style: ${ctx.protectionPlan.lockedStyle.join(", ")}.`,
  ];

  if (ctx.mascotDetected) {
    lines.push(
      "Keep mascot skin/face neutral white. Do not add human skin tone.",
      "Preserve cartoon outline style and HomeCheff brand identity."
    );
  }

  if (ctx.strongerProtection) {
    lines.push(
      "CRITICAL PROTECTION: Zero tolerance for changes outside the selected part(s).",
      "Do not modify any protected region, identity feature, background, or style element."
    );
  }

  if (ctx.targetBounds) {
    const regionType = ctx.targetBounds.exact ? "exact" : "estimated";
    lines.push(
      `Edit region (${regionType}): x=${ctx.targetBounds.x.toFixed(2)} y=${ctx.targetBounds.y.toFixed(2)} w=${ctx.targetBounds.width.toFixed(2)} h=${ctx.targetBounds.height.toFixed(2)}.`
    );
  }

  lines.push(`NEGATIVE: ${ctx.negativePrompt}`);
  return lines.join(" ");
}

export function enrichChangePlanItemWithPrecision(
  item: EditorInstructionChangePlanItem,
  document: EditorCanvasDocument,
  options?: { targetOnly?: boolean; strongerProtection?: boolean }
): EditorInstructionChangePlanItem {
  const selection: EditorInstructionSelection & { color?: string } = {
    objectKey: item.objectId,
    objectLabel: item.objectLabel,
    category: item.objectCategory,
    action: item.action,
    replacement: item.replacement,
    color: item.color,
    customPrompt: item.customPrompt,
    sliders: {
      changeStrength: item.strength,
      preserveStyle: item.preserveStyle,
      brandPreservation: item.preserveBrand,
      creativity: 50,
    },
    targetPartId: item.targetPartId,
    targetLayerId: item.targetLayerId,
    estimatedSelection: item.extractionQuality === "estimated_crop",
    accessoryType: item.accessoryType,
  };

  const ctx = buildTargetPrecisionContext(document, selection, options);
  const instruction = ctx.targetOnly
    ? buildTargetOnlyInstructionBlock(ctx)
    : item.instruction;

  return {
    ...item,
    instruction,
    targetBounds: ctx.targetBounds,
    targetSource: ctx.targetSource,
    requestedChange: ctx.requestedChange,
    lockedParts: ctx.lockedParts,
    protectedParts: ctx.protectedParts,
    negativePrompt: ctx.negativePrompt,
    targetOnly: ctx.targetOnly,
    protectionPlan: ctx.protectionPlan,
    extractionQuality:
      item.extractionQuality ??
      (ctx.estimatedSelection ? "estimated_crop" : undefined),
  };
}

export function buildPrecisionInstructionForPlanItem(
  item: EditorInstructionChangePlanItem
): string {
  if (item.targetOnly !== false && (item.protectionPlan || item.lockedParts?.length)) {
    const plan = item.protectionPlan;
    const lines = [
      `Edit only the selected part(s): ${plan?.targetParts.join(", ") ?? item.objectLabel}.`,
      item.requestedChange ?? item.instruction,
      `Protected parts: ${(plan?.protectedParts ?? item.protectedParts ?? []).join(", ")}.`,
      `Locked identity: ${(plan?.lockedIdentityFeatures ?? []).join(", ")}.`,
      plan?.lockedBackground ? "Locked background: yes." : "",
      `Locked style: ${(plan?.lockedStyle ?? []).join(", ")}.`,
    ].filter(Boolean);
    if (item.negativePrompt) {
      lines.push(`NEGATIVE: ${item.negativePrompt}`);
    }
    return lines.join(" ");
  }
  return item.instruction;
}

export function buildTargetOnlyPromptForSelection(
  document: EditorCanvasDocument,
  selection: EditorInstructionSelection & { color?: string },
  options?: {
    targetOnly?: boolean;
    strongerProtection?: boolean;
    brandIdentity?: string;
    preserveStyle?: number;
    preserveBrand?: number;
  }
): string {
  const ctx = buildTargetPrecisionContext(document, selection, options);
  const parts = [
    "Using the reference image,",
    buildTargetOnlyInstructionBlock(ctx),
  ];

  const preserveStyle = options?.preserveStyle ?? selection.sliders.preserveStyle;
  const preserveBrand = options?.preserveBrand ?? selection.sliders.brandPreservation;
  const styleFloor = ctx.strongerProtection ? 95 : 75;
  const brandFloor = ctx.strongerProtection ? 95 : 75;

  if (preserveStyle >= styleFloor || ctx.strongerProtection) {
    parts.push("Keep: mascot, pose, colors, and illustration style highly consistent.");
  }
  if (preserveBrand >= brandFloor || ctx.strongerProtection) {
    parts.push(
      options?.brandIdentity?.trim()
        ? `Preserve: brand identity (${options.brandIdentity.trim()}), mascot proportions, and logo treatment.`
        : "Preserve: brand colors, mascot identity, and logo treatment."
    );
  }

  return parts.filter(Boolean).join(" ");
}

export type ChangePlanItemDisplay = {
  title: string;
  onlyPartKey: string;
  onlyPartLabel: string;
  changeSummary: string;
  accessoryActionKey?: string;
  protectedList: string;
  identityList: string;
  backgroundLocked: boolean;
  styleList: string;
  mayChangeList: string;
  estimatedSelection: boolean;
};

export function buildChangePlanItemDisplay(
  item: EditorInstructionChangePlanItem
): ChangePlanItemDisplay {
  const plan = item.protectionPlan;
  const protectedList = (plan?.protectedParts ?? item.protectedParts ?? []).join(", ");
  let changeSummary = item.requestedChange ?? item.instruction;
  let accessoryActionKey: string | undefined;
  if (item.action === "change_color" && item.color) {
    changeSummary = `Color → ${item.color}`;
  }
  if (item.action === "accessory_add" && item.accessoryType) {
    accessoryActionKey =
      item.accessoryType === "custom"
        ? "editor.instructionStudio.v2.accessory.addCustom"
        : `editor.instructionStudio.v2.accessory.add.${item.accessoryType}`;
    changeSummary = accessoryActionKey;
  }

  return {
    title: item.objectLabel.toUpperCase(),
    onlyPartKey: "editor.instructionStudio.v2.precision.onlyPart",
    onlyPartLabel: item.objectLabel,
    changeSummary,
    accessoryActionKey,
    protectedList,
    identityList: (plan?.lockedIdentityFeatures ?? []).slice(0, 5).join(", "),
    backgroundLocked: plan?.lockedBackground ?? false,
    styleList: (plan?.lockedStyle ?? []).slice(0, 4).join(", "),
    mayChangeList: (plan?.targetParts ?? [item.objectLabel]).join(", "),
    estimatedSelection: item.extractionQuality === "estimated_crop",
  };
}

export type EditorInstructionVariantPrecisionWarning = "low_precision" | "possible_drift";

export function assessVariantPrecisionRisk(input: {
  targetOnly?: boolean;
  estimatedSelection?: boolean;
  mascotDetected?: boolean;
  extractionQuality?: EditorInstructionChangePlanItem["extractionQuality"];
  verification?: EditorInstructionVariantPrecisionVerification;
}): EditorInstructionVariantPrecisionWarning | null {
  if (input.verification?.status === "low_precision") {
    return "low_precision";
  }
  if (input.targetOnly === false) {
    return null;
  }
  if (input.estimatedSelection || input.extractionQuality === "estimated_crop") {
    return "possible_drift";
  }
  if (input.mascotDetected) {
    return "possible_drift";
  }
  return null;
}

export function mergePrecisionWarnings(
  preCheck: EditorInstructionVariantPrecisionWarning | null,
  verification: EditorInstructionVariantPrecisionVerification | undefined
): EditorInstructionVariantPrecisionWarning | null {
  if (verification?.status === "low_precision") {
    return "low_precision";
  }
  return preCheck;
}

export function ensureChangePlanPrecision(
  document: EditorCanvasDocument,
  items: EditorInstructionChangePlanItem[]
): EditorInstructionChangePlanItem[] {
  const targetOnly = resolveTargetOnlyEdit(document);
  const strongerProtection = resolveStrongerProtection(document);
  return items.map((item) =>
    item.protectionPlan?.targetParts.length
      ? item
      : enrichChangePlanItemWithPrecision(item, document, { targetOnly, strongerProtection })
  );
}

export function strongerProtectionSliders(
  sliders: EditorInstructionSelection["sliders"]
): EditorInstructionSelection["sliders"] {
  return {
    ...sliders,
    preserveStyle: Math.max(sliders.preserveStyle, 95),
    brandPreservation: Math.max(sliders.brandPreservation, 95),
    changeStrength: Math.min(sliders.changeStrength, 55),
    creativity: Math.min(sliders.creativity, 25),
  };
}
