/**
 * S.6F — Creative Planner.
 * Produces provider-neutral creative intent + Matrix selections only.
 * Never writes ContinuityBundle, provider prompts, or GenerationJobs.
 */

import type { MatrixUserSelections } from "@/lib/studio-prompt-matrix/assemble";
import type { ResolvedCreativeExperience } from "@/lib/studio-creative-director/experience-resolver";
import { getModePolicy } from "@/lib/studio-creative-director/mode-policy";
import type { StudioProductMode } from "@/lib/studio-creative-director/types";

export type CreativeIntentAnswers = {
  businessStyle?: string | null;
  background?: string | null;
  smile?: string | null;
  suit?: string | null;
  mood?: string | null;
  energy?: string | null;
  camera?: string | null;
  story?: string | null;
  emotion?: string | null;
  audience?: string | null;
  purpose?: string | null;
  platform?: string | null;
  durationSeconds?: number | null;
  aspect?: string | null;
  brandingGoals?: string | null;
  logo?: boolean | null;
  brandColors?: string | null;
  commercialTone?: string | null;
  lighting?: string | null;
  styleProfile?: string | null;
  directorProfile?: string | null;
  quality?: string | null;
  voice?: string | null;
  music?: string | null;
};

export type CreativeIntent = {
  mood: string | null;
  energy: string | null;
  camera: string | null;
  story: string | null;
  emotion: string | null;
  audience: string | null;
  purpose: string | null;
  platform: string | null;
  durationSeconds: number | null;
  aspect: string | null;
  brandingGoals: string | null;
  lighting: string | null;
  styleProfile: string | null;
  qualityNotes: string[];
};

export type CreativePlan = {
  intent: CreativeIntent;
  /** Selections for Prompt Matrix assemble — not Continuity. */
  matrixSelections: MatrixUserSelections;
  workflowSteps: string[];
  qualityGuidance: string[];
  unansweredQuestions: string[];
};

function defaultPlatformForExperience(exp: ResolvedCreativeExperience): string | null {
  switch (exp.experienceId) {
    case "SOCIAL_TIKTOK":
    case "SOCIAL_SHORTS":
    case "SOCIAL_REELS":
      return "tiktok";
    case "SOCIAL_INSTAGRAM":
      return "instagram";
    case "SOCIAL_FACEBOOK":
      return "facebook";
    case "SOCIAL_YOUTUBE":
      return "youtube";
    case "PEOPLE_LINKEDIN_PHOTO":
    case "PEOPLE_CV_PHOTO":
    case "PEOPLE_BUSINESS_PORTRAIT":
      return "linkedin";
    case "BUSINESS_RESTAURANT":
    case "BUSINESS_HOMECHEFF":
      return "instagram";
    default:
      return null;
  }
}

function defaultAspectForPlatform(platform: string | null): string | null {
  if (!platform) return null;
  const p = platform.toLowerCase();
  if (p.includes("tiktok") || p.includes("reel") || p.includes("short")) return "9:16";
  if (p.includes("linkedin") || p.includes("youtube")) return "16:9";
  if (p.includes("instagram")) return "9:16";
  return null;
}

function mapSmileToEmotion(smile: string | null | undefined): string | null {
  if (!smile) return null;
  const s = smile.toLowerCase();
  if (s.includes("soft") || s.includes("subtle")) return "warm_smile";
  if (s.includes("big") || s.includes("bright")) return "confident_smile";
  if (s.includes("serious") || s.includes("none")) return "professional_neutral";
  return smile;
}

function mapBusinessStyle(style: string | null | undefined): {
  lighting: string | null;
  styleProfile: string | null;
} {
  if (!style) return { lighting: null, styleProfile: null };
  const s = style.toLowerCase();
  if (s.includes("corporate") || s.includes("formal")) {
    return { lighting: "soft_key_clean", styleProfile: "clean_business" };
  }
  if (s.includes("creative") || s.includes("startup")) {
    return { lighting: "natural_window", styleProfile: "modern_editorial" };
  }
  return { lighting: "soft_key_clean", styleProfile: style };
}

/**
 * Plan creative intent from experience + simple answers.
 * Output feeds Matrix selections; Continuity remains elsewhere.
 */
export function planCreativeIntent(input: {
  experience: ResolvedCreativeExperience;
  mode: StudioProductMode;
  answers?: CreativeIntentAnswers | null;
}): CreativePlan {
  const policy = getModePolicy(input.mode);
  const a = input.answers ?? {};
  const mappedStyle = mapBusinessStyle(a.businessStyle ?? a.styleProfile);

  const platform =
    a.platform ??
    (policy.allowAudiencePlatformControls ? defaultPlatformForExperience(input.experience) : null) ??
    defaultPlatformForExperience(input.experience);

  const aspect =
    a.aspect ??
    defaultAspectForPlatform(platform) ??
    (input.experience.family === "SOCIAL" ? "9:16" : null);

  const energy =
    a.energy ??
    (input.experience.family === "SOCIAL"
      ? "high"
      : input.experience.family === "PEOPLE"
        ? "calm"
        : null);

  const mood =
    a.mood ??
    (input.experience.experienceId === "PEOPLE_LINKEDIN_PHOTO"
      ? "professional_confident"
      : input.experience.experienceId.startsWith("BUSINESS_")
        ? "brand_appetite"
        : null);

  const emotion = a.emotion ?? mapSmileToEmotion(a.smile);

  const purpose =
    a.purpose ??
    a.brandingGoals ??
    input.experience.creativeGoal;

  const camera =
    a.camera ??
    (policy.allowCameraVoiceMusicControls || input.mode !== "QUICK"
      ? input.experience.family === "PEOPLE"
        ? "medium_closeup"
        : null
      : input.experience.family === "PEOPLE"
        ? "medium_closeup"
        : null);

  const lighting =
    a.lighting ??
    mappedStyle.lighting ??
    (a.background?.toLowerCase().includes("office") ? "soft_office" : null);

  const styleProfile = a.styleProfile ?? mappedStyle.styleProfile;

  const qualityNotes: string[] = [];
  if (a.quality) qualityNotes.push(a.quality);
  if (input.experience.status === "MISSING") {
    qualityNotes.push("experience_pack_not_implemented");
  }
  if (input.experience.status === "PARTIAL") {
    qualityNotes.push("experience_partial_engine");
  }
  if (a.suit) qualityNotes.push(`attire:${a.suit}`);
  if (a.background) qualityNotes.push(`background:${a.background}`);
  if (a.logo) qualityNotes.push("include_logo");
  if (a.brandColors) qualityNotes.push(`brand_colors:${a.brandColors}`);
  if (a.commercialTone) qualityNotes.push(`tone:${a.commercialTone}`);
  if (a.music && policy.allowCameraVoiceMusicControls) qualityNotes.push(`music:${a.music}`);
  if (a.voice && policy.allowCameraVoiceMusicControls) qualityNotes.push(`voice:${a.voice}`);

  const intent: CreativeIntent = {
    mood,
    energy,
    camera,
    story: a.story ?? null,
    emotion,
    audience: a.audience ?? null,
    purpose,
    platform,
    durationSeconds: a.durationSeconds ?? null,
    aspect,
    brandingGoals: a.brandingGoals ?? (a.logo ? "logo_visible" : null),
    lighting,
    styleProfile,
    qualityNotes,
  };

  const matrixSelections: MatrixUserSelections = {
    shotType: camera,
    cameraMovement: null,
    energy,
    action: a.story ?? null,
    emotion,
    lighting,
    styleProfile,
    directorProfile: policy.allowProfessionalTerminology ? (a.directorProfile ?? null) : null,
    platform,
    audience: a.audience ?? null,
    objective: purpose,
    subject: null,
    durationSeconds: a.durationSeconds ?? null,
    aspectRatio: aspect,
    audioMood: mood,
    audioEnergy: energy,
    qualityInstructions: qualityNotes,
  };

  const workflowSteps =
    input.mode === "QUICK"
      ? ["upload_or_select_asset", "answer_questions", "generate"]
      : input.mode === "PROFESSIONAL"
        ? ["select_experience", "brand_audience_platform", "plan_creatively", "generate"]
        : [
            "select_experience",
            "link_characters_locations_props_worlds",
            "scene_and_shot_planning",
            "continuity_check",
            "movie_or_production",
            "motion_fusion_as_needed",
            "generate",
          ];

  const qualityGuidance: string[] = [
    "continuity_bundle_required_before_matrix",
    "prompt_matrix_assembles_specification",
    "provider_transform_last",
  ];
  if (input.experience.continuityRequirements !== "none") {
    qualityGuidance.push(`continuity:${input.experience.continuityRequirements}`);
  }
  if (!policy.allowFusionMotionMovieProduction) {
    qualityGuidance.push("advanced_fusion_motion_movie_via_director_mode");
  }

  const unanswered = input.experience.quickQuestions.filter((q) => {
    const key = q as keyof CreativeIntentAnswers;
    const val = a[key];
    return val == null || val === "";
  }).slice(0, policy.maxQuickQuestions);

  return {
    intent,
    matrixSelections,
    workflowSteps,
    qualityGuidance,
    unansweredQuestions: unanswered,
  };
}
