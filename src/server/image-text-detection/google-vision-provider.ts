import { randomUUID } from "node:crypto";
import {
  bboxFromVertices,
  inferBlockType,
  suggestAlignForBbox,
  suggestFontSizeForBbox,
  type DetectedTextBlock,
} from "@/lib/baked-text-detection";
import type { ImageTextDetectionProvider, ImageTextDetectionResult } from "@/server/image-text-detection/types";

type VisionVertex = { x?: number; y?: number };
type VisionAnnotation = {
  description?: string;
  locale?: string;
  boundingPoly?: { vertices?: VisionVertex[] };
};
type VisionResponse = {
  responses?: Array<{
    fullTextAnnotation?: { pages?: unknown[] };
    textAnnotations?: VisionAnnotation[];
    error?: { message?: string };
  }>;
};

async function fetchImageBase64(url: string): Promise<{ base64: string; width: number; height: number }> {
  const sharp = (await import("sharp")).default;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not fetch image for OCR (${res.status}).`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 720;
  const height = meta.height ?? 1280;
  const jpeg = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  return { base64: jpeg.toString("base64"), width, height };
}

function mapLocale(locale: string | undefined): DetectedTextBlock["language"] | undefined {
  if (!locale) {
    return undefined;
  }
  const l = locale.toLowerCase();
  if (l.startsWith("nl")) {
    return "nl";
  }
  if (l.startsWith("en")) {
    return "en";
  }
  if (l.startsWith("sr")) {
    return "sr";
  }
  return "auto";
}

export function createGoogleVisionTextDetectionProvider(apiKey: string): ImageTextDetectionProvider {
  return {
    id: "google_vision",
    async detectTextBlocks(
      inputImageUrl: string,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- options reserved for OpenAI parity
      _options?: import("@/server/image-text-detection/types").ImageTextDetectionOptions
    ): Promise<ImageTextDetectionResult> {
      const { base64, width, height } = await fetchImageBase64(inputImageUrl);
      const res = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                image: { content: base64 },
                features: [{ type: "TEXT_DETECTION" }],
              },
            ],
          }),
        }
      );
      const body = (await res.json().catch(() => ({}))) as VisionResponse;
      if (!res.ok) {
        const msg = body.responses?.[0]?.error?.message ?? `Google Vision OCR failed (${res.status}).`;
        throw new Error(msg);
      }

      const annotations = body.responses?.[0]?.textAnnotations ?? [];
      const blocks: DetectedTextBlock[] = [];
      const locale = annotations[0]?.locale;

      for (let i = 1; i < annotations.length; i += 1) {
        const ann = annotations[i];
        const text = ann.description?.trim() ?? "";
        if (!text || text.length < 2) {
          continue;
        }
        const vertices = (ann.boundingPoly?.vertices ?? [])
          .filter((v): v is { x: number; y: number } => typeof v.x === "number" && typeof v.y === "number")
          .map((v) => ({ x: v.x ?? 0, y: v.y ?? 0 }));
        const bbox = bboxFromVertices(vertices, width, height);
        if (!bbox) {
          continue;
        }
        const blockType = inferBlockType(text, bbox);
        blocks.push({
          id: randomUUID(),
          text,
          confidence: 0.88,
          bbox,
          suggestedFontSize: suggestFontSizeForBbox(bbox, height),
          suggestedAlign: suggestAlignForBbox(bbox),
          language: mapLocale(locale),
          blockType,
        });
      }

      return { provider: "google_vision", blocks, imageWidth: width, imageHeight: height };
    },
  };
}
