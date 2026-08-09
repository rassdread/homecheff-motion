/**
 * S.7E — Localization surfaces (structured meaning — not dubbing pipeline).
 */

export const STUDIO_LOCALIZATION_SURFACES = [
  "titles",
  "captions",
  "descriptions",
  "hashtags",
  "metadata",
  "scene_names",
  "chapter_titles",
  "exports",
  "future_dubbing",
  "future_lip_sync",
] as const;

export type StudioLocalizationSurface = (typeof STUDIO_LOCALIZATION_SURFACES)[number];

export type StudioLocalizationPlan = {
  version: "7e.1";
  sourceLanguage: string;
  targetLanguage: string | null;
  surfaces: Array<{
    surface: StudioLocalizationSurface;
    enabled: boolean;
    /** future_* remain planned only */
    implemented: boolean;
  }>;
  coupling: {
    voice: false;
    subtitles: "optional";
    dubbing: "NOT_IMPLEMENTED";
    lipSync: "NOT_IMPLEMENTED";
  };
};

export function buildLocalizationPlan(input: {
  sourceLanguage?: string | null;
  targetLanguage?: string | null;
}): StudioLocalizationPlan {
  const source = (input.sourceLanguage ?? "en").trim().toLowerCase().slice(0, 2) || "en";
  const target = input.targetLanguage?.trim().toLowerCase().slice(0, 2) || null;

  return {
    version: "7e.1",
    sourceLanguage: source,
    targetLanguage: target,
    surfaces: STUDIO_LOCALIZATION_SURFACES.map((surface) => {
      const future = surface.startsWith("future_");
      return {
        surface,
        enabled: !future,
        implemented: !future,
      };
    }),
    coupling: {
      voice: false,
      subtitles: "optional",
      dubbing: "NOT_IMPLEMENTED",
      lipSync: "NOT_IMPLEMENTED",
    },
  };
}
