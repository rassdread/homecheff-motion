/**
 * Translate Story Mode sceneTexts for language export versions.
 */

import type { LanguageExportCode } from "@/lib/video-language-export";
import type { InstantSceneText } from "@/lib/story-overlay-templates";
import { normalizeSceneText, parseInstantSceneTexts } from "@/lib/story-overlay-templates";

const TARGET_LANGUAGE_NAMES: Record<string, string> = {
  nl: "Dutch",
  en: "English",
  es: "Spanish",
  fr: "French",
  ar: "Arabic",
};

const BRAND_TOKENS = ["HomeCheff", "HomeGarden", "HomeDesigner", "HCP"] as const;

type TranslatableField = {
  sceneIndex: number;
  field: "heroText" | "title" | "subtitle" | "heroFinaleText" | "line";
  lineIndex?: number;
  text: string;
};

function collectTranslatableFields(scenes: InstantSceneText[]): TranslatableField[] {
  const out: TranslatableField[] = [];
  scenes.forEach((raw, sceneIndex) => {
    const scene = normalizeSceneText(raw);
    if (scene.heroText.trim()) {
      out.push({ sceneIndex, field: "heroText", text: scene.heroText });
    }
    if (scene.title.trim()) {
      out.push({ sceneIndex, field: "title", text: scene.title });
    }
    if (scene.subtitle.trim()) {
      out.push({ sceneIndex, field: "subtitle", text: scene.subtitle });
    }
    if (scene.heroFinaleText.trim()) {
      out.push({ sceneIndex, field: "heroFinaleText", text: scene.heroFinaleText });
    }
    scene.lines.forEach((line, lineIndex) => {
      if (line.text.trim()) {
        out.push({ sceneIndex, field: "line", lineIndex, text: line.text });
      }
    });
  });
  return out;
}

function protectBrands(text: string): { protectedText: string; map: Map<string, string> } {
  let protectedText = text;
  const map = new Map<string, string>();
  BRAND_TOKENS.forEach((brand, index) => {
    const token = `__BRAND_${index}__`;
    if (protectedText.includes(brand)) {
      map.set(token, brand);
      protectedText = protectedText.split(brand).join(token);
    }
  });
  return { protectedText, map };
}

function restoreBrands(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [token, brand] of map) {
    out = out.split(token).join(brand);
  }
  return out;
}

export type TranslateSceneTextsResult = {
  sceneTexts: InstantSceneText[];
  provider: string;
  translationFailed?: boolean;
  translationError?: string;
};

export async function translateSceneTexts(params: {
  sceneTexts: InstantSceneText[];
  targetLanguage: LanguageExportCode;
}): Promise<TranslateSceneTextsResult> {
  const base = params.sceneTexts.map((s) => normalizeSceneText(s));
  if (params.targetLanguage === "original" || base.length === 0) {
    return { sceneTexts: base, provider: "none" };
  }

  const fields = collectTranslatableFields(base);
  if (fields.length === 0) {
    return { sceneTexts: base, provider: "none" };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const targetName = TARGET_LANGUAGE_NAMES[params.targetLanguage];
  if (!apiKey || !targetName) {
    return {
      sceneTexts: base,
      provider: "manual_fallback",
      translationFailed: true,
      translationError: apiKey
        ? "Unsupported target language."
        : "OPENAI_API_KEY is not configured.",
    };
  }

  const payload = fields.map((f, id) => {
    const { protectedText } = protectBrands(f.text);
    return { id, text: protectedText };
  });

  const system = `You translate on-screen marketing text for video overlays. Target language: ${targetName}. Preserve meaning and similar length. Do not translate placeholder tokens like __BRAND_0__. Return JSON: {"strings":[{"id":0,"text":"..."}]}.`;

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
        { role: "user", content: JSON.stringify({ strings: payload }) },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      sceneTexts: base,
      provider: "manual_fallback",
      translationFailed: true,
      translationError: `Translation failed (${res.status}): ${errText.slice(0, 400)}`,
    };
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim() ?? "";
  let translated: Array<{ id: number; text: string }> = [];
  try {
    const parsed = JSON.parse(content) as { strings?: Array<{ id: number; text: string }> };
    translated = parsed.strings ?? [];
  } catch {
    return {
      sceneTexts: base,
      provider: "manual_fallback",
      translationFailed: true,
      translationError: "Translation response was not valid JSON.",
    };
  }

  const out: InstantSceneText[] = base.map((scene) => ({
    template: scene.template,
    heroText: scene.heroText,
    title: scene.title,
    subtitle: scene.subtitle,
    heroFinale: scene.heroFinale,
    heroFinaleText: scene.heroFinaleText,
    accentWords: scene.accentWords,
    lines: scene.lines.map((l) => l.text),
    transitionDurationSeconds: scene.transitionDurationSeconds,
    durationSeconds: scene.durationSeconds,
  }));

  for (const item of translated) {
    const field = fields[item.id];
    if (!field) {
      continue;
    }
    const brandMap = protectBrands(field.text).map;
    const text = restoreBrands(String(item.text ?? ""), brandMap);
    const scene = out[field.sceneIndex]!;
    if (field.field === "heroText") {
      scene.heroText = text.toUpperCase();
    } else if (field.field === "title") {
      scene.title = text.toUpperCase();
    } else if (field.field === "subtitle") {
      scene.subtitle = text;
    } else if (field.field === "heroFinaleText") {
      scene.heroFinaleText = text;
    } else if (field.field === "line" && field.lineIndex != null) {
      const lines = Array.isArray(scene.lines) ? [...scene.lines] : [];
      while (lines.length <= field.lineIndex) {
        lines.push("");
      }
      lines[field.lineIndex] = text;
      scene.lines = lines;
    }
  }

  return { sceneTexts: out, provider: "openai" };
}

export function parseSceneTextsJson(raw: unknown): InstantSceneText[] {
  return parseInstantSceneTexts(raw).map((scene) => ({
    template: scene.template,
    heroText: scene.heroText || undefined,
    title: scene.title || undefined,
    subtitle: scene.subtitle || undefined,
    heroFinale: scene.heroFinale,
    heroFinaleText: scene.heroFinaleText || undefined,
    accentWords: scene.accentWords,
    lines: scene.lines.map((l) => l.text),
    transitionDurationSeconds: scene.transitionDurationSeconds,
    durationSeconds: scene.durationSeconds,
  }));
}
