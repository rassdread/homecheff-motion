import {
  buildHeroLines,
  buildSequenceTiming,
  buildStagedRevealSlots,
  detectAccentWords,
  resolveSequenceLineStyle,
  splitSequenceSceneTiming,
  type NormalizedSceneText,
  type ResolvedSequenceLineStyle,
} from "@/lib/story-overlay-templates";
import type { AdaptiveOverlayTheme } from "@/server/animation-export/adaptive-overlay-style";
import {
  resolvePlacementForTemplate,
  type SceneSafeZoneContext,
} from "@/server/animation-export/enhanced-safe-zone";
import {
  resolveTypographyFromPlacement,
  type AdaptiveTypographyTemplate,
} from "@/server/animation-export/adaptive-typography";
import { SAFE_AREA_MARGIN_V } from "@/server/animation-export/safe-zone-placement";

export type SafeZoneInput = SceneSafeZoneContext | import("@/server/animation-export/safe-zone-placement").SafeZoneAnalysis | null | undefined;

export type SequenceAssEvent = {
  start: number;
  end: number;
  styleName: string;
  text: string;
  x: number;
  y: number;
};

export type BuildSequenceAssEventsInput = {
  scene: NormalizedSceneText;
  sceneStart: number;
  sceneEnd: number;
  width: number;
  height: number;
  styleNames: {
    heroMain: string;
    heroSmall: string;
    title: string;
    subtitle: string;
  };
  theme: AdaptiveOverlayTheme;
  safeZone?: SafeZoneInput;
  sceneIndex?: number;
  assTime: (seconds: number) => string;
  escapeAssText: (text: string) => string;
  heroLineWithAccents: (line: string, accentWords: string[], theme: AdaptiveOverlayTheme) => string;
  motionTags: (x: number, y: number) => string;
};

function phraseLines(
  phrase: string,
  template: AdaptiveTypographyTemplate,
  style: ResolvedSequenceLineStyle,
  input: BuildSequenceAssEventsInput,
  isFinale: boolean
): string[] {
  if (!input.safeZone || !phrase.trim()) {
    return buildHeroLines(phrase);
  }
  try {
    const overlayTemplate = isFinale ? "heroFinale" : style === "scene" ? "scene" : "sequence";
    const placement = resolvePlacementForTemplate(
      input.safeZone,
      overlayTemplate,
      input.width,
      input.height
    );
    const isBusy = "useStrongBackdrop" in input.safeZone && input.safeZone.useStrongBackdrop;
    const typography = resolveTypographyFromPlacement({
      text: phrase,
      template,
      placement,
      frameWidth: input.width,
      frameHeight: input.height,
      accentWords: input.scene.accentWords,
      sceneIntent: "intent" in input.safeZone ? input.safeZone.intent : undefined,
      isBusy,
    });
    if (typography.lines.length > 0) {
      return typography.lines;
    }
  } catch {
    /* fallback */
  }
  return buildHeroLines(phrase);
}

function resolveSequenceCenterY(
  visualLineCount: number,
  width: number,
  height: number,
  style: ResolvedSequenceLineStyle,
  safeZone?: SafeZoneInput,
  isFinale = false
): number {
  const step = style === "scene" ? 56 : 136;
  const block = Math.max(1, visualLineCount) * step;
  if (safeZone) {
    const template = isFinale ? "heroFinale" : "sequence";
    const placement = resolvePlacementForTemplate(safeZone, template, width, height);
    return Math.max(
      Math.round(height * SAFE_AREA_MARGIN_V) + step / 2,
      placement.anchorY - block / 2 + step / 2
    );
  }
  if (style === "scene") {
    return Math.round(height * 0.68 - block / 2);
  }
  if (visualLineCount <= 2) {
    return Math.round(height * 0.42);
  }
  return Math.round(height * 0.28 + step / 2);
}

function resolveSequenceCenterX(
  width: number,
  height: number,
  safeZone?: SafeZoneInput,
  isFinale = false
): number {
  if (safeZone) {
    const template = isFinale ? "heroFinale" : "sequence";
    return resolvePlacementForTemplate(safeZone, template, width, height).anchorX;
  }
  return Math.round(width / 2);
}

function renderSequencePhrase(
  phrase: string,
  style: ResolvedSequenceLineStyle,
  accentWords: string[],
  theme: AdaptiveOverlayTheme,
  styleNames: BuildSequenceAssEventsInput["styleNames"],
  escapeAssText: (text: string) => string,
  heroLineWithAccents: BuildSequenceAssEventsInput["heroLineWithAccents"],
  input: BuildSequenceAssEventsInput,
  isFinale = false
): { styleName: string; text: string; visualLineCount: number } {
  if (style === "scene") {
    const sceneLines = phraseLines(phrase, "scene", style, input, isFinale);
    const joined = sceneLines.map((line) => escapeAssText(line)).join("\\N");
    return {
      styleName: styleNames.title,
      text: joined || escapeAssText(phrase.toUpperCase()),
      visualLineCount: Math.max(1, sceneLines.length),
    };
  }

  const typoTemplate: AdaptiveTypographyTemplate =
    style === "hero_small" ? "hero_small"
    : isFinale ? "hero_finale"
    : "sequence";
  const heroLines = phraseLines(phrase, typoTemplate, style, input, isFinale);
  const visualLineCount = Math.max(1, heroLines.length);
  const useMain = style === "hero";
  const styleName = useMain ? styleNames.heroMain : styleNames.heroSmall;
  const joined = heroLines
    .map((line, idx) => {
      const accented = heroLineWithAccents(line, accentWords, theme);
      if (heroLines.length > 1 && idx < heroLines.length - 1) {
        return `${accented}\\N`;
      }
      return accented;
    })
    .join("");

  return {
    styleName,
    text: joined,
    visualLineCount,
  };
}

function appendFinaleEvent(
  out: SequenceAssEvent[],
  scene: NormalizedSceneText,
  finaleStart: number,
  finaleEnd: number,
  width: number,
  height: number,
  styleNames: BuildSequenceAssEventsInput["styleNames"],
  theme: AdaptiveOverlayTheme,
  input: BuildSequenceAssEventsInput
): void {
  const finaleText = scene.heroFinaleText.trim();
  if (!finaleText || finaleEnd <= finaleStart) {
    return;
  }
  const accentWords = detectAccentWords(finaleText, scene);
  const finaleLines = buildHeroLines(finaleText);
  const linesToRender = finaleLines.length > 0 ? finaleLines : [finaleText.toUpperCase()];
  const revealSlots = buildStagedRevealSlots(finaleStart, finaleEnd, linesToRender.length, {
    stepSec: 0.55,
    minStepSec: 0.35,
  });
  const cx = resolveSequenceCenterX(width, height, input.safeZone, true);

  let yCursor = resolveSequenceCenterY(
    Math.max(1, linesToRender.length),
    width,
    height,
    "hero",
    input.safeZone,
    true
  );
  const lineStep = 136;

  linesToRender.forEach((line, lineIndex) => {
    const slot = revealSlots[lineIndex] ?? revealSlots[revealSlots.length - 1]!;
    const rendered = renderSequencePhrase(
      line,
      "hero",
      accentWords,
      theme,
      styleNames,
      input.escapeAssText,
      input.heroLineWithAccents,
      input,
      true
    );
    const y = yCursor;
    yCursor += lineStep;
    out.push({
      start: slot.revealStart,
      end: slot.visibleEnd,
      styleName: rendered.styleName,
      text: rendered.text,
      x: cx,
      y,
    });
  });
}

/** Build timed ASS dialogue payloads for one sequence scene. */
export function buildSequenceAssEvents(input: BuildSequenceAssEventsInput): SequenceAssEvent[] {
  const { scene, sceneStart, sceneEnd, width, height, styleNames, theme } = input;
  const lines = scene.lines.filter((line) => line.text.trim());
  if (lines.length === 0 || sceneEnd <= sceneStart) {
    return [];
  }

  const hasFinaleText = scene.heroFinaleText.trim().length > 0;
  const useFinaleSplit = hasFinaleText || (scene.heroFinale && lines.length >= 2);
  const timing = splitSequenceSceneTiming(sceneStart, sceneEnd, useFinaleSplit && hasFinaleText);

  const sequenceLines = hasFinaleText ? lines : lines;
  const lineWindowStart = hasFinaleText ? timing.linesStart : sceneStart;
  const lineWindowEnd = hasFinaleText ? timing.linesEnd : sceneEnd;

  const slots = buildSequenceTiming(lineWindowStart, lineWindowEnd, sequenceLines.length);
  const out: SequenceAssEvent[] = [];

  for (const slot of slots) {
    const line = sequenceLines[slot.index];
    if (!line?.text.trim()) {
      continue;
    }
    if (slot.end <= slot.start) {
      continue;
    }

    const visualStyle = resolveSequenceLineStyle(
      line,
      slot.index,
      sequenceLines.length,
      hasFinaleText ? { ...scene, heroFinale: false } : scene
    );
    const accentWords = detectAccentWords(line.text, scene);
    const rendered = renderSequencePhrase(
      line.text,
      visualStyle,
      accentWords,
      theme,
      styleNames,
      input.escapeAssText,
      input.heroLineWithAccents,
      input,
      false
    );
    const y = resolveSequenceCenterY(
      rendered.visualLineCount,
      width,
      height,
      visualStyle,
      input.safeZone
    );
    const cx = resolveSequenceCenterX(width, height, input.safeZone);

    out.push({
      start: slot.start,
      end: slot.end,
      styleName: rendered.styleName,
      text: rendered.text,
      x: cx,
      y,
    });
  }

  if (hasFinaleText) {
    appendFinaleEvent(
      out,
      scene,
      timing.finaleStart,
      timing.finaleEnd,
      width,
      height,
      styleNames,
      theme,
      input
    );
  }

  return out;
}
