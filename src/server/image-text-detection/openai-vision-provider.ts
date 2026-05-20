import { randomUUID } from "node:crypto";
import {
  inferBlockType,
  normalizeBbox,
  suggestAlignForBbox,
  suggestFontSizeForBbox,
  type DetectedTextBlock,
} from "@/lib/baked-text-detection";
import { OCR_OPENAI_TIMEOUT_MS } from "@/lib/instant-ocr-scan";
import { classifyOpenAiApiFailure, OcrProviderError } from "@/lib/ocr-provider-errors";
import {
  noteOpenAiRateLimitFailure,
  runOpenAiGated,
} from "@/server/openai/openai-request-gate";
import { logOcrPerf } from "@/lib/ocr-performance-log";
import type {
  ImageTextDetectionOptions,
  ImageTextDetectionProvider,
  ImageTextDetectionResult,
} from "@/server/image-text-detection/types";

type OpenAiBlock = {
  text?: string;
  confidence?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  language?: string;
};

const FAST_SYSTEM =
  'Return JSON only: {"imageWidth":number,"imageHeight":number,"blocks":[{"text":string,"confidence":number,"x":number,"y":number,"width":number,"height":number}]} . Normalized 0-1 boxes. UI/sign/caption text ≥2 chars. Skip noise.';

const FULL_SYSTEM =
  'Return JSON: {"imageWidth", "imageHeight", "blocks":[{"text","confidence","x","y","width","height","language"}]} . Normalized 0-1 top-left boxes. UI labels and readable copy ≥2 chars.';

export function createOpenAiVisionTextDetectionProvider(apiKey: string): ImageTextDetectionProvider {
  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";

  return {
    id: "openai_vision",
    async detectTextBlocks(
      inputImageUrl: string,
      options?: ImageTextDetectionOptions
    ): Promise<ImageTextDetectionResult> {
      const mode = options?.mode ?? "fast";
      const started = Date.now();
      const signal =
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(OCR_OPENAI_TIMEOUT_MS)
          : undefined;

      return runOpenAiGated(async () => {
      let res: Response;
      try {
        res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal,
          body: JSON.stringify({
            model,
            temperature: 0,
            max_tokens: mode === "fast" ? 900 : 1400,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: mode === "fast" ? FAST_SYSTEM : FULL_SYSTEM,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: mode === "fast" ? "Detect text blocks." : "Detect all text blocks." },
                  {
                    type: "image_url",
                    image_url: {
                      url: inputImageUrl,
                      detail: mode === "fast" ? "low" : "auto",
                    },
                  },
                ],
              },
            ],
          }),
        });
      } catch (error) {
        const name = error instanceof Error ? error.name : "";
        if (name === "AbortError" || name === "TimeoutError") {
          logOcrPerf("openai-timeout", { mode, durationMs: Date.now() - started });
          throw new OcrProviderError("OPENAI_TIMEOUT", "OpenAI vision OCR timed out.", "openai_vision");
        }
        throw error;
      }

      const openAiMs = Date.now() - started;
      logOcrPerf("openai-response", { mode, status: res.status, openAiMs });

      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
      };
      if (!res.ok) {
        const msg = body.error?.message ?? `OpenAI vision OCR failed (${res.status}).`;
        const err = new OcrProviderError(classifyOpenAiApiFailure(res.status, msg), msg, "openai_vision");
        noteOpenAiRateLimitFailure(err);
        throw err;
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

      logOcrPerf("openai-parsed", { mode, blockCount: blocks.length, openAiMs });

      return { provider: "openai_vision", blocks, imageWidth, imageHeight };
      });
    },
  };
}
