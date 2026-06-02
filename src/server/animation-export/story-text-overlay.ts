import path from "node:path";
import fs from "node:fs/promises";
import {
  chooseTemplate,
  emptyNormalizedSceneText,
  getSceneTimingWindows,
  hasSceneOverlayContent,
  heroSourceText,
  layoutHeroScene,
  normalizeSceneText,
  resolveSequenceLineStyle,
  sceneOverlayTiming,
  type InstantSceneText,
  type NormalizedSceneText,
} from "@/lib/story-overlay-templates";
import {
  buildAdaptiveThemesForScenes,
  buildAdaptiveOverlayContextsForScenes,
  enhanceThemeForZonePlacement,
  resolveSceneOverlayTheme,
  type AdaptiveOverlayTheme,
  type SceneOverlayWindow,
  type SafeZoneAnalysis,
} from "@/server/animation-export/adaptive-overlay-style";
import {
  buildEnhancedSafeZoneDebugInfo,
  buildSceneSafeZoneContext,
  resolvePlacementForTemplate,
  type SceneSafeZoneContext,
} from "@/server/animation-export/enhanced-safe-zone";
import { isSafeZoneDebugEnabled } from "@/server/animation-export/safe-zone-placement";
import type { OverlayTemplateKind } from "@/server/animation-export/object-aware-placement";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

export type { InstantSceneText } from "@/lib/story-overlay-templates";
export {
  buildHeroLines,
  buildSequenceTiming,
  chooseTemplate,
  detectAccentWords,
  getSceneTimingWindows,
  hasSceneOverlayContent,
  normalizeSceneText,
  resolveSequenceLineStyle,
  sceneOverlayTiming,
} from "@/lib/story-overlay-templates";
import { buildSequenceAssEvents } from "@/server/animation-export/story-sequence-overlay";

export { buildSequenceAssEvents } from "@/server/animation-export/story-sequence-overlay";
export {
  analyzeFrameColors,
  buildAdaptiveThemesForScenes,
  buildAdaptiveOverlayContextsForScenes,
  chooseAdaptiveOverlayTheme,
  defaultV2OverlayTheme,
  extractSceneSampleFrame,
  hexToAssColor,
  type AdaptiveOverlayTheme,
  type FrameColorMetrics,
  type SafeZoneAnalysis,
} from "@/server/animation-export/adaptive-overlay-style";

/** @deprecated Use template field on scene; kept for API compat. */
export type StoryOverlayTemplate = "cinematic";

const HERO_SIZE_MAIN = 118;
const HERO_SIZE_SMALL = 74;
const SCENE_TITLE_MARGIN_V = 72;
const SUBTITLE_GAP = 8;

function assTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const cs = Math.round((clamped - Math.floor(clamped)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAssText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/\n/g, "\\N");
}

function heroLineWithAccents(
  line: string,
  accentWords: string[],
  theme: AdaptiveOverlayTheme
): string {
  const accentSet = new Set(accentWords.map((w) => w.toUpperCase()));
  const parts = line.split(/(\s+)/);
  return parts
    .map((part) => {
      if (!part.trim()) {
        return part;
      }
      const bare = part.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (accentSet.has(bare)) {
        return `{\\c${theme.accentColorAss}&}${escapeAssText(part)}{\\c${theme.primaryColorAss}&}`;
      }
      return escapeAssText(part);
    })
    .join("");
}

function motionTags(x: number, y: number): string {
  return `{\\fad(250,250)\\t(0,500,\\fscx103\\fscy103)\\pos(${x},${y})}`;
}

function sceneTextForSafeZone(scene: NormalizedSceneText): string {
  if (scene.heroText.trim()) {
    return scene.heroText;
  }
  if (scene.lines.length > 0) {
    return scene.lines.map((l) => l.text).join(" ");
  }
  if (scene.title.trim()) {
    return `${scene.title} ${scene.subtitle}`.trim();
  }
  return scene.subtitle;
}

type SafeZoneInput = SceneSafeZoneContext | SafeZoneAnalysis | null | undefined;

function resolveHeroAnchorY(
  lineCount: number,
  width: number,
  height: number,
  position: NormalizedSceneText["templatePosition"],
  safeZone?: SafeZoneInput
): number {
  if (safeZone) {
    const placement = resolvePlacementForTemplate(safeZone, "hero", width, height);
    const lineStep = HERO_SIZE_MAIN + 18;
    const blockHeight = lineCount * lineStep;
    return Math.max(
      Math.round(height * SAFE_AREA_MARGIN_V) + lineStep / 2,
      placement.anchorY - blockHeight / 2 + lineStep / 2
    );
  }
  const lineStep = HERO_SIZE_MAIN + 20;
  const blockHeight = lineCount * lineStep;
  if (position === "center") {
    return Math.round(height * 0.5 - blockHeight / 2 + lineStep / 2);
  }
  if (position === "bottom") {
    return Math.round(height * 0.78 - blockHeight);
  }
  if (lineCount <= 2) {
    return Math.round(height * 0.42);
  }
  return Math.round(height * 0.22 + lineStep / 2);
}

function resolveHeroAnchorX(
  width: number,
  height: number,
  safeZone?: SafeZoneInput
): number {
  if (safeZone) {
    return resolvePlacementForTemplate(safeZone, "hero", width, height).anchorX;
  }
  return Math.round(width / 2);
}

const SAFE_AREA_MARGIN_V = 0.08;

function defaultHeroPosition(
  scene: NormalizedSceneText,
  lineCount: number
): NormalizedSceneText["templatePosition"] {
  if (scene.templatePosition) {
    return scene.templatePosition;
  }
  if (lineCount <= 2 && heroSourceText(scene).split(/\s+/).length <= 4) {
    return "center";
  }
  return "top";
}

function assStyleLine(
  name: string,
  font: string,
  size: number,
  theme: AdaptiveOverlayTheme,
  alignment: number,
  marginV: number,
  marginH = 48
): string {
  const borderStyle = theme.useBackdrop ? 3 : 1;
  const backColour = theme.useBackdrop ? theme.backdropColorAss : "&H00000000";
  return (
    `Style: ${name},${font},${size},${theme.primaryColorAss},&H000000FF,` +
    `${theme.outlineColorAss},${backColour},-1,0,0,0,100,100,0,0,${borderStyle},` +
    `${theme.outline},${theme.shadow},${alignment},${marginH},${marginH},${marginV},1`
  );
}

function horizontalMarginForPlacement(
  width: number,
  textWidthFraction: number | undefined
): number {
  if (textWidthFraction == null) {
    return 48;
  }
  return Math.max(48, Math.round((width * (1 - textWidthFraction)) / 2));
}

function resolveSceneTheme(
  themeByIndex: Map<number, AdaptiveOverlayTheme | null> | undefined,
  safeZoneByIndex: Map<number, SafeZoneInput> | undefined,
  sceneIndex: number,
  width: number,
  height: number,
  template: OverlayTemplateKind
): AdaptiveOverlayTheme {
  const base = resolveSceneOverlayTheme(themeByIndex, sceneIndex);
  const safeZone = safeZoneByIndex?.get(sceneIndex);
  if (!safeZone) {
    return base;
  }
  const placement = resolvePlacementForTemplate(safeZone, template, width, height);
  let theme = enhanceThemeForZonePlacement(base, placement.zoneScore);
  if ("useStrongBackdrop" in safeZone && safeZone.useStrongBackdrop) {
    theme = {
      ...theme,
      isBusy: true,
      useBackdrop: true,
      backdropOpacity: Math.max(theme.backdropOpacity, 0.55),
      outline: Math.max(theme.outline, 6),
      shadow: Math.max(theme.shadow, 4),
    };
  }
  return theme;
}

function buildAssHeader(
  width: number,
  height: number,
  styleLines: string[]
): string[] {
  return [
    "[Script Info]",
    "Title: HomeCheff Story Overlay V4",
    "ScriptType: v4.00+",
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.709",
    "PlayResX: " + width,
    "PlayResY: " + height,
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    ...styleLines,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
}

function registerSceneStyles(
  styleLines: string[],
  sceneIndex: number,
  theme: AdaptiveOverlayTheme,
  width: number,
  height: number,
  kinds: { hero: boolean; scene: boolean; sequence: boolean },
  safeZone?: SafeZoneInput,
  template?: OverlayTemplateKind
): { heroMain: string; heroSmall: string; title: string; subtitle: string } {
  const titleSize = Math.round(Math.min(width, height) * 0.065);
  const subtitleSize = Math.round(titleSize * 0.55);
  const heroMain = `HCHeroMain_s${sceneIndex}`;
  const heroSmall = `HCHeroSmall_s${sceneIndex}`;
  const title = `HCStoryTitle_s${sceneIndex}`;
  const subtitle = `HCStorySubtitle_s${sceneIndex}`;

  let marginH = 48;
  if (safeZone && template) {
    const placement = resolvePlacementForTemplate(safeZone, template, width, height);
    marginH = horizontalMarginForPlacement(width, placement.textWidthFraction);
  }

  if (kinds.hero || kinds.sequence) {
    styleLines.push(assStyleLine(heroMain, "Arial Black", HERO_SIZE_MAIN, theme, 5, 154, marginH));
    styleLines.push(assStyleLine(heroSmall, "Arial Black", HERO_SIZE_SMALL, theme, 5, 154, marginH));
  }
  if (kinds.scene || kinds.sequence) {
    styleLines.push(
      assStyleLine(title, "Arial", titleSize, theme, 2, SCENE_TITLE_MARGIN_V, marginH)
    );
    styleLines.push(
      assStyleLine(
        subtitle,
        "Arial",
        subtitleSize,
        theme,
        2,
        SCENE_TITLE_MARGIN_V + titleSize + SUBTITLE_GAP,
        marginH
      )
    );
  }

  return { heroMain, heroSmall, title, subtitle };
}

function appendHeroEvents(
  events: string[],
  scene: NormalizedSceneText,
  start: number,
  end: number,
  width: number,
  height: number,
  styleNames: { heroMain: string; heroSmall: string },
  theme: AdaptiveOverlayTheme,
  safeZone?: SafeZoneInput
): void {
  const layout = layoutHeroScene(scene);
  if (!layout) {
    return;
  }
  const position = defaultHeroPosition(scene, layout.lines.length);
  const cx = resolveHeroAnchorX(width, height, safeZone);
  const anchorY = resolveHeroAnchorY(layout.lines.length, width, height, position, safeZone);
  const lineStep = HERO_SIZE_MAIN + 18;

  layout.lines.forEach((line, lineIndex) => {
    const isMain = lineIndex === layout.mainLineIndex;
    const style = isMain ? styleNames.heroMain : styleNames.heroSmall;
    const y = anchorY + lineIndex * lineStep;
    const tags = motionTags(cx, y);
    const text = heroLineWithAccents(line, layout.accentWords, theme);
    events.push(
      `Dialogue: 0,${assTime(start)},${assTime(end)},${style},,0,0,0,,${tags}${text}`
    );
  });
}

function appendSequenceEvents(
  events: string[],
  scene: NormalizedSceneText,
  start: number,
  end: number,
  width: number,
  height: number,
  styleNames: { heroMain: string; heroSmall: string; title: string; subtitle: string },
  theme: AdaptiveOverlayTheme,
  safeZone?: SafeZoneInput
): void {
  const sequenceEvents = buildSequenceAssEvents({
    scene,
    sceneStart: start,
    sceneEnd: end,
    width,
    height,
    styleNames,
    theme,
    safeZone,
    assTime,
    escapeAssText,
    heroLineWithAccents,
    motionTags,
  });
  for (const ev of sequenceEvents) {
    events.push(
      `Dialogue: 0,${assTime(ev.start)},${assTime(ev.end)},${ev.styleName},,0,0,0,,${motionTags(ev.x, ev.y)}${ev.text}`
    );
  }
}

function appendSceneEvents(
  events: string[],
  scene: NormalizedSceneText,
  start: number,
  end: number,
  width: number,
  height: number,
  styleNames: { title: string; subtitle: string },
  safeZone?: SafeZoneInput
): void {
  const title = scene.title.trim();
  const subtitle = scene.subtitle.trim();
  if (!title && !subtitle) {
    return;
  }
  const titleSize = Math.round(Math.min(width, height) * 0.065);
  let cx = Math.round(width / 2);
  let bottomThirdY = Math.round(height * 0.72);
  if (safeZone) {
    const placement = resolvePlacementForTemplate(safeZone, "scene", width, height);
    cx = placement.anchorX;
    bottomThirdY = placement.anchorY;
  }

  if (title) {
    events.push(
      `Dialogue: 0,${assTime(start)},${assTime(end)},${styleNames.title},,0,0,0,,${motionTags(cx, bottomThirdY)}${escapeAssText(title)}`
    );
  }
  if (subtitle) {
    const subY = bottomThirdY + titleSize + SUBTITLE_GAP;
    events.push(
      `Dialogue: 0,${assTime(start)},${assTime(end)},${styleNames.subtitle},,0,0,0,,${motionTags(cx, subY)}${escapeAssText(subtitle)}`
    );
  }
}

export type BuildStoryOverlayAssInput = {
  sceneTexts: InstantSceneText[] | NormalizedSceneText[];
  durationSeconds: number;
  width: number;
  height: number;
  themeByIndex?: Map<number, AdaptiveOverlayTheme | null>;
  safeZoneByIndex?: Map<number, SafeZoneInput>;
};

export function buildStoryOverlayAss(input: BuildStoryOverlayAssInput): string {
  const { sceneTexts, durationSeconds, width, height, themeByIndex, safeZoneByIndex } = input;
  const normalized = sceneTexts.map((s) => normalizeSceneText(s));
  const styleLines: string[] = [];
  const events: string[] = [];
  const styleNamesByScene = new Map<
    number,
    ReturnType<typeof registerSceneStyles>
  >();

  for (let index = 0; index < normalized.length; index += 1) {
    const scene = normalized[index]!;
    const resolved = chooseTemplate(scene);
    if (resolved === "skip") {
      continue;
    }
    const theme = resolveSceneTheme(themeByIndex, safeZoneByIndex, index, width, height, resolved);
    const safeZone = safeZoneByIndex?.get(index) ?? null;
    const names = registerSceneStyles(styleLines, index, theme, width, height, {
      hero: resolved === "hero",
      scene: resolved === "scene",
      sequence: resolved === "sequence",
    }, safeZone, resolved);
    styleNamesByScene.set(index, names);
  }

  const header = buildAssHeader(width, height, styleLines);

  for (let index = 0; index < normalized.length; index += 1) {
    const scene = normalized[index]!;
    const resolved = chooseTemplate(scene);
    if (resolved === "skip") {
      continue;
    }
    const timing = getSceneTimingWindows(normalized, durationSeconds, normalized.length)[index];
    const start = timing?.start ?? sceneOverlayTiming(index, normalized.length, durationSeconds).start;
    const end = timing?.end ?? sceneOverlayTiming(index, normalized.length, durationSeconds).end;
    if (end <= start) {
      continue;
    }
    const names = styleNamesByScene.get(index);
    if (!names) {
      continue;
    }
    const theme = resolveSceneTheme(themeByIndex, safeZoneByIndex, index, width, height, resolved);
    const safeZone = safeZoneByIndex?.get(index) ?? null;
    if (resolved === "hero") {
      appendHeroEvents(events, scene, start, end, width, height, names, theme, safeZone);
    } else if (resolved === "sequence") {
      appendSequenceEvents(events, scene, start, end, width, height, names, theme, safeZone);
    } else {
      appendSceneEvents(events, scene, start, end, width, height, names, safeZone);
    }
  }

  return [...header, ...events].join("\n");
}

function escapeFilterPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

export type BurnStoryTextOverlayInput = {
  inputVideoPath: string;
  outputVideoPath: string;
  assContent: string;
  workDir: string;
};

export async function burnStoryTextOverlay(input: BurnStoryTextOverlayInput): Promise<void> {
  const assPath = path.join(input.workDir, "story-overlay.ass");
  await fs.writeFile(assPath, input.assContent, "utf8");
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const assEscaped = escapeFilterPath(assPath);
  const vf = `subtitles='${assEscaped}'`;
  const args = [
    "-y",
    "-i",
    input.inputVideoPath,
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-c:a",
    "copy",
    input.outputVideoPath,
  ];
  let result = await runFfmpegCapture(ffmpeg, args, { timeoutMs: 10 * 60 * 1000 });
  if (result.code !== 0) {
    const fallbackArgs = [
      "-y",
      "-i",
      input.inputVideoPath,
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      input.outputVideoPath,
    ];
    result = await runFfmpegCapture(ffmpeg, fallbackArgs, { timeoutMs: 10 * 60 * 1000 });
  }
  if (result.code !== 0) {
    throw new Error(
      `Story text overlay failed: ${result.output?.slice(-500) ?? "ffmpeg error"}`
    );
  }
}

function collectSceneOverlayWindows(
  normalized: NormalizedSceneText[],
  durationSeconds: number
): SceneOverlayWindow[] {
  const windows: SceneOverlayWindow[] = [];
  for (let index = 0; index < normalized.length; index += 1) {
    if (chooseTemplate(normalized[index]!) === "skip") {
      continue;
    }
    const timing = getSceneTimingWindows(normalized, durationSeconds, normalized.length)[index];
    const start =
      timing?.start ?? sceneOverlayTiming(index, normalized.length, durationSeconds).start;
    const end = timing?.end ?? sceneOverlayTiming(index, normalized.length, durationSeconds).end;
    windows.push({ sceneIndex: index, start, end });
  }
  return windows;
}

export async function applyStorySceneTextOverlay(params: {
  inputVideoPath: string;
  outputVideoPath: string;
  sceneTexts: InstantSceneText[];
  durationSeconds: number;
  width: number;
  height: number;
  workDir: string;
  adaptiveOverlay?: boolean;
}): Promise<boolean> {
  const hasCopy = params.sceneTexts.some((s) => hasSceneOverlayContent(s));
  if (!hasCopy) {
    return false;
  }

  const normalized = params.sceneTexts.map((s) => normalizeSceneText(s));
  let themeByIndex: Map<number, AdaptiveOverlayTheme | null> | undefined;
  let safeZoneByIndex: Map<number, SafeZoneInput> | undefined;

  if (params.adaptiveOverlay !== false) {
    const windows = collectSceneOverlayWindows(normalized, params.durationSeconds);
    if (windows.length > 0) {
      try {
        const contexts = await buildAdaptiveOverlayContextsForScenes({
          inputVideoPath: params.inputVideoPath,
          sceneWindows: windows,
          workDir: params.workDir,
        });
        themeByIndex = new Map();
        safeZoneByIndex = new Map();
        for (const [index, ctx] of contexts) {
          themeByIndex.set(index, ctx?.theme ?? null);
          if (ctx?.detection) {
            const sceneSafeZone = buildSceneSafeZoneContext({
              detection: ctx.detection,
              sceneText: sceneTextForSafeZone(normalized[index] ?? emptyNormalizedSceneText()),
              width: params.width,
              height: params.height,
            });
            safeZoneByIndex.set(index, sceneSafeZone);
            if (isSafeZoneDebugEnabled()) {
              console.info("[hc-safe-zone-enhanced]", buildEnhancedSafeZoneDebugInfo(index, sceneSafeZone));
            }
          } else {
            safeZoneByIndex.set(index, ctx?.safeZone ?? null);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[hc-adaptive-overlay]", {
          warning: "Adaptive theme batch failed; using V2 defaults.",
          error: message,
        });
        themeByIndex = undefined;
        safeZoneByIndex = undefined;
      }
    }
  }

  const assContent = buildStoryOverlayAss({
    sceneTexts: params.sceneTexts,
    durationSeconds: params.durationSeconds,
    width: params.width,
    height: params.height,
    themeByIndex,
    safeZoneByIndex,
  });
  await burnStoryTextOverlay({
    inputVideoPath: params.inputVideoPath,
    outputVideoPath: params.outputVideoPath,
    assContent,
    workDir: params.workDir,
  });
  return true;
}
