import type { IllustrationPartAnalysisResult } from "@/types/editor-illustration-parts";
import type { EditorSemanticLayer } from "@/types/homecheff-visual-editor";

export const VISION_PARTS_API_TIMEOUT_MS = 22_000;

export async function fetchIllustrationPartsApi(input: {
  imageUrl: string;
  vision: import("@/types/studio-asset-vision-analysis").AssetVisionAnalysis;
  detections: import("@/server/animation-export/local-vision/object-detector-types").ObjectDetection[];
}): Promise<IllustrationPartAnalysisResult | null> {
  try {
    const res = await fetch("/api/editor/vision/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "include",
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      analysis?: IllustrationPartAnalysisResult;
      error?: string;
    };
    if (!res.ok || !body.analysis) {
      return null;
    }
    return body.analysis;
  } catch {
    return null;
  }
}

export async function fetchIllustrationPartsApiWithTimeout(
  input: Parameters<typeof fetchIllustrationPartsApi>[0],
  timeoutMs = VISION_PARTS_API_TIMEOUT_MS
): Promise<IllustrationPartAnalysisResult | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetchIllustrationPartsApi(input),
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function buildSemanticKeyToLayerId(
  semanticLayers: EditorSemanticLayer[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const layer of semanticLayers) {
    const match = layer.id.match(/^v6_([^_]+(?:_[^_]+)*)_\d+$/);
    if (match) {
      map.set(match[1]!, layer.id);
    }
    if (layer.id === "v6_character_root") {
      map.set("character", layer.id);
    }
    if (layer.id === "v6_prop_root") {
      map.set("globe", layer.id);
    }
  }
  return map;
}
