import path from "node:path";
import fs from "node:fs/promises";
import {
  chooseTemplate,
  detectAccentWords,
  emptyNormalizedSceneText,
  getSceneTimingWindows,
  hasSceneOverlayContent,
  heroSourceText,
  layoutHeroScene,
  normalizeSceneText,
  resolveSequenceLineStyle,
  buildSceneFieldRevealSlots,
  buildSceneLayeredRevealSlots,
  buildStagedRevealSlots,
  getSceneHeadline,
  resolveSceneOverlayStart,
  resolveSceneOverlayVisibleEnd,
  sceneOverlayTiming,
  storyOverlayMotionTags,
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
import {
  isSafeZoneDebugEnabled,
  SAFE_AREA_MARGIN_H,
  SAFE_AREA_MARGIN_V,
  type SafeZoneId,
} from "@/server/animation-export/safe-zone-placement";
import {
  clampAssAnchor,
  clampHeroLineAnchors,
  resolveExtraLinePositions,
  resolveStoryLayerPositions,
  assTextBounds,
  STORY_HEADLINE_ASS_ALIGNMENT,
  STORY_SUBTITLE_ASS_ALIGNMENT,
  STORY_TITLE_ASS_ALIGNMENT,
} from "@/server/animation-export/story-layer-placement";
import type { ObjectAwarePlacement, OverlayTemplateKind } from "@/server/animation-export/object-aware-placement";
import {
  applyTypographyToTheme,
  LEGACY_HERO_SIZE_MAIN,
  LEGACY_HERO_SIZE_SMALL,
  legacySceneSubtitleSize,
  legacySceneTitleSize,
  logAdaptiveTypographyDebug,
  overlayTemplateToTypography,
  resolveTypographyFromPlacement,
  type AdaptiveTypographyResult,
} from "@/server/animation-export/adaptive-typography";
import {
  STORY_ASS_SUBTITLE_GAP_PX,
  STORY_HEADLINE_TO_TITLE_RATIO,
} from "@/lib/story-overlay-typography-scale";
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
  buildSceneFieldRevealSlots,
  buildSceneLayeredRevealSlots,
  buildStagedRevealSlots,
  getSceneHeadline,
  sceneOverlayTiming,
  storyOverlayMotionTags,
} from "@/lib/story-overlay-templates";
import { buildSequenceAssEvents } from "@/server/animation-export/story-sequence-overlay";
import { chooseFinaleChannel } from "@/server/animation-export/story-overlay-collision";
import {
  makeDialogueDraft,
  resolveSceneDialogueCollisions,
  type FinalizeSceneDialoguesResult,
  type StoryDialogueDraft,
} from "@/server/animation-export/story-overlay-dialogue";
import {
  collectOcrAvoidBoxesForScene,
  storyFailSafeAvoidBoxes,
} from "@/server/animation-export/story-overlay-avoid-zones";
import {
  createEmptyStoryModeDebugReport,
  isStoryModeDebugEnabled,
  logStoryModeDebugReport,
  stashStoryModeDebugReport,
  type StoryModeDebugReport,
  type StorySceneDebugEntry,
} from "@/lib/story-mode-debug";
import { resolveSceneEmotionId } from "@/lib/animation-scene-emotions";

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

const SCENE_TITLE_MARGIN_V = 72;
const STORY_FOOTER_ASS_ALIGNMENT = 2;

type SceneFontSizes = {
  heroMain: number;
  heroSmall: number;
  headline: number;
  title: number;
  subtitle: number;
};

function defaultSceneFontSizes(width: number, height: number): SceneFontSizes {
  const title = legacySceneTitleSize(width, height);
  return {
    heroMain: LEGACY_HERO_SIZE_MAIN,
    heroSmall: LEGACY_HERO_SIZE_SMALL,
    headline: Math.round(title * STORY_HEADLINE_TO_TITLE_RATIO),
    title,
    subtitle: legacySceneSubtitleSize(title),
  };
}

function zoneContrastFromSafeZone(
  safeZone: SafeZoneInput | null | undefined,
  zoneId: string
): number | undefined {
  if (!safeZone) {
    return undefined;
  }
  const zones = "enhanced" in safeZone ? safeZone.enhanced.zones : safeZone.zones;
  return zones.find((z) => z.zoneId === zoneId)?.contrast;
}

function tryAdaptiveTypography(params: {
  text: string;
  template: ReturnType<typeof overlayTemplateToTypography>;
  placement: ReturnType<typeof resolvePlacementForTemplate> | undefined;
  width: number;
  height: number;
  safeZone: SafeZoneInput | null | undefined;
  accentWords: string[];
  sceneIndex: number;
}): AdaptiveTypographyResult | null {
  const { text, template, placement, width, height, safeZone, accentWords, sceneIndex } = params;
  if (!placement || !text.trim()) {
    return null;
  }
  try {
    const isBusy = Boolean(safeZone && "useStrongBackdrop" in safeZone && safeZone.useStrongBackdrop);
    const objectDetectionConfidence =
      safeZone && "detection" in safeZone && safeZone.detection.objectDetections.length > 0 ?
        Math.max(...safeZone.detection.objectDetections.map((d) => d.confidence))
      : undefined;
    const typography = resolveTypographyFromPlacement({
      text,
      template,
      placement,
      frameWidth: width,
      frameHeight: height,
      accentWords,
      sceneIntent: safeZone && "intent" in safeZone ? safeZone.intent : undefined,
      isBusy,
      contrast: zoneContrastFromSafeZone(safeZone, placement.zoneId),
      objectDetectionConfidence,
    });
    logAdaptiveTypographyDebug({
      sceneIndex,
      template,
      zoneId: placement.zoneId,
      typography,
    });
    return typography;
  } catch {
    return null;
  }
}

function heroMainLineIndex(lines: string[], accentWords: string[]): number {
  if (lines.length >= 3) {
    return 1;
  }
  if (lines.length === 2) {
    return lines[1]!.length >= lines[0]!.length ? 1 : 0;
  }
  const accentSet = new Set(accentWords.map((w) => w.toUpperCase()));
  for (let i = 0; i < lines.length; i += 1) {
    const lineUpper = lines[i]!.toUpperCase();
    if ([...accentSet].some((a) => lineUpper.includes(a))) {
      return i;
    }
  }
  return 0;
}

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

type MotionTagOptions = { finaleHold?: boolean; instant?: boolean };

function motionTags(x: number, y: number, options?: boolean | MotionTagOptions): string {
  const opts: MotionTagOptions =
    typeof options === "boolean" ? { finaleHold: options } : (options ?? {});
  return storyOverlayMotionTags(x, y, opts);
}

function buildOverlayTextBlockSummary(
  scene: NormalizedSceneText,
  resolved: ReturnType<typeof chooseTemplate>
): Array<{ kind: import("@/lib/story-mode-debug").StoryOverlayLayerKind; text: string }> {
  const blocks: Array<{ kind: import("@/lib/story-mode-debug").StoryOverlayLayerKind; text: string }> = [];
  const hero = heroSourceText(scene);
  if (resolved === "hero" && hero) {
    blocks.push({ kind: "hero", text: hero });
  }
  if (resolved === "scene") {
    const headline = getSceneHeadline(scene);
    if (headline) {
      blocks.push({ kind: "headline", text: headline });
    }
    if (scene.title.trim()) {
      blocks.push({ kind: "title", text: scene.title });
    }
    if (scene.subtitle.trim()) {
      blocks.push({ kind: "subtitle", text: scene.subtitle });
    }
    scene.extraLines.forEach((line, i) => {
      if (line.trim()) {
        blocks.push({ kind: "extra", text: line });
      }
    });
  }
  if (resolved === "sequence") {
    scene.lines.forEach((line) => {
      if (line.text.trim()) {
        blocks.push({ kind: "sequence_line", text: line.text });
      }
    });
    if (scene.heroFinaleText.trim()) {
      blocks.push({ kind: "hero_finale", text: scene.heroFinaleText });
    }
  }
  if (scene.finaleFooter.trim()) {
    blocks.push({ kind: "finale_footer", text: scene.finaleFooter });
  }
  return blocks;
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
    const lineStep = LEGACY_HERO_SIZE_MAIN + 18;
    const blockHeight = lineCount * lineStep;
    return Math.max(
      Math.round(height * SAFE_AREA_MARGIN_V) + lineStep / 2,
      placement.anchorY - blockHeight / 2 + lineStep / 2
    );
  }
  const lineStep = LEGACY_HERO_SIZE_MAIN + 20;
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

function logStoryLayerPositions(sceneIndex: number, positions: ReturnType<typeof resolveStoryLayerPositions>): void {
  if (!isSafeZoneDebugEnabled()) {
    return;
  }
  console.info("[hc-story-layer-placement]", { sceneIndex, ...positions });
}

function defaultHeroPosition(
  scene: NormalizedSceneText,
  _lineCount: number
): NormalizedSceneText["templatePosition"] {
  if (scene.templatePosition) {
    return scene.templatePosition;
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
  template: OverlayTemplateKind,
  typography?: AdaptiveTypographyResult | null
): AdaptiveOverlayTheme {
  const base = resolveSceneOverlayTheme(themeByIndex, sceneIndex);
  const safeZone = safeZoneByIndex?.get(sceneIndex);
  if (!safeZone) {
    return typography ? applyTypographyToTheme(base, typography) : base;
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
  if (typography) {
    theme = applyTypographyToTheme(theme, typography);
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
  sizes: SceneFontSizes,
  safeZone?: SafeZoneInput,
  template?: OverlayTemplateKind,
  extraLineCount = 0,
  hasFinaleFooter = false
): {
  heroMain: string;
  heroSmall: string;
  headline: string;
  title: string;
  subtitle: string;
  extraLines: string[];
  finaleFooter: string;
} {
  const heroMain = `HCHeroMain_s${sceneIndex}`;
  const heroSmall = `HCHeroSmall_s${sceneIndex}`;
  const headline = `HCStoryHeadline_s${sceneIndex}`;
  const title = `HCStoryTitle_s${sceneIndex}`;
  const subtitle = `HCStorySubtitle_s${sceneIndex}`;

  let marginH = 48;
  if (safeZone && template) {
    const placement = resolvePlacementForTemplate(safeZone, template, width, height);
    marginH = horizontalMarginForPlacement(width, placement.textWidthFraction);
  }

  if (kinds.hero || kinds.sequence) {
    styleLines.push(
      assStyleLine(heroMain, "Arial Black", sizes.heroMain, theme, 5, 154, marginH)
    );
    styleLines.push(
      assStyleLine(heroSmall, "Arial Black", sizes.heroSmall, theme, 5, 154, marginH)
    );
  }
  if (kinds.scene || kinds.sequence) {
    styleLines.push(
      assStyleLine(headline, "Arial Black", sizes.headline, theme, STORY_HEADLINE_ASS_ALIGNMENT, 120, marginH)
    );
    styleLines.push(
      assStyleLine(title, "Arial", sizes.title, theme, STORY_TITLE_ASS_ALIGNMENT, SCENE_TITLE_MARGIN_V, marginH)
    );
    styleLines.push(
      assStyleLine(
        subtitle,
        "Arial",
        sizes.subtitle,
        theme,
        STORY_SUBTITLE_ASS_ALIGNMENT,
        SCENE_TITLE_MARGIN_V + sizes.title + STORY_ASS_SUBTITLE_GAP_PX,
        marginH
      )
    );
    for (let extraIndex = 0; extraIndex < extraLineCount; extraIndex += 1) {
      const extraStyle = `HCStoryExtra${extraIndex}_s${sceneIndex}`;
      styleLines.push(
        assStyleLine(
          extraStyle,
          "Arial",
          sizes.subtitle,
          theme,
          STORY_SUBTITLE_ASS_ALIGNMENT,
          SCENE_TITLE_MARGIN_V + sizes.title + STORY_ASS_SUBTITLE_GAP_PX,
          marginH
        )
      );
    }
  }

  const extraLines = Array.from({ length: extraLineCount }, (_, extraIndex) => `HCStoryExtra${extraIndex}_s${sceneIndex}`);
  const finaleFooter = `HCStoryFooter_s${sceneIndex}`;

  if (hasFinaleFooter) {
    styleLines.push(
      assStyleLine(
        finaleFooter,
        "Arial",
        Math.round(sizes.subtitle * 0.78),
        theme,
        STORY_FOOTER_ASS_ALIGNMENT,
        Math.round(height * SAFE_AREA_MARGIN_V) + 8,
        marginH
      )
    );
  }

  return { heroMain, heroSmall, headline, title, subtitle, extraLines, finaleFooter };
}

function collectFinaleFooterDraft(
  params: {
    scene: NormalizedSceneText;
    sceneIndex: number;
    start: number;
    visibleEnd: number;
    width: number;
    height: number;
    subtitleSize: number;
    styleName: string;
    revealStart?: number;
  }
): StoryDialogueDraft | null {
  const finaleFooterRaw = params.scene.finaleFooter.trim();
  if (!finaleFooterRaw) {
    return null;
  }
  const footerFontSize = Math.max(28, Math.round(params.subtitleSize * 0.78));
  const footerY = Math.round(
    params.height * (1 - SAFE_AREA_MARGIN_V) - footerFontSize * 0.35
  );
  const footerClamped = clampAssAnchor({
    x: Math.round(params.width / 2),
    y: footerY,
    alignment: STORY_FOOTER_ASS_ALIGNMENT,
    lines: [finaleFooterRaw],
    fontSize: footerFontSize,
    frameWidth: params.width,
    frameHeight: params.height,
  });
  const revealStart = params.revealStart ?? params.start;
  return makeDialogueDraft({
    id: `s${params.sceneIndex}-footer`,
    kind: "finale_footer",
    sceneIndex: params.sceneIndex,
    styleName: params.styleName,
    assText: escapeAssText(finaleFooterRaw),
    lines: [finaleFooterRaw],
    x: footerClamped.clampedX,
    y: footerClamped.clampedY,
    alignment: STORY_FOOTER_ASS_ALIGNMENT,
    fontSize: footerFontSize,
    start: revealStart,
    end: params.visibleEnd,
    motionFinaleHold: true,
  });
}

function collectHeroDialogueDrafts(
  scene: NormalizedSceneText,
  start: number,
  end: number,
  width: number,
  height: number,
  styleNames: { heroMain: string; heroSmall: string; finaleFooter: string },
  theme: AdaptiveOverlayTheme,
  safeZone?: SafeZoneInput,
  heroTypography?: AdaptiveTypographyResult | null,
  sceneIndex = 0,
  options?: { visibleEnd?: number; isFinalScene?: boolean }
): StoryDialogueDraft[] {
  const drafts: StoryDialogueDraft[] = [];
  const visibleEnd = options?.visibleEnd ?? end;
  const finaleHold = options?.isFinalScene ?? false;
  const source = heroSourceText(scene);
  const accentWords = detectAccentWords(source, scene);
  const placement = safeZone ? resolvePlacementForTemplate(safeZone, "hero", width, height) : undefined;
  const adaptive =
    heroTypography ??
    tryAdaptiveTypography({
      text: source,
      template: "hero",
      placement,
      width,
      height,
      safeZone: safeZone ?? null,
      accentWords,
      sceneIndex,
    });

  const layout = layoutHeroScene(scene);
  if (!layout && !adaptive?.lines.length) {
    return drafts;
  }

  const lines = adaptive?.lines.length ? adaptive.lines : layout!.lines;
  const mainLineIndex =
    adaptive?.lines.length ? heroMainLineIndex(lines, accentWords) : layout!.mainLineIndex;
  const accents = layout?.accentWords ?? accentWords;

  const position = defaultHeroPosition(scene, lines.length);
  const cx = resolveHeroAnchorX(width, height, safeZone);
  const mainSize = adaptive?.fontSize ?? LEGACY_HERO_SIZE_MAIN;
  const smallSize = adaptive ? Math.round(adaptive.fontSize * 0.63) : LEGACY_HERO_SIZE_SMALL;
  const lineStep = mainSize + 18;
  let anchorY = resolveHeroAnchorY(lines.length, width, height, position, safeZone);
  let clampedCx = cx;

  const firstLineBounds = assTextBounds({
    x: cx,
    y: anchorY,
    alignment: STORY_HEADLINE_ASS_ALIGNMENT,
    lines: [lines[0] ?? ""],
    fontSize: mainSize,
  });
  const safeLeft = width * SAFE_AREA_MARGIN_H;
  const safeRight = width * (1 - SAFE_AREA_MARGIN_H);
  const safeTop = height * SAFE_AREA_MARGIN_V;
  const safeBottom = height * (1 - SAFE_AREA_MARGIN_V);
  const needsClamp =
    firstLineBounds.left < safeLeft ||
    firstLineBounds.right > safeRight ||
    firstLineBounds.top < safeTop ||
    firstLineBounds.bottom > safeBottom;

  if (needsClamp) {
    const heroClamp = clampHeroLineAnchors({
      cx,
      startY: anchorY,
      lines,
      mainFontSize: mainSize,
      smallFontSize: smallSize,
      mainLineIndex,
      width,
      height,
    });
    clampedCx = heroClamp.cx;
    anchorY = heroClamp.startY;
  }

  const revealSlots =
    lines.length > 1 ?
      buildStagedRevealSlots(start, visibleEnd, lines.length, { stepSec: 0.55, minStepSec: 0.35 })
    : [{ index: 0, revealStart: start, visibleEnd }];

  let yCursor = anchorY;
  lines.forEach((line, lineIndex) => {
    const isMain = lineIndex === mainLineIndex;
    const style = isMain ? styleNames.heroMain : styleNames.heroSmall;
    const step = isMain ? lineStep : smallSize + 14;
    const y = yCursor;
    yCursor += step;
    const slot = revealSlots[lineIndex] ?? revealSlots[revealSlots.length - 1]!;
    const lineStart = slot.revealStart;
    const lineEnd = slot.visibleEnd;
    const text = heroLineWithAccents(line, accents, theme);
    drafts.push(
      makeDialogueDraft({
        id: `s${sceneIndex}-hero-${lineIndex}`,
        kind: "hero",
        sceneIndex,
        styleName: style,
        assText: text,
        lines: [line],
        x: clampedCx,
        y,
        alignment: 5,
        fontSize: isMain ? mainSize : smallSize,
        start: lineStart,
        end: lineEnd,
        motionFinaleHold: finaleHold,
        motionInstant: sceneIndex === 0 && lineIndex === 0,
      })
    );
  });

  const finaleChannel = chooseFinaleChannel({
    heroFinaleText: scene.heroFinaleText,
    finaleFooter: scene.finaleFooter,
    template: "hero",
  });
  if (finaleHold && finaleChannel === "finale_footer" && scene.finaleFooter.trim()) {
    const sizes = defaultSceneFontSizes(width, height);
    const footer = collectFinaleFooterDraft({
      scene,
      sceneIndex,
      start,
      visibleEnd,
      width,
      height,
      subtitleSize: sizes.subtitle,
      styleName: styleNames.finaleFooter,
    });
    if (footer) {
      drafts.push(footer);
    }
  }
  return drafts;
}

function collectSequenceDialogueDrafts(
  scene: NormalizedSceneText,
  start: number,
  end: number,
  width: number,
  height: number,
  styleNames: { heroMain: string; heroSmall: string; title: string; subtitle: string; finaleFooter: string },
  theme: AdaptiveOverlayTheme,
  safeZone?: SafeZoneInput,
  sceneIndex = 0,
  options?: { visibleEnd?: number; isFinalScene?: boolean }
): StoryDialogueDraft[] {
  const drafts: StoryDialogueDraft[] = [];
  const visibleEnd = options?.visibleEnd ?? end;
  const finaleHold = options?.isFinalScene ?? false;
  const sequenceEvents = buildSequenceAssEvents({
    scene,
    sceneStart: start,
    sceneEnd: visibleEnd,
    width,
    height,
    styleNames,
    theme,
    safeZone,
    sceneIndex,
    assTime,
    escapeAssText,
    heroLineWithAccents,
    motionTags,
  });
  for (const [evIndex, ev] of sequenceEvents.entries()) {
    const isFinaleLine = ev.styleName === styleNames.heroMain && scene.heroFinaleText.trim().length > 0;
    drafts.push(
      makeDialogueDraft({
        id: `s${sceneIndex}-seq-${evIndex}`,
        kind: isFinaleLine ? "hero_finale" : "sequence_line",
        sceneIndex,
        styleName: ev.styleName,
        assText: ev.text,
        lines: ev.text.split("\\N").filter(Boolean),
        x: ev.x,
        y: ev.y,
        alignment: 5,
        fontSize: ev.styleName === styleNames.heroMain ? LEGACY_HERO_SIZE_MAIN : LEGACY_HERO_SIZE_SMALL,
        start: ev.start,
        end: ev.end,
        motionFinaleHold: finaleHold,
        motionInstant: sceneIndex === 0 && evIndex === 0 && ev.start <= start + 0.01,
      })
    );
  }

  const finaleChannel = chooseFinaleChannel({
    heroFinaleText: scene.heroFinaleText,
    finaleFooter: scene.finaleFooter,
    template: "sequence",
  });
  if (
    finaleHold &&
    finaleChannel === "both_separate" &&
    scene.finaleFooter.trim()
  ) {
    const sizes = defaultSceneFontSizes(width, height);
    const footer = collectFinaleFooterDraft({
      scene,
      sceneIndex,
      start,
      visibleEnd,
      width,
      height,
      subtitleSize: sizes.subtitle,
      styleName: styleNames.finaleFooter,
    });
    if (footer) {
      drafts.push(footer);
    }
  }
  return drafts;
}

function collectSceneDialogueDrafts(
  scene: NormalizedSceneText,
  start: number,
  end: number,
  width: number,
  height: number,
  styleNames: {
    headline: string;
    title: string;
    subtitle: string;
    extraLines: string[];
    finaleFooter: string;
  },
  safeZone?: SafeZoneInput,
  precomputedTypography?: {
    headline?: AdaptiveTypographyResult | null;
    title?: AdaptiveTypographyResult | null;
    subtitle?: AdaptiveTypographyResult | null;
  } | null,
  _legacySubtitleTypography?: AdaptiveTypographyResult | null,
  sceneIndex = 0,
  options?: { visibleEnd?: number; isFinalScene?: boolean }
): StoryDialogueDraft[] {
  const drafts: StoryDialogueDraft[] = [];
  const visibleEnd = options?.visibleEnd ?? end;
  const finaleHold = options?.isFinalScene ?? false;
  const finaleFooterRaw = scene.finaleFooter.trim();
  const headlineRaw = getSceneHeadline(scene);
  const titleRaw = scene.title.trim();
  const subtitleRaw = scene.subtitle.trim();
  const extraLineTexts = scene.extraLines.map((line) => line.trim()).filter(Boolean);
  if (
    !headlineRaw &&
    !titleRaw &&
    !subtitleRaw &&
    extraLineTexts.length === 0 &&
    !(finaleHold && finaleFooterRaw)
  ) {
    return drafts;
  }

  const accentWords = scene.accentWords;
  const headlinePlacement =
    safeZone ? resolvePlacementForTemplate(safeZone, "headline", width, height) : undefined;
  const titlePlacement =
    safeZone ? resolvePlacementForTemplate(safeZone, "title", width, height) : undefined;
  const subtitlePlacement =
    safeZone ? resolvePlacementForTemplate(safeZone, "subtitle", width, height) : undefined;

  const headlineTypo =
    precomputedTypography?.headline ??
    (headlineRaw ?
      tryAdaptiveTypography({
        text: headlineRaw,
        template: "headline",
        placement: headlinePlacement,
        width,
        height,
        safeZone: safeZone ?? null,
        accentWords,
        sceneIndex,
      })
    : null);
  const titleTypo =
    precomputedTypography?.title ??
    (titleRaw ?
      tryAdaptiveTypography({
        text: titleRaw,
        template: "scene",
        placement: titlePlacement,
        width,
        height,
        safeZone: safeZone ?? null,
        accentWords,
        sceneIndex,
      })
    : null);
  const subtitleTypo =
    precomputedTypography?.subtitle ??
    (subtitleRaw ?
      tryAdaptiveTypography({
        text: subtitleRaw,
        template: "subtitle",
        placement: subtitlePlacement,
        width,
        height,
        safeZone: safeZone ?? null,
        accentWords,
        sceneIndex,
      })
    : null);

  const headlineLines =
    headlineTypo?.lines.length ? headlineTypo.lines : headlineRaw ? [headlineRaw] : [];
  const titleLines = titleTypo?.lines.length ? titleTypo.lines : titleRaw ? [titleRaw] : [];
  const subtitleLines =
    subtitleTypo?.lines.length ? subtitleTypo.lines : subtitleRaw ? [subtitleRaw] : [];

  const titleSize = titleTypo?.fontSize ?? legacySceneTitleSize(width, height);
  const subtitleSize = subtitleTypo?.fontSize ?? legacySceneSubtitleSize(titleSize);

  const headlineFontSize = headlineTypo?.fontSize ?? Math.round(titleSize * STORY_HEADLINE_TO_TITLE_RATIO);
  let layerPositions: ReturnType<typeof resolveStoryLayerPositions> | null = null;

  if (safeZone && "placements" in safeZone) {
    layerPositions = resolveStoryLayerPositions({
      placements: safeZone.placements,
      width,
      height,
      headlineLines,
      titleLines,
      subtitleLines,
      headlineFontSize,
      titleFontSize: titleSize,
      subtitleFontSize: subtitleSize,
    });
  } else if (headlinePlacement || titlePlacement || subtitlePlacement) {
    const wrap = (placement: typeof headlinePlacement): ObjectAwarePlacement | undefined =>
      placement ?
        {
          ...placement,
          placementReason: "safe_zone_v1_fallback",
          confidence: 0.5,
          intent: "generic",
        }
      : undefined;

    layerPositions = resolveStoryLayerPositions({
      placements: {
        hero: wrap(headlinePlacement) ?? wrap(titlePlacement)!,
        headline: wrap(headlinePlacement) ?? wrap(titlePlacement)!,
        title: wrap(titlePlacement) ?? wrap(headlinePlacement)!,
        subtitle: wrap(subtitlePlacement) ?? wrap(titlePlacement)!,
        scene: wrap(titlePlacement) ?? wrap(subtitlePlacement)!,
        sequence: wrap(titlePlacement)!,
        heroFinale: wrap(headlinePlacement) ?? wrap(titlePlacement)!,
      },
      width,
      height,
      headlineLines,
      titleLines,
      subtitleLines,
      headlineFontSize,
      titleFontSize: titleSize,
      subtitleFontSize: subtitleSize,
    });
  }

  logStoryLayerPositions(sceneIndex, layerPositions ?? {});

  const headlineX = layerPositions?.headline?.clampedX ?? headlinePlacement?.anchorX ?? Math.round(width / 2);
  const headlineY =
    layerPositions?.headline?.clampedY ??
    headlinePlacement?.anchorY ??
    Math.round(height * (SAFE_AREA_MARGIN_V + 0.1));
  const titleX = layerPositions?.title?.clampedX ?? titlePlacement?.anchorX ?? Math.round(width / 2);
  const titleY = layerPositions?.title?.clampedY ?? titlePlacement?.anchorY ?? Math.round(height * 0.52);
  const subtitleX = layerPositions?.subtitle?.clampedX ?? titleX;
  const subtitleY =
    layerPositions?.subtitle?.clampedY ??
    (titleLines.length > 0 ? titleY + titleSize + STORY_ASS_SUBTITLE_GAP_PX : subtitlePlacement?.anchorY ?? titleY + titleSize + STORY_ASS_SUBTITLE_GAP_PX);

  const reveal = buildSceneLayeredRevealSlots(start, visibleEnd, {
    headline: headlineLines.length > 0,
    title: titleLines.length > 0,
    subtitle: subtitleLines.length > 0,
    extraLineCount: extraLineTexts.length,
    finaleFooter: finaleHold && Boolean(finaleFooterRaw),
  });

  const occupiedZones: SafeZoneId[] = [];
  if (finaleHold && finaleFooterRaw) {
    occupiedZones.push("BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT");
  }
  if (layerPositions?.headline?.zoneId) {
    occupiedZones.push(layerPositions.headline.zoneId);
  }
  if (layerPositions?.title?.zoneId) {
    occupiedZones.push(layerPositions.title.zoneId);
  } else if (titlePlacement?.zoneId) {
    occupiedZones.push(titlePlacement.zoneId);
  }
  const zoneScores =
    safeZone && "enhanced" in safeZone ?
      safeZone.enhanced.zones.map((zone) => ({ zoneId: zone.zoneId, score: zone.score }))
    : safeZone ?
      safeZone.zones.map((zone) => ({ zoneId: zone.zoneId, score: zone.score }))
    : undefined;
  const titleSubtitleBottom = Math.max(
    layerPositions?.subtitle ?
      assTextBounds({
        x: layerPositions.subtitle.clampedX,
        y: layerPositions.subtitle.clampedY,
        alignment: STORY_SUBTITLE_ASS_ALIGNMENT,
        lines: subtitleLines.length > 0 ? subtitleLines : [subtitleRaw || " "],
        fontSize: subtitleSize,
      }).bottom
    : subtitleY + subtitleSize / 2,
    layerPositions?.title ?
      assTextBounds({
        x: layerPositions.title.clampedX,
        y: layerPositions.title.clampedY,
        alignment: STORY_TITLE_ASS_ALIGNMENT,
        lines: titleLines.length > 0 ? titleLines : [titleRaw || " "],
        fontSize: titleSize,
      }).bottom
    : titleY + titleSize / 2,
    headlineY + headlineFontSize
  );
  const extraLinePositions = resolveExtraLinePositions({
    extraLines: extraLineTexts,
    fontSize: subtitleSize,
    width,
    height,
    occupiedZoneIds: occupiedZones,
    zoneScores,
    minY: titleSubtitleBottom + STORY_ASS_SUBTITLE_GAP_PX,
  });

  if (headlineLines.length > 0) {
    const headlineText = headlineLines.map((l) => escapeAssText(l)).join("\\N");
    const slot = reveal.headline ?? { revealStart: start, visibleEnd };
    drafts.push(
      makeDialogueDraft({
        id: `s${sceneIndex}-headline`,
        kind: "headline",
        sceneIndex,
        styleName: styleNames.headline,
        assText: headlineText,
        lines: headlineLines,
        x: headlineX,
        y: headlineY,
        fontSize: headlineFontSize,
        start: slot.revealStart,
        end: slot.visibleEnd,
        motionFinaleHold: finaleHold,
        motionInstant: sceneIndex === 0,
      })
    );
  }
  if (titleLines.length > 0) {
    const titleText = titleLines.map((l) => escapeAssText(l)).join("\\N");
    const slot = reveal.title ?? { revealStart: start, visibleEnd };
    drafts.push(
      makeDialogueDraft({
        id: `s${sceneIndex}-title`,
        kind: "title",
        sceneIndex,
        styleName: styleNames.title,
        assText: titleText,
        lines: titleLines,
        x: titleX,
        y: titleY,
        fontSize: titleSize,
        start: slot.revealStart,
        end: slot.visibleEnd,
        motionFinaleHold: finaleHold,
      })
    );
  }
  if (subtitleLines.length > 0) {
    const subtitleText = subtitleLines.map((l) => escapeAssText(l)).join("\\N");
    const slot = reveal.subtitle ?? { revealStart: start, visibleEnd };
    drafts.push(
      makeDialogueDraft({
        id: `s${sceneIndex}-subtitle`,
        kind: "subtitle",
        sceneIndex,
        styleName: styleNames.subtitle,
        assText: subtitleText,
        lines: subtitleLines,
        x: subtitleX,
        y: subtitleY,
        fontSize: subtitleSize,
        start: slot.revealStart,
        end: slot.visibleEnd,
        motionFinaleHold: finaleHold,
      })
    );
  }

  extraLinePositions.forEach((position, index) => {
    const line = extraLineTexts[position.lineIndex];
    if (!line) {
      return;
    }
    const styleName = styleNames.extraLines[index] ?? styleNames.extraLines[styleNames.extraLines.length - 1];
    if (!styleName) {
      return;
    }
    const slot = reveal.extraLines?.[index] ?? { revealStart: start, visibleEnd };
    drafts.push(
      makeDialogueDraft({
        id: `s${sceneIndex}-extra-${index}`,
        kind: "extra",
        sceneIndex,
        styleName,
        assText: escapeAssText(line),
        lines: [line],
        x: position.clampedX,
        y: position.clampedY,
        fontSize: subtitleSize,
        start: slot.revealStart,
        end: slot.visibleEnd,
        motionFinaleHold: finaleHold,
      })
    );
  });

  const finaleChannel = chooseFinaleChannel({
    heroFinaleText: scene.heroFinaleText,
    finaleFooter: scene.finaleFooter,
    template: "scene",
  });
  if (
    finaleHold &&
    (finaleChannel === "finale_footer" || finaleChannel === "both_separate") &&
    finaleFooterRaw
  ) {
    const footer = collectFinaleFooterDraft({
      scene,
      sceneIndex,
      start,
      visibleEnd,
      width,
      height,
      subtitleSize,
      styleName: styleNames.finaleFooter,
      revealStart:
        reveal.finaleFooter?.revealStart ??
        reveal.subtitle?.revealStart ??
        reveal.title?.revealStart ??
        reveal.headline?.revealStart ??
        start,
    });
    if (footer) {
      drafts.push(footer);
    }
  }
  return drafts;
}

export type BuildStoryOverlayAssInput = {
  sceneTexts: InstantSceneText[] | NormalizedSceneText[];
  durationSeconds: number;
  width: number;
  height: number;
  themeByIndex?: Map<number, AdaptiveOverlayTheme | null>;
  safeZoneByIndex?: Map<number, SafeZoneInput>;
  /** Receives per-scene collision resolution (for debug reports). */
  onSceneCollision?: (
    sceneIndex: number,
    result: FinalizeSceneDialoguesResult
  ) => void;
};

function resolveSceneFontSizes(params: {
  scene: NormalizedSceneText;
  resolved: "hero" | "scene" | "sequence";
  width: number;
  height: number;
  safeZone: SafeZoneInput | null | undefined;
  sceneIndex: number;
}): { sizes: SceneFontSizes; heroTypography: AdaptiveTypographyResult | null } {
  const { scene, resolved, width, height, safeZone, sceneIndex } = params;
  const sizes = defaultSceneFontSizes(width, height);
  let heroTypography: AdaptiveTypographyResult | null = null;

  if (resolved === "hero") {
    const source = heroSourceText(scene);
    const placement = safeZone ? resolvePlacementForTemplate(safeZone, "hero", width, height) : undefined;
    heroTypography = tryAdaptiveTypography({
      text: source,
      template: "hero",
      placement,
      width,
      height,
      safeZone: safeZone ?? null,
      accentWords: scene.accentWords,
      sceneIndex,
    });
    if (heroTypography) {
      sizes.heroMain = heroTypography.fontSize;
      sizes.heroSmall = Math.round(heroTypography.fontSize * 0.63);
    }
  }

  if (resolved === "scene") {
    const headline = getSceneHeadline(scene);
    const headlinePlacement =
      safeZone ? resolvePlacementForTemplate(safeZone, "headline", width, height) : undefined;
    const titlePlacement =
      safeZone ? resolvePlacementForTemplate(safeZone, "title", width, height) : undefined;
    const subtitlePlacement =
      safeZone ? resolvePlacementForTemplate(safeZone, "subtitle", width, height) : undefined;
    const headlineTypo = headline ?
      tryAdaptiveTypography({
        text: headline,
        template: "headline",
        placement: headlinePlacement,
        width,
        height,
        safeZone: safeZone ?? null,
        accentWords: scene.accentWords,
        sceneIndex,
      })
    : null;
    const titleTypo = scene.title.trim() ?
      tryAdaptiveTypography({
        text: scene.title,
        template: "scene",
        placement: titlePlacement,
        width,
        height,
        safeZone: safeZone ?? null,
        accentWords: scene.accentWords,
        sceneIndex,
      })
    : null;
    const subtitleTypo = scene.subtitle.trim() ?
      tryAdaptiveTypography({
        text: scene.subtitle,
        template: "subtitle",
        placement: subtitlePlacement,
        width,
        height,
        safeZone: safeZone ?? null,
        accentWords: scene.accentWords,
        sceneIndex,
      })
    : null;
    if (headlineTypo) {
      sizes.headline = headlineTypo.fontSize;
    }
    if (titleTypo) {
      sizes.title = titleTypo.fontSize;
    }
    if (subtitleTypo) {
      sizes.subtitle = subtitleTypo.fontSize;
    }
  }

  return { sizes, heroTypography };
}

export function buildStoryOverlayAss(input: BuildStoryOverlayAssInput): string {
  const { sceneTexts, durationSeconds, width, height, themeByIndex, safeZoneByIndex, onSceneCollision } =
    input;
  const normalized = sceneTexts.map((s) => normalizeSceneText(s));
  const styleLines: string[] = [];
  const events: string[] = [];
  const styleNamesByScene = new Map<
    number,
    ReturnType<typeof registerSceneStyles>
  >();
  const heroTypographyByScene = new Map<number, AdaptiveTypographyResult | null>();

  for (let index = 0; index < normalized.length; index += 1) {
    const scene = normalized[index]!;
    const resolved = chooseTemplate(scene);
    if (resolved === "skip") {
      continue;
    }
    const safeZone = safeZoneByIndex?.get(index) ?? null;
    const { sizes, heroTypography } = resolveSceneFontSizes({
      scene,
      resolved,
      width,
      height,
      safeZone,
      sceneIndex: index,
    });
    heroTypographyByScene.set(index, heroTypography);
    const theme = resolveSceneTheme(
      themeByIndex,
      safeZoneByIndex,
      index,
      width,
      height,
      resolved,
      heroTypography
    );
    const extraLineCount =
      resolved === "scene" ? scene.extraLines.filter((line) => line.trim()).length : 0;
    const isFinalScene = index === normalized.length - 1;
    const hasFinaleFooter = isFinalScene && Boolean(scene.finaleFooter.trim());
    const names = registerSceneStyles(
      styleLines,
      index,
      theme,
      width,
      height,
      {
        hero: resolved === "hero",
        scene: resolved === "scene",
        sequence: resolved === "sequence",
      },
      sizes,
      safeZone ?? undefined,
      resolved,
      extraLineCount,
      hasFinaleFooter
    );
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
    const rawStart = timing?.start ?? sceneOverlayTiming(index, normalized.length, durationSeconds).start;
    const start = resolveSceneOverlayStart(index, rawStart);
    const end = timing?.end ?? sceneOverlayTiming(index, normalized.length, durationSeconds).end;
    const visibleEnd = resolveSceneOverlayVisibleEnd({
      sceneIndex: index,
      sceneCount: normalized.length,
      sceneEnd: end,
      videoEnd: durationSeconds,
    });
    const isFinalScene = index === normalized.length - 1;
    if (visibleEnd <= start) {
      continue;
    }
    const names = styleNamesByScene.get(index);
    if (!names) {
      continue;
    }
    const heroTypography = heroTypographyByScene.get(index) ?? null;
    const theme = resolveSceneTheme(
      themeByIndex,
      safeZoneByIndex,
      index,
      width,
      height,
      resolved,
      heroTypography
    );
    const safeZone = safeZoneByIndex?.get(index) ?? null;
    const rawDrafts =
      resolved === "hero" ?
        collectHeroDialogueDrafts(
          scene,
          start,
          end,
          width,
          height,
          names,
          theme,
          safeZone,
          heroTypography,
          index,
          { visibleEnd, isFinalScene }
        )
      : resolved === "sequence" ?
        collectSequenceDialogueDrafts(
          scene,
          start,
          end,
          width,
          height,
          names,
          theme,
          safeZone,
          index,
          { visibleEnd, isFinalScene }
        )
      : collectSceneDialogueDrafts(
          scene,
          start,
          end,
          width,
          height,
          names,
          safeZone,
          null,
          null,
          index,
          { visibleEnd, isFinalScene }
        );

    const finalized = resolveSceneDialogueCollisions({
      drafts: rawDrafts,
      frameWidth: width,
      frameHeight: height,
    });
    onSceneCollision?.(index, finalized);
    events.push(...finalized.events);
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

export type ApplyStorySceneTextOverlayInput = {
  inputVideoPath: string;
  outputVideoPath: string;
  sceneTexts: InstantSceneText[];
  durationSeconds: number;
  width: number;
  height: number;
  workDir: string;
  adaptiveOverlay?: boolean;
  projectId?: string;
  aspectRatio?: string;
  sceneIds?: string[];
  imageMeta?: Array<{ imageId: string; order: number; bakedTextBlocksJson?: unknown }>;
  projectDetectedTextMetadata?: unknown;
};

export async function applyStorySceneTextOverlay(
  params: ApplyStorySceneTextOverlayInput
): Promise<boolean> {
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
            const sceneForZone = normalized[index] ?? emptyNormalizedSceneText();
            const imageRow = params.imageMeta?.[index];
            const ocrAvoid = collectOcrAvoidBoxesForScene({
              sceneIndex: index,
              imageId: imageRow?.imageId,
              imageBakedTextJson: imageRow?.bakedTextBlocksJson,
              projectDetectedTextMetadata: params.projectDetectedTextMetadata,
            });
            const sceneSafeZone = buildSceneSafeZoneContext({
              detection: ctx.detection,
              sceneText: sceneTextForSafeZone(sceneForZone),
              width: params.width,
              height: params.height,
              accentWords: sceneForZone.accentWords,
              extraAvoidBoxes: ocrAvoid,
              aspectRatio: params.aspectRatio,
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

  const collisionByScene = new Map<
    number,
    FinalizeSceneDialoguesResult
  >();

  const assContent = buildStoryOverlayAss({
    sceneTexts: params.sceneTexts,
    durationSeconds: params.durationSeconds,
    width: params.width,
    height: params.height,
    themeByIndex,
    safeZoneByIndex,
    onSceneCollision: (sceneIndex, result) => {
      collisionByScene.set(sceneIndex, result);
    },
  });

  if (isStoryModeDebugEnabled() && params.projectId) {
    const debugScenes: StorySceneDebugEntry[] = normalized.map((scene, index) => {
      const resolved = chooseTemplate(scene);
      const safeZone = safeZoneByIndex?.get(index);
      const ocrAvoid = collectOcrAvoidBoxesForScene({
        sceneIndex: index,
        imageId: params.imageMeta?.[index]?.imageId,
        imageBakedTextJson: params.imageMeta?.[index]?.bakedTextBlocksJson,
        projectDetectedTextMetadata: params.projectDetectedTextMetadata,
      });
      const failSafe = storyFailSafeAvoidBoxes(params.aspectRatio);
      const detection =
        safeZone && "detection" in safeZone ? safeZone.detection.combinedAvoidBoxes : [];
      return {
        sceneId: params.sceneIds?.[index],
        sceneIndex: index,
        imageId: params.imageMeta?.[index]?.imageId,
        imageOrder: params.imageMeta?.[index]?.order,
        resolvedEmotion: resolveSceneEmotionId({
          emotionMode: scene.emotionMode,
          emotion: scene.emotion,
          autoEmotion: scene.autoEmotion,
          sceneIndex: index,
          sceneCount: normalized.length,
          textSignals: {
            heroText: scene.heroText,
            title: scene.title,
            subtitle: scene.subtitle,
            heroFinaleText: scene.heroFinaleText,
            finaleFooter: scene.finaleFooter,
            extraLines: scene.extraLines,
            lines: scene.lines.map((l) => l.text),
          },
        }),
        emotionMode: scene.emotionMode,
        actingIntensity: scene.actingIntensity,
        overlayTemplate: resolved,
        overlayTextBlocks: buildOverlayTextBlockSummary(scene, resolved),
        ocrBoxes: [...ocrAvoid, ...failSafe].map((b) => ({
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
          label: b.label,
        })),
        faceSafeZones: detection
          .filter((b) => (b.label ?? "").toLowerCase().includes("face"))
          .map((b) => ({
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            type: b.label ?? "face",
          })),
        objectSafeZones: detection
          .filter((b) => !["face", "center_head_fail_safe"].includes(b.label ?? ""))
          .map((b) => ({
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            label: b.label ?? "object",
          })),
        collisionWarnings: collisionByScene.get(index)?.warnings ?? [],
        overlayPositions: (() => {
          const collision = collisionByScene.get(index);
          if (!collision) {
            return [];
          }
          const draftById = new Map(collision.resolvedDrafts.map((d) => [d.id, d]));
          return collision.actions.map((action) => {
            const draft = draftById.get(action.id);
            const placementAction =
              action.action === "kept" ? "kept"
              : action.action === "hidden" ? "hidden"
              : action.action === "resized" ? "resized"
              : "moved";
            return {
              layer: action.kind,
              x: draft?.x ?? 0,
              y: draft?.y ?? 0,
              action: placementAction,
              reason: `${action.action}:${action.reason}`,
            };
          });
        })(),
      };
    });
    const report: StoryModeDebugReport = {
      ...createEmptyStoryModeDebugReport({
        projectId: params.projectId,
        imageCount: normalized.length,
        imageOrder:
          params.imageMeta?.map((row) => ({ imageId: row.imageId, order: row.order })) ?? [],
      }),
      scenes: debugScenes,
      characterContinuityBlock: "",
      finalViduPrompt: "",
      finalViduPromptChars: 0,
    };
    stashStoryModeDebugReport(params.projectId, report);
    logStoryModeDebugReport(report);
  }

  await burnStoryTextOverlay({
    inputVideoPath: params.inputVideoPath,
    outputVideoPath: params.outputVideoPath,
    assContent,
    workDir: params.workDir,
  });
  return true;
}
