export type ComicStoryPresetId =
  | "none"
  | "comic_motion"
  | "manga_impact"
  | "dramatic_panel_reveal"
  | "marketplace_promo"
  | "mascot_seller";

export const COMIC_PRESET_IDS: readonly ComicStoryPresetId[] = [
  "none",
  "comic_motion",
  "manga_impact",
  "dramatic_panel_reveal",
  "marketplace_promo",
  "mascot_seller",
] as const;

export type ComicStoryPresetConfig = {
  id: ComicStoryPresetId;
  labelKey: string;
  promptBlock: string;
};

export const COMIC_STORY_PRESETS: Record<ComicStoryPresetId, ComicStoryPresetConfig> = {
  none: { id: "none", labelKey: "instant.comic.none", promptBlock: "" },
  comic_motion: {
    id: "comic_motion",
    labelKey: "instant.comic.comicMotion",
    promptBlock: `COMIC STORY MOTION:
- Animated comic panel flow between keyframes; preserve speech bubbles and typography exactly.
- Subjects act with clear poses; backgrounds may have subtle parallax only.`,
  },
  manga_impact: {
    id: "manga_impact",
    labelKey: "instant.comic.mangaImpact",
    promptBlock: `MANGA IMPACT:
- One controlled impact beat per segment; speed-line energy on subject, not on text bubbles.
- Preserve all readable text and UI; no redraw of letters.`,
  },
  dramatic_panel_reveal: {
    id: "dramatic_panel_reveal",
    labelKey: "instant.comic.dramaticReveal",
    promptBlock: `DRAMATIC PANEL REVEAL:
- Slow reveal energy between panels; cinematic pause before motion continues.
- Typography and logos remain pixel-stable.`,
  },
  marketplace_promo: {
    id: "marketplace_promo",
    labelKey: "instant.comic.marketplacePromo",
    promptBlock: `MARKETPLACE PROMO:
- Marketplace card/poster storytelling; product and mascot energy without morphing layout text.`,
  },
  mascot_seller: {
    id: "mascot_seller",
    labelKey: "instant.comic.mascotSeller",
    promptBlock: `MASCOT SELLER:
- Expressive mascot seller performance; friendly sales energy, varied gestures, speech bubbles untouched.`,
  },
};

export function normalizeComicStoryPresetId(value: unknown): ComicStoryPresetId {
  if (typeof value === "string") {
    const v = value.trim() as ComicStoryPresetId;
    if (COMIC_PRESET_IDS.includes(v)) {
      return v;
    }
  }
  return "none";
}

export function buildComicPromptBlock(presetId: ComicStoryPresetId): string {
  return COMIC_STORY_PRESETS[presetId]?.promptBlock ?? "";
}
