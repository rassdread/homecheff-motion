import type { HomeCheffProductId } from "@/types/homecheff-product-suite";

export type SuiteFlowAction = {
  id: string;
  labelKey: string;
  href: string;
  productId: HomeCheffProductId;
};

export function buildEditorSaveNextActions(params: {
  sessionId: string;
  assetId?: string | null;
}): SuiteFlowAction[] {
  const editorQ = params.sessionId ? `?editorSession=${encodeURIComponent(params.sessionId)}` : "";
  const motionParams = new URLSearchParams();
  if (params.sessionId) {
    motionParams.set("editorSession", params.sessionId);
  }
  if (params.assetId) {
    motionParams.set("editorAsset", params.assetId);
  }
  const motionQ = motionParams.toString() ? `?${motionParams.toString()}` : "";
  return [
    { id: "use-studio", labelKey: "suite.flow.createVideo", href: `/studio/start${editorQ}`, productId: "studio" },
    { id: "animate-motion", labelKey: "suite.flow.continueVideo", href: `/animate/instant${motionQ}`, productId: "motion" },
    { id: "open-library", labelKey: "suite.flow.openLibrary", href: params.assetId ? `/studio/assets/creative/characters/${params.assetId}` : "/studio/assets", productId: "assets" },
    { id: "download", labelKey: "suite.flow.download", href: `/editor${editorQ}`, productId: "editor" },
  ];
}

export function buildMotionRenderNextActions(params: {
  projectId: string;
  videoUrl?: string;
  hcProjectId?: string;
}): SuiteFlowAction[] {
  const publishHref = params.hcProjectId
    ? `/publish/start?hcProject=${encodeURIComponent(params.hcProjectId)}`
    : params.videoUrl
      ? `/publish?video=${encodeURIComponent(params.videoUrl)}&motion=${encodeURIComponent(params.projectId)}`
      : `/publish?motion=${encodeURIComponent(params.projectId)}`;
  return [
    { id: "open-publish", labelKey: "suite.flow.finishVideo", href: publishHref, productId: "presentation" },
    { id: "download", labelKey: "suite.flow.download", href: `/videos/${encodeURIComponent(params.projectId)}`, productId: "motion" },
    { id: "save-library", labelKey: "suite.flow.saveToLibrary", href: "/studio/assets/media/videos", productId: "assets" },
  ];
}

export function buildPublishExportNextActions(params: { projectId: string }): SuiteFlowAction[] {
  return [
    { id: "download", labelKey: "suite.flow.download", href: `/publish?project=${encodeURIComponent(params.projectId)}`, productId: "presentation" },
    { id: "save-library", labelKey: "suite.flow.saveToLibrary", href: "/studio/assets/media/videos", productId: "assets" },
  ];
}

export const SUITE_BREADCRUMB_PRODUCTS: HomeCheffProductId[] = ["editor", "studio", "motion", "presentation", "assets"];

export function resolveSuiteBreadcrumbHref(productId: HomeCheffProductId): string {
  const map: Record<HomeCheffProductId, string> = {
    editor: "/editor",
    studio: "/studio",
    motion: "/animate/instant",
    presentation: "/publish",
    assets: "/library",
  };
  return map[productId];
}

export function resolveSuiteBreadcrumbLabelKey(productId: HomeCheffProductId): string {
  const map: Record<HomeCheffProductId, string> = {
    editor: "suite.nav.editor",
    studio: "suite.nav.studio",
    motion: "suite.nav.motion",
    presentation: "suite.nav.publish",
    assets: "suite.nav.library",
  };
  return map[productId];
}
