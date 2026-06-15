import type { AssetPickerCategory } from "@/components/library/homecheff-asset-picker-modal";
import type { BriefWizardKind } from "@/components/studio/studio-brief-asset-wizard-panel";
import type {
  BriefAssetRequirement,
  BriefAssetRequirementKind,
  BriefAssetRequirementStatus,
} from "@/lib/studio-brief-asset-wizards";

export const EDITOR_VARIANT_ENDPOINT = "/api/editor/instruction/variant";

/** Studio asset requirement flows must never hit the editor variant API. */
export const STUDIO_ASSET_REQUIREMENT_ENDPOINTS = {
  generateImage: "/api/studio/asset-references/generate",
  uploadImage: "/api/uploads/images",
  uploadAudio: "/api/studio/audio-library/upload",
  voicePreviewDraft: "/api/studio/characters/voice-preview-draft",
  voiceLibrary: "/api/studio/user-voice-library",
  voiceCatalog: "/api/studio/voice-library",
  audioLibrary: "/api/studio/audio-library",
  characters: "/api/studio/characters",
  locations: "/api/studio/locations",
  props: "/api/studio/props",
  worlds: "/api/studio/worlds",
  derivationSources: "/api/studio/asset-derivation/sources",
} as const;

export type RequirementDebugEntry = {
  action: string;
  endpoint: string;
  at: string;
  ok?: boolean;
  error?: string;
};

export function assertNotEditorVariantEndpoint(endpoint: string): void {
  if (endpoint.includes(EDITOR_VARIANT_ENDPOINT)) {
    throw new Error("Studio asset requirements must not call editor variant API");
  }
}

export function isVisualRequirementKind(kind: BriefAssetRequirementKind): boolean {
  return ["character", "mascot", "team", "location", "prop", "world"].includes(kind);
}

export function isAudioRequirementKind(kind: BriefAssetRequirementKind): boolean {
  return kind === "voice" || kind === "music" || kind === "sfx";
}

export function briefWizardKindForRequirement(kind: BriefAssetRequirementKind): BriefWizardKind | null {
  if (kind === "mascot" || kind === "team") {
    return "character";
  }
  if (kind === "character" || kind === "location" || kind === "prop" || kind === "world") {
    return kind;
  }
  return null;
}

export function pickerCategoryForRequirement(kind: BriefAssetRequirementKind): AssetPickerCategory {
  switch (kind) {
    case "character":
      return "characters";
    case "mascot":
      return "mascots";
    case "team":
      return "characters";
    case "location":
      return "locations";
    case "prop":
      return "props";
    case "world":
      return "worlds";
    case "voice":
      return "voice";
    case "music":
      return "music";
    case "sfx":
      return "sfx";
    default:
      return "images";
  }
}

export function uploadAcceptForRequirement(kind: BriefAssetRequirementKind): string {
  if (isAudioRequirementKind(kind)) {
    return "audio/*,.mp3,.wav,.m4a,.ogg,.webm";
  }
  return "image/*";
}

export function requirementActionLabelKey(
  kind: BriefAssetRequirementKind,
  action: "generate" | "library" | "upload" | "skip" | "attach"
): string {
  const kindSlug =
    kind === "sfx" ? "sfx"
    : kind === "voice" ? "voice"
    : kind === "music" ? "music"
    : kind === "mascot" ? "mascot"
    : kind === "team" ? "team"
    : kind;
  return `studio.generateMissing.debug.action.${action}.${kindSlug}`;
}

export function resolveGenerateEndpoint(req: BriefAssetRequirement): string {
  if (isAudioRequirementKind(req.kind)) {
    if (req.kind === "voice") {
      return STUDIO_ASSET_REQUIREMENT_ENDPOINTS.voicePreviewDraft;
    }
    return STUDIO_ASSET_REQUIREMENT_ENDPOINTS.audioLibrary;
  }
  return STUDIO_ASSET_REQUIREMENT_ENDPOINTS.generateImage;
}

export function isRequirementActionable(status: BriefAssetRequirementStatus): boolean {
  return status === "missing" || status === "processing" || status === "failed";
}
