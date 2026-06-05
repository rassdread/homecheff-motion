/**
 * Studio V44 — automatic interaction detection from scene context.
 */

import type { InteractionType } from "@/types/studio-character-blocking";
import type { SceneCompositionType } from "@/types/studio-scene-composition";
import type { StudioSceneDetail } from "@/types/studio-api";

export type DetectedSceneInteraction = {
  interactionType: InteractionType;
  participantIds: string[];
  participantNames: string[];
  descriptionKey: string;
};

function sceneActionText(scene: StudioSceneDetail): string {
  return `${scene.action} ${scene.description} ${scene.title}`.toLowerCase();
}

export function detectSceneInteraction(
  scene: StudioSceneDetail,
  compositionType: SceneCompositionType
): DetectedSceneInteraction {
  const text = sceneActionText(scene);
  const participants = scene.characters.map((row) => ({
    id: row.id,
    name: row.name,
  }));

  if (participants.length === 0) {
    return {
      interactionType: "NONE",
      participantIds: [],
      participantNames: [],
      descriptionKey: "studio.blocking.interaction.none",
    };
  }

  if (text.includes("handshake") || text.includes("greet") || text.includes("welcome")) {
    return {
      interactionType: "HANDSHAKE",
      participantIds: participants.slice(0, 2).map((p) => p.id),
      participantNames: participants.slice(0, 2).map((p) => p.name),
      descriptionKey: "studio.blocking.interaction.handshake",
    };
  }

  if (
    text.includes("demonstrat") ||
    text.includes("cook") ||
    text.includes("kitchen") ||
    compositionType === "product_focus"
  ) {
    return {
      interactionType: "DEMONSTRATION",
      participantIds: participants.slice(0, 2).map((p) => p.id),
      participantNames: participants.slice(0, 2).map((p) => p.name),
      descriptionKey: "studio.blocking.interaction.demonstration",
    };
  }

  if (text.includes("exchange") || text.includes("give") || text.includes("share")) {
    return {
      interactionType: "EXCHANGE",
      participantIds: participants.slice(0, 2).map((p) => p.id),
      participantNames: participants.slice(0, 2).map((p) => p.name),
      descriptionKey: "studio.blocking.interaction.exchange",
    };
  }

  if (text.includes("team") || text.includes("together") || text.includes("collaborat")) {
    return {
      interactionType: "TEAMWORK",
      participantIds: participants.map((p) => p.id),
      participantNames: participants.map((p) => p.name),
      descriptionKey: "studio.blocking.interaction.teamwork",
    };
  }

  if (
    participants.length >= 3 ||
    compositionType === "community_scene" ||
    compositionType === "group_shot"
  ) {
    return {
      interactionType: "GROUP_ACTIVITY",
      participantIds: participants.map((p) => p.id),
      participantNames: participants.map((p) => p.name),
      descriptionKey: "studio.blocking.interaction.groupActivity",
    };
  }

  if (
    participants.length === 2 ||
    compositionType === "conversation" ||
    text.includes("talk") ||
    text.includes("conversation") ||
    text.includes("discuss")
  ) {
    return {
      interactionType: "CONVERSATION",
      participantIds: participants.slice(0, 2).map((p) => p.id),
      participantNames: participants.slice(0, 2).map((p) => p.name),
      descriptionKey: "studio.blocking.interaction.conversation",
    };
  }

  return {
    interactionType: "NONE",
    participantIds: participants.length === 1 ? [participants[0]!.id] : [],
    participantNames: participants.length === 1 ? [participants[0]!.name] : [],
    descriptionKey: "studio.blocking.interaction.none",
  };
}
