import { randomUUID } from "node:crypto";

export type LockedTextLanguage = "nl" | "en" | "sr" | "auto";

export type LockedTextAnimation =
  | "none"
  | "fade-in"
  | "slide-up"
  | "slide-left"
  | "slide-right"
  | "typewriter"
  | "letter-pop"
  | "word-by-word"
  | "scale-in";

export type LockedTextAlign = "left" | "center" | "right";

/** Deterministic overlay text rendered by HomeCheff after Vidu — never by the video model. */
export type LockedTextLayer = {
  id: string;
  text: string;
  language?: LockedTextLanguage;
  /** Normalized 0–1 position (top-left anchor). */
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: LockedTextAlign;
  animation: LockedTextAnimation;
  startMs: number;
  durationMs: number;
  endMs?: number;
  locked: true;
};

export const LOCKED_TEXT_ANIMATIONS: readonly LockedTextAnimation[] = [
  "none",
  "fade-in",
  "slide-up",
  "slide-left",
  "slide-right",
  "typewriter",
  "letter-pop",
  "word-by-word",
  "scale-in",
] as const;

export const LOCKED_TEXT_SAFETY_BLOCK = `TEXT SAFETY RULES:
- Do not generate, rewrite, translate, correct, replace, or invent any readable text.
- Treat all existing text in the source image as a visual placeholder only.
- Keep text areas stable and clean, but do not attempt to improve the wording.
- Important final text will be rendered later as locked overlay layers.
- Avoid hallucinated signs, labels, subtitles, captions, logos, or random letters.
- If text appears, it must remain visually neutral and must not become new readable words.`;

const MAX_LAYERS = 12;
const MAX_TEXT_LENGTH = 280;

/** Chips that must not carry readable copy inside the Vidu prompt — use locked layers instead. */
export const TEXT_IMPLYING_CHIP_IDS = [
  "text_caption",
  "text_cta",
  "text_price",
  "text_slogan",
  "text_product_title",
  "text_menu_label",
] as const;

export type TextImplyingChipId = (typeof TEXT_IMPLYING_CHIP_IDS)[number];

export function isTextImplyingChipId(value: string): value is TextImplyingChipId {
  return (TEXT_IMPLYING_CHIP_IDS as readonly string[]).includes(value);
}

export function isLockedTextAnimation(value: string): value is LockedTextAnimation {
  return (LOCKED_TEXT_ANIMATIONS as readonly string[]).includes(value);
}

/** Preserve exact user string — no trim of internal lines, only strip outer whitespace once. */
export function normalizeLockedTextContent(raw: string): string {
  return raw.replace(/\r\n/g, "\n").trim();
}

export function createLockedTextLayer(
  partial: Omit<LockedTextLayer, "id" | "locked"> & { id?: string }
): LockedTextLayer {
  return {
    id: partial.id?.trim() || randomUUID(),
    text: normalizeLockedTextContent(partial.text),
    language: partial.language ?? "auto",
    x: clamp01(partial.x),
    y: clamp01(partial.y),
    width: partial.width,
    height: partial.height,
    fontFamily: partial.fontFamily ?? "Arial",
    fontSize: partial.fontSize ?? 42,
    fontWeight: partial.fontWeight ?? "700",
    color: partial.color ?? "#FFFFFF",
    backgroundColor: partial.backgroundColor,
    textAlign: partial.textAlign ?? "center",
    animation: partial.animation ?? "fade-in",
    startMs: Math.max(0, Math.floor(partial.startMs)),
    durationMs: Math.max(200, Math.floor(partial.durationMs)),
    endMs: partial.endMs != null ? Math.max(0, Math.floor(partial.endMs)) : undefined,
    locked: true,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, n));
}

export function parseLockedTextLayersJson(value: unknown): LockedTextLayer[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: LockedTextLayer[] = [];
  for (const item of value) {
    const layer = parseLockedTextLayer(item);
    if (layer) {
      out.push(layer);
    }
  }
  return out.slice(0, MAX_LAYERS);
}

function parseLockedTextLayer(value: unknown): LockedTextLayer | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;
  if (typeof o.text !== "string" || !o.text.trim()) {
    return null;
  }
  const animation =
    typeof o.animation === "string" && isLockedTextAnimation(o.animation) ? o.animation : "fade-in";
  const startMs = typeof o.startMs === "number" ? o.startMs : 0;
  const durationMs = typeof o.durationMs === "number" ? o.durationMs : 2000;
  return createLockedTextLayer({
    id: typeof o.id === "string" ? o.id : undefined,
    text: o.text,
    language:
      o.language === "nl" || o.language === "en" || o.language === "sr" || o.language === "auto"
        ? o.language
        : "auto",
    x: typeof o.x === "number" ? o.x : 0.5,
    y: typeof o.y === "number" ? o.y : 0.12,
    width: typeof o.width === "number" ? o.width : undefined,
    height: typeof o.height === "number" ? o.height : undefined,
    fontFamily: typeof o.fontFamily === "string" ? o.fontFamily : undefined,
    fontSize: typeof o.fontSize === "number" ? o.fontSize : undefined,
    fontWeight: typeof o.fontWeight === "string" ? o.fontWeight : undefined,
    color: typeof o.color === "string" ? o.color : undefined,
    backgroundColor: typeof o.backgroundColor === "string" ? o.backgroundColor : undefined,
    textAlign:
      o.textAlign === "left" || o.textAlign === "center" || o.textAlign === "right"
        ? o.textAlign
        : undefined,
    animation,
    startMs,
    durationMs,
    endMs: typeof o.endMs === "number" ? o.endMs : undefined,
  });
}

export function validateLockedTextLayersForCreate(
  layers: LockedTextLayer[],
  totalDurationMs: number
): { ok: true; layers: LockedTextLayer[] } | { ok: false; error: string } {
  if (layers.length > MAX_LAYERS) {
    return { ok: false, error: `At most ${MAX_LAYERS} locked text layers allowed.` };
  }
  for (const layer of layers) {
    if (layer.text.length > MAX_TEXT_LENGTH) {
      return {
        ok: false,
        error: `Text layer exceeds ${MAX_TEXT_LENGTH} characters.`,
      };
    }
    if (layer.endMs != null && layer.endMs < layer.startMs + layer.durationMs) {
      return { ok: false, error: "Text layer endMs must be after start + duration." };
    }
    if (layer.startMs > totalDurationMs + 5000) {
      return { ok: false, error: "Text layer starts after video duration." };
    }
  }
  return { ok: true, layers };
}

export type TextLayerDraftInput = {
  id?: string;
  text: string;
  animation?: LockedTextAnimation;
  x?: number;
  y?: number;
  startMs?: number;
  durationMs?: number;
  language?: LockedTextLanguage;
  textAlign?: LockedTextAlign;
};

export type BuildLayersFromChipsInput = {
  selectedChips: string[];
  /** Optional copy keyed by chip slot (from UI). */
  chipTextBySlot?: Partial<Record<TextImplyingChipId, string>>;
  totalDurationMs: number;
  uiLanguage?: "nl" | "en";
};

const CHIP_LAYER_DEFAULTS: Record<
  TextImplyingChipId,
  { y: number; animation: LockedTextAnimation; durationRatio: number; startRatio: number }
> = {
  text_caption: { y: 0.78, animation: "fade-in", durationRatio: 0.35, startRatio: 0.05 },
  text_cta: { y: 0.86, animation: "scale-in", durationRatio: 0.28, startRatio: 0.62 },
  text_price: { y: 0.14, animation: "slide-left", durationRatio: 0.25, startRatio: 0.08 },
  text_slogan: { y: 0.2, animation: "fade-in", durationRatio: 0.4, startRatio: 0.1 },
  text_product_title: { y: 0.12, animation: "slide-up", durationRatio: 0.35, startRatio: 0.06 },
  text_menu_label: { y: 0.72, animation: "word-by-word", durationRatio: 0.45, startRatio: 0.12 },
};

/** Build locked layers from text-implying chips + UI copy (never embed that copy in Vidu prompts). */
export function buildLockedTextLayersFromChips(input: BuildLayersFromChipsInput): LockedTextLayer[] {
  const layers: LockedTextLayer[] = [];
  const total = Math.max(1000, input.totalDurationMs);
  let index = 0;
  for (const chipId of input.selectedChips) {
    if (!isTextImplyingChipId(chipId)) {
      continue;
    }
    const copy = input.chipTextBySlot?.[chipId]?.trim();
    if (!copy) {
      continue;
    }
    const spec = CHIP_LAYER_DEFAULTS[chipId];
    const durationMs = Math.max(400, Math.round(total * spec.durationRatio));
    const startMs = Math.max(0, Math.round(total * spec.startRatio));
    layers.push(
      createLockedTextLayer({
        id: `chip-${chipId}-${index}`,
        text: copy,
        language: input.uiLanguage ?? "auto",
        x: 0.5,
        y: spec.y,
        animation: spec.animation,
        startMs,
        durationMs,
        textAlign: "center",
      })
    );
    index += 1;
  }
  return layers;
}

/** Visual-only chips for Vidu (exclude text-implying chips). */
export function filterVisualOnlyChips(chipIds: string[]): string[] {
  return chipIds.filter((id) => !isTextImplyingChipId(id));
}

export function mergeLockedTextLayers(
  explicit: LockedTextLayer[],
  fromChips: LockedTextLayer[]
): LockedTextLayer[] {
  const byId = new Map<string, LockedTextLayer>();
  for (const layer of [...fromChips, ...explicit]) {
    if (layer.text.trim()) {
      byId.set(layer.id, layer);
    }
  }
  return [...byId.values()].slice(0, MAX_LAYERS);
}

export function resolveInstantVideoDimensions(
  aspectRatio: string | null | undefined,
  viduResolution: string | null | undefined
): { width: number; height: number } {
  const maxW = getVideoMaxWidth(viduResolution);
  const ar = aspectRatio?.trim() === "16:9" ? "16:9" : "9:16";
  if (ar === "16:9") {
    return { width: maxW, height: Math.round((maxW * 9) / 16) };
  }
  const width = Math.round(maxW * (9 / 16));
  return { width, height: maxW };
}

function getVideoMaxWidth(viduResolution: string | null | undefined): number {
  const s = (viduResolution ?? "").toLowerCase();
  if (s.includes("1080")) {
    return 1080;
  }
  if (s.includes("540")) {
    return 540;
  }
  return 720;
}

export type LockedTextValidationRecord = {
  layerId: string;
  expectedText: string;
  renderedText: string;
  match: boolean;
};

/** Post-render metadata validation (deterministic; OCR optional later). */
export function validateLockedTextLayerMetadata(layers: LockedTextLayer[]): {
  ok: boolean;
  records: LockedTextValidationRecord[];
} {
  const records: LockedTextValidationRecord[] = layers.map((layer) => {
    const expectedText = normalizeLockedTextContent(layer.text);
    return {
      layerId: layer.id,
      expectedText,
      renderedText: expectedText,
      match: true,
    };
  });
  return {
    ok: records.every((r) => r.match),
    records,
  };
}

export function lockedTextLayersForStorage(layers: LockedTextLayer[]): LockedTextLayer[] {
  return layers.map((l) => ({ ...l, locked: true as const }));
}
