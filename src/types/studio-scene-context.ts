import type { CharacterSnapshot } from "@/types/studio-character-snapshot";
import type { LocationSnapshot } from "@/types/studio-location-snapshot";
import type { PropSnapshot } from "@/types/studio-prop-snapshot";
import type { StudioSceneImageReference } from "@/types/studio-scene-image-reference";
import type { WizardImageSource } from "@/types/studio-scene-image-reference";
import type { MotionSceneStudioQa } from "@/types/motion-studio-intelligence";

/**
 * Studio metadata preserved on a Motion wizard scene (not used by Vidu yet).
 */
export type StudioSceneContextMetadata = {
  source: "studio";
  storyboardId: string;
  sceneId: string;
  action: string;
  emotion: string;
  camera: string;
  /** V23 — director metadata (read-only on Motion). */
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
  directorProfile?: import("@/lib/studio-director-profiles").StudioDirectorProfile;
  transitionToNext: string;
  location: LocationSnapshot | null;
  characters: CharacterSnapshot[];
  props: PropSnapshot[];
  /** Combined planning notes (description + action) for future Prompt Builder. */
  notes: string;
  /** Reserved — voice assignment per scene. */
  voice?: string;
  /** Reserved — music assignment per scene. */
  music?: string;
  /** V36 — sound effects plan summary per scene. */
  sfx?: string;
  /** V37 — audio production focus per scene. */
  audioFocus?: string;
  /** V7 — Motion-ready prompt (not sent to Vidu yet). */
  generatedPrompt?: string;
  stylePrompt?: string;
  continuityPrompt?: string;
  promptVersion?: import("@/types/studio-prompt-builder").PromptVersionMetadata;
  /** V8+ — selected generated scene image for Motion import. */
  selectedSceneImageId?: string | null;
  preferredSceneImageUrl?: string | null;
  sceneImageReference?: StudioSceneImageReference | null;
  imageSource?: WizardImageSource;
  selectedSceneImagePromptVersion?: number | null;
  selectedSceneImageGenerationVersion?: number | null;
  /** V18: Studio QA scores for Motion pre-render review (read-only). */
  studioQa?: MotionSceneStudioQa;
  /** V30: structured execution package from handoff v11. */
  sceneExecutionPackage?: import("@/types/studio-scene-execution").StudioSceneExecutionPackage;
  /** V30: final execution prompt for Vidu (debug / preview). */
  executionPrompt?: string;
};
