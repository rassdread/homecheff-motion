/**
 * Identity preservation engine — variations keep the same identity in a new role.
 */

import type {
  IdentityDriftAssessment,
  IdentityKind,
  IdentityPreservationOverrides,
  IdentityPreservationProfile,
} from "@/types/assistant-identity-preservation";
import type { AssistantToolMatchResult, AssistantToolMatchSettings } from "@/types/assistant-v4";

export const IDENTITY_DRIFT_THRESHOLD = 35;

const HOMECHEFF_MASCOT_NAMES = /globe\s*man|globeman|homecheff\s*chef|garden\s*chef|designer\s*mascot/i;

export const DEFAULT_IDENTITY_PRESERVATION_OVERRIDES: IdentityPreservationOverrides = {
  preserveFace: true,
  preserveEyes: true,
  preserveMouth: true,
  preservePersonality: true,
  preserveBodyShape: true,
  preserveCoreShape: true,
  preserveBrandIdentity: true,
};

export function resolveIdentityKind(input: {
  assetType?: string | null;
  assetName?: string | null;
  taxonomyType?: string | null;
}): IdentityKind {
  const name = (input.assetName ?? "").toLowerCase();
  const type = (input.taxonomyType ?? input.assetType ?? "").toLowerCase();

  if (
    HOMECHEFF_MASCOT_NAMES.test(name) ||
    (/globe|homecheff/i.test(name) && /mascot|man|chef|garden|designer/i.test(name))
  ) {
    return "homecheff_mascot";
  }
  if (type === "human" || type === "person") {
    return "human";
  }
  if (type === "animal" || type === "pet" || /dog|cat|hond|kat|dier|pet/i.test(name)) {
    return "animal";
  }
  if (type === "mascot" || /mascot|mascotte/i.test(name)) {
    return "mascot";
  }
  if (type === "character") {
    return "character";
  }
  if (/brand|logo/i.test(name)) {
    return "brand_mascot";
  }
  return "generic";
}

function baseProfile(kind: IdentityKind, assetName?: string): IdentityPreservationProfile {
  const common = {
    kind,
    assetName,
    preserveFace: true,
    preserveEyes: true,
    preserveMouth: true,
    preserveCoreShape: true,
    preservePersonality: true,
    preserveBrandIdentity: kind === "homecheff_mascot" || kind === "brand_mascot" || kind === "mascot",
    preserveBodyShape: true,
    preserveGlobe: kind === "homecheff_mascot",
    preserveFurPattern: kind === "animal",
    preserveBreedCharacteristics: kind === "animal",
    editableTraits: [] as string[],
    lockedTraits: [] as string[],
  };

  switch (kind) {
    case "human":
      return {
        ...common,
        editableTraits: ["clothing", "accessories", "colors", "environment", "pose", "expression", "style"],
        lockedTraits: [
          "face_structure",
          "eye_shape",
          "nose_shape",
          "mouth_shape",
          "hair_shape",
          "body_proportions",
        ],
      };
    case "animal":
      return {
        ...common,
        editableTraits: ["outfit", "accessories", "role", "environment", "style"],
        lockedTraits: ["head_shape", "eye_shape", "fur_pattern", "breed", "body_structure", "eye_color"],
      };
    case "homecheff_mascot":
      return {
        ...common,
        preserveGlobe: true,
        preserveBrandIdentity: true,
        editableTraits: [
          "outfit",
          "tools",
          "props",
          "accessories",
          "role_styling",
          "seasonal_styling",
          "color_accents",
        ],
        lockedTraits: ["face", "eyes", "mouth", "personality", "globe", "core_silhouette", "homecheff_identity"],
      };
    case "mascot":
    case "brand_mascot":
      return {
        ...common,
        editableTraits: ["outfit", "props", "accessories", "profession", "role", "seasonal_styling", "color_accents"],
        lockedTraits: ["face", "eyes", "mouth", "personality", "logo_elements", "silhouette", "brand_identity"],
      };
    case "character":
      return {
        ...common,
        editableTraits: ["outfit", "pose", "expression", "environment", "props"],
        lockedTraits: ["face", "eyes", "recognizable_identity"],
      };
    default:
      return {
        ...common,
        preserveBrandIdentity: false,
        editableTraits: ["style", "outfit", "environment"],
        lockedTraits: ["recognizable_features"],
      };
  }
}

export function buildIdentityPreservationProfile(input: {
  assetType?: string | null;
  assetName?: string | null;
  taxonomyType?: string | null;
  message?: string;
  overrides?: Partial<IdentityPreservationOverrides>;
}): IdentityPreservationProfile {
  const kind = resolveIdentityKind(input);
  const profile = baseProfile(kind, input.assetName ?? undefined);
  const overrides = { ...DEFAULT_IDENTITY_PRESERVATION_OVERRIDES, ...input.overrides };

  profile.preserveFace = overrides.preserveFace;
  profile.preserveEyes = overrides.preserveEyes;
  profile.preserveMouth = overrides.preserveMouth;
  profile.preservePersonality = overrides.preservePersonality;
  profile.preserveBodyShape = overrides.preserveBodyShape;
  profile.preserveCoreShape = overrides.preserveCoreShape;
  profile.preserveBrandIdentity = overrides.preserveBrandIdentity;

  const msg = (input.message ?? "").toLowerCase();
  if (/nieuw gezicht|ander gezicht|new face|different person|andere persoon/i.test(msg)) {
    profile.preserveFace = false;
    profile.preserveEyes = false;
    profile.preserveMouth = false;
  }
  if (/ander ras|different breed|andere hond/i.test(msg)) {
    profile.preserveBreedCharacteristics = false;
    profile.preserveFurPattern = false;
  }

  return profile;
}

export function identityProfileToSettings(
  profile: IdentityPreservationProfile
): AssistantToolMatchSettings {
  const settings: AssistantToolMatchSettings = {};
  if (profile.preserveFace) settings.preserveFace = true;
  if (profile.preserveEyes) settings.preserveEyes = true;
  if (profile.preserveMouth) settings.preserveMouth = true;
  if (profile.preservePersonality) settings.preservePersonality = true;
  if (profile.preserveCoreShape) settings.preserveCoreShape = true;
  if (profile.preserveBrandIdentity) settings.preserveBrandIdentity = true;
  if (profile.preserveBodyShape) settings.preserveBodyShape = true;
  if (profile.preserveGlobe) settings.preserveGlobe = true;
  if (profile.preserveFurPattern) settings.preserveFurPattern = true;
  if (profile.preserveBreedCharacteristics) settings.preserveBreedShape = true;
  if (profile.kind === "human") settings.preserveIdentity = true;
  return settings;
}

export function mergeIdentityIntoSettings(
  profile: IdentityPreservationProfile,
  settings: AssistantToolMatchSettings
): AssistantToolMatchSettings {
  return { ...settings, ...identityProfileToSettings(profile) };
}

function traitLabelNl(trait: string): string {
  const map: Record<string, string> = {
    face: "gezicht",
    eyes: "ogen",
    mouth: "mond",
    personality: "persoonlijkheid",
    globe: "wereldbol",
    brand_identity: "merkidentiteit",
    homecheff_identity: "HomeCheff-identiteit",
    core_silhouette: "silhouet",
    fur_pattern: "vachtpatroon",
    breed: "ras",
    body_structure: "lichaamsstructuur",
    eye_color: "oogkleur",
    identity: "identiteit",
    outfit: "outfit",
    pose: "pose",
    background: "achtergrond",
    clothing: "kleding",
    accessories: "accessoires",
    expression: "expressie",
    tools: "gereedschap",
    props: "props",
  };
  return map[trait] ?? trait.replace(/_/g, " ");
}

function traitLabelEn(trait: string): string {
  const map: Record<string, string> = {
    face: "face",
    eyes: "eyes",
    mouth: "mouth",
    personality: "personality",
    globe: "globe",
    brand_identity: "brand identity",
    homecheff_identity: "HomeCheff identity",
    core_silhouette: "silhouette",
    fur_pattern: "fur pattern",
    breed: "breed",
    body_structure: "body structure",
    eye_color: "eye color",
    identity: "identity",
    outfit: "outfit",
    pose: "pose",
    background: "background",
    clothing: "clothing",
    accessories: "accessories",
    expression: "expression",
    tools: "tools",
    props: "props",
  };
  return map[trait] ?? trait.replace(/_/g, " ");
}

export function profilePreserveLabels(
  profile: IdentityPreservationProfile,
  locale: "nl" | "en"
): string[] {
  const labels: string[] = [];
  const add = (on: boolean, trait: string) => {
    if (on) labels.push(locale === "en" ? traitLabelEn(trait) : traitLabelNl(trait));
  };
  add(profile.preserveFace, "face");
  add(profile.preserveEyes, "eyes");
  add(profile.preserveMouth, "mouth");
  add(profile.preservePersonality, "personality");
  add(profile.preserveGlobe, "globe");
  add(profile.preserveBrandIdentity, "brand_identity");
  add(profile.preserveCoreShape, "core_silhouette");
  add(profile.preserveFurPattern, "fur_pattern");
  add(profile.preserveBreedCharacteristics, "breed");
  add(profile.preserveBodyShape, "body_structure");
  if (profile.kind === "homecheff_mascot") {
    add(true, "homecheff_identity");
  }
  return labels;
}

export function inferChangedTraits(message: string, profile: IdentityPreservationProfile): string[] {
  const msg = message.toLowerCase();
  const changed: string[] = [];
  if (/outfit|kleding|chef|garden|designer|pirate|viking|zakelijk|casual/i.test(msg)) {
    changed.push("outfit", "clothing");
  }
  if (/prop|accessoire|tool|gereedschap|mand|basket|hat|hoed|piraat/i.test(msg)) {
    changed.push("props", "accessories");
  }
  if (/expressie|vrolijker|serious|smile|glimlach/i.test(msg)) {
    changed.push("expression");
  }
  if (/pose|houding/i.test(msg)) {
    changed.push("pose");
  }
  if (/stijl|style|cartoon|seasonal/i.test(msg)) {
    changed.push("style");
  }
  if (/omgeving|environment|background|tuin|kitchen/i.test(msg)) {
    changed.push("environment", "background");
  }
  if (changed.length === 0 && profile.editableTraits.length > 0) {
    changed.push(profile.editableTraits[0]!);
  }
  return [...new Set(changed)];
}

const HIGH_DRIFT_PATTERNS =
  /(nieuw gezicht|ander gezicht|new face|different person|andere persoon|ander ras|different breed|vervang.*gezicht|replace.*face|andere ogen|new eyes)/i;

export function assessIdentityDrift(input: {
  profile: IdentityPreservationProfile;
  message: string;
  recommendedSettings: AssistantToolMatchSettings;
}): IdentityDriftAssessment {
  const { profile, message, recommendedSettings } = input;
  let driftScore = 0;
  const changedTraits = inferChangedTraits(message, profile);
  const preservedTraits = profilePreserveLabels(profile, "nl");

  if (HIGH_DRIFT_PATTERNS.test(message)) {
    driftScore += 55;
  }
  if (recommendedSettings.preserveFace === false && profile.preserveFace) {
    driftScore += 25;
  }
  if (recommendedSettings.preserveGlobe === false && profile.preserveGlobe) {
    driftScore += 20;
  }
  if (recommendedSettings.preserveBreedShape === false && profile.preserveBreedCharacteristics) {
    driftScore += 30;
  }
  if (recommendedSettings.preserveFurPattern === false && profile.preserveFurPattern) {
    driftScore += 20;
  }
  if (recommendedSettings.preserveIdentity === false) {
    driftScore += 15;
  }

  driftScore = Math.min(100, Math.max(0, driftScore));
  const identityRetentionPercent = Math.max(0, 100 - driftScore);
  const exceedsThreshold = driftScore >= IDENTITY_DRIFT_THRESHOLD;

  return {
    driftScore,
    identityRetentionPercent,
    exceedsThreshold,
    changedTraits,
    preservedTraits,
    warningNl: exceedsThreshold
      ? "De variatie wijzigt de kernidentiteit te veel. Pas je instellingen aan of kies een mildere wijziging."
      : undefined,
    warningEn: exceedsThreshold
      ? "The variation changes core identity too much. Adjust settings or choose a milder change."
      : undefined,
  };
}

export function enrichToolMatchWithIdentity(input: {
  match: AssistantToolMatchResult;
  assetType?: string | null;
  assetName?: string | null;
  taxonomyType?: string | null;
  message: string;
  locale: "nl" | "en";
  overrides?: Partial<IdentityPreservationOverrides>;
}): AssistantToolMatchResult {
  const profile = buildIdentityPreservationProfile({
    assetType: input.assetType,
    assetName: input.assetName,
    taxonomyType: input.taxonomyType,
    message: input.message,
    overrides: input.overrides,
  });

  const recommendedSettings = mergeIdentityIntoSettings(profile, input.match.recommendedSettings);
  const preserveLabels = profilePreserveLabels(profile, input.locale);
  const drift = assessIdentityDrift({
    profile,
    message: input.message,
    recommendedSettings,
  });

  const warnings = [...input.match.warnings];
  if (drift.warningNl) {
    warnings.push(input.locale === "en" ? drift.warningEn! : drift.warningNl);
  }

  const preserveConstraints = [...new Set([...input.match.preserveConstraints, ...preserveLabels])];

  return {
    ...input.match,
    recommendedSettings,
    preserveConstraints,
    warnings,
    identityProfile: profile,
    identityDrift: drift,
  };
}
