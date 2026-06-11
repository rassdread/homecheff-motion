import { categorySupportsBranding, isBrandingAction } from "@/lib/editor-instruction-actions";
import type {
  EditorInstructionDynamicAction,
  EditorInstructionObjectCategory,
  EditorInstructionObjectV2,
} from "@/types/editor-instruction-studio";

export const BRANDING_SURFACE_OBJECTS = new Set([
  "apron",
  "packaging",
  "cup",
  "truck",
  "sign",
  "banner",
  "clothing",
  "storefront",
  "product label",
]);

export function objectSupportsBrandingWorkflow(obj: EditorInstructionObjectV2): boolean {
  return categorySupportsBranding(obj.category);
}

export function isBrandingWorkflowAction(action: EditorInstructionDynamicAction): boolean {
  return isBrandingAction(action);
}

export function defaultBrandingPlacementHint(category: EditorInstructionObjectCategory): string {
  switch (category) {
    case "clothing":
      return "chest area";
    case "packaging":
      return "front label area";
    case "vehicle":
      return "side panel";
    case "signage":
      return "center of sign";
    case "building":
      return "storefront fascia";
    case "product":
      return "product label";
    default:
      return "primary visible surface";
  }
}

export function brandingWorkflowRequiresLogo(action: EditorInstructionDynamicAction): boolean {
  return isBrandingAction(action);
}
