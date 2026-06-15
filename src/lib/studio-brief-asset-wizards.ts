import type { StudioCharacterWizardAnswers } from "@/types/studio-production-brief-v3";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import { enrichCharacterFromWizard, type EnrichedCharacterConcept } from "@/lib/studio-character-wizard";
import { readHcWorkflowV2, storeStudioWorkflowInHc, writeHcWorkflowV2 } from "@/lib/hc-workflow-v2";

export type LocationWizardAnswers = {
  setting: "indoor" | "outdoor" | "city" | "nature" | "shop" | "fantasy";
  mood: "warm" | "modern" | "cinematic" | "playful" | "premium";
  time: "morning" | "day" | "evening" | "night";
  detail: "simple" | "realistic" | "rich";
  brand: "none" | "subtle" | "visible";
};

export type PropWizardAnswers = {
  category: "product" | "food" | "clothing" | "tool" | "logo" | "object";
  importance: "background" | "supporting" | "hero";
  style: "realistic" | "cartoon" | "premium" | "playful";
  brand: "none" | "subtle" | "clear";
  use: "held" | "worn" | "placed" | "displayed" | "animated";
};

export type WorldWizardAnswers = {
  style: "realistic" | "cartoon" | "cinematic" | "anime" | "pixar-like";
  colorMood: "warm" | "cool" | "neutral" | "vibrant" | "muted";
  environment: "urban" | "nature" | "studio" | "fantasy" | "commercial";
  realism: "stylized" | "semi-realistic" | "photorealistic";
  brandPresence: "none" | "subtle" | "prominent";
};

export type EnrichedLocationConcept = LocationWizardAnswers & {
  name: string;
  description: string;
  lighting: string;
  estimatedCredits: number;
};

export type EnrichedPropConcept = PropWizardAnswers & {
  name: string;
  description: string;
  placement: string;
  estimatedCredits: number;
};

export type EnrichedWorldConcept = WorldWizardAnswers & {
  name: string;
  palette: string;
  atmosphere: string;
  estimatedCredits: number;
};

export const LOCATION_WIZARD_DEFAULTS: LocationWizardAnswers = {
  setting: "indoor",
  mood: "warm",
  time: "day",
  detail: "realistic",
  brand: "none",
};

export const PROP_WIZARD_DEFAULTS: PropWizardAnswers = {
  category: "product",
  importance: "hero",
  style: "realistic",
  brand: "none",
  use: "displayed",
};

export const WORLD_WIZARD_DEFAULTS: WorldWizardAnswers = {
  style: "cinematic",
  colorMood: "warm",
  environment: "commercial",
  realism: "semi-realistic",
  brandPresence: "subtle",
};

export function enrichLocationFromWizard(answers: LocationWizardAnswers): EnrichedLocationConcept {
  return {
    ...answers,
    name: `${answers.setting} ${answers.mood} scene`,
    description: `${answers.detail} ${answers.setting} at ${answers.time}`,
    lighting: answers.time === "night" ? "Moody artificial light" : "Natural soft light",
    estimatedCredits: answers.detail === "rich" ? 3 : 2,
  };
}

export function enrichPropFromWizard(answers: PropWizardAnswers): EnrichedPropConcept {
  return {
    ...answers,
    name: `${answers.category} prop`,
    description: `${answers.importance} ${answers.category} in ${answers.style} style`,
    placement: answers.use,
    estimatedCredits: answers.importance === "hero" ? 2 : 1,
  };
}

export function enrichWorldFromWizard(answers: WorldWizardAnswers): EnrichedWorldConcept {
  return {
    ...answers,
    name: `${answers.style} world`,
    palette: `${answers.colorMood} tones`,
    atmosphere: `${answers.environment} · ${answers.realism}`,
    estimatedCredits: answers.realism === "photorealistic" ? 4 : 2,
  };
}

export type BriefAssetRequirementKind =
  | "character"
  | "mascot"
  | "team"
  | "location"
  | "prop"
  | "world"
  | "voice"
  | "music"
  | "sfx";

export type BriefAssetRequirementStatus =
  | "missing"
  | "uploading"
  | "processing"
  | "generating"
  | "attached"
  | "failed"
  | "skipped";

export type BriefAssetRequirement = {
  id: string;
  kind: BriefAssetRequirementKind;
  label: string;
  sceneIds: string[];
  status: BriefAssetRequirementStatus;
  assetRefId?: string;
  estimatedCredits: number;
  thumbnailUrl?: string;
  previewUrl?: string;
  audioUrl?: string;
  provider?: string;
  creditsUsed?: number;
  generatedPrompt?: string;
  source?: string;
  errorMessage?: string;
  referenceStorageKey?: string;
  referenceMode?: "generate_from" | "reference_only";
  cacheHit?: boolean;
};

export function normalizeRequirementStatus(status: string): BriefAssetRequirementStatus {
  if (status === "linked" || status === "generated") {
    return "attached";
  }
  if (
    status === "missing" ||
    status === "uploading" ||
    status === "processing" ||
    status === "generating" ||
    status === "attached" ||
    status === "failed" ||
    status === "skipped"
  ) {
    return status;
  }
  return "missing";
}

export function buildMissingAssetRequirements(input: {
  storyPlan: import("@/types/studio-production-brief-v3").StudioStoryPlan;
  linkedKinds?: string[];
}): BriefAssetRequirement[] {
  const linked = new Set(input.linkedKinds ?? []);
  const reqs: BriefAssetRequirement[] = [];
  const seen = new Set<string>();

  for (const scene of input.storyPlan.scenes) {
    for (const assetLabel of scene.requiredAssets) {
      const key = assetLabel.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const kind = inferAssetKind(assetLabel);
      reqs.push({
        id: `req_${key.replace(/\s+/g, "_")}`,
        kind,
        label: assetLabel,
        sceneIds: input.storyPlan.scenes.filter((s) => s.requiredAssets.includes(assetLabel)).map((s) => s.id),
        status: linked.has(kind) ? "attached" : "missing",
        estimatedCredits: kind === "character" || kind === "world" ? 2 : 1,
      });
    }
  }

  if (!seen.has("voice") && input.storyPlan.voiceOverProposal) {
    reqs.push({
      id: "req_voice",
      kind: "voice",
      label: "Voice-over",
      sceneIds: input.storyPlan.scenes.map((s) => s.id),
      status: linked.has("voice") ? "attached" : "missing",
      estimatedCredits: 1,
    });
  }

  if (!seen.has("music")) {
    reqs.push({
      id: "req_music",
      kind: "music",
      label: "Background music",
      sceneIds: input.storyPlan.scenes.map((s) => s.id),
      status: linked.has("music") ? "attached" : "missing",
      estimatedCredits: 1,
    });
  }

  if (!seen.has("sfx") && !seen.has("sound")) {
    reqs.push({
      id: "req_sfx",
      kind: "sfx",
      label: "Sound effects",
      sceneIds: input.storyPlan.scenes.map((s) => s.id),
      status: linked.has("sfx") ? "attached" : "missing",
      estimatedCredits: 1,
    });
  }

  return reqs;
}

function inferAssetKind(label: string): BriefAssetRequirementKind {
  const l = label.toLowerCase();
  if (l.includes("mascot")) return "mascot";
  if (l.includes("team") || l.includes("crew") || l.includes("cast")) return "team";
  if (l.includes("character") || l.includes("person") || l.includes("host")) return "character";
  if (l.includes("location") || l.includes("scene") || l.includes("setting")) return "location";
  if (l.includes("world") || l.includes("style") || l.includes("environment")) return "world";
  if (l.includes("voice") || l.includes("narrat")) return "voice";
  if (l.includes("music") || l.includes("soundtrack")) return "music";
  if (l.includes("sfx") || l.includes("sound effect") || l.includes("foley")) return "sfx";
  if (l.includes("audio")) return "music";
  return "prop";
}

export function estimateMissingAssetCredits(reqs: BriefAssetRequirement[]): number {
  return reqs.filter((r) => r.status === "missing").reduce((sum, r) => sum + r.estimatedCredits, 0);
}

export function persistWizardConceptToHc(
  project: HomeCheffProjectPackage,
  kind: BriefAssetRequirement["kind"],
  concept:
    | EnrichedCharacterConcept
    | EnrichedLocationConcept
    | EnrichedPropConcept
    | EnrichedWorldConcept
): HomeCheffProjectPackage {
  const id = `wizard_${kind}_${Date.now()}`;
  const name = "name" in concept ? concept.name : kind;
  const withRef = upsertHcAssetReference(
    project,
    createHcAssetReference({ id, kind, role: name, sourceService: "studio" })
  );
  const root = readHcWorkflowV2(withRef);
  return writeHcWorkflowV2(
    storeStudioWorkflowInHc(withRef, {
      inventorySummary: {
        available: [...(root.studio?.inventorySummary?.available ?? []), kind],
        missing: (root.studio?.inventorySummary?.missing ?? []).filter((m) => m !== kind),
        optional: root.studio?.inventorySummary?.optional ?? [],
      },
    }),
    {
      studio: {
        ...root.studio,
        phase: root.studio?.phase ?? "generate",
      },
      assetConcepts: {
        ...root.assetConcepts,
        [kind]: concept,
      },
    }
  );
}

export type { EnrichedCharacterConcept, StudioCharacterWizardAnswers };

export { enrichCharacterFromWizard };
