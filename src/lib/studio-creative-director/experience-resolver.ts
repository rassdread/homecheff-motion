/**
 * S.6F — Experience Resolver.
 * Resolves doors / product IDs / fans into a canonical product experience.
 * Emits no prompts.
 */

import {
  isStudioProductExperienceId,
  type StudioProductExperienceId,
} from "@/lib/studio-creative-director/product-experience-ids";
import {
  getProductExperience,
  STUDIO_PRODUCT_EXPERIENCE_REGISTRY,
  type StudioProductExperienceEntry,
} from "@/lib/studio-creative-director/product-experience-registry";
import type { StudioProductMode } from "@/lib/studio-creative-director/types";

export type ExperienceResolveInput = {
  /** Explicit product experience (preferred). */
  experienceId?: string | null;
  /** Instant / door / fan key (e.g. linkedin_photo, restaurant_promo). */
  entryFan?: string | null;
  /** Free-text or legacy door label (normalized). */
  doorHint?: string | null;
  mode?: StudioProductMode | null;
};

export type ResolvedCreativeExperience = {
  experienceId: StudioProductExperienceId;
  family: StudioProductExperienceEntry["family"];
  creativeGoal: string;
  status: StudioProductExperienceEntry["status"];
  matrixExperienceId: StudioProductExperienceEntry["matrixExperienceId"];
  requiredAssets: string[];
  optionalAssets: string[];
  recommendedPlanners: StudioProductExperienceEntry["recommendedPlanners"];
  continuityRequirements: StudioProductExperienceEntry["continuityRequirements"];
  generationStrategy: string;
  providerCapabilities: string[];
  quickQuestions: string[];
  supportedModes: StudioProductMode[];
  resolveSource: "experienceId" | "entryFan" | "doorHint" | "default";
};

const DOOR_ALIASES: Record<string, StudioProductExperienceId> = {
  linkedin: "PEOPLE_LINKEDIN_PHOTO",
  linkedin_photo: "PEOPLE_LINKEDIN_PHOTO",
  cv: "PEOPLE_CV_PHOTO",
  resume: "PEOPLE_CV_PHOTO",
  dating: "PEOPLE_DATING_PROFILE",
  tinder: "PEOPLE_DATING_PROFILE",
  wedding: "PEOPLE_WEDDING",
  family: "PEOPLE_FAMILY",
  baby: "PEOPLE_BABY",
  pregnancy: "PEOPLE_PREGNANCY",
  christmas: "PEOPLE_CHRISTMAS",
  birthday: "PEOPLE_BIRTHDAY",
  vacation: "PEOPLE_VACATION",
  travel: "CREATIVE_TRAVEL_VLOG",
  restaurant: "BUSINESS_RESTAURANT",
  homecheff: "BUSINESS_HOMECHEFF",
  product: "BUSINESS_PRODUCT",
  real_estate: "BUSINESS_REAL_ESTATE",
  car: "BUSINESS_AUTOMOTIVE",
  fashion: "BUSINESS_FASHION",
  retail: "BUSINESS_RETAIL",
  corporate: "BUSINESS_CORPORATE",
  ad: "BUSINESS_ADVERTISEMENT",
  advertisement: "BUSINESS_ADVERTISEMENT",
  commercial: "BUSINESS_COMMERCIAL",
  branding: "BUSINESS_BRANDING",
  logo: "BUSINESS_LOGO_PLACEMENT",
  tiktok: "SOCIAL_TIKTOK",
  instagram: "SOCIAL_INSTAGRAM",
  facebook: "SOCIAL_FACEBOOK",
  youtube: "SOCIAL_YOUTUBE",
  shorts: "SOCIAL_SHORTS",
  reels: "SOCIAL_REELS",
  storyboard: "CREATIVE_STORYBOARD",
  film: "CREATIVE_FILM",
  movie: "CREATIVE_FILM",
  documentary: "CREATIVE_DOCUMENTARY",
  music_video: "CREATIVE_MUSIC_VIDEO",
  podcast: "CREATIVE_PODCAST",
  presentation: "CREATIVE_PRESENTATION",
  animation: "CREATIVE_ANIMATION",
  outfit: "IDENTITY_OUTFIT",
  character: "IDENTITY_CHARACTER",
  mascot: "IDENTITY_MASCOT",
  future_child: "IDENTITY_FUTURE_CHILD",
  fusion: "IDENTITY_CHARACTER_FUSION",
  motion_ready: "IDENTITY_MOTION_READY",
  person_background: "IDENTITY_PERSON_BACKGROUND",
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function buildEntryFanIndex(): Map<string, StudioProductExperienceId> {
  const map = new Map<string, StudioProductExperienceId>();
  for (const exp of Object.values(STUDIO_PRODUCT_EXPERIENCE_REGISTRY)) {
    for (const fan of exp.entryFans) {
      map.set(normalizeKey(fan), exp.experienceId);
    }
  }
  for (const [alias, id] of Object.entries(DOOR_ALIASES)) {
    if (!map.has(alias)) map.set(alias, id);
  }
  return map;
}

const ENTRY_FAN_INDEX = buildEntryFanIndex();

function toResolved(
  entry: StudioProductExperienceEntry,
  resolveSource: ResolvedCreativeExperience["resolveSource"]
): ResolvedCreativeExperience {
  return {
    experienceId: entry.experienceId,
    family: entry.family,
    creativeGoal: entry.creativeGoal,
    status: entry.status,
    matrixExperienceId: entry.matrixExperienceId,
    requiredAssets: [...entry.requiredAssets],
    optionalAssets: [...entry.optionalAssets],
    recommendedPlanners: [...entry.recommendedPlanners],
    continuityRequirements: entry.continuityRequirements,
    generationStrategy: entry.generationStrategy,
    providerCapabilities: [...entry.providerCapabilities],
    quickQuestions: [...entry.quickQuestions],
    supportedModes: [...entry.supportedModes],
    resolveSource,
  };
}

/**
 * Resolve user/door intent into one product experience.
 * Defaults to storyboard (Director workspace) when nothing matches.
 */
export function resolveCreativeExperience(
  input: ExperienceResolveInput
): ResolvedCreativeExperience {
  if (input.experienceId && isStudioProductExperienceId(input.experienceId)) {
    return toResolved(getProductExperience(input.experienceId), "experienceId");
  }

  if (input.entryFan) {
    const id = ENTRY_FAN_INDEX.get(normalizeKey(input.entryFan));
    if (id) return toResolved(getProductExperience(id), "entryFan");
  }

  if (input.doorHint) {
    const key = normalizeKey(input.doorHint);
    const fromFan = ENTRY_FAN_INDEX.get(key);
    if (fromFan) return toResolved(getProductExperience(fromFan), "doorHint");
    const alias = DOOR_ALIASES[key];
    if (alias) return toResolved(getProductExperience(alias), "doorHint");
    // Soft match: substring against labels / goals
    for (const exp of Object.values(STUDIO_PRODUCT_EXPERIENCE_REGISTRY)) {
      const hay = `${exp.label} ${exp.creativeGoal} ${exp.experienceId}`.toLowerCase();
      if (hay.includes(key.replace(/_/g, " ")) || hay.includes(key)) {
        return toResolved(exp, "doorHint");
      }
    }
  }

  const fallbackMode = input.mode ?? "QUICK";
  const fallbackId: StudioProductExperienceId =
    fallbackMode === "DIRECTOR" ? "CREATIVE_STORYBOARD" : "CREATIVE_ANIMATION";
  return toResolved(getProductExperience(fallbackId), "default");
}

export function listResolvableEntryFans(): string[] {
  return [...ENTRY_FAN_INDEX.keys()].sort();
}
