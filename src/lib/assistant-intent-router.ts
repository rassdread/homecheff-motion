import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { AssistantClarificationKind } from "@/lib/assistant-session-memory";
import {
  characterStudioFlowToActionId,
  detectCharacterStudioFlowFromMessage,
} from "@/lib/character-studio-copilot";
import { detectStudioVideoIntent } from "@/lib/studio-video-intents";
import type { StudioVideoIntent } from "@/types/studio-video-production";

export type AssistantClarifyOption = {
  id: string;
  labelKey: `assistant.clarify.${string}`;
  actionId: AssistantActionId;
  understoodKey: `assistant.understood.${string}`;
};

export type AssistantIntentMatch =
  | { kind: "query"; query: AssistantQueryKind }
  | {
      kind: "action";
      actionId: AssistantActionId;
      understoodKey: `assistant.understood.${string}`;
      videoIntent?: StudioVideoIntent;
    }
  | { kind: "clarify"; clarification: AssistantClarificationKind; messageKey: `assistant.clarify.${string}` }
  | { kind: "unknown" };

export type AssistantQueryKind =
  | "list_characters"
  | "list_motion_videos"
  | "list_fusion_outputs"
  | "open_latest_project"
  | "project_status"
  | "project_assets";

const VIDEO_TYPE_OPTIONS: AssistantClarifyOption[] = [
  {
    id: "story",
    labelKey: "assistant.clarify.video.story",
    actionId: "create_motion_video",
    understoodKey: "assistant.understood.videoStory",
  },
  {
    id: "ad",
    labelKey: "assistant.clarify.video.ad",
    actionId: "create_fusion",
    understoodKey: "assistant.understood.videoAd",
  },
  {
    id: "social",
    labelKey: "assistant.clarify.video.social",
    actionId: "create_publish_export",
    understoodKey: "assistant.understood.videoSocial",
  },
  {
    id: "animation",
    labelKey: "assistant.clarify.video.animation",
    actionId: "create_motion_video",
    understoodKey: "assistant.understood.videoAnimation",
  },
];

export function assistantClarifyOptions(
  kind: AssistantClarificationKind
): AssistantClarifyOption[] {
  if (kind === "video_type") {
    return VIDEO_TYPE_OPTIONS;
  }
  return [];
}

function normalizeAssistantInput(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((needle) => hay.includes(needle));
}

export function matchAssistantIntent(
  input: string,
  options?: { pendingClarification?: AssistantClarificationKind | null }
): AssistantIntentMatch {
  const text = normalizeAssistantInput(input);

  if (options?.pendingClarification === "video_type") {
    const option = VIDEO_TYPE_OPTIONS.find(
      (row) =>
        text === row.id ||
        text.includes(row.id) ||
        (row.id === "story" && includesAny(text, ["verhaal", "story", "film"])) ||
        (row.id === "ad" && includesAny(text, ["reclame", "campagne", "ad", "commercial"])) ||
        (row.id === "social" && includesAny(text, ["social", "instagram", "tiktok", "reels"])) ||
        (row.id === "animation" && includesAny(text, ["animatie", "animation", "motion"]))
    );
    if (option) {
      return {
        kind: "action",
        actionId: option.actionId,
        understoodKey: option.understoodKey,
      };
    }
  }

  if (
    includesAny(text, [
      "welke personages",
      "which characters",
      "mijn personages",
      "my characters",
      "lijst personages",
      "list characters",
    ])
  ) {
    return { kind: "query", query: "list_characters" };
  }

  if (
    includesAny(text, [
      "welke motion",
      "which motion",
      "motion video",
      "motion videos",
      "mijn video's",
      "my videos",
      "welke video",
      "which video",
    ])
  ) {
    return { kind: "query", query: "list_motion_videos" };
  }

  if (
    includesAny(text, [
      "fusion output",
      "fusion outputs",
      "welke fusion",
      "which fusion",
    ])
  ) {
    return { kind: "query", query: "list_fusion_outputs" };
  }

  if (
    includesAny(text, [
      "laatste project",
      "last project",
      "open mijn project",
      "open my project",
      "open project",
    ])
  ) {
    return { kind: "query", query: "open_latest_project" };
  }

  if (
    includesAny(text, [
      "workflow status",
      "project status",
      "waar staat dit project",
      "where is this project",
      "motion_ready",
      "publish_ready",
    ])
  ) {
    return { kind: "query", query: "project_status" };
  }

  if (
    includesAny(text, [
      "assets bij dit project",
      "assets for this project",
      "welke assets",
      "which assets",
      "bij dit project",
      "for this project",
    ])
  ) {
    return { kind: "query", query: "project_assets" };
  }

  if (
    includesAny(text, [
      "van deze foto",
      "from this photo",
      "from reference",
      "van foto",
      "from photo",
      "referentie",
      "reference image",
      "foto personage",
    ])
  ) {
    return {
      kind: "action",
      actionId: "create_character_from_reference",
      understoodKey: "assistant.understood.characterFromReference",
    };
  }

  if (
    includesAny(text, [
      "motion-ready",
      "motion ready",
      "motion ready personage",
      "prepare motion",
      "klaar voor motion",
    ])
  ) {
    return {
      kind: "action",
      actionId: "prepare_motion_character",
      understoodKey: "assistant.understood.motionReadyCharacter",
    };
  }

  if (
    includesAny(text, [
      "nieuw personage",
      "new character",
      "personage maken",
      "create character",
      "maak een personage",
      "make a character",
    ])
  ) {
    return {
      kind: "action",
      actionId: "create_character",
      understoodKey: "assistant.understood.createCharacter",
    };
  }

  const videoIntentMatch = detectStudioVideoIntent(input);
  if (videoIntentMatch) {
    return {
      kind: "action",
      actionId: "create_video_production",
      understoodKey: "assistant.understood.createVideoProduction",
      videoIntent: videoIntentMatch.intent,
    };
  }

  if (
    includesAny(text, [
      "video maken",
      "make a video",
      "create video",
      "maak een video",
      "ik wil een video",
      "i want a video",
      "animatie maken",
      "videoclip",
      "maak een videoclip",
    ])
  ) {
    return {
      kind: "action",
      actionId: "create_video_production",
      understoodKey: "assistant.understood.createVideoProduction",
      videoIntent: "brand_story",
    };
  }

  if (
    includesAny(text, [
      "motion video",
      "animate",
      "animatie starten",
      "start motion",
      "naar motion",
      "open motion",
      "create video",
    ])
  ) {
    return {
      kind: "action",
      actionId: "create_video_production",
      understoodKey: "assistant.understood.createVideoProduction",
      videoIntent: "brand_story",
    };
  }

  const characterStudioMatch = detectCharacterStudioFlowFromMessage(input);
  if (characterStudioMatch.kind === "flow") {
    const actionId = characterStudioFlowToActionId(characterStudioMatch.flowId);
    const understoodByFlow: Partial<Record<typeof characterStudioMatch.flowId, `assistant.understood.${string}`>> = {
      outfit: "assistant.understood.fusionOutfit",
      logo_placement: "assistant.understood.fusionLogo",
      mascot_transform: "assistant.understood.editMascot",
      human_to_mascot: "assistant.understood.editMascot",
      mascot_to_human: "assistant.understood.editMascot",
      character_upgrade: "assistant.understood.humanMorph",
      motion_ready: "assistant.understood.motionReadyCharacter",
      full_body: "assistant.understood.motionReadyCharacter",
      character_fusion: "assistant.understood.createFusion",
      future_child: "assistant.understood.fusionAge",
      genetic_blend: "assistant.understood.createFusion",
    };
    return {
      kind: "action",
      actionId,
      understoodKey:
        understoodByFlow[characterStudioMatch.flowId] ?? "assistant.understood.createFusion",
    };
  }

  if (includesAny(text, ["outfit", "kleding", "jas op", "clothing from"])) {
    return {
      kind: "action",
      actionId: "prepare_outfit",
      understoodKey: "assistant.understood.fusionOutfit",
    };
  }

  if (includesAny(text, ["logo plaats", "logo placement", "logo bescherm"])) {
    return {
      kind: "action",
      actionId: "prepare_logo_placement",
      understoodKey: "assistant.understood.fusionLogo",
    };
  }

  if (
    includesAny(text, [
      "fusion",
      "combineren",
      "combine",
      "samenvoegen",
    ])
  ) {
    return {
      kind: "action",
      actionId: "create_fusion",
      understoodKey: "assistant.understood.createFusion",
    };
  }

  if (
    includesAny(text, [
      "publish",
      "publiceren",
      "export",
      "exporteren",
      "deliverable",
    ])
  ) {
    return {
      kind: "action",
      actionId: "create_publish_export",
      understoodKey: "assistant.understood.createPublishExport",
    };
  }

  if (includesAny(text, ["hernoem", "rename project", "rename"])) {
    return {
      kind: "action",
      actionId: "rename_project",
      understoodKey: "assistant.understood.renameProject",
    };
  }

  if (includesAny(text, ["open asset", "open bibliotheek", "open library", "browse assets"])) {
    return {
      kind: "action",
      actionId: "open_asset",
      understoodKey: "assistant.understood.openAsset",
    };
  }

  return { kind: "unknown" };
}
