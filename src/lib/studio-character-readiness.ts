/**
 * Single-character readiness projection for create/edit — reuses identity completeness engine.
 */

import {
  characterIdentityCompletenessTier,
  characterListItemPreviewFromIdentityForm,
  type CharacterIdentityFormValues,
  type CharacterVoiceIdentityStatus,
} from "@/lib/studio-character-identity-fields";
import { identityCompleteness, toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import {
  characterHasExplicitVoiceChoice,
  isClonedVoiceProfileRef,
  isLibraryVoiceProfileRef,
  parseVoiceProfileRef,
} from "@/lib/studio-voice-profile-ref";
import type { StudioWorldProfileListItem } from "@/types/studio-api";

export type CharacterReadinessDomainId =
  | "identity"
  | "visualStyle"
  | "voice"
  | "world"
  | "referenceImage";

export type CharacterReadinessStatus = "pass" | "warning" | "missing";

export type CharacterReadinessDomain = {
  id: CharacterReadinessDomainId;
  labelKey: string;
  status: CharacterReadinessStatus;
  detailKey?: string;
};

export type CharacterCreationPhaseId = "identity" | "voice" | "reference" | "ready";

export type CharacterCreationPhase = {
  id: CharacterCreationPhaseId;
  labelKey: string;
  status: "done" | "current" | "upcoming";
};

export type CharacterReadinessView = {
  domains: CharacterReadinessDomain[];
  overallScore: number;
  overallTier: "complete" | "almost" | "missing";
  nextStepKey: string;
  nextStepDetailKey?: string;
  creationPhases: CharacterCreationPhase[];
  summary: {
    name: string;
    characterTypeKey: string | null;
    visualStyleKey: string | null;
    voiceSummaryKey: string;
    worldName: string | null;
  };
  directorCompatibility: {
    suitableKeys: string[];
    lessSuitableKeys: string[];
  };
};

export type CharacterReadinessInput = {
  identity: CharacterIdentityFormValues;
  referenceImageUrl: string;
  voiceEnabled: boolean;
  voiceProfile: string;
  voiceStatus: CharacterVoiceIdentityStatus;
  worlds: StudioWorldProfileListItem[];
  mode: "create" | "edit";
};

function domainStatus(passed: boolean, weak: boolean): CharacterReadinessStatus {
  if (passed) return "pass";
  return weak ? "warning" : "missing";
}

function buildIdentityDomain(identity: CharacterIdentityFormValues): CharacterReadinessDomain {
  const hasName = Boolean(identity.name.trim());
  const hasType = Boolean(identity.characterType.trim());
  const hasDescription = Boolean(identity.description.trim());
  const hasPersonality = Boolean(identity.personality.trim());
  const passed = hasName && hasType && hasDescription && hasPersonality;
  const weak = hasName && (!hasType || !hasDescription || !hasPersonality);
  return {
    id: "identity",
    labelKey: "studio.characterReadiness.domain.identity",
    status: domainStatus(passed, weak),
    detailKey:
      !hasName ? "studio.characterReadiness.detail.nameMissing"
      : !hasType ? "studio.characterReadiness.detail.typeMissing"
      : !hasDescription ? "studio.characterReadiness.detail.descriptionMissing"
      : !hasPersonality ? "studio.characterReadiness.detail.personalityWeak"
      : undefined,
  };
}

function buildVisualStyleDomain(identity: CharacterIdentityFormValues): CharacterReadinessDomain {
  const hasStyle = Boolean(identity.visualStyle.trim());
  return {
    id: "visualStyle",
    labelKey: "studio.characterReadiness.domain.visualStyle",
    status: "pass",
    detailKey: hasStyle
      ? "studio.characterReadiness.detail.visualStyleSaved"
      : "studio.characterReadiness.detail.visualStyleOptional",
  };
}

function buildVoiceDomain(
  voiceEnabled: boolean,
  voiceProfile: string,
  voiceStatus: CharacterVoiceIdentityStatus
): CharacterReadinessDomain {
  const explicit = characterHasExplicitVoiceChoice(voiceProfile);
  const passed = voiceEnabled && explicit && voiceStatus !== "none";
  return {
    id: "voice",
    labelKey: "studio.characterReadiness.domain.voice",
    status: passed ? "pass" : "warning",
    detailKey:
      !voiceEnabled ? "studio.characterReadiness.detail.voiceDisabled"
      : !explicit ? "studio.characterReadiness.detail.voiceDefault"
      : undefined,
  };
}

function buildWorldDomain(identity: CharacterIdentityFormValues): CharacterReadinessDomain {
  const hasWorld = Boolean(identity.worldProfileId);
  return {
    id: "world",
    labelKey: "studio.characterReadiness.domain.world",
    status: "pass",
    detailKey: hasWorld ? undefined : "studio.characterReadiness.detail.worldOptional",
  };
}

function buildReferenceDomain(
  referenceImageUrl: string,
  mode: "create" | "edit"
): CharacterReadinessDomain {
  const hasImage = Boolean(referenceImageUrl.trim());
  if (mode === "edit" && hasImage) {
    return {
      id: "referenceImage",
      labelKey: "studio.characterReadiness.domain.referenceImage",
      status: "pass",
    };
  }
  return {
    id: "referenceImage",
    labelKey: "studio.characterReadiness.domain.referenceImage",
    status: hasImage ? "pass" : "missing",
    detailKey: hasImage ? undefined : "studio.characterReadiness.detail.referenceMissing",
  };
}

function pickNextStep(
  domains: CharacterReadinessDomain[]
): { key: string; detailKey?: string } {
  const byId = new Map(domains.map((d) => [d.id, d]));
  const order: CharacterReadinessDomainId[] = ["identity", "referenceImage", "voice"];

  for (const id of order) {
    const domain = byId.get(id);
    if (!domain || domain.status !== "missing") continue;
    const stepKeys: Record<CharacterReadinessDomainId, string> = {
      identity: "studio.characterReadiness.next.identity",
      visualStyle: "studio.characterReadiness.next.visualStyle",
      voice: "studio.characterReadiness.next.voice",
      world: "studio.characterReadiness.next.world",
      referenceImage: "studio.characterReadiness.next.reference",
    };
    return { key: stepKeys[id], detailKey: domain.detailKey };
  }

  const voice = byId.get("voice");
  if (voice && voice.status !== "pass") {
    return { key: "studio.characterReadiness.next.voice", detailKey: voice.detailKey };
  }

  const identity = byId.get("identity");
  if (identity?.status === "warning") {
    return {
      key: "studio.characterReadiness.next.personality",
      detailKey: identity.detailKey,
    };
  }

  return { key: "studio.characterReadiness.next.ready" };
}

function buildDirectorCompatibility(identity: CharacterIdentityFormValues, voiceProfile: string): {
  suitableKeys: string[];
  lessSuitableKeys: string[];
} {
  const type = identity.characterType.trim() || identity.role;
  const ref = parseVoiceProfileRef(voiceProfile);
  const presetId = ref.kind === "preset" ? ref.profileId : "";

  const suitable = new Set<string>();
  const lessSuitable = new Set<string>();

  if (type === "mascot" || type === "brand_character") {
    suitable.add("studio.characterReadiness.compat.mascot");
    suitable.add("studio.characterReadiness.compat.communityHost");
    suitable.add("studio.characterReadiness.compat.narrator");
    lessSuitable.add("studio.characterReadiness.compat.documentary");
  } else if (type === "human" || type === "avatar") {
    suitable.add("studio.characterReadiness.compat.narrator");
    suitable.add("studio.characterReadiness.compat.communityHost");
    suitable.add("studio.characterReadiness.compat.presenter");
    lessSuitable.add("studio.characterReadiness.compat.cartoonMascot");
  } else if (type === "animal") {
    suitable.add("studio.characterReadiness.compat.mascot");
    suitable.add("studio.characterReadiness.compat.playfulHost");
    lessSuitable.add("studio.characterReadiness.compat.corporate");
  } else {
    suitable.add("studio.characterReadiness.compat.narrator");
    suitable.add("studio.characterReadiness.compat.explainer");
  }

  if (presetId === "documentary") {
    suitable.add("studio.characterReadiness.compat.documentary");
    lessSuitable.delete("studio.characterReadiness.compat.documentary");
  }
  if (presetId === "commercial" || presetId === "premium_brand") {
    suitable.add("studio.characterReadiness.compat.brandSpot");
  }
  if (isClonedVoiceProfileRef(voiceProfile) || isLibraryVoiceProfileRef(voiceProfile)) {
    suitable.add("studio.characterReadiness.compat.characterVoice");
  }

  if (identity.energy === "calm" || identity.energy === "professional") {
    lessSuitable.add("studio.characterReadiness.compat.hypeHost");
  }

  return {
    suitableKeys: [...suitable].slice(0, 4),
    lessSuitableKeys: [...lessSuitable].slice(0, 2),
  };
}

function buildCreationPhases(params: {
  domains: CharacterReadinessDomain[];
}): CharacterCreationPhase[] {
  const identityDone =
    params.domains.find((d) => d.id === "identity")?.status === "pass" ||
    params.domains.find((d) => d.id === "identity")?.status === "warning";
  const voiceDone = params.domains.find((d) => d.id === "voice")?.status === "pass";
  const referenceDone = params.domains.find((d) => d.id === "referenceImage")?.status === "pass";
  const readyDone = identityDone && referenceDone;

  const phases: CharacterCreationPhase[] = [
    {
      id: "identity",
      labelKey: "studio.characterReadiness.phase.identity",
      status: identityDone ? "done" : "current",
    },
    {
      id: "voice",
      labelKey: "studio.characterReadiness.phase.voice",
      status: voiceDone ? "done" : identityDone ? "current" : "upcoming",
    },
    {
      id: "reference",
      labelKey: "studio.characterReadiness.phase.reference",
      status: referenceDone ? "done" : voiceDone ? "current" : "upcoming",
    },
    {
      id: "ready",
      labelKey: "studio.characterReadiness.phase.ready",
      status: readyDone ? "done" : referenceDone ? "current" : "upcoming",
    },
  ];

  if (!identityDone) {
    phases[0]!.status = "current";
    phases[1]!.status = "upcoming";
    phases[2]!.status = "upcoming";
    phases[3]!.status = "upcoming";
  } else if (!voiceDone) {
    phases[0]!.status = "done";
    phases[1]!.status = "current";
  } else if (!referenceDone) {
    phases[0]!.status = "done";
    phases[1]!.status = "done";
    phases[2]!.status = "current";
  } else if (!readyDone) {
    phases[0]!.status = "done";
    phases[1]!.status = "done";
    phases[2]!.status = "done";
    phases[3]!.status = "current";
  } else {
    phases.forEach((p) => {
      p.status = "done";
    });
  }

  return phases;
}

function voiceSummaryKey(voiceProfile: string, voiceStatus: CharacterVoiceIdentityStatus): string {
  if (voiceStatus === "clone") return "studio.characterReadiness.summary.voiceClone";
  if (voiceStatus === "locked") return "studio.characterReadiness.summary.voiceLocked";
  if (isLibraryVoiceProfileRef(voiceProfile)) return "studio.characterReadiness.summary.voiceLibrary";
  if (voiceStatus === "none") return "studio.characterReadiness.summary.voiceNone";
  const ref = parseVoiceProfileRef(voiceProfile);
  if (ref.kind === "preset") {
    return getVoiceProfilePreset(ref.profileId).labelKey;
  }
  return "studio.characterReadiness.summary.voicePreset";
}

export function buildCharacterReadinessView(input: CharacterReadinessInput): CharacterReadinessView {
  const preview = characterListItemPreviewFromIdentityForm(input.identity, {
    id: "readiness-preview",
    ownerId: "",
    referenceImageUrl: input.referenceImageUrl,
    slug: "",
  });
  const overallScore = identityCompleteness(toIdentitySpec(preview));
  const overallTier = characterIdentityCompletenessTier(overallScore);

  const domains = [
    buildIdentityDomain(input.identity),
    buildVisualStyleDomain(input.identity),
    buildVoiceDomain(input.voiceEnabled, input.voiceProfile, input.voiceStatus),
    buildWorldDomain(input.identity),
    buildReferenceDomain(input.referenceImageUrl, input.mode),
  ];

  const next = pickNextStep(domains);
  const worldName =
    input.worlds.find((w) => w.id === input.identity.worldProfileId)?.name ?? null;

  return {
    domains,
    overallScore,
    overallTier,
    nextStepKey: next.key,
    nextStepDetailKey: next.detailKey,
    creationPhases: buildCreationPhases({ domains }),
    summary: {
      name: input.identity.name.trim() || "—",
      characterTypeKey: input.identity.characterType
        ? (`studio.characterIdentity.types.${input.identity.characterType}` as string)
        : null,
      visualStyleKey: input.identity.visualStyle
        ? (`studio.characterIdentity.styles.${input.identity.visualStyle}` as string)
        : null,
      voiceSummaryKey: voiceSummaryKey(input.voiceProfile, input.voiceStatus),
      worldName,
    },
    directorCompatibility: buildDirectorCompatibility(input.identity, input.voiceProfile),
  };
}
