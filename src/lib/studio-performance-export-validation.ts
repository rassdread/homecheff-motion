import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { MotionPerformanceExportWarning } from "@/types/motion-character-performance-export";
import type { CharacterPerformanceProfile } from "@/types/studio-character-performance";
import {
  normalizeSceneEmotion,
  SCENE_ENERGY_MULTIPLIERS,
} from "@/lib/studio-character-performance";
import type { CharacterSnapshot } from "@/types/studio-character-snapshot";

const KNOWN_EMOTION_KEYS = new Set([
  "happy",
  "joyful",
  "sad",
  "excited",
  "calm",
  "angry",
  "neutral",
]);

function matchSnapshotSpeaker(speaker: string, characters: CharacterSnapshot[]): CharacterSnapshot | null {
  const norm = speaker.trim().toLowerCase();
  if (!norm) {
    return null;
  }
  return characters.find((c) => c.name.trim().toLowerCase() === norm) ?? null;
}

export type MotionPerformanceValidationCode =
  | "legacy_handoff"
  | "voice_without_performance_profile"
  | "active_speaker_not_in_scene"
  | "performance_disabled_for_speaker"
  | "unknown_emotion"
  | "unknown_energy"
  | "no_voice_segments"
  | "no_mouth_anchor_assets";

export function validateMotionPerformanceExport(params: {
  handoff: MotionHandoffPayload;
  profiles: CharacterPerformanceProfile[];
}): MotionPerformanceExportWarning[] {
  const warnings: MotionPerformanceExportWarning[] = [];
  const { handoff, profiles } = params;

  if (handoff.version < MOTION_HANDOFF_PAYLOAD_VERSION) {
    warnings.push({
      code: "legacy_handoff",
      message: `Handoff v${handoff.version} has no performance runtime (requires v${MOTION_HANDOFF_PAYLOAD_VERSION}).`,
    });
    return warnings;
  }

  const voiceSegments = handoff.voiceSegments ?? [];
  const hasVoice = Boolean(handoff.voiceMetadata?.ready || voiceSegments.length > 0);

  if (hasVoice && profiles.length === 0) {
    warnings.push({
      code: "voice_without_performance_profile",
      message: "Voice is present but no enabled character performance profiles.",
    });
  }

  if (hasVoice && voiceSegments.length === 0) {
    warnings.push({
      code: "no_voice_segments",
      message: "Voice metadata exists without timed voice segments.",
    });
  }

  const knownEnergies = new Set(Object.keys(SCENE_ENERGY_MULTIPLIERS));

  for (const scene of handoff.scenes ?? []) {
    const emotion = normalizeSceneEmotion(scene.emotion);
    const raw = (scene.emotion ?? "").trim();
    if (raw && !KNOWN_EMOTION_KEYS.has(emotion)) {
      warnings.push({
        code: "unknown_emotion",
        message: `Scene "${scene.title}" uses unrecognized emotion "${scene.emotion}".`,
      });
    }

    const energyRaw = (scene.sceneEnergy ?? "neutral").trim().toLowerCase();
    if (energyRaw && !knownEnergies.has(energyRaw)) {
      warnings.push({
        code: "unknown_energy",
        message: `Scene "${scene.title}" uses unrecognized energy "${scene.sceneEnergy}".`,
      });
    }
  }

  for (const segment of voiceSegments) {
    const scene = handoff.scenes?.find((s) => s.sceneId === segment.sceneId);
    const speaker = typeof segment.speaker === "string" ? segment.speaker.trim() : "";
    if (!speaker || !scene) {
      continue;
    }
    const match = matchSnapshotSpeaker(speaker, scene.characters ?? []);
    if (!match) {
      warnings.push({
        code: "active_speaker_not_in_scene",
        message: `Speaker "${speaker}" on scene "${scene.title}" does not match scene characters.`,
      });
      continue;
    }
    const profile = profiles.find((p) => p.characterId === match.id);
    if (!profile) {
      const disabled = handoff.characterPerformanceProfiles?.find(
        (p) => p.characterId === match.id && !p.performanceEnabled
      );
      if (disabled) {
        warnings.push({
          code: "performance_disabled_for_speaker",
          message: `${match.name} is the speaker but performance overlay is disabled.`,
        });
      }
    }
  }

  const hasAnchors = (handoff.scenes ?? []).some((s) =>
    (s.characters ?? []).some((c) => Boolean(c.referenceImageUrl?.trim()))
  );
  if (!hasAnchors) {
    warnings.push({
      code: "no_mouth_anchor_assets",
      message:
        "No character reference anchors for asset-based mouth overlay; using debug performance indicators only.",
    });
  }

  return warnings;
}
