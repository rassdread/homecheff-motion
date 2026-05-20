import {
  confirmedBlocks,
  parseBakedTextProtectionPayload,
  type BakedTextBlockRecord,
  type BakedTextProtectionPayload,
} from "@/lib/baked-text-detection";
import { isTextImplyingChipId } from "@/lib/locked-text-layer";
import type { CreateAnimationProjectImageInput } from "@/types/animation-api";
import { normalizeTextRenderMode, usesPosterMotionPreserve } from "@/lib/hybrid-motion-overlay";
import type { InstantPremiumCreatePayload } from "@/server/instant-premium/create-instant-premium-project";
import {
  assessImageTextRiskWithOpenAi,
  type ImagePreflightVisionAssessment,
} from "@/server/instant-premium/openai-preflight-vision";
import {
  derivePreflightVisionFromOcrBlocks,
  emptyPreflightVisionFromOcr,
} from "@/server/instant-premium/preflight-vision-from-ocr";
import {
  isOpenAiCooldownActive,
  isOpenAiRateLimitFailure,
  noteOpenAiRateLimitFailure,
} from "@/server/openai/openai-request-gate";
import { runViduPromptLengthPreflight } from "@/lib/vidu-prompt-preflight";
import type { ViduPromptTooLongDebug } from "@/lib/vidu-prompt-budget";
import { buildPremiumRenderValidationReport } from "@/lib/premium-render-validation";
import type { PremiumRenderValidationReport } from "@/lib/premium-render-validation";
import { isValidHttpUrl } from "@/lib/is-valid-http-url";

export const INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL =
  "Deze afbeelding bevat tekst die kan vervormen. Scan en bevestig tekst eerst.";

export const OPENAI_RATE_LIMIT_PREFLIGHT_MESSAGE_NL =
  "Tekstscan is tijdelijk te druk, maar je beschermde tekstlagen worden gebruikt.";

export type ImageProtectionState =
  | "none"
  | "ocr_skipped"
  | "ocr_no_text"
  | "legacy_confirmed"
  | "blocks_confirmed"
  | "unconfirmed_blocks"
  | "enabled_incomplete";

export type PreflightWarningCode =
  | "HIGH_DISTORTION_RISK"
  | "MEDIUM_DISTORTION_RISK"
  | "UI_TEXT_UNCONFIRMED"
  | "LOGO_TEXT_UNPROTECTED"
  | "UNCONFIRMED_BLOCKS"
  | "INCOMPLETE_PROTECTION"
  | "TEXT_CHIPS_NO_LAYERS"
  | "OPENAI_RATE_LIMITED"
  | "VISION_SUMMARY";

export type PreflightWarning = {
  code: PreflightWarningCode;
  imageIndex: number;
  message: string;
};

export type PreflightImageReport = {
  index: number;
  fileName: string;
  protectionState: ImageProtectionState;
  confirmedBlockCount: number;
  vision: ImagePreflightVisionAssessment | null;
  blocked: boolean;
  blockMessage: string | null;
  warnings: string[];
  structuredWarnings: PreflightWarning[];
};

export type InstantPremiumPreflightResult =
  | {
      ok: true;
      warnings: string[];
      images: PreflightImageReport[];
      visionUsed: boolean;
      /** Budgeted Vidu prompt length (admin debug). */
      viduPromptChars?: number;
      renderValidation?: PremiumRenderValidationReport;
    }
  | {
      ok: false;
      error: string;
      code:
        | "TEXT_PROTECTION_REQUIRED"
        | "PREFLIGHT_UNAVAILABLE"
        | "OPENAI_RATE_LIMITED"
        | "VIDU_PROMPT_TOO_LONG"
        | "TEXT_LOCK_REQUIRED"
        | "INVALID_IMAGE_URL";
      blockMessage: string;
      warnings: string[];
      images: PreflightImageReport[];
      visionUsed: boolean;
      viduPromptDebug?: ViduPromptTooLongDebug;
    };

function imageSourceUrl(image: CreateAnimationProjectImageInput): string {
  return image.workingImageUrl?.trim() || image.previewUrl?.trim() || "";
}

const OCR_TERMINAL_PHASES = new Set([
  "no_text_found",
  "skipped",
  "auto_protected",
  "needs_review",
  "received_result",
]);

export function resolveImageProtectionState(
  image: CreateAnimationProjectImageInput
): { state: ImageProtectionState; confirmed: BakedTextBlockRecord[] } {
  const protection = parseBakedTextProtectionPayload(image.bakedTextProtection);
  if (!protection) {
    return { state: "none", confirmed: [] };
  }

  if (
    protection.userSkipped ||
    protection.status === "skipped" ||
    protection.ocrScanPhase === "skipped"
  ) {
    return { state: "ocr_skipped", confirmed: [] };
  }

  if (protection.ocrScanPhase === "no_text_found") {
    return { state: "ocr_no_text", confirmed: [] };
  }

  if (!protection.enabled) {
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

export function isProtectionConfirmed(state: ImageProtectionState): boolean {
  return state === "blocks_confirmed" || state === "legacy_confirmed";
}

export function isRenderSafeProtectionState(state: ImageProtectionState): boolean {
  return (
    isProtectionConfirmed(state) || state === "ocr_skipped" || state === "ocr_no_text"
  );
}

function hasOcrScanResult(protection: BakedTextProtectionPayload | null): boolean {
  if (!protection) {
    return false;
  }
  if (protection.userSkipped || protection.ocrScanPhase === "skipped") {
    return true;
  }
  if (protection.ocrScanPhase === "no_text_found") {
    return true;
  }
  if (protection.ocrScanPhase && OCR_TERMINAL_PHASES.has(protection.ocrScanPhase)) {
    return true;
  }
  return (protection.blocks?.length ?? 0) > 0;
}

function visionFromOcrPayload(
  protection: BakedTextProtectionPayload | null
): ImagePreflightVisionAssessment | null {
  if (!protection) {
    return null;
  }
  if (protection.ocrScanPhase === "no_text_found") {
    return emptyPreflightVisionFromOcr();
  }
  const blocks = protection.blocks ?? [];
  if (blocks.length > 0) {
    return derivePreflightVisionFromOcrBlocks(blocks);
  }
  return null;
}

function shouldCallOpenAiPreflight(params: {
  image: CreateAnimationProjectImageInput;
  protectionState: ImageProtectionState;
  protection: BakedTextProtectionPayload | null;
  url: string;
}): boolean {
  const { protectionState, protection, url } = params;
  if (!url) {
    return false;
  }
  if (isRenderSafeProtectionState(protectionState)) {
    return false;
  }
  if (hasOcrScanResult(protection)) {
    return false;
  }
  if (isOpenAiCooldownActive()) {
    return false;
  }
  return protectionState === "none";
}

function blockMessageForIndex(): string {
  return INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL;
}

function needsLockedLayersForPayload(payload: InstantPremiumCreatePayload): boolean {
  const chips = payload.selectedChips ?? [];
  return chips.some((id) => isTextImplyingChipId(id));
}

function pushWarning(
  warnings: PreflightWarning[],
  code: PreflightWarningCode,
  imageIndex: number,
  message: string
): void {
  warnings.push({ code, imageIndex, message });
}

export function dedupePreflightWarnings(warnings: PreflightWarning[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of warnings) {
    const key = `${w.code}:${w.imageIndex}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(w.message);
  }
  return out;
}

export function evaluateImageReport(params: {
  index: number;
  image: CreateAnimationProjectImageInput;
  protectionState: ImageProtectionState;
  confirmed: BakedTextBlockRecord[];
  vision: ImagePreflightVisionAssessment | null;
  payload: InstantPremiumCreatePayload;
}): PreflightImageReport {
  const structured: PreflightWarning[] = [];
  const { index, image, protectionState, confirmed, vision, payload } = params;

  if (isRenderSafeProtectionState(protectionState) && protectionState !== "none") {
    if (vision?.distortionRisk === "high" && isProtectionConfirmed(protectionState)) {
      pushWarning(
        structured,
        "HIGH_DISTORTION_RISK",
        index,
        "High distortion risk — confirmed masks and locked overlays will be applied."
      );
    }
    const deduped = dedupePreflightWarnings(structured);
    return {
      index,
      fileName: image.fileName,
      protectionState,
      confirmedBlockCount: confirmed.length,
      vision,
      blocked: false,
      blockMessage: null,
      warnings: deduped,
      structuredWarnings: structured,
    };
  }

  const protectedOk = isProtectionConfirmed(protectionState);

  if (protectionState === "unconfirmed_blocks") {
    pushWarning(
      structured,
      "UNCONFIRMED_BLOCKS",
      index,
      "Detected text blocks are not confirmed yet."
    );
    return {
      index,
      fileName: image.fileName,
      protectionState,
      confirmedBlockCount: 0,
      vision,
      blocked: true,
      blockMessage: blockMessageForIndex(),
      warnings: dedupePreflightWarnings(structured),
      structuredWarnings: structured,
    };
  }

  if (protectionState === "enabled_incomplete") {
    pushWarning(
      structured,
      "INCOMPLETE_PROTECTION",
      index,
      "Text protection is enabled but not completed."
    );
    return {
      index,
      fileName: image.fileName,
      protectionState,
      confirmedBlockCount: 0,
      vision,
      blocked: true,
      blockMessage: blockMessageForIndex(),
      warnings: dedupePreflightWarnings(structured),
      structuredWarnings: structured,
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
      if (vision.summary) {
        pushWarning(structured, "VISION_SUMMARY", index, vision.summary);
      }
      return {
        index,
        fileName: image.fileName,
        protectionState,
        confirmedBlockCount: confirmed.length,
        vision,
        blocked: true,
        blockMessage: blockMessageForIndex(),
        warnings: dedupePreflightWarnings(structured),
        structuredWarnings: structured,
      };
    }

    if (vision.hasPhoneOrUiText && protectedOk && confirmed.every((b) => b.blockType !== "ui")) {
      pushWarning(
        structured,
        "UI_TEXT_UNCONFIRMED",
        index,
        "Phone/UI text detected — ensure UI blocks are confirmed and masked."
      );
    }

    if (vision.hasLogoOrBrandText && !protectedOk) {
      pushWarning(
        structured,
        "LOGO_TEXT_UNPROTECTED",
        index,
        "Logo or brand text may distort without protection."
      );
      return {
        index,
        fileName: image.fileName,
        protectionState,
        confirmedBlockCount: confirmed.length,
        vision,
        blocked: true,
        blockMessage: blockMessageForIndex(),
        warnings: dedupePreflightWarnings(structured),
        structuredWarnings: structured,
      };
    }

    if (vision.distortionRisk === "high" && protectedOk) {
      pushWarning(
        structured,
        "HIGH_DISTORTION_RISK",
        index,
        "High distortion risk — confirmed masks and locked overlays will be applied."
      );
    } else if (vision.distortionRisk === "medium" && !protectedOk) {
      pushWarning(
        structured,
        "MEDIUM_DISTORTION_RISK",
        index,
        "Medium text distortion risk detected."
      );
    }
  }

  if (protectedOk && confirmed.length > 0) {
    const uiBlocks = confirmed.filter((b) => b.blockType === "ui");
    if (vision?.hasPhoneOrUiText && uiBlocks.length === 0) {
      pushWarning(
        structured,
        "UI_TEXT_UNCONFIRMED",
        index,
        "Phone/UI text detected; consider adding or confirming a UI text block."
      );
    }
  }

  if (
    needsLockedLayersForPayload(payload) &&
    payload.lockedTextMode !== false &&
    (payload.lockedTextLayers?.length ?? 0) === 0 &&
    !protectedOk
  ) {
    pushWarning(
      structured,
      "TEXT_CHIPS_NO_LAYERS",
      index,
      "Text chips selected but no locked text layers are configured."
    );
  }

  return {
    index,
    fileName: image.fileName,
    protectionState,
    confirmedBlockCount: confirmed.length,
    vision,
    blocked: false,
    blockMessage: null,
    warnings: dedupePreflightWarnings(structured),
    structuredWarnings: structured,
  };
}

function imageUnverifiedAfterRateLimit(image: CreateAnimationProjectImageInput): boolean {
  const { state } = resolveImageProtectionState(image);
  if (isRenderSafeProtectionState(state)) {
    return false;
  }
  if (state === "unconfirmed_blocks" || state === "enabled_incomplete") {
    return true;
  }
  const protection = parseBakedTextProtectionPayload(image.bakedTextProtection);
  return !hasOcrScanResult(protection);
}

function flattenStructuredWarnings(reports: PreflightImageReport[]): PreflightWarning[] {
  return reports.flatMap((r) => r.structuredWarnings);
}

export async function runInstantPremiumTextPreflight(
  payload: InstantPremiumCreatePayload
): Promise<InstantPremiumPreflightResult> {
  if (usesPosterMotionPreserve(normalizeTextRenderMode(payload.textRenderMode))) {
    const viduPromptCheck = runViduPromptLengthPreflight(payload);
    const validation = buildPremiumRenderValidationReport({
      payload,
      viduPromptChars:
        viduPromptCheck.ok ? viduPromptCheck.chars : viduPromptCheck.debug.charsAfter,
      viduPromptOk: viduPromptCheck.ok,
      extraWarnings: [
        "Poster motion preserve: typography frozen in source + hard text lock when enabled.",
      ],
    });
    if (!validation.ok) {
      const code =
        validation.blockCode === "VIDU_PROMPT_TOO_LONG" ? "VIDU_PROMPT_TOO_LONG"
        : validation.blockCode === "INVALID_IMAGE_URL" ? "INVALID_IMAGE_URL"
        : validation.blockCode === "TEXT_LOCK_REQUIRED" ? "TEXT_LOCK_REQUIRED"
        : "TEXT_PROTECTION_REQUIRED";
      return {
        ok: false,
        error: validation.blockMessage ?? "Render validation failed.",
        code,
        blockMessage: validation.blockMessage ?? "Render validation failed.",
        warnings: validation.warnings,
        images: payload.images.map((image, index) => {
          const imgReport = validation.images[index];
          const { state, confirmed } = resolveImageProtectionState(image);
          return {
            index,
            fileName: image.fileName,
            protectionState: state,
            confirmedBlockCount: confirmed.length,
            vision: null,
            blocked: true,
            blockMessage: validation.blockMessage ?? null,
            warnings: imgReport?.textLockWarning ?
              ["Large text not hard-locked."]
            : [],
            structuredWarnings: [],
          };
        }),
        visionUsed: false,
        viduPromptDebug: !viduPromptCheck.ok ? viduPromptCheck.debug : undefined,
      };
    }

    return {
      ok: true,
      warnings: validation.warnings,
      viduPromptChars: validation.viduPromptChars,
      renderValidation: validation,
      images: payload.images.map((image, index) => {
        const imgReport = validation.images[index];
        const { state, confirmed } = resolveImageProtectionState(image);
        const url = imageSourceUrl(image);
        const warnings: string[] = [];
        if (!isValidHttpUrl(url)) {
          warnings.push("Invalid image URL.");
        }
        if (imgReport?.textLockWarning) {
          warnings.push("Large visible text — confirm OCR lock before paid render.");
        }
        return {
          index,
          fileName: image.fileName,
          protectionState: state,
          confirmedBlockCount: confirmed.length,
          vision: null,
          blocked: false,
          blockMessage: null,
          warnings,
          structuredWarnings: [],
        };
      }),
      visionUsed: false,
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const reports: PreflightImageReport[] = [];
  let visionUsed = false;
  let openAiRateLimited = false;

  const finishBlocked = (): InstantPremiumPreflightResult => ({
    ok: false,
    error:
      reports.find((r) => r.blocked)?.blockMessage ?? INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL,
    code: "TEXT_PROTECTION_REQUIRED",
    blockMessage:
      reports.find((r) => r.blocked)?.blockMessage ?? INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL,
    warnings: dedupePreflightWarnings(flattenStructuredWarnings(reports)),
    images: reports,
    visionUsed,
  });

  for (let index = 0; index < payload.images.length; index += 1) {
    const image = payload.images[index];
    const protection = parseBakedTextProtectionPayload(image.bakedTextProtection);
    const { state, confirmed } = resolveImageProtectionState(image);
    const url = imageSourceUrl(image);

    let vision = visionFromOcrPayload(protection);
    if (vision) {
      visionUsed = true;
    }

    const needsOpenAi =
      Boolean(openAiKey) && shouldCallOpenAiPreflight({ image, protectionState: state, protection, url });

    if (needsOpenAi) {
      try {
        vision = await assessImageTextRiskWithOpenAi(url, openAiKey!);
        visionUsed = true;
      } catch (error) {
        if (isOpenAiRateLimitFailure(error)) {
          noteOpenAiRateLimitFailure(error);
          openAiRateLimited = true;
          if (!vision) {
            vision = visionFromOcrPayload(protection);
          }
        } else {
          const message = error instanceof Error ? error.message : "Vision preflight failed.";
          return {
            ok: false,
            error: message,
            code: "PREFLIGHT_UNAVAILABLE",
            blockMessage: message,
            warnings: dedupePreflightWarnings(flattenStructuredWarnings(reports)),
            images: reports,
            visionUsed: true,
          };
        }
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
      return finishBlocked();
    }
  }

  if (openAiRateLimited) {
    const rateLimitWarnings: PreflightWarning[] = [
      ...flattenStructuredWarnings(reports),
      {
        code: "OPENAI_RATE_LIMITED",
        imageIndex: -1,
        message: OPENAI_RATE_LIMIT_PREFLIGHT_MESSAGE_NL,
      },
    ];
    const noBlockedReports = reports.every((r) => !r.blocked);
    const noUnverified = !payload.images.some(imageUnverifiedAfterRateLimit);
    if (noBlockedReports && noUnverified) {
      return {
        ok: true,
        warnings: dedupePreflightWarnings(rateLimitWarnings),
        images: reports,
        visionUsed,
      };
    }
    return {
      ok: false,
      error: OPENAI_RATE_LIMIT_PREFLIGHT_MESSAGE_NL,
      code: "OPENAI_RATE_LIMITED",
      blockMessage: INSTANT_PREFLIGHT_BLOCK_MESSAGE_NL,
      warnings: dedupePreflightWarnings(rateLimitWarnings),
      images: reports,
      visionUsed,
    };
  }

  if (!openAiKey) {
    return {
      ok: true,
      warnings: dedupePreflightWarnings(flattenStructuredWarnings(reports)),
      images: reports,
      visionUsed: false,
    };
  }

  return {
    ok: true,
    warnings: dedupePreflightWarnings(flattenStructuredWarnings(reports)),
    images: reports,
    visionUsed,
  };
}

export function instantPreflightHttpStatus(
  result: Extract<InstantPremiumPreflightResult, { ok: false }>
): number {
  if (result.code === "PREFLIGHT_UNAVAILABLE") {
    return 503;
  }
  if (result.code === "OPENAI_RATE_LIMITED") {
    return 429;
  }
  return 422;
}
