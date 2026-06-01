export const SCENE_OVERLAY_TEMPLATES = ["auto", "hero", "scene"] as const;
export type SceneOverlayTemplate = (typeof SCENE_OVERLAY_TEMPLATES)[number];

export const SCENE_TEMPLATE_POSITIONS = ["top", "center", "bottom"] as const;
export type SceneTemplatePosition = (typeof SCENE_TEMPLATE_POSITIONS)[number];

export type InstantSceneText = {
  template?: SceneOverlayTemplate;
  heroText?: string;
  title?: string;
  subtitle?: string;
  accentWords?: string[];
  templatePosition?: SceneTemplatePosition;
};

export type NormalizedSceneText = {
  template: SceneOverlayTemplate;
  heroText: string;
  title: string;
  subtitle: string;
  accentWords: string[];
  templatePosition?: SceneTemplatePosition;
};

export type ResolvedSceneTemplate = "hero" | "scene" | "skip";

export const STORY_OVERLAY_TIMING_EDGE_SEC = 0.15;
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
  return value === "auto" || value === "hero" || value === "scene";
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

  return {
    template,
    heroText,
    title,
    subtitle,
    accentWords,
    templatePosition,
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

  if (n.template === "hero") {
    return n.heroText.trim() ? "hero" : "skip";
  }
  if (n.template === "scene") {
    return n.title.trim() || n.subtitle.trim() ? "scene" : "skip";
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

/** Hero body text for auto (subtitle-only punchline) or explicit heroText. */
export function heroSourceText(scene: NormalizedSceneText): string {
  if (scene.heroText.trim()) {
    return scene.heroText;
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
