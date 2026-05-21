/**
 * Translate language text layers via OpenAI (optional — manual overrides supported).
 */

import type { LanguageExportCode } from "@/lib/video-language-export";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";

const TARGET_LANGUAGE_NAMES: Record<string, string> = {
  nl: "Dutch",
  en: "English",
  es: "Spanish",
  fr: "French",
  ar: "Arabic",
};

export type TranslateLanguageTextResult = {
  layers: LanguageTextLayerRecord[];
  provider: string;
  translationCostEstimate: number;
  translationFailed?: boolean;
  translationError?: string;
};

export async function translateLanguageTextLayers(params: {
  layers: LanguageTextLayerRecord[];
  targetLanguage: LanguageExportCode;
}): Promise<TranslateLanguageTextResult> {
  const { layers, targetLanguage } = params;
  if (targetLanguage === "original" || layers.length === 0) {
    return {
      layers: layers.map((l) => ({ ...l, translatedText: l.sourceText })),
      provider: "none",
      translationCostEstimate: 0,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const targetName = TARGET_LANGUAGE_NAMES[targetLanguage];
  if (!apiKey || !targetName) {
    return {
      layers: layers.map((l) => ({ ...l, translatedText: l.sourceText })),
      provider: "manual_fallback",
      translationCostEstimate: 0,
      translationFailed: true,
      translationError: apiKey
        ? "Unsupported target language."
        : "OPENAI_API_KEY is not configured.",
    };
  }

  const payload = layers.map((l) => ({ id: l.id, text: l.sourceText }));
  const system = `You translate on-screen marketing text for video overlays. Target language: ${targetName}. For Arabic use natural RTL phrasing. Preserve meaning, keep similar length when possible, no extra quotes. Return JSON array: [{\"id\":\"...\",\"text\":\"...\"}].`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TRANSLATE_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify({ strings: payload }),
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const message = `Translation failed (${res.status}): ${errText.slice(0, 400)}`;
    return {
      layers: layers.map((l) => ({ ...l, translatedText: l.sourceText })),
      provider: "manual_fallback",
      translationCostEstimate: 0,
      translationFailed: true,
      translationError: message,
    };
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  const content = json.choices?.[0]?.message?.content?.trim() ?? "{}";
  let parsed: { strings?: Array<{ id: string; text: string }> } = {};
  try {
    parsed = JSON.parse(content) as typeof parsed;
  } catch {
    return {
      layers: layers.map((l) => ({ ...l, translatedText: l.sourceText })),
      provider: "manual_fallback",
      translationCostEstimate: 0,
      translationFailed: true,
      translationError: "Translation response was not valid JSON.",
    };
  }
  const translatedById = new Map(
    (parsed.strings ?? []).map((row) => [row.id, row.text?.trim() ?? ""])
  );

  const merged = layers.map((layer) => ({
    ...layer,
    translatedText: translatedById.get(layer.id) || layer.sourceText,
  }));

  const tokens = json.usage?.total_tokens ?? 0;
  return {
    layers: merged,
    provider: "openai",
    translationCostEstimate: tokens > 0 ? tokens * 0.000002 : 0.001,
  };
}
