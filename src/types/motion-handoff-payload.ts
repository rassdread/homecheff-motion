import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioSceneContextMetadata } from "@/types/studio-scene-context";
import type { PromptVersionMetadata } from "@/types/studio-prompt-builder";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioSceneImageReference } from "@/types/studio-scene-image-reference";
import type {
  CharacterMemorySnapshot,
  LocationMemorySnapshot,
  PropMemorySnapshot,
  WorldMemorySnapshot,
} from "@/types/studio-memory-snapshots";
import type { SceneConsistencyReport, StoryboardConsistencyReport } from "@/types/studio-consistency";
import type {
  ConsistencyHistoryEntry,
  CorrectionRecommendation,
  ImprovementScore,
} from "@/types/studio-correction";
import type { VisionConsistencyReport, StoryboardVisionReport } from "@/types/studio-vision-consistency";
import type { StoryboardCharacterConsistencyReport } from "@/types/studio-character-consistency";
import type {
  StudioExecutionReadiness,
  StudioExecutionWarning,
  StudioSceneExecutionPackage,
  StudioStoryExecutionPackage,
} from "@/types/studio-scene-execution";
import type { CharacterVoiceAssignment } from "@/types/studio-character-voice";
import type {
  ActiveSpeakerPerformanceData,
  CharacterPerformanceAssignment,
  CharacterPerformanceState,
  PerformanceEmotionModifier,
  PerformanceEnergyModifier,
} from "@/types/studio-character-performance";
import type {
  MotionSubtitleTrackHandoff,
  MotionVoiceMetadata,
  MotionVoiceSegmentHandoff,
} from "@/types/studio-voice-execution";
import type {
  MotionMusicHandoffPlan,
  MotionSceneMusicCueHandoff,
  MusicDirectorWarning,
  SceneMusicCue,
} from "@/types/studio-music-director";
import type {
  MotionSceneSoundCueHandoff,
  MotionSoundHandoffPlan,
  SceneSoundCue,
  SoundDirectorWarning,
} from "@/types/studio-sound-director";
import type {
  AudioProductionWarning,
  MotionAudioProductionHandoffPlan,
  MotionSceneAudioProductionHandoff,
} from "@/types/studio-audio-production-director";
import type {
  AudioAssetWarning,
  MotionAudioAssetHandoffPlan,
  MotionSceneAudioAssetHandoff,
  StudioAudioAsset,
} from "@/types/studio-audio-asset-director";
import type {
  MotionCharacterResolvedVoiceHandoff,
  MotionVoiceIdentityHandoffPlan,
  ResolvedCharacterVoiceIdentity,
  VoiceIdentityWarning,
} from "@/types/studio-voice-identity";
import type {
  MotionMediaAssetHandoffPlan,
  StudioAssetCollection,
} from "@/types/studio-media-asset";
import type {
  MotionProviderExecutionHandoffPlan,
  ProviderAssignment,
  ProviderCapability,
  ProviderCostEstimate,
  ProviderExecutionWarning,
  ProviderFallbackPlan,
} from "@/types/studio-provider-execution";
import type {
  BrandPlacementPlan,
  CharacterPlacementPlan,
  CompositionWarning,
  LocationCompositionPlan,
  MotionSceneCompositionHandoffPlan,
  PropPlacementPlan,
  SceneComposition,
} from "@/types/studio-scene-composition";
import type {
  BrandPlacement,
  CharacterPlacement,
  LocationPlacement,
  MotionAssetPlacementHandoffPlan,
  PlacementWarning,
  PropPlacement,
  SceneAssetPlacement,
  VisualHierarchySummary,
} from "@/types/studio-asset-placement";
import type {
  AttentionTargetPlan,
  BlockingWarning,
  CharacterActionPlan,
  CharacterInteractionPlan,
  CharacterPosePlan,
  MotionCharacterBlockingHandoffPlan,
  SceneCharacterBlocking,
} from "@/types/studio-character-blocking";
import type { MotionSceneTextBeatsHandoff } from "@/types/studio-text-beats-handoff";

export const MOTION_HANDOFF_PAYLOAD_VERSION = 25 as const;

/**
 * Single source of truth for Studio → Motion wizard import.
 */
export type MotionHandoffScene = SceneSnapshot & {
  studioContext: StudioSceneContextMetadata;
  generatedPrompt: string;
  stylePrompt: string;
  continuityPrompt: string;
  promptVersion: PromptVersionMetadata;
  /** Resolved Studio still for Motion (selected → latest completed). */
  selectedSceneImageId: string | null;
  selectedSceneImageUrl: string | null;
  selectedSceneImagePromptVersion: number | null;
  selectedSceneImageGenerationVersion: number | null;
  sceneImageReference: StudioSceneImageReference | null;
  /** V11: consistency metadata for selected/l latest still (stored only). */
  sceneConsistencyScore: number | null;
  sceneConsistencyReport: SceneConsistencyReport | null;
  sceneConsistencyRecommendations: string[];
  /** V12: structured correction recommendations for selected still (metadata only). */
  sceneCorrectionRecommendations: CorrectionRecommendation[];
  /** V13: visual QA for selected still (metadata only). */
  sceneVisionScore: number | null;
  sceneVisionReport: VisionConsistencyReport | null;
  /** V14: selected still scoring for Motion import (metadata only). */
  selectedImageScore: number | null;
  selectedImageVisionScore: number | null;
  selectedImageConsistencyScore: number | null;
  selectedImageImprovementScore: number | null;
  selectedImageRecommended: boolean;
  /** V30: structured execution package (Motion / Vidu). */
  sceneExecutionPackage?: StudioSceneExecutionPackage;
  /** V30: final combined execution prompt for generation. */
  executionPrompt?: string;
  /** V31: timed voice segment for this scene (metadata for Motion export). */
  voiceSegment?: MotionVoiceSegmentHandoff;
  /** V33: primary speaker on this scene. */
  activeSpeaker?: string | null;
  speakerVoiceProfile?: string | null;
  /** V34: computed performance state for scene primary speaker. */
  speakerPerformance?: CharacterPerformanceState | null;
  /** V35: scene music cue plan (planning only — no audio). */
  musicCue?: MotionSceneMusicCueHandoff;
  /** V36: scene sound effects cue plan (planning only — no audio). */
  soundCue?: MotionSceneSoundCueHandoff;
  /** V37: scene audio production mix plan (planning only — no audio). */
  audioProduction?: MotionSceneAudioProductionHandoff;
  /** V38: scene audio asset assignments (planning only — no audio). */
  sceneAudioAssetPackage?: MotionSceneAudioAssetHandoff;
  /** V39: resolved voice identity for scene primary speaker. */
  resolvedVoiceProfile?: string | null;
  /** V42: per-scene visual composition (planning only). */
  sceneComposition?: SceneComposition;
  /** V43: per-scene semantic asset placement (planning only). */
  assetPlacement?: SceneAssetPlacement;
  /** V44: per-scene character blocking (planning only). */
  characterBlocking?: SceneCharacterBlocking;
  /** V46: Studio-generated text beats for Motion overlay defaults. */
  studioTextBeats?: MotionSceneTextBeatsHandoff;
};

export type MotionHandoffPayload = {
  version: typeof MOTION_HANDOFF_PAYLOAD_VERSION;
  storyboardId: string;
  title: string;
  description: string;
  promptStyleProfile: StudioPromptStyleProfile;
  /** V23: director profile + shot metadata (read-only for Motion). */
  directorProfile: StudioDirectorProfile;
  shotDiversityScore: number;
  /** V10: stored for future Motion continuity; not used in rendering yet. */
  characterMemory: CharacterMemorySnapshot[];
  locationMemory: LocationMemorySnapshot | null;
  propMemory: PropMemorySnapshot[];
  worldMemory: WorldMemorySnapshot | null;
  continuityStrength: StudioContinuityStrength;
  /** V11: storyboard-wide consistency (metadata only). */
  consistencyReport: StoryboardConsistencyReport | null;
  overallConsistencyScore: number;
  driftWarnings: string[];
  /** V12: aggregated correction recommendations (metadata only). */
  correctionRecommendations: CorrectionRecommendation[];
  consistencyHistory: ConsistencyHistoryEntry[];
  latestImprovementScore: ImprovementScore | null;
  /** V13: storyboard-wide vision QA (metadata only). */
  visionReport: StoryboardVisionReport | null;
  overallVisionScore: number;
  visionWarnings: string[];
  /** V17: character identity across storyboard (metadata only). */
  characterConsistencyReport: StoryboardCharacterConsistencyReport | null;
  overallCharacterConsistencyScore: number;
  characterDriftWarnings: string[];
  perSceneCharacterIdentityScores: Array<{
    sceneId: string;
    order: number;
    characters: Array<{ characterId: string; name: string; score: number; status: string }>;
  }>;
  /** V30: story-level execution summary. */
  executionPackage?: StudioStoryExecutionPackage;
  executionReadiness?: StudioExecutionReadiness;
  executionWarnings?: StudioExecutionWarning[];
  /** V31: voice-over metadata (no Vidu wiring). */
  voiceMetadata?: MotionVoiceMetadata;
  voiceDuration?: number;
  subtitleTrack?: MotionSubtitleTrackHandoff;
  subtitleAvailability?: boolean;
  /** V33: per-character voice assignments for Motion preview. */
  characterVoiceProfiles?: CharacterVoiceAssignment[];
  characterVoiceAssignments?: CharacterVoiceAssignment[];
  voiceSegments?: MotionVoiceSegmentHandoff[];
  /** V34: per-character performance profiles. */
  characterPerformanceProfiles?: CharacterPerformanceAssignment[];
  performanceStates?: CharacterPerformanceState[];
  activeSpeakerData?: ActiveSpeakerPerformanceData[];
  emotionModifiers?: Record<string, PerformanceEmotionModifier>;
  energyModifiers?: PerformanceEnergyModifier[];
  /** V35: Music Director plan (no generated audio). */
  musicPlan?: MotionMusicHandoffPlan;
  musicProfile?: string;
  sceneMusicCues?: SceneMusicCue[];
  musicNarrativeSummary?: string;
  musicWarnings?: MusicDirectorWarning[];
  /** V36: Sound Effects Director plan (no generated audio). */
  soundPlan?: MotionSoundHandoffPlan;
  soundProfile?: string;
  sceneSoundCues?: SceneSoundCue[];
  soundWarnings?: SoundDirectorWarning[];
  /** V37: Audio Production Director plan (no mixed audio). */
  audioProductionPlan?: MotionAudioProductionHandoffPlan;
  audioFocusSummary?: string;
  audioWarnings?: AudioProductionWarning[];
  /** V38: Audio Asset Director plan (no rendered audio). */
  audioAssetPlan?: MotionAudioAssetHandoffPlan;
  assignedVoiceAssets?: StudioAudioAsset[];
  assignedMusicAssets?: StudioAudioAsset[];
  assignedSoundAssets?: StudioAudioAsset[];
  assetWarnings?: AudioAssetWarning[];
  /** V39: Voice Identity plan (lock enforcement, multi-language). */
  voiceIdentityPlan?: MotionVoiceIdentityHandoffPlan;
  lockedVoiceAssignments?: CharacterVoiceAssignment[];
  resolvedVoiceProfiles?: ResolvedCharacterVoiceIdentity[];
  voiceIdentityWarnings?: VoiceIdentityWarning[];
  characterResolvedVoices?: MotionCharacterResolvedVoiceHandoff[];
  /** V40: Media Asset Manager plan (metadata only). */
  mediaAssetPlan?: MotionMediaAssetHandoffPlan;
  assetReferences?: MotionMediaAssetHandoffPlan["assetReferences"];
  assetCollections?: StudioAssetCollection[];
  assetUsageSummary?: string;
  /** V41: Provider Execution Framework (planning only — no provider calls). */
  providerExecutionPlan?: MotionProviderExecutionHandoffPlan;
  providerAssignments?: ProviderAssignment[];
  providerFallbackPlan?: ProviderFallbackPlan;
  providerCapabilities?: ProviderCapability[];
  providerWarnings?: ProviderExecutionWarning[];
  providerCostEstimate?: ProviderCostEstimate[];
  /** V42: Scene Composition Director plan (planning only — no rendering). */
  sceneCompositionPlan?: MotionSceneCompositionHandoffPlan;
  characterPlacementPlans?: CharacterPlacementPlan[];
  propPlacementPlans?: PropPlacementPlan[];
  brandPlacementPlans?: BrandPlacementPlan[];
  locationCompositionPlans?: LocationCompositionPlan[];
  visualFocusSummary?: string;
  compositionWarnings?: CompositionWarning[];
  /** V43: Asset Placement Engine plan (planning only — no rendering). */
  assetPlacementPlan?: MotionAssetPlacementHandoffPlan;
  characterPlacements?: CharacterPlacement[];
  propPlacements?: PropPlacement[];
  brandPlacements?: BrandPlacement[];
  locationPlacements?: LocationPlacement[];
  visualHierarchySummary?: VisualHierarchySummary;
  placementWarnings?: PlacementWarning[];
  /** V44: Character Blocking Director plan (planning only — no animation). */
  characterBlockingPlan?: MotionCharacterBlockingHandoffPlan;
  characterActions?: CharacterActionPlan[];
  characterPoses?: CharacterPosePlan[];
  characterInteractions?: CharacterInteractionPlan[];
  attentionTargets?: AttentionTargetPlan[];
  blockingWarnings?: BlockingWarning[];
  scenes: MotionHandoffScene[];
};
