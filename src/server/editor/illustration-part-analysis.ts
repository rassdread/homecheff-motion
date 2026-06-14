import { classifyOpenAiApiFailure, OcrProviderError } from "@/lib/ocr-provider-errors";
import {
  buildTemplateIllustrationPartAnalysis,
  mergeOpenAiIllustrationParts,
} from "@/lib/editor-vision-v6-part-analysis";
import { runOpenAiGated } from "@/server/openai/openai-request-gate";
import type {
  IllustrationPartAnalysisJson,
  IllustrationPartAnalysisResult,
} from "@/types/editor-illustration-parts";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorPartCategory } from "@/types/homecheff-visual-editor";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";

const VALID_CATEGORIES = new Set<string>([
  "head", "face", "eyes", "mouth", "outline", "torso", "jacket", "shirt", "tie",
  "arms", "hands", "left_arm", "right_arm", "left_hand", "right_hand", "pants", "shoes",
  "globe", "logo", "clothing", "legs", "shadow", "prop",
]);

function buildPartAnalysisPrompt(vision: AssetVisionAnalysis, detections: ObjectDetection[]): string {
  const detSummary =
    detections.length > 0
      ? detections.map((d) => `${d.label} (${Math.round(d.confidence * 100)}%)`).join(", ")
      : "none";

  return `Analyze this illustration/mascot/logo image for editable semantic parts.

Vision context:
- objectType: ${vision.objectType}
- visualStyle: ${vision.visualStyle}
- keyFeatures: ${vision.keyFeatures.join(", ")}
- brandIdentity: ${vision.brandIdentity}
RT-DETR detections (may be weak/generic): ${detSummary}

Return JSON only:
{
  "characterLabel": "Mascot or Character name",
  "propLabel": "World globe or null",
  "parts": [
    {
      "key": "unique_snake_key",
      "label": "Human label e.g. Head, Eyes, Tie, Shoes",
      "category": "head|face|eyes|mouth|outline|torso|jacket|shirt|tie|arms|hands|pants|shoes|globe|shadow|prop",
      "parentKey": "parent key or null",
      "group": "character|prop|background|style",
      "bbox": { "x": 0-1, "y": 0-1, "width": 0-1, "height": 0-1 },
      "confidence": 0.0-1.0,
      "editable": true
    }
  ]
}

For mascot/character illustrations include at minimum:
Head, Eyes, Mouth, Face outline, Body, Jacket, Shirt, Tie, Arms, Hands, Pants, Shoes.

If a world globe or held object is visible, add prop group with globe + ocean + continents children.

Add background group: White background, Shadow, Safe empty area.
Add style group: illustration style, line art, color palette entries (editable: false).

Use normalized 0-1 bounding boxes. Be specific to what you see.`;
}

function parseOpenAiPartAnalysis(
  json: IllustrationPartAnalysisJson,
  template: IllustrationPartAnalysisResult
): IllustrationPartAnalysisResult {
  const parts = (json.parts ?? []).map((p) => ({
    key: p.key,
    label: p.label,
    category: (VALID_CATEGORIES.has(p.category ?? "") ? p.category : "prop") as EditorPartCategory,
    parentKey: p.parentKey ?? undefined,
    group: p.group ?? "character",
    bbox: p.bbox ?? { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
    source: "openai_vision" as const,
    confidence: p.confidence ?? 0.65,
    editable: p.editable ?? true,
  }));

  if (parts.length < 4) {
    return template;
  }

  return mergeOpenAiIllustrationParts(template, {
    parts,
    characterLabel: json.characterLabel ?? template.characterLabel,
    propLabel: json.propLabel ?? template.propLabel,
    openAiUsed: true,
    templateUsed: true,
  });
}

export async function analyzeIllustrationParts(input: {
  imageUrl: string;
  vision: AssetVisionAnalysis;
  detections: ObjectDetection[];
}): Promise<IllustrationPartAnalysisResult> {
  const template = buildTemplateIllustrationPartAnalysis(input.vision);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return template;
  }

  try {
    const openAi = await runOpenAiGated(() =>
      analyzeIllustrationPartsWithOpenAiInner(input, apiKey, template)
    );
    return openAi;
  } catch {
    return template;
  }
}

async function analyzeIllustrationPartsWithOpenAiInner(
  input: { imageUrl: string; vision: AssetVisionAnalysis; detections: ObjectDetection[] },
  apiKey: string,
  template: IllustrationPartAnalysisResult
): Promise<IllustrationPartAnalysisResult> {
  const model =
    process.env.OPENAI_VISION_MODEL?.trim() ||
    process.env.OPENAI_CHARACTER_IDENTITY_MODEL?.trim() ||
    "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPartAnalysisPrompt(input.vision, input.detections) },
            { type: "image_url", image_url: { url: input.imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const msg = await res.text();
    const code = classifyOpenAiApiFailure(res.status, msg);
    throw new OcrProviderError(code, msg, "openai_illustration_parts");
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = body.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    return template;
  }

  const json = JSON.parse(raw) as IllustrationPartAnalysisJson;
  return parseOpenAiPartAnalysis(json, template);
}
