/**
 * Unique asset learning — analyze every upload; bill unique profiles once.
 * Quality: never skip analysis. Economics: reuse cached identity/style/brand/product profiles.
 */

export type UniqueAssetKind = "character" | "mascot" | "logo" | "product" | "style";

export type CachedProfileFlags = {
  characterProfile?: boolean;
  mascotProfile?: boolean;
  brandProfile?: boolean;
  productProfile?: boolean;
  styleDna?: boolean;
  motionReady?: boolean;
  motionIdentity?: boolean;
};

export type UniqueAssetLearningInput = {
  photoCount?: number;
  logoCount?: number;
  productCount?: number;
  characterCount?: number;
  mascotCount?: number;
  audioCount?: number;
  videoCount?: number;
  cached?: CachedProfileFlags;
  cachedAnalysisSources?: string[];
};

export type UniqueAssetSlot = {
  kind: UniqueAssetKind;
  /** Images that must be analyzed (quality — never skip). */
  imagesToAnalyze: number;
  /** Unique profiles to create when cache misses. */
  uniqueProfilesBillable: number;
  cached: boolean;
  reusableFrom?: string;
};

export type UniqueAssetLearningPlan = {
  slots: UniqueAssetSlot[];
  /** Every uploaded image is analyzed — no subset skipping. */
  totalImagesToAnalyze: number;
  totalAudioToAnalyze: number;
  totalVideoToAnalyze: number;
  totalUniqueProfilesBillable: number;
  totalUniqueProfilesCached: number;
};

function sourcesInclude(sources: string[], key: string): boolean {
  return sources.includes(key);
}

/** Build learning plan: full analysis count + cache-first unique profile billing. */
export function buildUniqueAssetLearningPlan(input: UniqueAssetLearningInput): UniqueAssetLearningPlan {
  const sources = input.cachedAnalysisSources ?? [];
  const cached = input.cached ?? {};
  const photoCount = Math.max(0, input.photoCount ?? 0);
  const logoCount = Math.max(0, input.logoCount ?? 0);
  const productCount = Math.max(0, input.productCount ?? 0);
  const characterCount = Math.max(0, input.characterCount ?? 0);
  const mascotCount = Math.max(0, input.mascotCount ?? 0);

  const slots: UniqueAssetSlot[] = [];

  if (photoCount > 0) {
    slots.push({
      kind: "character",
      imagesToAnalyze: photoCount,
      uniqueProfilesBillable:
        cached.characterProfile ||
        cached.motionReady ||
        sourcesInclude(sources, "character_studio") ||
        sourcesInclude(sources, "motion_ready")
          ? 0
          : Math.max(1, characterCount || 1),
      cached: Boolean(
        cached.characterProfile ||
          cached.motionReady ||
          sourcesInclude(sources, "character_studio") ||
          sourcesInclude(sources, "motion_ready")
      ),
      reusableFrom: cached.motionReady
        ? "motion_ready"
        : sourcesInclude(sources, "character_studio")
          ? "character_studio"
          : undefined,
    });
  }

  if (logoCount > 0) {
    const brandCached =
      cached.brandProfile ||
      cached.motionIdentity ||
      sourcesInclude(sources, "motion_identity_profile") ||
      sourcesInclude(sources, "motion_ready");
    slots.push({
      kind: "logo",
      imagesToAnalyze: logoCount,
      uniqueProfilesBillable: brandCached ? 0 : 1,
      cached: brandCached,
      reusableFrom: brandCached ? "brand_profile" : undefined,
    });
  }

  if (productCount > 0) {
    const productCached =
      cached.productProfile || sourcesInclude(sources, "reference_analysis");
    slots.push({
      kind: "product",
      imagesToAnalyze: productCount,
      uniqueProfilesBillable: productCached ? 0 : 1,
      cached: productCached,
      reusableFrom: productCached ? "product_profile" : undefined,
    });
  }

  if (mascotCount > 0) {
    const mascotCached = cached.mascotProfile || cached.brandProfile;
    slots.push({
      kind: "mascot",
      imagesToAnalyze: mascotCount,
      uniqueProfilesBillable: mascotCached ? 0 : 1,
      cached: Boolean(mascotCached),
    });
  }

  const styleCached =
    cached.styleDna ||
    sourcesInclude(sources, "asset_style_dna") ||
    slots.some((s) => (s.kind === "character" || s.kind === "logo") && s.cached);
  if (photoCount + logoCount + productCount > 0 && !styleCached) {
    slots.push({
      kind: "style",
      imagesToAnalyze: 0,
      uniqueProfilesBillable: 1,
      cached: false,
    });
  } else if (photoCount + logoCount + productCount > 0) {
    slots.push({
      kind: "style",
      imagesToAnalyze: 0,
      uniqueProfilesBillable: 0,
      cached: true,
      reusableFrom: "asset_style_dna",
    });
  }

  const totalUniqueProfilesBillable = slots.reduce((s, x) => s + x.uniqueProfilesBillable, 0);
  const totalUniqueProfilesCached = slots.filter((x) => x.cached).length;

  return {
    slots,
    totalImagesToAnalyze: photoCount + logoCount + productCount + mascotCount,
    totalAudioToAnalyze: Math.max(0, input.audioCount ?? 0),
    totalVideoToAnalyze: Math.max(0, input.videoCount ?? 0),
    totalUniqueProfilesBillable,
    totalUniqueProfilesCached,
  };
}
