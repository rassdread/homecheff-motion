/**
 * Studio V44 — Character Blocking Director (planning only, no animation).
 */

export type CharacterAction =
  | "STANDING"
  | "WALKING"
  | "RUNNING"
  | "TALKING"
  | "PRESENTING"
  | "POINTING"
  | "LOOKING"
  | "LISTENING"
  | "COOKING"
  | "SHOPPING"
  | "WORKING"
  | "SITTING"
  | "WAVING"
  | "HANDSHAKE"
  | "CELEBRATING"
  | "HOLDING_ITEM"
  | "USING_PHONE"
  | "OBSERVING";

export type CharacterPose =
  | "NEUTRAL"
  | "CONFIDENT"
  | "FRIENDLY"
  | "FOCUSED"
  | "HAPPY"
  | "SERIOUS"
  | "EXCITED"
  | "THOUGHTFUL";

export type AttentionTarget =
  | "CAMERA"
  | "CHARACTER"
  | "PROP"
  | "PRODUCT"
  | "LOCATION"
  | "AUDIENCE";

export type InteractionType =
  | "NONE"
  | "CONVERSATION"
  | "HANDSHAKE"
  | "TEAMWORK"
  | "EXCHANGE"
  | "DEMONSTRATION"
  | "GROUP_ACTIVITY";

export type EngagementLevel = "high" | "medium" | "low";

export type BlockingWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  sceneId?: string;
  params?: Record<string, string | number>;
};

export type CharacterActionPlan = {
  sceneId: string;
  characterId: string;
  characterName: string;
  action: CharacterAction;
  engagementLevel: EngagementLevel;
  isActiveSpeaker: boolean;
  summaryKey: string;
};

export type CharacterPosePlan = {
  sceneId: string;
  characterId: string;
  characterName: string;
  pose: CharacterPose;
  emotionSource: string;
  summaryKey: string;
};

export type CharacterInteractionPlan = {
  sceneId: string;
  interactionType: InteractionType;
  participantIds: string[];
  participantNames: string[];
  descriptionKey: string;
};

export type AttentionTargetPlan = {
  sceneId: string;
  characterId: string;
  characterName: string;
  target: AttentionTarget;
  targetName: string | null;
  summaryKey: string;
};

export type SceneCharacterBlocking = {
  sceneId: string;
  order: number;
  sceneGoal: string;
  activeSpeakerId: string | null;
  activeSpeakerName: string | null;
  isNarratorScene: boolean;
  blockingSummary: string;
  characterActions: CharacterActionPlan[];
  characterPoses: CharacterPosePlan[];
  interaction: CharacterInteractionPlan;
  attentionTargets: AttentionTargetPlan[];
  blockingWarnings: BlockingWarning[];
};

export type CharacterBlockingPlan = {
  enabled: boolean;
  version: 44;
  sceneBlockings: SceneCharacterBlocking[];
  characterActions: CharacterActionPlan[];
  characterPoses: CharacterPosePlan[];
  characterInteractions: CharacterInteractionPlan[];
  attentionTargets: AttentionTargetPlan[];
  blockingWarnings: BlockingWarning[];
};

export type MotionCharacterBlockingHandoffPlan = Pick<
  CharacterBlockingPlan,
  | "enabled"
  | "sceneBlockings"
  | "characterActions"
  | "characterPoses"
  | "characterInteractions"
  | "attentionTargets"
  | "blockingWarnings"
>;
