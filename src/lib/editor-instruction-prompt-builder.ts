import type {
  EditorInstructionAction,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";

export type EditorInstructionPromptInput = EditorInstructionSelection & {
  assetName?: string;
  brandIdentity?: string;
};

const ACTION_VERBS: Record<EditorInstructionAction, string> = {
  remove: "Remove only",
  replace: "Replace only",
  change_color: "Change the color of only",
  change_style: "Adjust the style of only",
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
    return "Keep the original illustration style, line weight, shading, and color palette highly consistent.";
  }
  if (preserveStyle >= 45) {
    return "Keep the overall illustration style mostly consistent.";
  }
  return "You may reinterpret the visual style while keeping the scene recognizable.";
}

function brandPreservationPhrase(brandPreservation: number, brandIdentity?: string): string {
  const brand = brandIdentity?.trim();
  if (brandPreservation >= 75) {
    return brand
      ? `Preserve brand identity (${brand}), mascot proportions, and logo treatment.`
      : "Preserve brand colors, mascot identity, and logo treatment.";
  }
  if (brandPreservation >= 45) {
    return "Keep major brand cues recognizable.";
  }
  return "Brand cues may shift if needed for the requested edit.";
}

function creativityPhrase(creativity: number): string {
  if (creativity >= 70) {
    return "You may add tasteful creative details that support the brief.";
  }
  if (creativity >= 40) {
    return "Stay close to the reference composition with limited creative liberty.";
  }
  return "Do not invent new elements beyond the explicit request.";
}

function actionDetail(selection: EditorInstructionPromptInput): string {
  const target = selection.objectLabel.trim() || selection.objectId;
  const verb = ACTION_VERBS[selection.action];
  switch (selection.action) {
    case "replace": {
      const replacement = selection.replacement?.trim() || "the described replacement";
      return `${verb} ${target} with ${replacement}.`;
    }
    case "remove":
      return `${verb} ${target} and fill the area naturally.`;
    case "change_color":
      return `${verb} ${target} as described in the user brief.`;
    case "change_style":
      return `${verb} ${target} while keeping the rest of the image coherent.`;
    case "change_background":
      return `${verb} as described; do not alter foreground subjects unless necessary for blending.`;
    case "duplicate":
      return `${verb} ${target} as a separate asset-ready element.`;
    case "detach_asset":
      return `${verb} ${target} on a clean transparent or simple background.`;
    default:
      return `${verb} ${target}.`;
  }
}

function preserveCharacterClause(selection: EditorInstructionPromptInput): string {
  if (selection.preserveCharacter === false) {
    return "";
  }
  if (selection.objectId === "character" || selection.objectId === "mascot" || selection.objectId === "person") {
    return "";
  }
  return "Do not change the character's face, pose, clothing, or expression.";
}

export function buildEditorInstructionPrompt(input: EditorInstructionPromptInput): string {
  const custom = input.customPrompt?.trim();
  const parts = [
    "Using the reference image,",
    stylePreservationPhrase(input.sliders.preserveStyle),
    brandPreservationPhrase(input.sliders.brandPreservation, input.brandIdentity),
    actionDetail(input),
    preserveCharacterClause(input),
    "Do not change unrelated objects, text, logos, or background unless the action requires it.",
    strengthPhrase(input.sliders.changeStrength),
    creativityPhrase(input.sliders.creativity),
  ];
  if (custom) {
    parts.push(`User brief: ${custom}`);
  }
  return parts.filter(Boolean).join(" ");
}

export function buildEditorInstructionVariantPayload(input: EditorInstructionPromptInput): {
  prompt: string;
  instruction: EditorInstructionSelection;
  sourceImageId: string;
} {
  const prompt = buildEditorInstructionPrompt(input);
  return {
    prompt,
    instruction: {
      objectId: input.objectId,
      objectLabel: input.objectLabel,
      action: input.action,
      replacement: input.replacement,
      customPrompt: input.customPrompt,
      sliders: input.sliders,
      preserveCharacter: input.preserveCharacter,
    },
    sourceImageId: "background",
  };
}
