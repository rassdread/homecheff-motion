/**
 * S.7D — Brand audio concepts (contract only — not auto-wired into mix).
 */

export type StudioBrandAudioConcept =
  | "brand_theme"
  | "brand_intro"
  | "brand_outro"
  | "brand_sting"
  | "brand_transition"
  | "brand_ambience";

export const STUDIO_BRAND_AUDIO_CONCEPTS: StudioBrandAudioConcept[] = [
  "brand_theme",
  "brand_intro",
  "brand_outro",
  "brand_sting",
  "brand_transition",
  "brand_ambience",
];

export type StudioBrandAudioContract = {
  version: "7d.1";
  concepts: Record<StudioBrandAudioConcept, string | null>;
  /** Explicit: do not auto-alter mix/render */
  wired: false;
  autoApply: false;
};

export function emptyBrandAudioContract(
  partial?: Partial<StudioBrandAudioContract["concepts"]>
): StudioBrandAudioContract {
  return {
    version: "7d.1",
    concepts: {
      brand_theme: partial?.brand_theme ?? null,
      brand_intro: partial?.brand_intro ?? null,
      brand_outro: partial?.brand_outro ?? null,
      brand_sting: partial?.brand_sting ?? null,
      brand_transition: partial?.brand_transition ?? null,
      brand_ambience: partial?.brand_ambience ?? null,
    },
    wired: false,
    autoApply: false,
  };
}

/** Map BrandKit kitJson optional ids into contract — still unwired. */
export function brandAudioFromKitJson(kitJson: unknown): StudioBrandAudioContract {
  if (!kitJson || typeof kitJson !== "object" || Array.isArray(kitJson)) {
    return emptyBrandAudioContract();
  }
  const row = kitJson as Record<string, unknown>;
  return emptyBrandAudioContract({
    brand_theme: typeof row.musicAssetId === "string" ? row.musicAssetId : null,
    brand_intro: typeof row.brandIntroAssetId === "string" ? row.brandIntroAssetId : null,
    brand_outro: typeof row.brandOutroAssetId === "string" ? row.brandOutroAssetId : null,
    brand_sting: typeof row.brandStingAssetId === "string" ? row.brandStingAssetId : null,
    brand_transition:
      typeof row.brandTransitionAssetId === "string" ? row.brandTransitionAssetId : null,
    brand_ambience:
      typeof row.brandAmbienceAssetId === "string" ? row.brandAmbienceAssetId : null,
  });
}
