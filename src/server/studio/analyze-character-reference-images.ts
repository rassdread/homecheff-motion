import { classifyOpenAiApiFailure, OcrProviderError } from "@/lib/ocr-provider-errors";
import {
  noteOpenAiRateLimitFailure,
  runOpenAiGated,
} from "@/server/openai/openai-request-gate";
import type {
  CharacterIdentityImagePrefillInput,
  CharacterReferenceImageAnalysis,
  CharacterReferenceImageRole,
} from "@/types/studio-character-identity-image-prefill";

const ROLE_LABELS: Record<CharacterReferenceImageRole, string> = {
  primary: "Primary reference (main character)",
  reference: "Extra reference angle",
  closeup: "Close-up (face/expression)",
  outfit: "Outfit or detail reference",
  style: "Style reference",
};

type OpenAiExtractionJson = CharacterReferenceImageAnalysis;

function buildImageContent(
  input: CharacterIdentityImagePrefillInput
): Array<{ type: string; text?: string; image_url?: { url: string } }> {
  const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    {
      type: "text",
      text: `Analyze these character reference images for a video production identity profile.
User description: ${input.userDescription?.trim() || "(none)"}
Intended usage: ${input.intendedUsage?.trim() || "(none)"}
Return JSON only with these fields (use empty string when unknown):
{
  "name": "suggested character name",
  "role": "narrator|host|mascot|hero|sidekick|etc",
  "characterType": "human|mascot|animal|robot|avatar|object_character|etc",
  "visualStyle": "cartoon style description or preset hint",
  "shapeLanguage": "rounded|compact|expressive|etc",
  "energy": "calm|friendly|energetic|etc",
  "personality": "short personality traits",
  "clothing": "outfit description",
  "accessories": "visible accessories",
  "colorTheme": "dominant colors or palette name",
  "colorNotes": "specific hex or color names",
  "appearanceMemory": "stable visual traits to remember across scenes",
  "forbiddenElements": "elements to avoid in future renders",
  "usageContext": "where this character fits",
  "voiceDirection": "suggested voice tone, age, accent — not a specific provider id",
  "confidence": 0.0-1.0,
  "safetyNotes": ["copyright/brand/real-person warnings if any"]
}
Do not invent brand names. Flag real-person likeness or trademark risk in safetyNotes.`,
    },
  ];

  input.imageUrls.slice(0, 5).forEach((url, index) => {
    const role = input.imageRoles?.[index] ?? (index === 0 ? "primary" : "reference");
    parts.push({
      type: "text",
      text: `Image ${index + 1} (${ROLE_LABELS[role]}):`,
    });
    parts.push({ type: "image_url", image_url: { url } });
  });

  return parts;
}

/** OpenAI Vision extraction for character reference images. */
export async function analyzeCharacterReferenceImagesWithOpenAi(
  input: CharacterIdentityImagePrefillInput,
  apiKey: string
): Promise<CharacterReferenceImageAnalysis> {
  return runOpenAiGated(() => analyzeCharacterReferenceImagesWithOpenAiInner(input, apiKey));
}

async function analyzeCharacterReferenceImagesWithOpenAiInner(
  input: CharacterIdentityImagePrefillInput,
  apiKey: string
): Promise<CharacterReferenceImageAnalysis> {
  if (!input.imageUrls.length) {
    throw new Error("At least one reference image URL is required.");
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
            "You extract reusable character identity fields from reference images for animation production. Return valid JSON only.",
        },
        {
          role: "user",
          content: buildImageContent(input),
        },
      ],
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok) {
    const msg = body.error?.message ?? `OpenAI character identity vision failed (${res.status}).`;
    const code = classifyOpenAiApiFailure(res.status, msg);
    const err = new OcrProviderError(code, msg, "openai_character_identity");
    noteOpenAiRateLimitFailure(err);
    throw err;
  }

  try {
    return JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as OpenAiExtractionJson;
  } catch {
    throw new Error("OpenAI character identity vision returned invalid JSON.");
  }
}
