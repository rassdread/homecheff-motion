/**
 * Character Voice Orchestration — cast planning (no TTS, no audio generation).
 */

import type { CharacterVoiceAssignment } from "@/types/studio-character-voice";
import type { StoryNarrativeMomentId } from "@/types/studio-story-architecture";

export type CastVoiceSourceType = "preset" | "persona" | "my_voice" | "none";

export type CastVoiceAssignmentStatus = "assigned" | "missing_voice" | "voice_disabled";

export type DialogueReadinessStatus =
  | "single_voice"
  | "multi_character"
  | "dialogue_ready"
  | "voice_missing";

export type StoryCastMember = {
  characterId: string;
  characterName: string;
  sceneOrders: number[];
  appearsInSceneCount: number;
  voiceEnabled: boolean;
  voiceProfile: string;
  voiceDisplayName: string;
  voiceSourceType: CastVoiceSourceType;
  voiceSourceLabelKey: string;
  presetLabelKey?: string;
  status: CastVoiceAssignmentStatus;
  statusLabelKey: string;
};

export type StoryMomentSpeaker = {
  momentId: StoryNarrativeMomentId;
  momentLabelKey: string;
  sceneOrders: number[];
  carrierCharacterId: string | null;
  carrierCharacterName: string | null;
  carrierVoiceDisplayName: string | null;
  planningLineKey: string;
  planningLineParams: Record<string, string>;
};

export type DialogueReadiness = {
  status: DialogueReadinessStatus;
  labelKey: string;
  characterCount: number;
  voicedCharacterCount: number;
  missingVoiceCharacterIds: string[];
};

export type OrchestrationWarning = {
  code: string;
  severity: "low" | "medium" | "high";
  messageKey: string;
  messageParams?: Record<string, string>;
  characterId?: string;
};

export type CastCombinationAdvisory = {
  id: string;
  messageKey: "studio.voiceOrchestration.advisory.frequentCast";
  messageParams: { castNames: string };
  characterIds: string[];
  storyboardCount: number;
};

export type CharacterVoiceOrchestration = {
  version: 1;
  language: string;
  castMembers: StoryCastMember[];
  speakingCharacters: StoryCastMember[];
  narrationCharacters: StoryCastMember[];
  unusedCharacters: StoryCastMember[];
  voiceAssignments: CharacterVoiceAssignment[];
  momentSpeakers: StoryMomentSpeaker[];
  dialogueReadiness: DialogueReadiness;
  orchestrationWarnings: OrchestrationWarning[];
  directorContextLines: string[];
  castAdvisories: CastCombinationAdvisory[];
};

export type StoryboardSceneSpeakerAssignment = {
  sceneId: string;
  sceneOrder: number;
  speakerCharacterId: string | null;
  speakerName: string;
  voiceProfile: string;
  voiceDisplayName: string;
  voiceSourceType: CastVoiceSourceType;
};

export type StoryboardVoicePlan = {
  version: 1;
  language: string;
  narrator: {
    enabled: boolean;
    voiceProfile: string;
    labelKey: string;
  } | null;
  speakers: Array<{
    characterId: string;
    characterName: string;
    sceneCount: number;
  }>;
  sceneSpeakerAssignments: StoryboardSceneSpeakerAssignment[];
  estimatedVoiceChanges: number;
  dialogueMoments: number;
};

export type CharacterVoiceOrchestrationContext = {
  orchestration: CharacterVoiceOrchestration;
  voicePlan: StoryboardVoicePlan;
  contextLines: string[];
  recommendationKeys: string[];
};

export type MotionCharacterVoicePlanHandoff = {
  dialogueReadiness: DialogueReadinessStatus;
  castMemberCount: number;
  voiceAssignedCount: number;
  sceneSpeakerAssignments: Array<{
    sceneOrder: number;
    speakerName: string;
    characterId: string | null;
    voiceProfile: string;
  }>;
};

export type InsightsVoiceCastSummary = {
  characterCount: number;
  voiceAssignedCount: number;
  cloneCount: number;
  personaCount: number;
  presetCount: number;
  missingVoiceCount: number;
  missingVoiceNames: string[];
  dialogueReadiness: DialogueReadinessStatus;
  dialogueReadinessLabelKey: string;
};
