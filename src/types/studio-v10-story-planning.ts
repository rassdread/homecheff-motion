export type StudioV10NarrativeMode =
  | "voice_over_only"
  | "dialogue_only"
  | "voice_over_and_dialogue"
  | "silent";

export type StudioV10StoryArcPhase = "opening" | "conflict" | "development" | "resolution" | "cta";

export type StudioV10StoryArcBeat = {
  id: string;
  phase: StudioV10StoryArcPhase;
  label: string;
  summary: string;
};

export type StudioV10OverlayPosition = "top" | "center" | "bottom";

export type StudioV10OverlayPlan = {
  sceneId: string;
  header?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  position: StudioV10OverlayPosition;
  durationSeconds: number;
};

export type StudioV10DialogueLine = {
  id: string;
  character: string;
  voice: string;
  dialogue: string;
  emotion: string;
  sceneId: string;
  sceneIndex: number;
  timingLabel: string;
  enabled: boolean;
};

export type StudioV10VoiceOverLine = {
  sceneId: string;
  sceneIndex: number;
  script: string;
  narratorVoice: string;
  emotion: string;
  durationSeconds: number;
};

export type StudioV10SceneProposal = {
  id: string;
  index: number;
  title: string;
  location: string;
  characters: string[];
  action: string;
  emotion: string;
  purpose: string;
  voiceOver: string;
  dialogueLines: StudioV10DialogueLine[];
  overlay: StudioV10OverlayPlan;
  estimatedDurationSeconds: number;
  approved: boolean;
};

export type StudioV10SceneVoiceAssignment = {
  sceneId: string;
  sceneIndex: number;
  speakerLabel: string;
  voiceAssetId?: string;
  voiceProfile?: string;
  voiceName?: string;
  emotion?: string;
  speed?: number;
  isOverride?: boolean;
};

export type StudioV10RuntimeConfidence = "high" | "medium" | "low";

export type StudioV10RuntimeSceneRow = {
  sceneId: string;
  index: number;
  title: string;
  seconds: number;
};

export type StudioV10RuntimeBreakdown = {
  scenes: StudioV10RuntimeSceneRow[];
  totalSeconds: number;
  confidence: StudioV10RuntimeConfidence;
  factors: string[];
};

export type StudioV10InterpretationSummary = {
  audience: string;
  goal: string;
  emotion: string;
  narrativeType: string;
  cta: string;
  mainCharacters: string[];
  locations: string[];
  products: string[];
  interpretation: string;
};

export type StudioV10StoryPlanningState = {
  version: 1;
  locale: "nl" | "en";
  interpretation: StudioV10InterpretationSummary;
  interpretationConfirmed: boolean;
  narrativeMode: StudioV10NarrativeMode;
  storyArc: StudioV10StoryArcBeat[];
  sceneProposals: StudioV10SceneProposal[];
  dialogueLines: StudioV10DialogueLine[];
  voiceOverLines: StudioV10VoiceOverLine[];
  overlayPlans: StudioV10OverlayPlan[];
  sceneVoiceAssignments: StudioV10SceneVoiceAssignment[];
  runtime: StudioV10RuntimeBreakdown;
  userApproved: boolean;
  builtAt: string;
  updatedAt: string;
};

export type StudioProviderAudioCacheEntry = {
  id: string;
  kind: "music" | "sfx" | "voice";
  provider: string;
  providerAssetId: string;
  audioUrl: string;
  previewUrl: string;
  prompt: string;
  durationSeconds: number;
  createdAt: string;
  usageCount: number;
  lastUsedAt: string;
  libraryAssetId?: string;
};
