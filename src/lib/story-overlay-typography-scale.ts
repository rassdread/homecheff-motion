/**
 * Global story overlay typography scale — preview + FFmpeg ASS rendering.
 * Tuned for 9:16 mobile readability (TikTok / Reels / Shorts).
 */

export const STORY_OVERLAY_HEADLINE_SCALE = 1.3;
export const STORY_OVERLAY_TITLE_SCALE = 1.2;
export const STORY_OVERLAY_SUBTITLE_SCALE = 1.1;

/** Slightly more space between title and subtitle blocks. */
export const STORY_OVERLAY_SUBTITLE_GAP_SCALE = 1.25;

export type StoryOverlayTypographyRole = "headline" | "title" | "subtitle";

const ROLE_SCALE: Record<StoryOverlayTypographyRole, number> = {
  headline: STORY_OVERLAY_HEADLINE_SCALE,
  title: STORY_OVERLAY_TITLE_SCALE,
  subtitle: STORY_OVERLAY_SUBTITLE_SCALE,
};

export function scaleStoryOverlayFontSize(
  role: StoryOverlayTypographyRole,
  baseSize: number
): number {
  return Math.round(baseSize * ROLE_SCALE[role]);
}

export function scaleStoryOverlayTemplateBase(params: {
  default: number;
  min: number;
  max: number;
  role: StoryOverlayTypographyRole;
}): { default: number; min: number; max: number } {
  const scale = ROLE_SCALE[params.role];
  return {
    default: Math.round(params.default * scale),
    min: Math.round(params.min * scale),
    max: Math.round(params.max * scale),
  };
}

/** Fallback headline size from a title-sized value (when adaptive headline is unavailable). */
export const STORY_HEADLINE_TO_TITLE_RATIO =
  (1.28 * STORY_OVERLAY_HEADLINE_SCALE) / STORY_OVERLAY_TITLE_SCALE;

/** Fallback subtitle size from a title-sized value (legacy path). */
export const STORY_SUBTITLE_TO_TITLE_RATIO =
  (0.55 * STORY_OVERLAY_SUBTITLE_SCALE) / STORY_OVERLAY_TITLE_SCALE;

export const STORY_LEGACY_TITLE_HEIGHT_FRACTION = 0.065 * STORY_OVERLAY_TITLE_SCALE;

export const STORY_ASS_SUBTITLE_GAP_PX = Math.round(8 * STORY_OVERLAY_SUBTITLE_GAP_SCALE);
export const STORY_LAYER_SUBTITLE_VERTICAL_GAP_PX = Math.round(
  12 * STORY_OVERLAY_SUBTITLE_GAP_SCALE
);

/** Tailwind classes for live storyboard preview (relative hierarchy matches render scale). */
export const STORY_PREVIEW_TYPOGRAPHY_CLASS = {
  headline: "text-[1.125rem] font-bold uppercase tracking-wide text-white sm:text-xl",
  title: "text-[1.2rem] font-semibold text-white sm:text-[1.35rem]",
  subtitle: "mt-1.5 text-[0.975rem] font-medium uppercase tracking-wide text-zinc-100 sm:text-base",
  extraLine: "text-[0.975rem] text-zinc-200 sm:text-base",
  sequenceLine: "text-[1.05rem] font-semibold text-white sm:text-lg",
  heroFinale: "text-[1.125rem] font-bold uppercase tracking-wide text-white sm:text-xl",
  footer: "mt-3 text-xs font-medium tracking-wide text-emerald-200 sm:text-sm",
} as const;
