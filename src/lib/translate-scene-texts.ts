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
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ar: "Arabic",
};

export const PROTECTED_BRAND_LITERALS = [
  "HomeCheff",
  "HomeGarden",
  "HomeDesigner",
  "HCP",
  "Rotterdam",
  "Paramaribo",
] as const;

const URL_PATTERN = /\bhttps?:\/\/[^\s]+|www\.[^\s]+/gi;

type TranslatableField = {
  sceneIndex: number;
  field:
    | "heroText"
    | "title"
    | "subtitle"
    | "headlineBeat"
    | "titleBeat"
    | "subtitleBeat"
    | "heroTextBeat"
    | "finaleTextBeat"
    | "heroFinaleText"
    | "finaleFooter"
    | "line"
    | "accentWord"
    | "extraLine";
  lineIndex?: number;
  extraIndex?: number;
  accentIndex?: number;
  beatIndex?: number;
  text: string;
};

export function collectTranslatableFields(scenes: InstantSceneText[]): TranslatableField[] {
  const out: TranslatableField[] = [];
  scenes.forEach((raw, sceneIndex) => {
    const scene = normalizeSceneText(raw);
    if (scene.headlineBeats.length > 1) {
      scene.headlineBeats.forEach((text, beatIndex) => {
        if (text.trim()) {
          out.push({ sceneIndex, field: "headlineBeat", beatIndex, text });
        }
      });
    } else if (scene.heroText.trim()) {
      out.push({ sceneIndex, field: "heroText", text: scene.heroText });
    }
    if (scene.titleBeats.length > 1) {
      scene.titleBeats.forEach((text, beatIndex) => {
        if (text.trim()) {
          out.push({ sceneIndex, field: "titleBeat", beatIndex, text });
        }
      });
    } else if (scene.title.trim()) {
      out.push({ sceneIndex, field: "title", text: scene.title });
    }
    if (scene.subtitleBeats.length > 1) {
      scene.subtitleBeats.forEach((text, beatIndex) => {
        if (text.trim()) {
          out.push({ sceneIndex, field: "subtitleBeat", beatIndex, text });
        }
      });
    } else if (scene.subtitle.trim()) {
      out.push({ sceneIndex, field: "subtitle", text: scene.subtitle });
    }
    if (scene.heroTextBeats.length > 1) {
      scene.heroTextBeats.forEach((text, beatIndex) => {
        if (text.trim()) {
          out.push({ sceneIndex, field: "heroTextBeat", beatIndex, text });
        }
      });
    }
    scene.extraLines.forEach((line, extraIndex) => {
      if (line.trim()) {
        out.push({ sceneIndex, field: "extraLine", extraIndex, text: line });
      }
    });
    if (scene.heroFinaleText.trim() && scene.finaleTextBeats.length <= 1) {
      out.push({ sceneIndex, field: "heroFinaleText", text: scene.heroFinaleText });
    }
    if (scene.finaleTextBeats.length > 1) {
      scene.finaleTextBeats.forEach((text, beatIndex) => {
        if (text.trim()) {
          out.push({ sceneIndex, field: "finaleTextBeat", beatIndex, text });
        }
      });
    }
    if (scene.finaleFooter.trim()) {
      out.push({ sceneIndex, field: "finaleFooter", text: scene.finaleFooter });
    }
    scene.lines.forEach((line, lineIndex) => {
      if (line.text.trim()) {
        out.push({ sceneIndex, field: "line", lineIndex, text: line.text });
      }
    });
    scene.accentWords.forEach((word, accentIndex) => {
      if (word.trim()) {
        out.push({ sceneIndex, field: "accentWord", accentIndex, text: word.trim() });
      }
    });
  });
  return out;
}

export function protectProtectedLiterals(text: string): {
  protectedText: string;
  map: Map<string, string>;
} {
  let protectedText = text;
  const map = new Map<string, string>();
  let tokenIndex = 0;

  const protectToken = (literal: string) => {
    const token = `__LIT_${tokenIndex}__`;
    tokenIndex += 1;
    map.set(token, literal);
    protectedText = protectedText.split(literal).join(token);
  };

  PROTECTED_BRAND_LITERALS.forEach((brand) => {
    if (protectedText.includes(brand)) {
      protectToken(brand);
    }
  });

  const urls = protectedText.match(URL_PATTERN) ?? [];
  for (const url of urls) {
    if (protectedText.includes(url)) {
      protectToken(url);
    }
  }

  return { protectedText, map };
}

export function restoreProtectedLiterals(text: string, map: Map<string, string>): string {
  let out = text;
  for (const [token, literal] of map) {
    out = out.split(token).join(literal);
  }
  return out;
}

export function applySceneTextTranslations(params: {
  base: InstantSceneText[];
  fields: TranslatableField[];
  translated: Array<{ id: number; text: string }>;
}): InstantSceneText[] {
  const out: InstantSceneText[] = params.base.map((scene) => {
    const normalized = normalizeSceneText(scene);
    return {
      template: normalized.template,
      heroText: normalized.heroText,
      title: normalized.title,
      subtitle: normalized.subtitle,
      headlineBeats: [...normalized.headlineBeats],
      titleBeats: [...normalized.titleBeats],
      subtitleBeats: [...normalized.subtitleBeats],
      heroTextBeats: [...normalized.heroTextBeats],
      finaleTextBeats: [...normalized.finaleTextBeats],
      extraLines: [...normalized.extraLines],
      heroFinale: normalized.heroFinale,
      heroFinaleText: normalized.heroFinaleText,
      finaleFooter: normalized.finaleFooter,
      accentWords: normalized.accentWords,
      lines: normalized.lines.map((l) => l.text),
      transitionDurationSeconds: normalized.transitionDurationSeconds,
      durationSeconds: normalized.durationSeconds,
    };
  });

  for (const item of params.translated) {
    const field = params.fields[item.id];
    if (!field) {
      continue;
    }
    const brandMap = protectProtectedLiterals(field.text).map;
    const text = restoreProtectedLiterals(String(item.text ?? ""), brandMap);
    const scene = out[field.sceneIndex]!;
    if (field.field === "heroText") {
      scene.heroText = text.toUpperCase();
      if (!scene.headlineBeats?.length) {
        scene.headlineBeats = [text.toUpperCase()];
      } else {
        scene.headlineBeats[0] = text.toUpperCase();
      }
    } else if (field.field === "headlineBeat" && field.beatIndex != null) {
      const beats = Array.isArray(scene.headlineBeats) ? [...scene.headlineBeats] : [];
      while (beats.length <= field.beatIndex) {
        beats.push("");
      }
      beats[field.beatIndex] = text.toUpperCase();
      scene.headlineBeats = beats.filter((line) => line.trim().length > 0);
      scene.heroText = beats[0]?.toUpperCase() ?? "";
    } else if (field.field === "title") {
      scene.title = text.toUpperCase();
      if (!scene.titleBeats?.length) {
        scene.titleBeats = [text.toUpperCase()];
      } else {
        scene.titleBeats[0] = text.toUpperCase();
      }
    } else if (field.field === "titleBeat" && field.beatIndex != null) {
      const beats = Array.isArray(scene.titleBeats) ? [...scene.titleBeats] : [];
      while (beats.length <= field.beatIndex) {
        beats.push("");
      }
      beats[field.beatIndex] = text.toUpperCase();
      scene.titleBeats = beats.filter((line) => line.trim().length > 0);
      scene.title = beats[0]?.toUpperCase() ?? "";
    } else if (field.field === "subtitle") {
      scene.subtitle = text;
      if (!scene.subtitleBeats?.length) {
        scene.subtitleBeats = [text];
      } else {
        scene.subtitleBeats[0] = text;
      }
    } else if (field.field === "subtitleBeat" && field.beatIndex != null) {
      const beats = Array.isArray(scene.subtitleBeats) ? [...scene.subtitleBeats] : [];
      while (beats.length <= field.beatIndex) {
        beats.push("");
      }
      beats[field.beatIndex] = text;
      scene.subtitleBeats = beats.filter((line) => line.trim().length > 0);
      scene.subtitle = beats[0] ?? "";
    } else if (field.field === "heroTextBeat" && field.beatIndex != null) {
      const beats = Array.isArray(scene.heroTextBeats) ? [...scene.heroTextBeats] : [];
      while (beats.length <= field.beatIndex) {
        beats.push("");
      }
      beats[field.beatIndex] = text.toUpperCase();
      scene.heroTextBeats = beats.filter((line) => line.trim().length > 0);
      scene.heroText = beats[0]?.toUpperCase() ?? "";
    } else if (field.field === "extraLine" && field.extraIndex != null) {
      const extraLines = Array.isArray(scene.extraLines) ? [...scene.extraLines] : [];
      while (extraLines.length <= field.extraIndex) {
        extraLines.push("");
      }
      extraLines[field.extraIndex] = text;
      scene.extraLines = extraLines.filter((line) => line.trim().length > 0);
    } else if (field.field === "heroFinaleText") {
      scene.heroFinaleText = text;
      if (!scene.finaleTextBeats?.length) {
        scene.finaleTextBeats = [text];
      } else {
        scene.finaleTextBeats[0] = text;
      }
    } else if (field.field === "finaleTextBeat" && field.beatIndex != null) {
      const beats = Array.isArray(scene.finaleTextBeats) ? [...scene.finaleTextBeats] : [];
      while (beats.length <= field.beatIndex) {
        beats.push("");
      }
      beats[field.beatIndex] = text;
      scene.finaleTextBeats = beats.filter((line) => line.trim().length > 0);
      scene.heroFinaleText = beats.join(" ");
    } else if (field.field === "finaleFooter") {
      scene.finaleFooter = text;
    } else if (field.field === "line" && field.lineIndex != null) {
      const lines = Array.isArray(scene.lines) ? [...scene.lines] : [];
      while (lines.length <= field.lineIndex) {
        lines.push("");
      }
      lines[field.lineIndex] = text;
      scene.lines = lines;
    } else if (field.field === "accentWord" && field.accentIndex != null) {
      const words = Array.isArray(scene.accentWords) ? [...scene.accentWords] : [];
      while (words.length <= field.accentIndex) {
        words.push("");
      }
      words[field.accentIndex] = text;
      scene.accentWords = words.filter((w) => w.trim().length > 0);
    }
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
    const { protectedText } = protectProtectedLiterals(f.text);
    return { id, text: protectedText };
  });

  const system = `You translate on-screen marketing text for short-form video overlays. Target language: ${targetName}.
Preserve meaning, punctuation, and line intent. Keep similar length and punchy marketing tone.
Preserve capitalization style where possible (ALL CAPS headlines stay ALL CAPS in the target language).
Do not translate placeholder tokens like __LIT_0__. Do not translate brand names or URLs.
Return JSON: {"strings":[{"id":0,"text":"..."}]}.`;

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

  return {
    sceneTexts: applySceneTextTranslations({ base, fields, translated }),
    provider: "openai",
  };
}

export function parseSceneTextsJson(raw: unknown): InstantSceneText[] {
  return parseInstantSceneTexts(raw).map((scene) => ({
    template: scene.template,
    heroText: scene.heroText || undefined,
    title: scene.title || undefined,
    subtitle: scene.subtitle || undefined,
    extraLines: scene.extraLines.length > 0 ? scene.extraLines : undefined,
    heroFinale: scene.heroFinale,
    heroFinaleText: scene.heroFinaleText || undefined,
    finaleFooter: scene.finaleFooter || undefined,
    accentWords: scene.accentWords,
    lines: scene.lines.map((l) => l.text),
    transitionDurationSeconds: scene.transitionDurationSeconds,
    durationSeconds: scene.durationSeconds,
  }));
}
