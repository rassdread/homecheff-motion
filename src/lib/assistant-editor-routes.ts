import { buildCharacterStudioFlowHref, buildCharacterStudioHubHref } from "@/lib/character-studio-hub";
import { STUDIO_PRODUCT_START_PATHS } from "@/lib/studio-product-landing-routes";

/** Copilot and registry must land on /editor/start — bare /editor shows marketing landing. */
export function normalizeAssistantEditorRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed.startsWith("/editor")) {
    return trimmed;
  }
  if (
    trimmed === STUDIO_PRODUCT_START_PATHS.editor ||
    trimmed.startsWith(`${STUDIO_PRODUCT_START_PATHS.editor}?`) ||
    trimmed.startsWith(`${STUDIO_PRODUCT_START_PATHS.editor}/`)
  ) {
    return trimmed;
  }
  if (trimmed === "/editor" || trimmed.startsWith("/editor?")) {
    return trimmed.replace(/^\/editor/, STUDIO_PRODUCT_START_PATHS.editor);
  }
  return trimmed;
}

export function buildAssistantEditorWorkflowRoute(
  workflow: string,
  extraParams?: Record<string, string>
): string {
  const params = new URLSearchParams({ workflow, ...extraParams });
  return `${STUDIO_PRODUCT_START_PATHS.editor}?${params.toString()}`;
}

export function buildMascotTransformWizardRoute(extraParams?: Record<string, string>): string {
  return buildCharacterStudioFlowHref("mascot_transform", extraParams);
}

export function buildCharacterStudioHubRoute(): string {
  return buildCharacterStudioHubHref();
}

export function buildCharacterStudioOutfitRoute(extraParams?: Record<string, string>): string {
  return buildCharacterStudioFlowHref("outfit", extraParams);
}

export function buildLogoPlacementWizardRoute(extraParams?: Record<string, string>): string {
  return buildCharacterStudioFlowHref("logo_placement", extraParams);
}
