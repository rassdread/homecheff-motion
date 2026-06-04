/**
 * Lightweight reference to a Studio-generated scene still (V9+ continuity prep).
 * Stored on Motion wizard slots and handoff payloads — not used by Vidu yet.
 */
export type StudioSceneImageReference = {
  sceneImageId: string;
  sceneId: string;
  storyboardId: string;
  promptVersion: number;
  generationVersion: number;
  imageUrl: string;
  thumbnailUrl: string;
};

export type WizardImageSource = "studio" | "manual";
