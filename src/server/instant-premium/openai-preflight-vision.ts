import { classifyOpenAiApiFailure, OcrProviderError } from "@/lib/ocr-provider-errors";
import {
  noteOpenAiRateLimitFailure,
  runOpenAiGated,
} from "@/server/openai/openai-request-gate";

export type ImageTextRiskLevel = "none" | "low" | "medium" | "high";

export type ImagePreflightVisionAssessment = {
  hasReadableText: boolean;
  hasPhoneOrUiText: boolean;
  hasLogoOrBrandText: boolean;
  estimatedTextBlockCount: number;
  distortionRisk: ImageTextRiskLevel;
  summary: string;
};

type OpenAiPreflightJson = {
  hasReadableText?: boolean;
  hasPhoneOrUiText?: boolean;
  hasLogoOrBrandText?: boolean;
  estimatedTextBlockCount?: number;
  distortionRisk?: string;
  summary?: string;
};

function normalizeRisk(value: string | undefined): ImageTextRiskLevel {
  const v = value?.trim().toLowerCase();
  if (v === "none" || v === "low" || v === "medium" || v === "high") {
    return v;
  }
  return "medium";
}

/** OpenAI Vision risk scan for baked-in / UI / logo text before paid Vidu render. */
export async function assessImageTextRiskWithOpenAi(
  imageUrl: string,
  apiKey: string
): Promise<ImagePreflightVisionAssessment> {
  return runOpenAiGated(() => assessImageTextRiskWithOpenAiInner(imageUrl, apiKey));
}

async function assessImageTextRiskWithOpenAiInner(
  imageUrl: string,
  apiKey: string
): Promise<ImagePreflightVisionAssessment> {
  const model = process.env.OPENAI_PREFLIGHT_MODEL?.trim() || process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You assess text-distortion risk for AI image-to-video generation.
Return JSON only:
{
  "hasReadableText": boolean,
  "hasPhoneOrUiText": boolean (screens, app UI, buttons, status bar),
  "hasLogoOrBrandText": boolean,
  "estimatedTextBlockCount": number,
  "distortionRisk": "none"|"low"|"medium"|"high",
  "summary": "one short sentence"
}
High risk when readable marketing copy, menus, phone UI, logos, or captions are visible and would be animated by the video model.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Inspect this image for readable text that Vidu might distort. Be conservative: if unsure, mark hasReadableText true.",
            },
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
    const msg = body.error?.message ?? `OpenAI preflight vision failed (${res.status}).`;
    const code = classifyOpenAiApiFailure(res.status, msg);
    const err = new OcrProviderError(code, msg, "openai_preflight");
    noteOpenAiRateLimitFailure(err);
    throw err;
  }

  let parsed: OpenAiPreflightJson = {};
  try {
    parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as OpenAiPreflightJson;
  } catch {
    throw new Error("OpenAI preflight returned invalid JSON.");
  }

  return {
    hasReadableText: parsed.hasReadableText === true,
    hasPhoneOrUiText: parsed.hasPhoneOrUiText === true,
    hasLogoOrBrandText: parsed.hasLogoOrBrandText === true,
    estimatedTextBlockCount:
      typeof parsed.estimatedTextBlockCount === "number"
        ? Math.max(0, Math.round(parsed.estimatedTextBlockCount))
        : 0,
    distortionRisk: normalizeRisk(parsed.distortionRisk),
    summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
  } as ImagePreflightVisionAssessment;
}
