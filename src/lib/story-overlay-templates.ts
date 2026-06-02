import type { InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";

export const SCENE_OVERLAY_TEMPLATES = ["auto", "hero", "scene", "sequence"] as const;

export type SceneOverlayTemplate = (typeof SCENE_OVERLAY_TEMPLATES)[number];

export const MAX_SEQUENCE_LINES = 10;
export const STORY_SCENE_DURATION_OPTIONS = [3, 5, 7] as const;
export type StorySceneDurationSeconds = (typeof STORY_SCENE_DURATION_OPTIONS)[number];
export const STORY_SCENE_DURATION_ALLOWED = [3, 5, 7, 8] as const;
export const MAX_SCENE_LINE_CHARS = 80;
export const MAX_HERO_FINALE_TEXT_CHARS = 160;

export const SEQUENCE_LINE_STYLES = ["auto", "hero", "hero_small", "scene"] as const;
export type SequenceLineStyle = (typeof SEQUENCE_LINE_STYLES)[number];

export type SequenceLineInput =
  | string
  | {
      text: string;
      style?: SequenceLineStyle | string;
    };

export type ResolvedSequenceLineStyle = "hero" | "hero_small" | "scene";

export const SCENE_TEMPLATE_POSITIONS = ["top", "center", "bottom"] as const;
export type SceneTemplatePosition = (typeof SCENE_TEMPLATE_POSITIONS)[number];

export type InstantSceneText = {
  template?: SceneOverlayTemplate;
  heroText?: string;
  title?: string;
  subtitle?: string;
  accentWords?: string[];
  templatePosition?: SceneTemplatePosition;
  lines?: SequenceLineInput[];
  /** When true (default for 2+ sequence lines), earlier lines use hero small and the last uses full hero. */
  heroFinale?: boolean;
  /** Optional finale message shown in the last portion of a sequence scene. */
  heroFinaleText?: string;
  /** Transition into the next frame (Story Mode). Not used on the last frame. */
  transitionDurationSeconds?: number;
  /** @deprecated Use transitionDurationSeconds — kept for legacy projects. */
  durationSeconds?: number;
};

export type NormalizedSequenceLine = {
  text: string;
  requestedStyle: SequenceLineStyle;
};

export type NormalizedSceneText = {
  template: SceneOverlayTemplate;
  heroText: string;
  title: string;
  subtitle: string;
  accentWords: string[];
  templatePosition?: SceneTemplatePosition;
  lines: NormalizedSequenceLine[];
  heroFinale: boolean;
  heroFinaleText: string;
  transitionDurationSeconds?: StorySceneDurationSeconds;
  /** @deprecated Use transitionDurationSeconds */
  durationSeconds?: StorySceneDurationSeconds;
};

export type ResolvedSceneTemplate = "hero" | "scene" | "sequence" | "skip";

export const STORY_OVERLAY_TIMING_EDGE_SEC = 0.15;
export const SEQUENCE_TIMING_PADDING_SEC = 0.1;
export const HERO_AUTO_MAX_WORDS = 10;
export const HERO_PUNCHLINE_MAX_WORDS = 8;
export const HERO_MAX_CHARS_PER_LINE = 18;

const DEFAULT_ACCENT_KEYWORDS = [
  "MONEY",
  "VALUE",
  "LOCAL",
  "GROW",
  "CREATE",
  "EARN",
  "SELL",
  "FOOD",
  "COMMUNITY",
  "TOGETHER",
  "FREEDOM",
  "TIME",
  "SYSTEM",
  "PROBLEM",
  "SOLUTION",
] as const;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function isSceneOverlayTemplate(value: unknown): value is SceneOverlayTemplate {
  return (
    value === "auto" ||
    value === "hero" ||
    value === "scene" ||
    value === "sequence"
  );
}

export function isSequenceLineStyle(value: unknown): value is SequenceLineStyle {
  return (
    value === "auto" ||
    value === "hero" ||
    value === "hero_small" ||
    value === "scene"
  );
}

function parseSequenceLineStyle(value: unknown): SequenceLineStyle {
  return isSequenceLineStyle(value) ? value : "auto";
}

export function parseSequenceLines(raw: unknown): NormalizedSequenceLine[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: NormalizedSequenceLine[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const text = item.trim();
      if (!text) {
        continue;
      }
      out.push({ text, requestedStyle: "auto" });
      continue;
    }
    if (!item || typeof item !== "object") {
      continue;
    }
    const o = item as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text.trim() : "";
    if (!text) {
      continue;
    }
    out.push({
      text,
      requestedStyle: parseSequenceLineStyle(o.style),
    });
  }
  return out.slice(0, MAX_SEQUENCE_LINES);
}

export function parseAccentWordsInput(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((w): w is string => typeof w === "string")
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((w) => w.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
}

/** Backwards-compatible normalization for stored + API payloads. */
export function normalizeSceneText(scene: InstantSceneText | null | undefined): NormalizedSceneText {
  const template = isSceneOverlayTemplate(scene?.template) ? scene.template : "auto";
  const heroRaw = typeof scene?.heroText === "string" ? scene.heroText.trim() : "";
  const titleRaw = typeof scene?.title === "string" ? scene.title.trim() : "";
  const subtitleRaw = typeof scene?.subtitle === "string" ? scene.subtitle.trim() : "";
  const heroText = heroRaw ? heroRaw.toUpperCase() : "";
  const title = titleRaw ? titleRaw.toUpperCase() : "";
  const subtitle = subtitleRaw;
  const accentWords = parseAccentWordsInput(scene?.accentWords);
  const templatePosition =
    scene?.templatePosition === "top" ||
    scene?.templatePosition === "center" ||
    scene?.templatePosition === "bottom" ?
      scene.templatePosition
    : undefined;

  const lines = parseSequenceLines(scene?.lines);
  const heroFinale =
    scene?.heroFinale === false ? false : lines.length >= 2;
  const heroFinaleRaw =
    typeof scene?.heroFinaleText === "string" ? scene.heroFinaleText.trim() : "";
  const heroFinaleText = heroFinaleRaw ?
    heroFinaleRaw.slice(0, MAX_HERO_FINALE_TEXT_CHARS)
  : "";
  const transitionRaw = scene?.transitionDurationSeconds;
  const durationRaw = scene?.durationSeconds;
  const transitionDurationSeconds =
    typeof transitionRaw === "number" && Number.isFinite(transitionRaw) ?
      normalizeStorySceneDurationSeconds(transitionRaw)
    : typeof durationRaw === "number" && Number.isFinite(durationRaw) ?
      normalizeStorySceneDurationSeconds(durationRaw)
    : undefined;
  const durationSeconds = transitionDurationSeconds;

  return {
    template,
    heroText,
    title,
    subtitle,
    accentWords,
    templatePosition,
    lines,
    heroFinale,
    heroFinaleText,
    transitionDurationSeconds,
    durationSeconds,
  };
}

export function parseInstantSceneTexts(raw: unknown): NormalizedSceneText[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => normalizeSceneText(item as InstantSceneText));
}

export function emptyNormalizedSceneText(): NormalizedSceneText {
  return normalizeSceneText({ template: "auto" });
}

export function hasSceneOverlayContent(scene: InstantSceneText | NormalizedSceneText): boolean {
  const n = normalizeSceneText(scene);
  return chooseTemplate(n) !== "skip";
}

export function chooseTemplate(scene: InstantSceneText | NormalizedSceneText): ResolvedSceneTemplate {
  const n = normalizeSceneText(scene);

  if (n.template === "sequence") {
    return n.lines.length > 0 ? "sequence" : "skip";
  }
  if (n.template === "hero") {
    if (n.heroText.trim()) {
      return "hero";
    }
    if (n.lines.length === 1) {
      return "hero";
    }
    return "skip";
  }
  if (n.template === "scene") {
    return n.title.trim() || n.subtitle.trim() ? "scene" : "skip";
  }

  if (n.lines.length > 1) {
    return "sequence";
  }
  if (n.lines.length === 1) {
    const wc = wordCount(n.lines[0]!.text);
    return wc <= HERO_AUTO_MAX_WORDS ? "hero" : "scene";
  }

  if (n.title.trim()) {
    return "scene";
  }
  if (n.heroText.trim()) {
    return wordCount(n.heroText) <= HERO_AUTO_MAX_WORDS ? "hero" : "scene";
  }
  if (n.subtitle.trim() && wordCount(n.subtitle) <= HERO_PUNCHLINE_MAX_WORDS) {
    return "hero";
  }
  if (n.subtitle.trim()) {
    return "scene";
  }
  return "skip";
}

export type SequenceTimingSlot = {
  index: number;
  start: number;
  end: number;
  lineDuration: number;
};

/** Split scene window into equal slots with padding to avoid hard cuts. */
export function buildSequenceTiming(
  sceneStart: number,
  sceneEnd: number,
  lineCount: number
): SequenceTimingSlot[] {
  const count = Math.max(0, Math.floor(lineCount));
  if (count <= 0 || sceneEnd <= sceneStart) {
    return [];
  }
  const available = sceneEnd - sceneStart;
  const lineDuration = available / count;
  const slots: SequenceTimingSlot[] = [];
  for (let index = 0; index < count; index += 1) {
    const slotStart = sceneStart + index * lineDuration;
    const slotEnd = sceneStart + (index + 1) * lineDuration;
    const start = slotStart + SEQUENCE_TIMING_PADDING_SEC;
    const end = slotEnd - SEQUENCE_TIMING_PADDING_SEC;
    slots.push({
      index,
      start: Math.min(start, end),
      end: Math.max(start, end),
      lineDuration,
    });
  }
  return slots;
}

export function autoSequenceLineStyle(text: string): ResolvedSequenceLineStyle {
  const wc = wordCount(text);
  if (wc <= 4) {
    return "hero";
  }
  if (wc <= 8) {
    return "hero_small";
  }
  return "scene";
}

export function resolveSequenceLineStyle(
  line: NormalizedSequenceLine,
  lineIndex: number,
  lineCount: number,
  scene: Pick<NormalizedSceneText, "heroFinale">
): ResolvedSequenceLineStyle {
  if (line.requestedStyle === "hero") {
    return "hero";
  }
  if (line.requestedStyle === "hero_small") {
    return "hero_small";
  }
  if (line.requestedStyle === "scene") {
    return "scene";
  }

  if (scene.heroFinale && lineCount >= 2) {
    if (lineIndex === lineCount - 1) {
      return "hero";
    }
    return "hero_small";
  }

  return autoSequenceLineStyle(line.text);
}

/** Hero body text for auto (subtitle-only punchline) or explicit heroText. */
export function heroSourceText(scene: NormalizedSceneText): string {
  if (scene.heroText.trim()) {
    return scene.heroText;
  }
  if (scene.lines.length === 1 && scene.lines[0]!.text.trim()) {
    return scene.lines[0]!.text.toUpperCase();
  }
  if (chooseTemplate(scene) === "hero" && scene.subtitle.trim()) {
    return scene.subtitle.toUpperCase();
  }
  return "";
}

export function buildHeroLines(text: string): string[] {
  const raw = text.trim();
  if (!raw) {
    return [];
  }

  if (raw.includes("\n")) {
    return raw
      .split("\n")
      .map((line) => collapseSpaces(line).toUpperCase())
      .filter(Boolean)
      .slice(0, 4);
  }

  const upper = collapseSpaces(raw).toUpperCase();
  const words = upper.split(" ").filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  if (words.length === 1) {
    return [words[0]!];
  }
  if (words.length === 2) {
    return [words.join(" ")];
  }
  if (words.length === 3) {
    return [words.slice(0, 2).join(" "), words[2]!];
  }
  if (words.length === 4) {
    return [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
  }
  if (words.length === 5) {
    return [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
  }
  if (words.length === 6) {
    return [
      words.slice(0, 2).join(" "),
      words.slice(2, 4).join(" "),
      words.slice(4).join(" "),
    ];
  }
  if (words.length === 7) {
    return [
      words.slice(0, 2).join(" "),
      words.slice(2, 4).join(" "),
      words.slice(4).join(" "),
    ];
  }
  if (words.length === 8) {
    return [
      words.slice(0, 2).join(" "),
      words.slice(2, 5).join(" "),
      words.slice(5).join(" "),
    ];
  }

  const lines: string[] = [];
  let bucket: string[] = [];
  for (const word of words) {
    const candidate = [...bucket, word].join(" ");
    if (candidate.length > HERO_MAX_CHARS_PER_LINE && bucket.length > 0) {
      lines.push(bucket.join(" "));
      bucket = [word];
    } else {
      bucket.push(word);
    }
    if (lines.length >= 3) {
      break;
    }
  }
  if (bucket.length > 0 && lines.length < 4) {
    lines.push(bucket.join(" "));
  }
  const usedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const remainder = words.slice(usedWords).join(" ");
  if (remainder && lines.length < 4) {
    lines.push(remainder);
  }
  return lines.slice(0, 4).map((l) => l.toUpperCase());
}

export function detectAccentWords(
  text: string,
  scene: Pick<NormalizedSceneText, "accentWords">
): string[] {
  const fromScene = scene.accentWords.map((w) => w.toUpperCase()).filter(Boolean);
  if (fromScene.length > 0) {
    return fromScene.slice(0, 2);
  }

  const upper = collapseSpaces(text).toUpperCase();
  const words = upper.split(" ").filter(Boolean);
  const found: string[] = [];

  for (const keyword of DEFAULT_ACCENT_KEYWORDS) {
    if (words.includes(keyword) && !found.includes(keyword)) {
      found.push(keyword);
      if (found.length >= 2) {
        return found;
      }
    }
  }

  const last = words[words.length - 1];
  if (last && !found.includes(last)) {
    found.push(last);
  }

  return found.slice(0, 2);
}

export function sceneOverlayTiming(
  index: number,
  sceneCount: number,
  durationSeconds: number
): { start: number; end: number; sceneDuration: number } {
  const safeCount = Math.max(1, sceneCount);
  const sceneDuration = durationSeconds / safeCount;
  const start = index * sceneDuration + STORY_OVERLAY_TIMING_EDGE_SEC;
  const end = (index + 1) * sceneDuration - STORY_OVERLAY_TIMING_EDGE_SEC;
  return { start, end, sceneDuration };
}

export type HeroLineLayout = {
  lines: string[];
  mainLineIndex: number;
  accentWords: string[];
};

export function layoutHeroScene(scene: NormalizedSceneText): HeroLineLayout | null {
  const source = heroSourceText(scene);
  if (!source.trim()) {
    return null;
  }
  const lines = buildHeroLines(source);
  if (lines.length === 0) {
    return null;
  }
  const accentWords = detectAccentWords(source, scene);
  let mainLineIndex = 0;
  if (lines.length >= 3) {
    mainLineIndex = 1;
  } else if (lines.length === 2) {
    mainLineIndex = lines[1]!.length >= lines[0]!.length ? 1 : 0;
  }
  for (let i = 0; i < lines.length; i += 1) {
    const lineUpper = lines[i]!.toUpperCase();
    if (accentWords.some((a) => lineUpper.includes(a))) {
      mainLineIndex = i;
      break;
    }
  }
  return { lines, mainLineIndex, accentWords };
}

export const SEQUENCE_HERO_FINALE_SHARE = 0.32;
export const SEQUENCE_LINES_SHARE = 1 - SEQUENCE_HERO_FINALE_SHARE;

export function storyDurationFromGlobalFallback(
  transitionSeconds: InstantTransitionSeconds | number = 5
): StorySceneDurationSeconds {
  if (transitionSeconds === 3) {
    return 3;
  }
  if (transitionSeconds === 8) {
    return 7;
  }
  return 5;
}

export function normalizeStorySceneDurationSeconds(
  value: unknown,
  fallback: InstantTransitionSeconds | StorySceneDurationSeconds = 5
): StorySceneDurationSeconds {
  if (value === 3 || value === 5 || value === 7) {
    return value;
  }
  if (value === 8) {
    return 7;
  }
  return storyDurationFromGlobalFallback(fallback);
}

export function isStorySceneDurationAllowed(value: unknown): boolean {
  return value === 3 || value === 5 || value === 7 || value === 8;
}

export function clampStorySceneDurationForVidu(seconds: number): number {
  return Math.max(2, Math.min(7, Math.floor(seconds)));
}

export function sanitizeSceneTextField(text: string, maxChars: number): string {
  return text.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

/** Transition duration on a frame (into the next image). */
export function getSceneTransitionDurationSeconds(
  scene: InstantSceneText | NormalizedSceneText | null | undefined,
  fallback: InstantTransitionSeconds | StorySceneDurationSeconds = 5
): StorySceneDurationSeconds {
  if (!scene || typeof scene !== "object") {
    return storyDurationFromGlobalFallback(fallback);
  }
  const raw = scene as InstantSceneText;
  const value = raw.transitionDurationSeconds ?? raw.durationSeconds;
  return typeof value === "number" && Number.isFinite(value) ?
      normalizeStorySceneDurationSeconds(value, fallback)
    : storyDurationFromGlobalFallback(fallback);
}

export function hasCustomTransitionDurations(
  scenes: InstantSceneText[] | NormalizedSceneText[]
): boolean {
  return scenes.some((scene) => {
    if (!scene || typeof scene !== "object") {
      return false;
    }
    const raw = scene as InstantSceneText;
    return (
      (typeof raw.transitionDurationSeconds === "number" &&
        Number.isFinite(raw.transitionDurationSeconds)) ||
      (typeof raw.durationSeconds === "number" && Number.isFinite(raw.durationSeconds))
    );
  });
}

/** @deprecated Use hasCustomTransitionDurations */
export const hasPerSceneDurations = hasCustomTransitionDurations;

export function normalizeStoryboardScenes(
  scenes: InstantSceneText[] | NormalizedSceneText[] | null | undefined,
  imageCount: number,
  fallbackTransitionSeconds: InstantTransitionSeconds = 5
): NormalizedSceneText[] {
  const fallback = storyDurationFromGlobalFallback(fallbackTransitionSeconds);
  const count = Math.max(0, imageCount);
  const rawList = Array.isArray(scenes) ? scenes : [];
  const out: NormalizedSceneText[] = [];
  for (let index = 0; index < count; index += 1) {
    const base = normalizeSceneText(rawList[index] as InstantSceneText | undefined);
    const raw = rawList[index] as InstantSceneText | undefined;
    const isLast = index === count - 1;
    let transitionDurationSeconds: StorySceneDurationSeconds | undefined;
    if (!isLast) {
      transitionDurationSeconds = getSceneTransitionDurationSeconds(
        raw ?? base,
        fallbackTransitionSeconds
      );
    }
    out.push({
      ...base,
      transitionDurationSeconds,
      durationSeconds: transitionDurationSeconds,
    });
  }
  return out;
}

/** Sum of Vidu transition durations (frames 0..N-2). Same as generated video length. */
export function getStoryTransitionDurationSeconds(
  scenes: InstantSceneText[] | NormalizedSceneText[],
  imageCount: number,
  fallbackTransitionSeconds: InstantTransitionSeconds = 5
): number {
  const count = Math.max(0, imageCount);
  const segmentCount = Math.max(0, count - 1);
  if (segmentCount === 0) {
    return 0;
  }
  if (!hasCustomTransitionDurations(scenes)) {
    return segmentCount * fallbackTransitionSeconds;
  }
  const normalized = normalizeStoryboardScenes(scenes, count, fallbackTransitionSeconds);
  let sum = 0;
  for (let index = 0; index < segmentCount; index += 1) {
    sum += getSceneTransitionDurationSeconds(normalized[index], fallbackTransitionSeconds);
  }
  return sum;
}

/** @deprecated Use getStoryTransitionDurationSeconds */
export const getStoryboardDurationSeconds = getStoryTransitionDurationSeconds;

export function resolveViduSegmentDurationsFromStoryboard(
  scenes: InstantSceneText[] | NormalizedSceneText[],
  imageCount: number,
  fallbackTransitionSeconds: InstantTransitionSeconds = 5
): number[] {
  const segmentCount = Math.max(0, imageCount - 1);
  const normalized = normalizeStoryboardScenes(scenes, imageCount, fallbackTransitionSeconds);
  const fallback = storyDurationFromGlobalFallback(fallbackTransitionSeconds);
  const segments: number[] = [];
  for (let index = 0; index < segmentCount; index += 1) {
    segments.push(
      clampStorySceneDurationForVidu(
        getSceneTransitionDurationSeconds(normalized[index], fallback)
      )
    );
  }
  return segments;
}

export function getViduTotalFromStoryboardSegments(
  scenes: InstantSceneText[] | NormalizedSceneText[],
  imageCount: number,
  fallbackTransitionSeconds: InstantTransitionSeconds = 5
): number {
  return resolveViduSegmentDurationsFromStoryboard(
    scenes,
    imageCount,
    fallbackTransitionSeconds
  ).reduce((sum, value) => sum + value, 0);
}

export type SceneTimingWindow = {
  index: number;
  start: number;
  end: number;
  sceneDuration: number;
  /** Planned scene duration before scaling to provider video length. */
  storyboardDuration: number;
  /** @deprecated Use storyboardDuration */
  plannedDuration: number;
};

export function getSceneTimingWindows(
  scenes: InstantSceneText[] | NormalizedSceneText[],
  totalDurationSeconds: number,
  imageCount?: number
): SceneTimingWindow[] {
  const count = Math.max(0, imageCount ?? scenes.length);
  if (count === 0 || totalDurationSeconds <= 0) {
    return [];
  }

  if (!hasCustomTransitionDurations(scenes)) {
    const sceneDuration = totalDurationSeconds / count;
    return Array.from({ length: count }, (_, index) => {
      const start = index * sceneDuration + STORY_OVERLAY_TIMING_EDGE_SEC;
      const end = (index + 1) * sceneDuration - STORY_OVERLAY_TIMING_EDGE_SEC;
      return {
        index,
        start: Math.max(0, start),
        end: Math.max(start, end),
        sceneDuration,
        storyboardDuration: sceneDuration,
        plannedDuration: sceneDuration,
      };
    });
  }

  const normalized = normalizeStoryboardScenes(scenes, count);
  const fallback = 5 as StorySceneDurationSeconds;
  let cursor = 0;
  const windows: SceneTimingWindow[] = [];

  for (let index = 0; index < count; index += 1) {
    const transitionSeconds =
      index < count - 1 ?
        getSceneTransitionDurationSeconds(normalized[index], fallback)
      : getSceneTransitionDurationSeconds(normalized[index - 1], fallback);
    const start = cursor + STORY_OVERLAY_TIMING_EDGE_SEC;
    const end = cursor + transitionSeconds - STORY_OVERLAY_TIMING_EDGE_SEC;
    windows.push({
      index,
      start: Math.max(0, start),
      end: Math.max(start, end),
      sceneDuration: transitionSeconds,
      storyboardDuration: transitionSeconds,
      plannedDuration: transitionSeconds,
    });
    cursor += transitionSeconds;
  }

  return windows;
}

export function splitSequenceSceneTiming(
  sceneStart: number,
  sceneEnd: number,
  hasHeroFinale: boolean
): { linesStart: number; linesEnd: number; finaleStart: number; finaleEnd: number } {
  const available = Math.max(0, sceneEnd - sceneStart);
  if (!hasHeroFinale || available <= 0) {
    return {
      linesStart: sceneStart,
      linesEnd: sceneEnd,
      finaleStart: sceneEnd,
      finaleEnd: sceneEnd,
    };
  }
  if (available < 4) {
    const mid = sceneStart + available / 2;
    return {
      linesStart: sceneStart,
      linesEnd: mid,
      finaleStart: mid,
      finaleEnd: sceneEnd,
    };
  }
  const finaleDuration = available * SEQUENCE_HERO_FINALE_SHARE;
  const linesEnd = sceneEnd - finaleDuration;
  return {
    linesStart: sceneStart,
    linesEnd,
    finaleStart: linesEnd,
    finaleEnd: sceneEnd,
  };
}
