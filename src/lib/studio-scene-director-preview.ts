import { buildDirectorProfilePrompt, type StudioDirectorProfile } from "@/lib/studio-director-profiles";
import {
  buildCameraMovementPrompt,
  buildSceneEnergyPrompt,
  buildShotTypePrompt,
  resolveSceneShotType,
} from "@/lib/studio-scene-director";

export type DirectorPreviewScene = {
  description?: string;
  action?: string;
  emotion?: string;
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
  camera?: string;
};

/** Human-readable director-led scene summary (UI + planning). */
export function buildDirectorScenePreviewText(
  scene: DirectorPreviewScene,
  directorProfile?: StudioDirectorProfile
): string {
  const shot = resolveSceneShotType(scene.shotType, scene.camera);
  const shotPhrase = shot ? formatShotLabel(shot) : "";
  const movementPhrase = formatMovementLabel(scene.cameraMovement ?? "");
  const actionPart = [scene.action?.trim(), scene.description?.trim()].filter(Boolean).join(" ");
  const emotionPart = scene.emotion?.trim();

  const lead: string[] = [];
  if (shotPhrase) {
    lead.push(shotPhrase);
  }
  if (movementPhrase) {
    lead.push(movementPhrase);
  }

  const bodyParts: string[] = [];
  if (actionPart) {
    bodyParts.push(actionPart);
  }
  if (emotionPart) {
    bodyParts.push(`(${emotionPart})`);
  }

  const leadText = lead.length > 0 ? `${lead.join(". ")}.` : "";
  const bodyText = bodyParts.join(" ");
  const combined = [leadText, bodyText].filter(Boolean).join(" ");

  if (combined.trim()) {
    return combined.trim();
  }

  if (directorProfile) {
    return buildDirectorProfilePrompt(directorProfile).slice(0, 120);
  }
  return "";
}

/** Prompt-oriented director line (metadata for image prompts). */
export function buildDirectorPromptLine(scene: DirectorPreviewScene): string {
  const parts = [
    buildShotTypePrompt(scene.shotType ?? ""),
    buildCameraMovementPrompt(scene.cameraMovement ?? ""),
    buildSceneEnergyPrompt(scene.sceneEnergy ?? ""),
  ].filter(Boolean);
  return parts.join(" ");
}

function formatShotLabel(shot: string): string {
  return shot
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatMovementLabel(movement: string): string {
  const trimmed = movement.trim().toLowerCase().replace(/\s+/g, "_");
  if (!trimmed) {
    return "";
  }
  return trimmed
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
