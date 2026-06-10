import type {
  EditorAssetType,
  EditorStudioReadinessReport,
  StudioAssetIntent,
  StudioAssetIntentKind,
} from "@/types/editor-asset-profile";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const STUDIO_KIND: Record<EditorAssetType, StudioAssetIntentKind> = {
  mascot: "character",
  character: "character",
  logo: "brand_element",
  brand_asset: "brand_element",
  scene: "scene",
  photo: "scene",
  product: "prop",
  food: "prop",
  plant: "prop",
  garden_asset: "location",
  poster: "scene",
  flyer: "scene",
  background: "world",
  object_collection: "prop",
  text_design: "brand_element",
  motion_asset: "prop",
};

const STUDIO_USAGE: Record<EditorAssetType, Array<{ key: string; fit: "good" | "partial" | "low" }>> = {
  mascot: [
    { key: "editor.assetIntel.studio.use.character", fit: "good" },
    { key: "editor.assetIntel.studio.use.prop", fit: "partial" },
  ],
  character: [
    { key: "editor.assetIntel.studio.use.character", fit: "good" },
    { key: "editor.assetIntel.studio.use.storyboard", fit: "partial" },
  ],
  logo: [
    { key: "editor.assetIntel.studio.use.brand", fit: "good" },
    { key: "editor.assetIntel.studio.use.prop", fit: "low" },
  ],
  scene: [
    { key: "editor.assetIntel.studio.use.scene", fit: "good" },
    { key: "editor.assetIntel.studio.use.location", fit: "good" },
  ],
  photo: [
    { key: "editor.assetIntel.studio.use.sceneRef", fit: "good" },
    { key: "editor.assetIntel.studio.use.storyboard", fit: "partial" },
  ],
  food: [
    { key: "editor.assetIntel.studio.use.prop", fit: "good" },
    { key: "editor.assetIntel.studio.use.scene", fit: "partial" },
  ],
  product: [
    { key: "editor.assetIntel.studio.use.prop", fit: "good" },
    { key: "editor.assetIntel.studio.use.brand", fit: "partial" },
  ],
  poster: [
    { key: "editor.assetIntel.studio.use.storyboard", fit: "good" },
    { key: "editor.assetIntel.studio.use.sceneRef", fit: "partial" },
  ],
  flyer: [
    { key: "editor.assetIntel.studio.use.storyboard", fit: "good" },
    { key: "editor.assetIntel.studio.use.sceneRef", fit: "partial" },
  ],
  garden_asset: [
    { key: "editor.assetIntel.studio.use.location", fit: "good" },
    { key: "editor.assetIntel.studio.use.world", fit: "partial" },
  ],
  plant: [
    { key: "editor.assetIntel.studio.use.prop", fit: "good" },
    { key: "editor.assetIntel.studio.use.location", fit: "partial" },
  ],
  brand_asset: [
    { key: "editor.assetIntel.studio.use.brand", fit: "good" },
    { key: "editor.assetIntel.studio.use.prop", fit: "low" },
  ],
  background: [
    { key: "editor.assetIntel.studio.use.world", fit: "good" },
    { key: "editor.assetIntel.studio.use.location", fit: "partial" },
  ],
  object_collection: [
    { key: "editor.assetIntel.studio.use.prop", fit: "good" },
    { key: "editor.assetIntel.studio.use.storyboard", fit: "partial" },
  ],
  text_design: [
    { key: "editor.assetIntel.studio.use.brand", fit: "good" },
    { key: "editor.assetIntel.studio.use.storyboard", fit: "partial" },
  ],
  motion_asset: [
    { key: "editor.assetIntel.studio.use.sceneRef", fit: "good" },
    { key: "editor.assetIntel.studio.use.prop", fit: "partial" },
  ],
};

const INTENT_LABEL: Record<StudioAssetIntentKind, string> = {
  character: "editor.assetIntel.studio.intent.character",
  location: "editor.assetIntel.studio.intent.location",
  scene: "editor.assetIntel.studio.intent.scene",
  world: "editor.assetIntel.studio.intent.world",
  prop: "editor.assetIntel.studio.intent.prop",
  brand_element: "editor.assetIntel.studio.intent.brand",
};

export function buildStudioReadinessReport(
  document: EditorCanvasDocument,
  assetType: EditorAssetType
): EditorStudioReadinessReport {
  const usages = STUDIO_USAGE[assetType] ?? STUDIO_USAGE.photo;
  const goodCount = usages.filter((u) => u.fit === "good").length;
  const score = Math.round((goodCount / Math.max(1, usages.length)) * 100);
  const best = usages.find((u) => u.fit === "good") ?? usages[0]!;
  return {
    score,
    labelKey:
      score >= 80
        ? "editor.assetIntel.studio.label.ready"
        : score >= 50
          ? "editor.assetIntel.studio.label.partial"
          : "editor.assetIntel.studio.label.explore",
    usages: usages.map((u) => ({ labelKey: u.key, fit: u.fit })),
    recommendedUsageKey: best.key,
  };
}

export function buildStudioAssetIntent(
  document: EditorCanvasDocument,
  assetType: EditorAssetType
): StudioAssetIntent {
  const kind = STUDIO_KIND[assetType] ?? "scene";
  const referenceUrls = [
    document.backgroundUrl,
    ...(document.importedLayers ?? []).map((l) => l.cutoutUrl ?? l.sourceImageUrl).filter(Boolean),
    ...(document.cutoutAssets ?? []).map((c) => c.cutoutUrl),
  ].filter((url, i, arr) => arr.indexOf(url) === i);
  return {
    kind,
    labelKey: INTENT_LABEL[kind],
    referenceUrls,
    editorSessionId: document.sessionId,
  };
}
