/**
 * Studio V2 — AI Director proposal model (in-memory only, no DB writes until apply).
 */

import type { AiDirectorStyleStrength, InterpretedDirectorStyle } from "@/lib/studio-ai-director-interpreter";
import type { StoryArcPhase } from "@/lib/studio-story-arc";
import type { RenderReadinessLevel } from "@/lib/studio-render-readiness-summary";
import type { MotionRenderStrategyHandoffPlan } from "@/types/motion-handoff-payload";
import type { StudioProductionPlan } from "@/types/studio-production-plan";
import type { StudioAnimationPlan } from "@/types/studio-animation-plan";

export type DirectorProposalApplyMode = "all" | "scenes" | "assets" | "audio" | "text";

export type ProposedNewAsset = {
  tempId: string;
  name: string;
  reasonKey: string;
};

export type ProposedAssetRef = {
  existingId: string;
  name: string;
};

export type ProposedSceneAudio = {
  musicCueType: string;
  musicEnergyTarget: string;
  soundEnvironment: string;
  soundAmbient: string;
};

export type ProposedScene = {
  tempId: string;
  existingSceneId?: string;
  order: number;
  arcPhase: StoryArcPhase;
  titleKey: string;
  titleParams: Record<string, string>;
  descriptionKey: string;
  descriptionParams: Record<string, string>;
  actionKey: string;
  actionParams: Record<string, string>;
  emotion: string;
  shotType: string;
  cameraMovement: string;
  sceneEnergy: string;
  camera: string;
  characterRefs: ProposedAssetRef[];
  proposedCharacters: ProposedNewAsset[];
  locationRef: ProposedAssetRef | null;
  proposedLocation: ProposedNewAsset | null;
  propRefs: ProposedAssetRef[];
  proposedProps: ProposedNewAsset[];
  worldRef: ProposedAssetRef | null;
  sceneAudio: ProposedSceneAudio;
  textBeatKeys: string[];
  textBeatParams: Record<string, string>[];
  overlayKeys: string[];
  overlayParams: Record<string, string>[];
  durationSeconds: number;
};

export type DirectorProposalStoryArc = {
  beginningKey: string;
  middleKey: string;
  endKey: string;
  topicParams: Record<string, string>;
};

export type DirectorProposalCameraSummary = {
  dominantShotType: string;
  dominantMovement: string;
  framingKey: string;
};

export type DirectorProposalEmotionSummary = {
  moodKeywords: string[];
  energyProfileKey: string;
  toneKey: string;
};

export type DirectorProposalAudio = {
  voiceProfile: string;
  voiceProfileLabelKey: string;
  narrationMode: string;
  voiceEnabled: boolean;
  musicProfile: string;
  musicProfileLabelKey: string;
  musicIntensity: string;
  musicEnabled: boolean;
  soundProfile: string;
  soundProfileLabelKey: string;
  soundDensity: string;
  soundEnabled: boolean;
  recommendationKeys: string[];
};

export type ProposedCharacterVoice = {
  characterId: string;
  characterName: string;
  voiceProfile: string;
  voiceProfileLabelKey: string;
  voiceEnabled: boolean;
  voiceLock: boolean;
  status: "ready" | "missing" | "inconsistent";
  recommendationKey?: string;
};

export type DirectorProposalTextSummary = {
  openingHookKey: string;
  openingHookParams: Record<string, string>;
  coreMessageKey: string;
  coreMessageParams: Record<string, string>;
  ctaKey: string;
  ctaParams: Record<string, string>;
  sceneOverlays: Array<{
    sceneOrder: number;
    overlayKey: string;
    overlayParams: Record<string, string>;
  }>;
  narrationScriptPreview: string;
};

export type DirectorProposalVoiceSummary = {
  storyVoiceProfile: string;
  storyVoiceProfileLabelKey: string;
  characterVoices: ProposedCharacterVoice[];
  warningKeys: string[];
};

export type DirectorProposalRenderReadiness = {
  level: RenderReadinessLevel;
  score: number;
  checks: Array<{ id: string; messageKey: string; passed: boolean }>;
  recommendationKeys: string[];
};

export type DirectorProposalConsistencySuggestion = {
  id: string;
  domain: "story" | "characters" | "location" | "prop" | "voice" | "world" | "visual";
  issueKey: string;
  currentLabel: string;
  suggestedLabel: string;
  reasonKey?: string;
  sceneOrder?: number;
  assetRef?: ProposedAssetRef;
  voiceProfile?: string;
};

export type DirectorProposalFieldChange = {
  id: string;
  sceneOrder?: number;
  fieldKey: string;
  fromLabel: string;
  toLabel: string;
};

export type DirectorProposalMemorySuggestion = {
  id: string;
  kind: "character" | "location" | "prop" | "world" | "voice" | "style" | "audio";
  issueKey: string;
  memoryBasisKeys: string[];
  memoryBasisParams?: Record<string, string>[];
  assetRef?: ProposedAssetRef;
  proposedName?: string;
  usageStoryboardCount: number;
  usageRenderCount: number;
  sceneOrder?: number;
};

export type DirectorProposalIdentityRationale = {
  id: string;
  reasonKey: string;
  reasonParams?: Record<string, string>;
  sourceKind: string;
  sourceName: string;
};

export type DirectorProposalIdentityConsumption = {
  directorContextLines: string[];
  rationales: DirectorProposalIdentityRationale[];
  completenessWarnings: Array<{
    id: string;
    messageKey: string;
    assetName: string;
    kind: string;
  }>;
};

export type DirectorProposalActionShotDistributionEntry = {
  sceneOrder: number;
  sceneTitle: string;
  recommendedShotCount: number;
  suggestsMultipleShots: boolean;
  distributionReasonKey?: string;
  durationAdviceKey: string;
  durationAdviceParams?: Record<string, string>;
  beats: Array<{
    order: number;
    labelKey: string;
    actionHint: string;
    role: string;
    imageRole: string;
    imageStatus: string;
  }>;
  missingAssetKeys: string[];
};

export type DirectorProposalActionIntelligence = {
  characterPlans: Array<{
    characterId: string;
    characterName: string;
    expected: string[];
    supported: string[];
    possible: string[];
  }>;
  sceneSuggestions: Array<{
    sceneOrder: number;
    classification: "supported" | "possible" | "unusual" | "unsupported";
    suggestionKey?: string;
    suggestionParams?: Record<string, string>;
  }>;
};

export type DirectorProposalAnimationPlanEntry = {
  sceneOrder: number;
  sceneTitle: string;
  targetDuration: number;
  shots: Array<{
    shotRole: string;
    startTime: number;
    endTime: number;
    motionIntentKey: string;
    missingImage: boolean;
    actionBeat: string;
  }>;
};

export type StudioDirectorProposal = {
  version: 2;
  ideaPrompt: string;
  interpretation: InterpretedDirectorStyle;
  styleStrength: AiDirectorStyleStrength;
  directorQualityScore: number;
  storyArc: DirectorProposalStoryArc;
  scenes: ProposedScene[];
  camera: DirectorProposalCameraSummary;
  emotion: DirectorProposalEmotionSummary;
  audio: DirectorProposalAudio;
  text: DirectorProposalTextSummary;
  voices: DirectorProposalVoiceSummary;
  renderReadiness: DirectorProposalRenderReadiness;
  storyHealthKeys?: string[];
  consistencySuggestions?: DirectorProposalConsistencySuggestion[];
  fieldChanges?: DirectorProposalFieldChange[];
  memorySuggestions?: DirectorProposalMemorySuggestion[];
  identityConsumption?: DirectorProposalIdentityConsumption;
  renderStrategyPlan?: MotionRenderStrategyHandoffPlan;
  actionIntelligence?: DirectorProposalActionIntelligence;
  actionShotDistribution?: DirectorProposalActionShotDistributionEntry[];
  productionPlan?: StudioProductionPlan;
  animationPlan?: StudioAnimationPlan;
  animationPlanPreview?: DirectorProposalAnimationPlanEntry[];
  generationPlan?: import("@/types/studio-scene-generation-plan").StudioSceneGenerationPlan;
  productionMemoryContext?: import("@/types/studio-production-memory").ProductionMemoryContext;
  creativeReviewContext?: import("@/types/studio-creative-review").CreativeReviewContext;
  creationAssistantContext?: import("@/types/studio-creation-assistant").CreationAssistantContext;
  productionPatternContext?: import("@/types/studio-production-pattern").ProductionPatternContext;
  snapshotContext?: import("@/types/studio-production-snapshot").StudioSnapshotContext;
  generationPlanPreview?: Array<{
    sceneOrder: number;
    actionBeat: string;
    roleLabelKey: string;
    priority: "required" | "recommended" | "optional";
    status: "present" | "missing" | "blocked";
    orderIndex: number;
  }>;
};
