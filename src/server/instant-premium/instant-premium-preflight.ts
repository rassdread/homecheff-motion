import {
  confirmedBlocks,
  parseBakedTextProtectionPayload,
  type BakedTextBlockRecord,
} from "@/lib/baked-text-detection";
import { isTextImplyingChipId } from "@/lib/locked-text-layer";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";
import type { InstantPremiumCreatePayload } from "@/server/instant-premium/create-instant-premium-project";
import {
  assessImageTextRiskWithOpenAi,
  type ImagePreflightVisionAssessment,
} from "@/server/instant-premium/openai-preflight-vision";

export const INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL =
  "Deze afbeelding bevat tekst die kan vervormen. Scan en bevestig tekst eerst.";

export type ImageProtectionState =
  | "none"
  | "legacy_confirmed"
  | "blocks_confirmed"
  | "unconfirmed_blocks"
  | "enabled_incomplete";

export type PreflightImageReport = {
  index: number;
  fileName: string;
  protectionState: ImageProtectionState;
  confirmedBlockCount: number;
  vision: ImagePreflightVisionAssessment | null;
  blocked: boolean;
  blockMessage: string | null;
  warnings: string[];
};

export type InstantPremiumPreflightResult =
  | {
      ok: true;
      warnings: string[];
      images: PreflightImageReport[];
      visionUsed: boolean;
    }
  | {
      ok: false;
      error: string;
      code: "TEXT_PROTECTION_REQUIRED" | "PREFLIGHT_UNAVAILABLE";
      blockMessage: string;
      warnings: string[];
      images: PreflightImageReport[];
      visionUsed: boolean;
    };

function imageSourceUrl(image: CreateAnimationProjectImageInput): string {
  return image.workingImageUrl?.trim() || image.previewUrl?.trim() || "";
}

export function resolveImageProtectionState(
  image: CreateAnimationProjectImageInput
): { state: ImageProtectionState; confirmed: BakedTextBlockRecord[] } {
  const protection = parseBakedTextProtectionPayload(image.bakedTextProtection);
  if (!protection?.enabled) {
    return { state: "none", confirmed: [] };
  }

  const blocks = protection.blocks ?? [];
  const confirmed = confirmedBlocks(blocks);
  if (confirmed.length > 0) {
    return { state: "blocks_confirmed", confirmed };
  }
  if (protection.exactText?.trim()) {
    return { state: "legacy_confirmed", confirmed: [] };
  }
  if (blocks.length > 0) {
    return { state: "unconfirmed_blocks", confirmed: [] };
  }
  return { state: "enabled_incomplete", confirmed: [] };
}

function isProtectionConfirmed(state: ImageProtectionState): boolean {
  return state === "blocks_confirmed" || state === "legacy_confirmed";
}

function blockMessageForIndex(): string {
  return INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL;
}

function needsLockedLayersForPayload(payload: InstantPremiumCreatePayload): boolean {
  const chips = payload.selectedChips ?? [];
  return chips.some((id) => isTextImplyingChipId(id));
}

export function evaluateImageReport(params: {
  index: number;
  image: CreateAnimationProjectImageInput;
  protectionState: ImageProtectionState;
  confirmed: BakedTextBlockRecord[];
  vision: ImagePreflightVisionAssessment | null;
  payload: InstantPremiumCreatePayload;
}): PreflightImageReport {
  const warnings: string[] = [];
  const { index, image, protectionState, confirmed, vision, payload } = params;
  const protectedOk = isProtectionConfirmed(protectionState);

  if (protectionState === "unconfirmed_blocks") {
    return {
      index,
      fileName: image.fileName,
      protectionState,
      confirmedBlockCount: 0,
      vision,
      blocked: true,
      blockMessage: blockMessageForIndex(),
      warnings: ["Detected text blocks are not confirmed yet."],
    };
  }

  if (protectionState === "enabled_incomplete") {
    return {
      index,
      fileName: image.fileName,
      protectionState,
      confirmedBlockCount: 0,
      vision,
      blocked: true,
      blockMessage: blockMessageForIndex(),
      warnings: ["Text protection is enabled but not completed."],
    };
  }

  if (vision) {
    const riskyText =
      vision.hasReadableText &&
      (vision.distortionRisk === "high" ||
        vision.distortionRisk === "medium" ||
        vision.hasPhoneOrUiText ||
        vision.hasLogoOrBrandText);

    if (riskyText && !protectedOk) {
      return {
        index,
        fileName: image.fileName,
        protectionState,
        confirmedBlockCount: confirmed.length,
        vision,
        blocked: true,
        blockMessage: blockMessageForIndex(),
        warnings: vision.summary ? [vision.summary] : [],
      };
    }

    if (vision.hasPhoneOrUiText && protectedOk && confirmed.every((b) => b.blockType !== "ui")) {
      warnings.push("Phone/UI text detected — ensure UI blocks are confirmed and masked.");
    }

    if (vision.hasLogoOrBrandText && !protectedOk) {
      return {
        index,
        fileName: image.fileName,
        protectionState,
        confirmedBlockCount: confirmed.length,
        vision,
        blocked: true,
        blockMessage: blockMessageForIndex(),
        warnings: ["Logo or brand text may distort without protection."],
      };
    }

    if (vision.distortionRisk === "high" && protectedOk) {
      warnings.push("High distortion risk — confirmed masks and locked overlays will be applied.");
    } else if (vision.distortionRisk === "medium" && !protectedOk) {
      warnings.push("Medium text distortion risk detected.");
    }
  }

  if (protectedOk && confirmed.length > 0) {
    const uiBlocks = confirmed.filter((b) => b.blockType === "ui");
    if (vision?.hasPhoneOrUiText && uiBlocks.length === 0) {
      warnings.push("Phone/UI text detected; consider adding or confirming a UI text block.");
    }
  }

  if (
    needsLockedLayersForPayload(payload) &&
    payload.lockedTextMode !== false &&
    (payload.lockedTextLayers?.length ?? 0) === 0 &&
    !protectedOk
  ) {
    warnings.push("Text chips selected but no locked text layers are configured.");
  }

  return {
    index,
    fileName: image.fileName,
    protectionState,
    confirmedBlockCount: confirmed.length,
    vision,
    blocked: false,
    blockMessage: null,
    warnings,
  };
}

export async function runInstantPremiumTextPreflight(
  payload: InstantPremiumCreatePayload
): Promise<InstantPremiumPreflightResult> {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const reports: PreflightImageReport[] = [];

  if (!openAiKey) {
    for (let index = 0; index < payload.images.length; index += 1) {
      const image = payload.images[index];
      const { state, confirmed } = resolveImageProtectionState(image);
      const report = evaluateImageReport({
        index,
        image,
        protectionState: state,
        confirmed,
        vision: null,
        payload,
      });
      reports.push(report);
      if (report.blocked) {
        return {
          ok: false,
          error: report.blockMessage ?? INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL,
          code: "TEXT_PROTECTION_REQUIRED",
          blockMessage: report.blockMessage ?? INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL,
          warnings: reports.flatMap((r) => r.warnings),
          images: reports,
          visionUsed: false,
        };
      }
    }
    return {
      ok: true,
      warnings: reports.flatMap((r) => r.warnings),
      images: reports,
      visionUsed: false,
    };
  }

  for (let index = 0; index < payload.images.length; index += 1) {
    const image = payload.images[index];
    const { state, confirmed } = resolveImageProtectionState(image);
    const url = imageSourceUrl(image);

    let vision: ImagePreflightVisionAssessment | null = null;
    if (url) {
      try {
        vision = await assessImageTextRiskWithOpenAi(url, openAiKey);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Vision preflight failed.";
        return {
          ok: false,
          error: message,
          code: "PREFLIGHT_UNAVAILABLE",
          blockMessage: message,
          warnings: [],
          images: reports,
          visionUsed: true,
        };
      }
    }

    const report = evaluateImageReport({
      index,
      image,
      protectionState: state,
      confirmed,
      vision,
      payload,
    });
    reports.push(report);

    if (report.blocked) {
      return {
        ok: false,
        error: report.blockMessage ?? INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL,
        code: "TEXT_PROTECTION_REQUIRED",
        blockMessage: report.blockMessage ?? INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL,
        warnings: reports.flatMap((r) => r.warnings),
        images: reports,
        visionUsed: true,
      };
    }
  }

  return {
    ok: true,
    warnings: reports.flatMap((r) => r.warnings),
    images: reports,
    visionUsed: true,
  };
}

export function instantPreflightHttpStatus(
  result: Extract<InstantPremiumPreflightResult, { ok: false }>
): number {
  return result.code === "PREFLIGHT_UNAVAILABLE" ? 503 : 422;
}
