import { classifyOpenAiApiFailure, OcrProviderError } from "@/lib/ocr-provider-errors";
import {
  noteOpenAiRateLimitFailure,
  runOpenAiGated,
} from "@/server/openai/openai-request-gate";
import type { AssetReferenceVisionJson } from "@/types/studio-asset-vision-analysis";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export type AssetReferenceVisionInput = {
  imageUrl: string;
  sourceKind: StudioAssetKind;
  sourceName: string;
  userDescription?: string;
};

function buildVisionPrompt(input: AssetReferenceVisionInput): string {
  return `Analyze this reference image for a creative asset studio (characters, props, packaging, locations, logos, illustrations).

Source context: ${input.sourceKind} — "${input.sourceName}".
${input.userDescription?.trim() ? `User note: ${input.userDescription.trim()}` : ""}

Return JSON only:
{
  "objectType": "one of: Character, Mascot, Human, Animal, Food Item, Product, Packaging, Vehicle, Tool, Building, Location, Environment, Logo, Brand Asset, Illustration, UI Asset, Unknown",
  "visualStyle": "e.g. Flat Cartoon, 3D Cartoon, Storybook, Cinematic, Realistic, Corporate Brand, Minimalist, Illustration, Mixed",
  "colors": [
    { "label": "color name", "hex": "#RRGGBB if estimable", "role": "primary|secondary|accent|other" }
  ],
  "shapeLanguage": ["Rounded", "Friendly", "Premium", "Playful", "Geometric", "Organic", "etc"],
  "keyFeatures": ["list 3-8 distinctive visual elements visible in the image"],
  "brandIdentity": "e.g. HomeCheff Globe Mascot — use visible brand/name; infer mascot family name from distinctive features when logo/text visible; never 'Unknown' when clear brand markers exist",
  "materialHints": "materials if relevant (props/packaging)",
  "environmentHints": "environment/architecture/mood if location",
  "architectureHints": "",
  "moodHints": "",
  "logoSymbolism": "",
  "suggestedPreserve": ["specific elements to preserve for this object type"],
  "suggestedChange": ["specific elements safe to change for this object type"],
  "suggestedForbidden": ["specific breaks to avoid — e.g. style break, color break, face change, logo removal, layout break"],
  "confidence": 0.0-1.0,
  "assetFamily": "e.g. HomeCheff Mascots — group related variants under one family",
  "characterLineage": "Primary Mascot | Role Variant | Edition Variant",
  "brandRecognitionConfidence": 0.0-1.0,
  "faceStructure": "face/head structure if character-like",
  "outlineStyle": "line/outline style e.g. flat vector, bold outline",
  "proportions": "body/head proportions e.g. friendly round, compact mascot",
  "silhouette": "distinctive silhouette description",
  "accessoryPattern": "recurring accessories or identity markers",
  "safetyNotes": ["copyright/trademark/real-person warnings if any"]
}

Transformation guidance by object type:
- Character/Mascot: preserve face, colors, brand identity, shape language; change outfit, role, accessories, environment; forbid style/color/face breaks.
- Packaging: preserve logo, branding, shape; change edition, format, context; forbid logo removal and brand break.
- Logo: preserve symbol, brand colors, identity; change presentation, 3D version, dark variant; forbid symbol/color/identity breaks.
- Location: preserve architecture, layout; change season, time of day, mood; forbid layout/architecture breaks.

Be specific about what you see. Do not invent brand names unless clearly visible.`;
}

/** Universal OpenAI Vision analysis for any asset reference image. */
export async function analyzeAssetReferenceVisionWithOpenAi(
  input: AssetReferenceVisionInput,
  apiKey: string
): Promise<AssetReferenceVisionJson> {
  return runOpenAiGated(() => analyzeAssetReferenceVisionWithOpenAiInner(input, apiKey));
}

async function analyzeAssetReferenceVisionWithOpenAiInner(
  input: AssetReferenceVisionInput,
  apiKey: string
): Promise<AssetReferenceVisionJson> {
  const imageUrl = input.imageUrl.trim();
  if (!imageUrl) {
    throw new Error("Reference image URL is required.");
  }

  const model =
    process.env.OPENAI_CHARACTER_IDENTITY_MODEL?.trim() ||
    process.env.OPENAI_VISION_MODEL?.trim() ||
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
          role: "system",
          content:
            "You analyze reference images for a video production asset library. Identify object type, visual style, colors, shape language, key features, and brand identity. Return valid JSON only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: buildVisionPrompt(input) },
            { type: "image_url", image_url: { url: imageUrl } },
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
    const msg = body.error?.message ?? `OpenAI asset vision failed (${res.status}).`;
    const code = classifyOpenAiApiFailure(res.status, msg);
    const err = new OcrProviderError(code, msg, "openai_asset_vision");
    if (code === "OPENAI_RATE_LIMITED") {
      noteOpenAiRateLimitFailure(err);
    }
    throw err;
  }

  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI asset vision returned empty content.");
  }

  try {
    return JSON.parse(content) as AssetReferenceVisionJson;
  } catch {
    throw new Error("OpenAI asset vision returned invalid JSON.");
  }
}

export function resolveAssetVisionModel(): string {
  return (
    process.env.OPENAI_CHARACTER_IDENTITY_MODEL?.trim() ||
    process.env.OPENAI_VISION_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}
