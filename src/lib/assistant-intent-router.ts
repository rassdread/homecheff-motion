import type { AssistantActionId } from "@/lib/assistant-action-registry";
import type { AssistantClarificationKind } from "@/lib/assistant-session-memory";

export type AssistantClarifyOption = {
  id: string;
  labelKey: `assistant.clarify.${string}`;
  actionId: AssistantActionId;
  understoodKey: `assistant.understood.${string}`;
};

export type AssistantIntentMatch =
  | { kind: "query"; query: AssistantQueryKind }
  | { kind: "action"; actionId: AssistantActionId; understoodKey: `assistant.understood.${string}` }
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

  if (
    includesAny(text, [
      "video maken",
      "make a video",
      "create video",
      "maak een video",
      "ik wil een video",
      "i want a video",
      "animatie maken",
    ])
  ) {
    return {
      kind: "clarify",
      clarification: "video_type",
      messageKey: "assistant.clarify.video.prompt",
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
    ])
  ) {
    return {
      kind: "action",
      actionId: "create_motion_video",
      understoodKey: "assistant.understood.createMotionVideo",
    };
  }

  if (
    includesAny(text, [
      "fusion",
      "combineren",
      "combine",
      "outfit",
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
