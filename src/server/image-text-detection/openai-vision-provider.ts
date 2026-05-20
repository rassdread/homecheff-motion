import { randomUUID } from "node:crypto";
import {
  inferBlockType,
  normalizeBbox,
  suggestAlignForBbox,
  suggestFontSizeForBbox,
  type DetectedTextBlock,
} from "@/lib/baked-text-detection";
import { OCR_DETECT_SERVER_TIMEOUT_MS } from "@/lib/instant-ocr-scan";
import type { ImageTextDetectionProvider, ImageTextDetectionResult } from "@/server/image-text-detection/types";

type OpenAiBlock = {
  text?: string;
  confidence?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  language?: string;
};

export function createOpenAiVisionTextDetectionProvider(apiKey: string): ImageTextDetectionProvider {
  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";

  return {
    id: "openai_vision",
    async detectTextBlocks(inputImageUrl: string): Promise<ImageTextDetectionResult> {
      const signal =
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(OCR_DETECT_SERVER_TIMEOUT_MS)
          : undefined;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You detect readable text blocks in images. Return JSON: { imageWidth, imageHeight, blocks: [{ text, confidence, x, y, width, height, language }] } where x,y,width,height are normalized 0-1 bounding boxes (top-left origin). Include UI labels, phone screens, signs, captions. Exclude noise under 2 chars.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Detect all text blocks." },
                { type: "image_url", image_url: { url: inputImageUrl } },
              ],
            },
          ],
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
      };
      if (!res.ok) {
        throw new Error(body.error?.message ?? `OpenAI vision OCR failed (${res.status}).`);
      }

      const content = body.choices?.[0]?.message?.content ?? "{}";
      let parsed: { imageWidth?: number; imageHeight?: number; blocks?: OpenAiBlock[] } = {};
      try {
        parsed = JSON.parse(content) as typeof parsed;
      } catch {
        throw new Error("OpenAI vision returned invalid JSON.");
      }

      const imageWidth = parsed.imageWidth ?? 720;
      const imageHeight = parsed.imageHeight ?? 1280;
      const blocks: DetectedTextBlock[] = [];

      for (const raw of parsed.blocks ?? []) {
        const text = raw.text?.trim() ?? "";
        if (!text || text.length < 2) {
          continue;
        }
        if (
          typeof raw.x !== "number" ||
          typeof raw.y !== "number" ||
          typeof raw.width !== "number" ||
          typeof raw.height !== "number"
        ) {
          continue;
        }
        const bbox = normalizeBbox({
          x: raw.x,
          y: raw.y,
          width: raw.width,
          height: raw.height,
        });
        const blockType = inferBlockType(text, bbox);
        blocks.push({
          id: randomUUID(),
          text,
          confidence: typeof raw.confidence === "number" ? raw.confidence : 0.75,
          bbox,
          suggestedFontSize: suggestFontSizeForBbox(bbox, imageHeight),
          suggestedAlign: suggestAlignForBbox(bbox),
          language:
            raw.language === "nl" || raw.language === "en" || raw.language === "sr"
              ? raw.language
              : "auto",
          blockType,
        });
      }

      return { provider: "openai_vision", blocks, imageWidth, imageHeight };
    },
  };
}
