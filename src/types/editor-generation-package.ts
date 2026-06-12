import type { EditorReferenceAssignment } from "@/types/editor-reference-metadata";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export type EditorGenerationAssetKind =
  | "source_reference"
  | "generated_image"
  | "sequence_frame"
  | "thumbnail"
  | "motion_video"
  | "export_output";

export type EditorGenerationPackageAsset = {
  id: string;
  kind: EditorGenerationAssetKind;
  url: string;
  storageKey?: string;
  label?: string;
  stepIndex?: number;
  variantId?: string;
  createdAt: string;
};

export type EditorGenerationPackage = {
  id: string;
  editorSessionId: string;
  workflow: EditorFusionIntent | "edit" | "export" | "motion_prepare" | "custom_composition";
  sourceReferences: EditorReferenceAssignment[];
  metadataSnapshot: EditorReferenceAssignment[];
  generatedImages: EditorGenerationPackageAsset[];
  sequenceFrames: EditorGenerationPackageAsset[];
  thumbnails: EditorGenerationPackageAsset[];
  motionOutputs: EditorGenerationPackageAsset[];
  exportOutputs: EditorGenerationPackageAsset[];
  transformationSessionId?: string;
  orderedFrameUrls: string[];
  motionDurationSec?: number;
  createdAt: string;
  updatedAt: string;
};

export type EditorGenerationResultType = "image" | "sequence" | "animation" | "export";

export type EditorNextBestActionId =
  | "download"
  | "save_library"
  | "send_studio_scene"
  | "add_text_caption"
  | "create_social_post"
  | "prepare_print"
  | "animate_3s"
  | "animate_5s"
  | "animate_8s"
  | "generate_variant"
  | "add_subtitles"
  | "add_voiceover"
  | "add_music"
  | "add_intro_outro"
  | "export_tiktok"
  | "export_instagram"
  | "export_youtube_shorts"
  | "publish_share_ready"
  | "watch_ad"
  | "buy_credits"
  | "upgrade_premium"
  | "download_frames"
  | "download_package"
  | "export_hc"
  | "create_flyer"
  | "create_social_story";

export type EditorNextBestActionCost = "free" | "ad_eligible" | "credits" | "premium" | "motion_credits";

export type EditorNextBestAction = {
  id: EditorNextBestActionId;
  labelKey: string;
  descriptionKey: string;
  cost: EditorNextBestActionCost;
  creditCost?: number;
  premiumRequired?: boolean;
  href?: string;
  priority: number;
};

export type EditorNextBestActionInput = {
  resultType: EditorGenerationResultType;
  workflow?: EditorFusionIntent | string;
  userTier: "free" | "plus" | "premium";
  credits: number;
  hasAnimation?: boolean;
  hasSequence?: boolean;
  hasText?: boolean;
  hasVoice?: boolean;
  hasMusic?: boolean;
  printReady?: boolean;
  savedToLibrary?: boolean;
  sentToStudio?: boolean;
  motionDurationSec?: number;
  editorSessionId?: string;
  primaryResultUrl?: string;
  packageId?: string;
  hcProjectId?: string;
  document?: import("@/types/homecheff-visual-editor").EditorCanvasDocument;
  syncHcToServer?: boolean;
  lastAccessPath?: "free" | "ad" | "credits" | "subscription" | "premium";
};
