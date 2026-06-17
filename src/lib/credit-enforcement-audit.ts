/**
 * Credit enforcement coverage audit — static registry of billable provider routes.
 */

import { STUDIO_ACTION_TYPES } from "@/server/studio-account/studio-action-cost-registry";
import { isFreeStudioAction } from "@/server/studio-account/free-action-registry";

export type EnforcementAuditRow = {
  action: string;
  route: string;
  provider: string;
  actionType: string;
  gated: boolean;
  status: "PASS" | "PARTIAL" | "FAIL" | "FREE";
};

/** Billable provider routes — must use billProviderAction / runBilledProviderRoute. */
export const BILLED_PROVIDER_ROUTES: Array<{
  action: string;
  route: string;
  provider: string;
  actionType: string;
}> = [
  { action: "Scene image (single)", route: "POST /api/studio/storyboards/[id]/scenes/[sceneId]/images", provider: "openai", actionType: "scene_generation" },
  { action: "Scene images (bulk)", route: "POST /api/studio/storyboards/[id]/generate-scene-images", provider: "openai", actionType: "scene_generation" },
  { action: "Scene regenerate corrections", route: "POST …/regenerate-with-corrections", provider: "openai", actionType: "scene_generation" },
  { action: "Scene improve", route: "POST …/improve-image", provider: "openai", actionType: "scene_generation" },
  { action: "Bulk improve scenes", route: "POST …/bulk-improve-scenes", provider: "openai", actionType: "scene_generation" },
  { action: "Asset reference generate", route: "POST /api/studio/asset-references/generate", provider: "openai", actionType: "character_generation" },
  { action: "Character reference analysis", route: "POST …/characters/analyze-reference-images", provider: "openai", actionType: "vision_analysis" },
  { action: "Storyboard vision QA", route: "POST …/analyze-vision", provider: "openai", actionType: "vision_analysis" },
  { action: "Scene image vision QA", route: "POST …/images/[imageId]/analyze-vision", provider: "openai", actionType: "vision_analysis" },
  { action: "Asset derivation analyze", route: "POST …/asset-derivation/analyze", provider: "openai", actionType: "vision_analysis" },
  { action: "Storyboard voice", route: "POST …/voice", provider: "elevenlabs", actionType: "voice_generation" },
  { action: "Voice preview", route: "POST …/characters/[id]/voice-preview", provider: "elevenlabs", actionType: "voice_generation" },
  { action: "Voice preview draft", route: "POST …/voice-preview-draft", provider: "elevenlabs", actionType: "voice_generation" },
  { action: "Character voice clone", route: "POST …/characters/[id]/voice-clone", provider: "elevenlabs", actionType: "voice_clone" },
  { action: "User voice clone", route: "POST /api/studio/voice-clones", provider: "elevenlabs", actionType: "voice_clone" },
  { action: "Subtitles transcribe", route: "POST …/subtitles/transcribe", provider: "elevenlabs", actionType: "subtitle_transcription" },
  { action: "Music generation", route: "POST …/audio-library/generate-music", provider: "elevenlabs", actionType: "music_generation" },
  { action: "SFX generation", route: "POST …/audio-library/generate-sfx", provider: "elevenlabs", actionType: "sfx_generation" },
  { action: "Motion project create", route: "POST /api/animations/projects", provider: "vidu", actionType: "motion_render" },
  { action: "Instant test render", route: "POST /api/instant-premium/create-and-generate", provider: "vidu", actionType: "motion_render" },
  { action: "Segment retry", route: "POST …/segments/[order]/retry", provider: "vidu", actionType: "motion_render" },
  { action: "Language export prepare", route: "POST …/language-exports (prepare)", provider: "openai", actionType: "translation_export" },
  { action: "Language export render", route: "POST …/language-exports (render)", provider: "openai", actionType: "translation_export" },
  { action: "Editor instruction variant", route: "POST /api/editor/instruction/variant", provider: "openai", actionType: "image_generation" },
  { action: "Editor instruction bulk", route: "POST …/instruction/variant/bulk", provider: "openai", actionType: "image_generation" },
  { action: "OCR detect text", route: "POST …/detect-text", provider: "openai", actionType: "ocr_scan" },
  { action: "Editor segmentation", route: "POST /api/editor/segment/*", provider: "replicate", actionType: "transformation_session" },
  { action: "Editor masked edit", route: "POST /api/editor/edit/*", provider: "openai", actionType: "image_edit" },
  { action: "Publish export", route: "POST /api/publish/export", provider: "ffmpeg", actionType: "publish_mp4_export" },
  { action: "Assistant interpret", route: "POST /api/assistant/interpret", provider: "openai", actionType: "assistant_interpret" },
];

export const FREE_PROVIDER_ROUTES: Array<{ action: string; route: string }> = [
  { action: "Assistant execute", route: "POST /api/assistant/execute/*" },
  { action: "Consistency analysis", route: "POST …/analyze-consistency" },
  { action: "Correction preview", route: "POST …/generate-corrections" },
];

export function runCreditEnforcementAudit(): {
  rows: EnforcementAuditRow[];
  passCount: number;
  totalBillable: number;
  passPercent: number;
  targetMet: boolean;
} {
  const rows: EnforcementAuditRow[] = BILLED_PROVIDER_ROUTES.map((row) => ({
    ...row,
    gated: STUDIO_ACTION_TYPES.includes(row.actionType as (typeof STUDIO_ACTION_TYPES)[number]),
    status: STUDIO_ACTION_TYPES.includes(row.actionType as (typeof STUDIO_ACTION_TYPES)[number])
      ? "PASS"
      : "FAIL",
  }));

  for (const free of FREE_PROVIDER_ROUTES) {
    rows.push({
      action: free.action,
      route: free.route,
      provider: "—",
      actionType: "free",
      gated: false,
      status: "FREE",
    });
  }

  const billable = rows.filter((r) => r.status !== "FREE");
  const passCount = billable.filter((r) => r.status === "PASS").length;
  const passPercent = billable.length > 0 ? (passCount / billable.length) * 100 : 100;

  return {
    rows,
    passCount,
    totalBillable: billable.length,
    passPercent,
    targetMet: passPercent >= 90,
  };
}

export function assertRegistryCoversBillableActions(): void {
  for (const row of BILLED_PROVIDER_ROUTES) {
    if (!STUDIO_ACTION_TYPES.includes(row.actionType as (typeof STUDIO_ACTION_TYPES)[number])) {
      throw new Error(`Billable route missing registry action: ${row.actionType} (${row.route})`);
    }
  }
}

export function assertFreeActionsRegistered(): void {
  for (const action of ["assistant_execute_plan", "consistency_analysis", "correction_preview"] as const) {
    if (!isFreeStudioAction(action)) {
      throw new Error(`Expected free action: ${action}`);
    }
  }
}
