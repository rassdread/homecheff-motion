import { brand } from "@/lib/brand";
import { dropLibraryAssetOnCanvas, type LibraryDragPayload } from "@/lib/editor-v6-library-drag";
import type { EditorBrandKitItem, EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function brandKitItemHasRenderablePreview(item: EditorBrandKitItem): boolean {
  if (item.kind === "color" || item.kind === "gradient" || item.kind === "font" || item.kind === "background") {
    return true;
  }
  if (!item.previewUrl) {
    return false;
  }
  return item.previewUrl.startsWith("/") && !item.previewUrl.endsWith(".svg");
}

export function resolveVisibleBrandKitItems(items?: EditorBrandKitItem[]): EditorBrandKitItem[] {
  return (items ?? defaultHomeCheffBrandKit()).filter(brandKitItemHasRenderablePreview);
}

export function defaultHomeCheffBrandKit(): EditorBrandKitItem[] {
  return [
    {
      id: "hc_color_green",
      kind: "color",
      label: "Studio Green",
      value: brand.studioGreen,
    },
    {
      id: "hc_color_blue",
      kind: "color",
      label: "Studio Blue",
      value: brand.studioBlue,
    },
    {
      id: "hc_font_primary",
      kind: "font",
      label: "Inter",
      value: "Inter, system-ui, sans-serif",
    },
    {
      id: "hc_gradient_brand",
      kind: "gradient",
      label: "Brand Gradient",
      value: `linear-gradient(135deg, ${brand.studioGreen}, ${brand.studioBlue})`,
    },
    {
      id: "hc_bg_soft",
      kind: "background",
      label: "Soft Studio Background",
      value: "#f7fbf8",
    },
  ];
}

export function brandKitItemToInsertPayload(item: EditorBrandKitItem): LibraryDragPayload | null {
  if (!item.previewUrl && item.kind !== "color" && item.kind !== "gradient") {
    return null;
  }
  if (item.kind === "logo" || item.kind === "mascot") {
    return {
      sourceAssetId: null,
      imageUrl: item.previewUrl ?? item.value,
      label: item.label,
      kind: item.kind === "logo" ? "logo" : "mascot",
      dropPoint: { x: 0.5, y: 0.5 },
    };
  }
  return null;
}

export function insertBrandKitItemOnCanvas(
  document: EditorCanvasDocument,
  item: EditorBrandKitItem
): EditorCanvasDocument {
  const payload = brandKitItemToInsertPayload(item);
  if (!payload) {
    if (item.kind === "background" || item.kind === "gradient") {
      return {
        ...document,
        backgroundUrl: item.value.startsWith("linear") ? document.backgroundUrl : item.value,
        updatedAt: new Date().toISOString(),
      };
    }
    return document;
  }
  return dropLibraryAssetOnCanvas(document, payload);
}

export function brandKitItemsByKind(items: EditorBrandKitItem[]): Record<string, EditorBrandKitItem[]> {
  return items.reduce<Record<string, EditorBrandKitItem[]>>((acc, item) => {
    const list = acc[item.kind] ?? [];
    list.push(item);
    acc[item.kind] = list;
    return acc;
  }, {});
}
