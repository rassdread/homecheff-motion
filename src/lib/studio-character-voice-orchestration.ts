/**
 * Character Voice Orchestration — cast planning layer (no TTS, no audio generation).
 */

import {
  buildCharacterVoiceAssignments,
  collectStoryboardCharacters,
  resolveActiveSpeakerForScene,
  scriptUsesSpeakerTags,
} from "@/lib/studio-character-voice";
import { buildFrequentCastAdvisories } from "@/lib/studio-voice-cast-advisories";
import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import {
  characterHasExplicitVoiceChoice,
  isClonedVoiceProfileRef,
  isLibraryVoiceProfileRef,
  resolvePlanningVoiceProfile,
} from "@/lib/studio-voice-profile-ref";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import type { StoryArchitecture } from "@/types/studio-story-architecture";
import type {
  CastCombinationAdvisory,
  CastVoiceAssignmentStatus,
  CastVoiceSourceType,
  CharacterVoiceOrchestration,
  CharacterVoiceOrchestrationContext,
  DialogueReadiness,
  DialogueReadinessStatus,
  InsightsVoiceCastSummary,
  OrchestrationWarning,
  StoryCastMember,
  StoryboardVoicePlan,
  StoryMomentSpeaker,
} from "@/types/studio-character-voice-orchestration";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

export type BuildCharacterVoiceOrchestrationInput = {
  storyboard: StudioStoryboardDetail;
  characters?: StudioCharacterListItem[];
  language?: string;
  storyArchitecture?: StoryArchitecture | null;
  projectMemory?: StudioProjectMemorySnapshot;
  /** Prior storyboards for cast-frequency advisories (same owner). */
  priorStoryboardCasts?: Array<{ id: string; characterIds: string[] }>;
};

export function resolveCastVoiceSourceType(voiceProfile: string): CastVoiceSourceType {
  if (isClonedVoiceProfileRef(voiceProfile)) {
    return "my_voice";
  }
  if (isLibraryVoiceProfileRef(voiceProfile)) {
    return "persona";
  }
  if (characterHasExplicitVoiceChoice(voiceProfile)) {
    return "preset";
  }
  return "none";
}

export function castVoiceSourceLabelKey(sourceType: CastVoiceSourceType): string {
  switch (sourceType) {
    case "preset":
      return "studio.voiceOrchestration.source.preset";
    case "persona":
      return "studio.voiceOrchestration.source.persona";
    case "my_voice":
      return "studio.voiceOrchestration.source.myVoice";
    default:
      return "studio.voiceOrchestration.source.none";
  }
}

function castAssignmentStatus(params: {
  voiceEnabled: boolean;
  voiceProfile: string;
}): CastVoiceAssignmentStatus {
  if (!params.voiceEnabled) {
    return "voice_disabled";
  }
  if (!characterHasExplicitVoiceChoice(params.voiceProfile)) {
    return "missing_voice";
  }
  return "assigned";
}

function castStatusLabelKey(status: CastVoiceAssignmentStatus): string {
  switch (status) {
    case "assigned":
      return "studio.voiceOrchestration.castStatus.assigned";
    case "missing_voice":
      return "studio.voiceOrchestration.castStatus.missingVoice";
    case "voice_disabled":
      return "studio.voiceOrchestration.castStatus.voiceDisabled";
  }
}

function resolveVoiceDisplayName(params: {
  voiceProfile: string;
  voiceDescription: string;
  presetLabelKey: string;
}): string {
  if (params.voiceDescription.trim()) {
    return params.voiceDescription.trim();
  }
  if (isClonedVoiceProfileRef(params.voiceProfile) || isLibraryVoiceProfileRef(params.voiceProfile)) {
    return params.voiceProfile.split(":").pop() ?? params.voiceProfile;
  }
  return params.presetLabelKey;
}

function buildCastMember(
  character: StudioCharacterListItem,
  sceneOrders: number[],
  language: string,
  storyboardOverride: string | null
): StoryCastMember {
  const identity = resolveCharacterVoiceIdentity({
    character,
    language,
    attemptedOverrideProfile: character.voiceLock ? storyboardOverride : null,
  });
  const sourceType = resolveCastVoiceSourceType(identity.voiceProfile);
  const status = castAssignmentStatus({
    voiceEnabled: identity.voiceEnabled,
    voiceProfile: identity.voiceProfile,
  });
  return {
    characterId: character.id,
    characterName: character.name,
    sceneOrders,
    appearsInSceneCount: sceneOrders.length,
    voiceEnabled: identity.voiceEnabled,
    voiceProfile: identity.voiceProfile,
    voiceDisplayName: resolveVoiceDisplayName({
      voiceProfile: identity.voiceProfile,
      voiceDescription: identity.voiceDescription,
      presetLabelKey: identity.presetLabelKey,
    }),
    voiceSourceType: sourceType,
    voiceSourceLabelKey: castVoiceSourceLabelKey(sourceType),
    presetLabelKey: identity.presetLabelKey,
    status,
    statusLabelKey: castStatusLabelKey(status),
  };
}

function computeDialogueReadiness(params: {
  castMembers: StoryCastMember[];
  storyboard: StudioStoryboardDetail;
  language: string;
}): DialogueReadiness {
  const sceneCast = params.castMembers.filter((m) => m.appearsInSceneCount > 0);
  const voiced = sceneCast.filter(
    (m) => m.voiceEnabled && characterHasExplicitVoiceChoice(m.voiceProfile)
  );
  const missing = sceneCast.filter((m) => m.status === "missing_voice" || m.status === "voice_disabled");
  const savedScript = params.storyboard.voiceNarrationScript?.trim() ?? "";
  const hasTags = scriptUsesSpeakerTags(savedScript);
  const uniqueSpeakers = new Set(
    [...params.storyboard.scenes]
      .sort((a, b) => a.order - b.order)
      .map((scene) => resolveActiveSpeakerForScene(scene, params.language)?.speakerName)
      .filter(Boolean)
  );

  let status: DialogueReadinessStatus;
  if (missing.length > 0 && sceneCast.length >= 2) {
    status = "voice_missing";
  } else if (
    voiced.length >= 2 &&
    (hasTags || uniqueSpeakers.size >= 2)
  ) {
    status = "dialogue_ready";
  } else if (voiced.length >= 2 || sceneCast.length >= 2) {
    status = "multi_character";
  } else {
    status = "single_voice";
  }

  const labelKeys: Record<DialogueReadinessStatus, string> = {
    single_voice: "studio.voiceOrchestration.dialogueReadiness.singleVoice",
    multi_character: "studio.voiceOrchestration.dialogueReadiness.multiCharacter",
    dialogue_ready: "studio.voiceOrchestration.dialogueReadiness.dialogueReady",
    voice_missing: "studio.voiceOrchestration.dialogueReadiness.voiceMissing",
  };

  return {
    status,
    labelKey: labelKeys[status],
    characterCount: sceneCast.length,
    voicedCharacterCount: voiced.length,
    missingVoiceCharacterIds: missing.map((m) => m.characterId),
  };
}

function buildMomentSpeakers(params: {
  storyArchitecture?: StoryArchitecture | null;
  castMembers: StoryCastMember[];
  storyboard: StudioStoryboardDetail;
  language: string;
}): StoryMomentSpeaker[] {
  if (!params.storyArchitecture?.storyMoments.length) {
    return [];
  }

  const castById = new Map(params.castMembers.map((m) => [m.characterId, m]));
  const sceneByOrder = new Map(params.storyboard.scenes.map((s) => [s.order, s]));

  return params.storyArchitecture.storyMoments.map((moment) => {
    const sceneOrders = moment.sceneOrders.length > 0 ? moment.sceneOrders : [];
    let carrier: StoryCastMember | null = null;

    for (const order of sceneOrders) {
      const scene = sceneByOrder.get(order);
      const primary = scene?.characters?.[0];
      if (primary) {
        carrier = castById.get(primary.id) ?? buildCastMember(primary, [order], params.language, null);
        break;
      }
    }

    if (!carrier && params.castMembers.length > 0) {
      const index = params.storyArchitecture!.storyMoments.indexOf(moment);
      carrier = params.castMembers[index % params.castMembers.length] ?? null;
    }

    return {
      momentId: moment.id,
      momentLabelKey: moment.labelKey,
      sceneOrders,
      carrierCharacterId: carrier?.characterId ?? null,
      carrierCharacterName: carrier?.characterName ?? null,
      carrierVoiceDisplayName: carrier?.voiceDisplayName ?? null,
      planningLineKey: "studio.voiceOrchestration.momentSpeaker.line",
      planningLineParams: {
        moment: moment.id,
        character: carrier?.characterName ?? "—",
      },
    };
  });
}

function buildOrchestrationWarnings(params: {
  castMembers: StoryCastMember[];
  dialogueReadiness: DialogueReadiness;
}): OrchestrationWarning[] {
  const warnings: OrchestrationWarning[] = [];
  for (const member of params.castMembers) {
    if (member.appearsInSceneCount === 0) {
      continue;
    }
    if (member.status === "missing_voice") {
      warnings.push({
        code: "cast_missing_voice",
        severity: "high",
        messageKey: "studio.voiceOrchestration.warning.missingVoice",
        messageParams: { character: member.characterName },
        characterId: member.characterId,
      });
    }
    if (member.status === "voice_disabled") {
      warnings.push({
        code: "cast_voice_disabled",
        severity: "medium",
        messageKey: "studio.voiceOrchestration.warning.voiceDisabled",
        messageParams: { character: member.characterName },
        characterId: member.characterId,
      });
    }
  }
  if (params.dialogueReadiness.status === "multi_character") {
    warnings.push({
      code: "dialogue_not_ready",
      severity: "low",
      messageKey: "studio.voiceOrchestration.warning.multiCharacterPlanning",
      messageParams: {
        count: String(params.dialogueReadiness.characterCount),
      },
    });
  }
  return warnings;
}

function buildDirectorContextLines(params: {
  castMembers: StoryCastMember[];
  momentSpeakers: StoryMomentSpeaker[];
  dialogueReadiness: DialogueReadiness;
}): string[] {
  const lines: string[] = [];
  const sceneCast = params.castMembers.filter((m) => m.appearsInSceneCount > 0);
  if (sceneCast.length > 0) {
    lines.push(
      `Cast: ${sceneCast.map((m) => `${m.characterName} (${m.voiceDisplayName || m.voiceSourceType})`).join(", ")}`
    );
  }
  for (const moment of params.momentSpeakers) {
    if (moment.carrierCharacterName) {
      lines.push(`${moment.momentId}: ${moment.carrierCharacterName}`);
    }
  }
  lines.push(`Dialogue readiness: ${params.dialogueReadiness.status}`);
  return lines;
}

export function buildCharacterVoiceOrchestration(
  input: BuildCharacterVoiceOrchestrationInput
): CharacterVoiceOrchestration {
  const language = (input.language ?? input.storyboard.voiceLanguage ?? "en").slice(0, 2);
  const storyboardOverride = input.storyboard.voiceProfile?.trim() || null;
  const sceneCharacters = collectStoryboardCharacters(input.storyboard);
  const sceneOrdersByCharacter = new Map<string, number[]>();
  for (const scene of input.storyboard.scenes) {
    for (const character of scene.characters ?? []) {
      const orders = sceneOrdersByCharacter.get(character.id) ?? [];
      orders.push(scene.order);
      sceneOrdersByCharacter.set(character.id, orders);
    }
  }

  const castMembers = sceneCharacters.map((character) =>
    buildCastMember(character, sceneOrdersByCharacter.get(character.id) ?? [], language, storyboardOverride)
  );

  const castIds = new Set(castMembers.map((m) => m.characterId));
  const unusedCharacters = (input.characters ?? [])
    .filter((c) => !castIds.has(c.id))
    .map((c) => buildCastMember(c, [], language, storyboardOverride));

  const speakingCharacters = castMembers.filter(
    (m) => m.appearsInSceneCount > 0 && (m.voiceEnabled || m.status === "missing_voice")
  );
  const narrationCharacters = castMembers.filter(
    (m) => m.appearsInSceneCount > 0 && m.voiceEnabled && characterHasExplicitVoiceChoice(m.voiceProfile)
  );

  const voiceAssignments = buildCharacterVoiceAssignments(input.storyboard, language);
  const momentSpeakers = buildMomentSpeakers({
    storyArchitecture: input.storyArchitecture,
    castMembers,
    storyboard: input.storyboard,
    language,
  });
  const dialogueReadiness = computeDialogueReadiness({
    castMembers,
    storyboard: input.storyboard,
    language,
  });
  const orchestrationWarnings = buildOrchestrationWarnings({ castMembers, dialogueReadiness });
  const directorContextLines = buildDirectorContextLines({
    castMembers,
    momentSpeakers,
    dialogueReadiness,
  });

  const castAdvisories: CastCombinationAdvisory[] = buildFrequentCastAdvisories({
    characters: input.characters ?? sceneCharacters,
    storyboards: input.priorStoryboardCasts,
    projectMemory: input.projectMemory,
  });

  return {
    version: 1,
    language,
    castMembers,
    speakingCharacters,
    narrationCharacters,
    unusedCharacters,
    voiceAssignments,
    momentSpeakers,
    dialogueReadiness,
    orchestrationWarnings,
    directorContextLines,
    castAdvisories,
  };
}

export function buildStoryboardVoicePlan(params: {
  storyboard: StudioStoryboardDetail;
  orchestration?: CharacterVoiceOrchestration;
  language?: string;
}): StoryboardVoicePlan {
  const language = (params.language ?? params.storyboard.voiceLanguage ?? "en").slice(0, 2);
  const orchestration =
    params.orchestration ??
    buildCharacterVoiceOrchestration({ storyboard: params.storyboard, language });

  const castById = new Map(orchestration.castMembers.map((m) => [m.characterId, m]));
  const sortedScenes = [...params.storyboard.scenes].sort((a, b) => a.order - b.order);
  const sceneSpeakerAssignments = sortedScenes.map((scene) => {
    const active = resolveActiveSpeakerForScene(scene, language);
    const primary = scene.characters?.[0];
    const member = primary ? castById.get(primary.id) : undefined;
    return {
      sceneId: scene.id,
      sceneOrder: scene.order,
      speakerCharacterId: primary?.id ?? null,
      speakerName: active?.speakerName ?? primary?.name ?? "Narrator",
      voiceProfile: member?.voiceProfile ?? resolvePlanningVoiceProfile(params.storyboard.voiceProfile),
      voiceDisplayName: member?.voiceDisplayName ?? getVoiceProfilePreset(params.storyboard.voiceProfile).labelKey,
      voiceSourceType: member?.voiceSourceType ?? resolveCastVoiceSourceType(params.storyboard.voiceProfile),
    };
  });

  let estimatedVoiceChanges = 0;
  let dialogueMoments = 0;
  let previousSpeaker: string | null = null;
  for (const row of sceneSpeakerAssignments) {
    if (previousSpeaker && row.speakerName !== previousSpeaker) {
      estimatedVoiceChanges++;
      dialogueMoments++;
    }
    previousSpeaker = row.speakerName;
  }

  const speakerCounts = new Map<string, { characterId: string; characterName: string; sceneCount: number }>();
  for (const row of sceneSpeakerAssignments) {
    if (!row.speakerCharacterId) {
      continue;
    }
    const existing = speakerCounts.get(row.speakerCharacterId);
    if (existing) {
      existing.sceneCount++;
    } else {
      speakerCounts.set(row.speakerCharacterId, {
        characterId: row.speakerCharacterId,
        characterName: row.speakerName,
        sceneCount: 1,
      });
    }
  }

  const narratorProfile = resolvePlanningVoiceProfile(params.storyboard.voiceProfile);
  const narratorPreset = getVoiceProfilePreset(narratorProfile);

  return {
    version: 1,
    language,
    narrator: params.storyboard.voiceEnabled
      ? {
          enabled: true,
          voiceProfile: narratorProfile,
          labelKey: narratorPreset.labelKey,
        }
      : null,
    speakers: [...speakerCounts.values()].sort((a, b) => b.sceneCount - a.sceneCount),
    sceneSpeakerAssignments,
    estimatedVoiceChanges,
    dialogueMoments,
  };
}

export function buildCharacterVoiceOrchestrationContext(
  input: BuildCharacterVoiceOrchestrationInput
): CharacterVoiceOrchestrationContext {
  const orchestration = buildCharacterVoiceOrchestration(input);
  const voicePlan = buildStoryboardVoicePlan({
    storyboard: input.storyboard,
    orchestration,
    language: orchestration.language,
  });

  const recommendationKeys: string[] = [];
  for (const warning of orchestration.orchestrationWarnings) {
    recommendationKeys.push(warning.messageKey);
  }
  for (const advisory of orchestration.castAdvisories) {
    recommendationKeys.push(advisory.messageKey);
  }

  const contextLines = [
    ...orchestration.directorContextLines,
    ...voicePlan.sceneSpeakerAssignments.map(
      (row) => `Scene ${row.sceneOrder + 1}: ${row.speakerName}`
    ),
  ];

  return {
    orchestration,
    voicePlan,
    contextLines,
    recommendationKeys: [...new Set(recommendationKeys)].slice(0, 8),
  };
}

export function buildInsightsVoiceCastSummary(
  orchestration: CharacterVoiceOrchestration
): InsightsVoiceCastSummary {
  const sceneCast = orchestration.castMembers.filter((m) => m.appearsInSceneCount > 0);
  const assigned = sceneCast.filter((m) => m.status === "assigned");
  const missing = sceneCast.filter((m) => m.status !== "assigned");

  return {
    characterCount: sceneCast.length,
    voiceAssignedCount: assigned.length,
    cloneCount: sceneCast.filter((m) => m.voiceSourceType === "my_voice").length,
    personaCount: sceneCast.filter((m) => m.voiceSourceType === "persona").length,
    presetCount: sceneCast.filter((m) => m.voiceSourceType === "preset").length,
    missingVoiceCount: missing.length,
    missingVoiceNames: missing.map((m) => m.characterName),
    dialogueReadiness: orchestration.dialogueReadiness.status,
    dialogueReadinessLabelKey: orchestration.dialogueReadiness.labelKey,
  };
}
