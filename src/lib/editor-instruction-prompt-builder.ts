import { isBrandingAction } from "@/lib/editor-instruction-actions";
import {
  buildPrecisionInstructionForPlanItem,
  buildTargetOnlyPromptForSelection,
  ensureChangePlanPrecision,
  strongerProtectionSliders,
} from "@/lib/editor-instruction-target-precision";
import type { BrandReferenceAsset } from "@/types/editor-instruction-studio";
import type {
  EditorInstructionDynamicAction,
  EditorInstructionObjectCategory,
  EditorInstructionReference,
  EditorInstructionSelection,
  EditorInstructionSliders,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorInstructionPromptInputV2 = EditorInstructionSelection & {
  assetName?: string;
  brandIdentity?: string;
  logoReference?: BrandReferenceAsset | null;
  references?: EditorInstructionReference[];
  preserveObjects?: string[];
};

const ACTION_PHRASES: Partial<Record<EditorInstructionDynamicAction, string>> = {
  add_logo: "Apply the uploaded logo to",
  replace_logo: "Replace the logo on",
  change_color: "Change the color of only",
  change_material: "Change the material of only",
  remove: "Remove only",
  redesign_packaging: "Redesign the packaging of",
  premium_packaging: "Upgrade the packaging of to a premium luxury style for",
  eco_packaging: "Redesign the packaging of with eco-friendly sustainable styling for",
  rewrite: "Rewrite the text on",
  translate: "Translate the text on",
  replace: "Replace only",
  blur: "Blur only",
  transparent: "Make transparent only",
  change_clothing: "Change the clothing on",
  change_expression: "Change the expression of",
  change_pose: "Change the pose of",
  add_item: "Add an item to",
  remove_item: "Remove an item from",
  enlarge_logo: "Enlarge the logo on",
  move_logo: "Reposition the logo on",
  remove_logo: "Remove the logo from",
  change_style: "Adjust the visual style of only",
  change_background: "Change the background",
  duplicate: "Create a duplicate variant of",
  detach_asset: "Isolate and extract",
};

function strengthPhrase(changeStrength: number): string {
  if (changeStrength >= 75) {
    return "Apply a strong, clearly visible change.";
  }
  if (changeStrength >= 45) {
    return "Apply a moderate, balanced change.";
  }
  return "Apply a subtle, conservative change.";
}

function stylePreservationPhrase(preserveStyle: number): string {
  if (preserveStyle >= 75) {
    return "Keep: mascot, pose, colors, and illustration style highly consistent.";
  }
  if (preserveStyle >= 45) {
    return "Keep: overall illustration style mostly consistent.";
  }
  return "Style may shift while keeping the scene recognizable.";
}

function brandPreservationPhrase(brandPreservation: number, brandIdentity?: string): string {
  const brand = brandIdentity?.trim();
  if (brandPreservation >= 75) {
    return brand
      ? `Preserve: brand identity (${brand}), mascot proportions, and logo treatment.`
      : "Preserve: brand colors, mascot identity, and logo treatment.";
  }
  if (brandPreservation >= 45) {
    return "Preserve: major brand cues.";
  }
  return "Brand cues may adapt to support the edit.";
}

function creativityPhrase(creativity: number): string {
  if (creativity >= 70) {
    return "You may add tasteful creative details that support the brief.";
  }
  if (creativity >= 40) {
    return "Stay close to the reference composition.";
  }
  return "Do not invent elements beyond the explicit request.";
}

function doNotModifyClause(
  category: EditorInstructionObjectCategory,
  preserveObjects?: string[]
): string {
  const defaults = ["unrelated objects", "text", "logos", "background"];
  if (category !== "background" && category !== "character") {
    defaults.unshift("mascot face", "pose", "clothing");
  }
  if (category === "background") {
    return "Do not modify: foreground subjects, logos, or clothing unless required for blending.";
  }
  const extras = preserveObjects?.length ? preserveObjects : defaults;
  return `Do not modify: ${extras.join(", ")}.`;
}

function brandingPromptBlock(
  input: EditorInstructionPromptInputV2,
  target: string
): string {
  const placement = input.brandingPlacementHint?.trim() || "the appropriate visible area";
  const logoName = input.logoReference?.name ?? "uploaded logo";
  if (input.action === "add_logo") {
    return [
      `Apply the uploaded logo (${logoName}) to ${target} at ${placement}.`,
      "Preserve: fabric folds, perspective, shadows, lighting.",
      "Do not alter: mascot face, pose, background.",
    ].join(" ");
  }
  if (input.action === "replace_logo") {
    return [
      `Replace the existing logo on ${target} with the uploaded logo (${logoName}).`,
      "Preserve: fabric folds, perspective, shadows, lighting.",
      "Do not alter: mascot face, pose, background.",
    ].join(" ");
  }
  return "";
}

function actionDetail(input: EditorInstructionPromptInputV2): string {
  const target = input.objectLabel.trim() || input.objectKey;
  if (isBrandingAction(input.action) && input.logoReference) {
    return brandingPromptBlock(input, target);
  }

  const verb = ACTION_PHRASES[input.action] ?? "Edit only";
  switch (input.action) {
    case "replace":
    case "replace_logo": {
      const replacement = input.replacement?.trim() || "the described replacement";
      return `${verb} ${target} with ${replacement}.`;
    }
    case "premium_packaging":
    case "eco_packaging":
    case "redesign_packaging":
      return `${verb} ${target}.`;
    case "transparent":
      return `Make ${target} transparent while keeping edges clean.`;
    case "blur":
      return `Blur ${target} naturally.`;
    default:
      return `${verb} ${target}.`;
  }
}

function referenceClause(references?: EditorInstructionReference[]): string {
  if (!references?.length) {
    return "";
  }
  const parts = references
    .filter((r) => r.type !== "SOURCE_IMAGE")
    .map((r) => {
      switch (r.type) {
        case "LOGO_REFERENCE":
          return `Use the provided logo reference (${r.label ?? "logo"}) for brand placement.`;
        case "STYLE_REFERENCE":
          return `Match the visual style of the style reference (${r.label ?? "style"}).`;
        case "PRODUCT_REFERENCE":
          return `Use the product reference (${r.label ?? "product"}) for shape and detail.`;
        default:
          return "";
      }
    })
    .filter(Boolean);
  return parts.join(" ");
}

/** @deprecated use buildEditorInstructionPromptV2 */
export function buildEditorInstructionPrompt(
  input: EditorInstructionPromptInputV2 & { objectId?: string; sliders: EditorInstructionSliders }
): string {
  return buildEditorInstructionPromptV2(input);
}

export function buildEditorInstructionPromptV2(input: EditorInstructionPromptInputV2): string {
  const custom = input.customPrompt?.trim();
  const parts = [
    "Using the reference image,",
    stylePreservationPhrase(input.sliders.preserveStyle),
    brandPreservationPhrase(input.sliders.brandPreservation, input.brandIdentity),
    actionDetail(input),
    doNotModifyClause(input.category, input.preserveObjects),
    referenceClause(input.references),
    strengthPhrase(input.sliders.changeStrength),
    creativityPhrase(input.sliders.creativity),
  ];
  if (custom) {
    parts.push(`User brief: ${custom}`);
  }
  return parts.filter(Boolean).join(" ");
}

export function buildEditorInstructionChangePlanPrompt(input: {
  items: import("@/types/editor-instruction-studio").EditorInstructionChangePlanItem[];
  brandIdentity?: string;
  references?: EditorInstructionReference[];
  preserveStyle?: number;
  preserveBrand?: number;
}): string {
  const entries = input.items.map((item) => ({ ...item, entryType: "object" as const }));
  return buildEditorInstructionPromptV3({
    entries,
    brandIdentity: input.brandIdentity,
    references: input.references,
    preserveStyle: input.preserveStyle,
    preserveBrand: input.preserveBrand,
  });
}

export function buildEditorInstructionPromptV3(input: {
  entries: import("@/types/editor-instruction-studio").EditorInstructionChangePlanEntry[];
  brandIdentity?: string;
  references?: EditorInstructionReference[];
  preserveStyle?: number;
  preserveBrand?: number;
  userNotes?: string;
  document?: EditorCanvasDocument;
}): string {
  const preserveStyle = input.preserveStyle ?? 80;
  const preserveBrand = input.preserveBrand ?? 85;
  const sorted = [...input.entries].sort((a, b) => a.order - b.order);
  const objectChanges = sorted.filter((e) => e.entryType !== "style");
  const styleChanges = sorted.filter((e) => e.entryType === "style");

  const precisionObjectChanges =
    input.document && objectChanges.length > 0
      ? ensureChangePlanPrecision(
          input.document,
          objectChanges.filter(
            (e): e is import("@/types/editor-instruction-studio").EditorInstructionChangePlanItem =>
              e.entryType === "object"
          )
        )
      : objectChanges.filter(
          (e): e is import("@/types/editor-instruction-studio").EditorInstructionChangePlanItem =>
            e.entryType === "object"
        );

  const lines = [
    "REFERENCE IMAGE",
    "Use the supplied image as reference.",
    "",
    "OBJECT CHANGES",
  ];

  if (precisionObjectChanges.length === 0) {
    lines.push("None.");
  } else {
    precisionObjectChanges.forEach((item, index) => {
      const instruction = buildPrecisionInstructionForPlanItem(item);
      lines.push(`${index + 1}. ${instruction}`);
    });
  }

  lines.push("", "STYLE CHANGES");
  if (styleChanges.length === 0) {
    lines.push("None.");
  } else {
    styleChanges.forEach((item, index) => {
      if (item.entryType !== "style") {
        return;
      }
      lines.push(`${index + 1}. ${item.instruction}.`);
    });
  }

  const brandPreserveLine = input.brandIdentity?.trim()
    ? `- ${input.brandIdentity.trim()} branding`
    : "- brand identity";
  lines.push(
    "",
    "PRESERVE",
    "- mascot identity",
    "- facial recognizability",
    brandPreserveLine,
    "- illustration quality",
    "- pose",
    "- composition",
    "- unchanged clothing unless modified above",
    "- unchanged background unless modified above"
  );

  if (preserveStyle >= 75) {
    lines.push(stylePreservationPhrase(preserveStyle));
  }
  if (preserveBrand >= 75) {
    lines.push(brandPreservationPhrase(preserveBrand, input.brandIdentity));
  }

  const ref = referenceClause(input.references);
  if (ref) {
    lines.push(ref);
  }
  if (input.userNotes?.trim()) {
    lines.push(`User notes: ${input.userNotes.trim()}`);
  }

  return lines.filter(Boolean).join("\n");
}

export function buildEditorInstructionVariantPayload(
  input: EditorInstructionPromptInputV2 & { document?: EditorCanvasDocument }
): {
  prompt: string;
  instruction: EditorInstructionSelection;
  sourceImageId: string;
  references: EditorInstructionReference[];
} {
  const references = input.references ?? [];
  const targetOnly =
    input.document ? input.document.instructionStudioState?.targetOnlyEdit !== false : true;
  const strongerProtection =
    input.document?.instructionStudioState?.strongerProtection === true;
  const sliders =
    strongerProtection ? strongerProtectionSliders(input.sliders) : input.sliders;
  const prompt =
    input.document && targetOnly
      ? buildTargetOnlyPromptForSelection(
          input.document,
          { ...input, sliders },
          {
          targetOnly,
          strongerProtection,
          brandIdentity: input.brandIdentity,
          preserveStyle: sliders.preserveStyle,
          preserveBrand: sliders.brandPreservation,
        })
      : buildEditorInstructionPromptV2({ ...input, sliders, references });
  return {
    prompt,
    instruction: {
      objectKey: input.objectKey,
      objectLabel: input.objectLabel,
      category: input.category,
      action: input.action,
      replacement: input.replacement,
      customPrompt: input.customPrompt,
      sliders: input.sliders,
      preserveCharacter: input.preserveCharacter,
      logoReferenceId: input.logoReferenceId,
      styleReferenceId: input.styleReferenceId,
      productReferenceId: input.productReferenceId,
      brandingPlacementHint: input.brandingPlacementHint,
    },
    sourceImageId: "background",
    references,
  };
}
