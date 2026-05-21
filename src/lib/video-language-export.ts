/**
 * Multilingual final exports — overlay-only, no Vidu.
 */

export const MAX_LANGUAGE_EXPORTS_PER_PROJECT = 6;

export const LANGUAGE_EXPORT_CODES = [
  "original",
  "nl",
  "en",
  "es",
  "fr",
  "ar",
] as const;

export type LanguageExportCode = (typeof LANGUAGE_EXPORT_CODES)[number];

export type LanguageExportStatus =
  | "queued"
  | "rendering"
  | "completed"
  | "failed"
  | "needs_refresh";

export type LanguageTextLayerRecord = {
  id: string;
  sourceText: string;
  translatedText: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";
  animation?: string;
  startMs?: number;
  durationMs?: number;
};

export type LanguageExportAuditEvent = {
  type: "language_export";
  billingImpact: "none";
  aiCreditsUsed: 0;
  provider: "internal_text_overlay";
  translationCost?: number;
  translationProvider?: string;
  languageCode: string;
  projectId: string;
  sourceFinalVideoUrl: string;
  outputVideoUrl?: string | null;
  recordedAt: string;
  status: "started" | "completed" | "failed";
};

const LANGUAGE_LABELS: Record<LanguageExportCode, { en: string; nl: string }> = {
  original: { en: "Original", nl: "Origineel" },
  nl: { en: "Dutch", nl: "Nederlands" },
  en: { en: "English", nl: "Engels" },
  es: { en: "Spanish", nl: "Spaans" },
  fr: { en: "French", nl: "Frans" },
  ar: { en: "Arabic", nl: "Arabisch" },
};

export function isLanguageExportCode(value: string): value is LanguageExportCode {
  return (LANGUAGE_EXPORT_CODES as readonly string[]).includes(value);
}

export function languageExportLabel(code: LanguageExportCode, locale: "en" | "nl" = "en"): string {
  return LANGUAGE_LABELS[code][locale];
}

export function languageFinalBlobPathname(
  projectId: string,
  languageCode: string,
  version = 1
): string {
  const safeCode = languageCode.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "lang";
  if (version <= 1) {
    return `motion/final/${projectId}/lang/${safeCode}/final.mp4`;
  }
  return `motion/final/${projectId}/lang/${safeCode}/final-v${version}.mp4`;
}

export function parseLanguageTextLayerJson(value: unknown): LanguageTextLayerRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: LanguageTextLayerRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const sourceText = typeof o.sourceText === "string" ? o.sourceText : "";
    const translatedText =
      typeof o.translatedText === "string" ? o.translatedText : sourceText;
    if (!translatedText.trim() && !sourceText.trim()) {
      continue;
    }
    out.push({
      id: typeof o.id === "string" ? o.id : `layer-${out.length}`,
      sourceText: sourceText.trim(),
      translatedText: translatedText.trim() || sourceText.trim(),
      x: typeof o.x === "number" ? o.x : 0.5,
      y: typeof o.y === "number" ? o.y : 0.1,
      width: typeof o.width === "number" ? o.width : undefined,
      height: typeof o.height === "number" ? o.height : undefined,
      fontSize: typeof o.fontSize === "number" ? o.fontSize : undefined,
      color: typeof o.color === "string" ? o.color : undefined,
      backgroundColor: typeof o.backgroundColor === "string" ? o.backgroundColor : undefined,
      textAlign:
        o.textAlign === "left" || o.textAlign === "center" || o.textAlign === "right"
          ? o.textAlign
          : "center",
      animation: typeof o.animation === "string" ? o.animation : "none",
      startMs: typeof o.startMs === "number" ? o.startMs : 0,
      durationMs: typeof o.durationMs === "number" ? o.durationMs : undefined,
    });
  }
  return out.slice(0, 12);
}
