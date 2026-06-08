import { createHash } from "node:crypto";
import { buildAssetReferenceGenerationPrompt } from "@/lib/studio-asset-reference-prompt";
import { buildDerivationReferenceGenerationPrompt } from "@/lib/studio-asset-derivation-prompt";
import { presentAssetReferenceGenerationError } from "@/lib/studio-asset-reference-errors";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import { isSceneImageProviderAvailable } from "@/lib/studio-regeneration-guard";
import { getSelectedSceneImageProviderId } from "@/server/scene-image-providers";
import { uploadStudioAssetReferenceBuffers } from "@/server/studio/studio-asset-reference-blob";
import { generateImageBuffersFromPrompt } from "@/server/studio/studio-image-generation-core";
import {
  meterAssetDerivation,
  meterOpenAiSceneImage,
  type StudioMeteringContext,
} from "@/server/provider-cost/studio-cost-metering";
import type { StudioAssetKind } from "@/types/studio-asset-creation";
import type { SessionUser } from "@/server/auth/session";

export type GenerateAssetReferenceInput = {
  kind: StudioAssetKind;
  summaryPrompt: string;
  choices?: Record<string, string>;
  customTexts?: Record<string, string>;
  generationId: string;
  sourceReference?: {
    name: string;
    imageUrl?: string;
    transformLabel?: string;
    userPrompt?: string;
  };
  derivation?: {
    styleDna: AssetStyleDna;
    sourceName: string;
    sourceKind: string;
    sourceAssetId?: string | null;
  };
};

export type GenerateAssetReferenceResult = {
  referenceImageUrl: string;
  referenceStorageKey: string;
  thumbnailUrl: string;
  generatedPrompt: string;
  provider: string;
};

type ServiceError = {
  error: string;
  code: string;
  status: number;
  providerMessage?: string;
};

export function isAssetReferenceGenerationAvailable(): boolean {
  return isSceneImageProviderAvailable();
}

export async function generateAssetReference(
  viewer: Pick<SessionUser, "id" | "role">,
  input: GenerateAssetReferenceInput
): Promise<{ data: GenerateAssetReferenceResult } | ServiceError> {
  if (input.kind === "world") {
    return {
      error: "World assets do not use reference images.",
      code: "WORLD_NO_REFERENCE",
      status: 400,
    };
  }

  if (!isAssetReferenceGenerationAvailable()) {
    return {
      error: "Image generation is not configured.",
      code: "PROVIDER_UNAVAILABLE",
      status: 503,
    };
  }

  const summary = input.summaryPrompt.trim();
  if (!summary) {
    return {
      error: "Summary prompt is required for generation.",
      code: "SUMMARY_REQUIRED",
      status: 400,
    };
  }

  const generationId = input.generationId.trim();
  if (!generationId || generationId.length > 64) {
    return {
      error: "A valid generationId is required.",
      code: "GENERATION_ID_REQUIRED",
      status: 400,
    };
  }

  const sourceRef = input.sourceReference?.name.trim()
    ? {
        name: input.sourceReference.name.trim(),
        transformLabel: input.sourceReference.transformLabel?.trim(),
        userPrompt: input.sourceReference.userPrompt?.trim(),
      }
    : undefined;

  const generatedPrompt = input.derivation
    ? buildDerivationReferenceGenerationPrompt({
        kind: input.kind,
        summaryPrompt: summary,
        choices: input.choices,
        customTexts: input.customTexts,
        styleDna: input.derivation.styleDna,
        sourceName: input.derivation.sourceName,
        transformLabel: sourceRef?.transformLabel,
      })
    : buildAssetReferenceGenerationPrompt({
        kind: input.kind,
        summaryPrompt: summary,
        choices: input.choices,
        customTexts: input.customTexts,
        sourceReference: sourceRef,
      });

  const meteringCtx: StudioMeteringContext = {
    userId: viewer.id,
    feature: input.derivation ? "asset_derivation" : "asset_reference_generate",
    relatedJobId: generationId,
  };

  const providerId = getSelectedSceneImageProviderId();

  try {
    const buffers = await generateImageBuffersFromPrompt({
      prompt: generatedPrompt,
      correlationId: generationId,
      ownerId: viewer.id,
      seed: promptSeed(generatedPrompt, generationId),
    });

    const uploaded = await uploadStudioAssetReferenceBuffers({
      ownerId: viewer.id,
      kind: input.kind,
      generationId,
      imageBuffer: buffers.imageBuffer,
      thumbnailBuffer: buffers.thumbnailBuffer,
      imageContentType: buffers.contentType,
      thumbContentType: "image/jpeg",
    });

    if (input.derivation) {
      meterAssetDerivation({
        ctx: meteringCtx,
        phase: "generate",
        status: "completed",
        sourceKind: input.derivation.sourceKind,
        targetKind: input.kind,
        sourceAssetId: input.derivation.sourceAssetId,
        sourceAssetName: input.derivation.sourceName,
        model: buffers.model,
        promptSummary: summary.slice(0, 240),
        assetKind: input.kind,
      });
    } else {
      meterOpenAiSceneImage({
        ctx: meteringCtx,
        status: "completed",
        model: buffers.model,
        size: buffers.size,
        imageRecordId: generationId,
        providerId: buffers.provider,
        extraMetadata: {
          assetKind: input.kind,
          promptSummary: summary.slice(0, 240),
          sourceAssetName: sourceRef?.name,
        },
      });
    }

    return {
      data: {
        referenceImageUrl: uploaded.referenceImageUrl,
        referenceStorageKey: uploaded.referenceStorageKey,
        thumbnailUrl: uploaded.thumbnailUrl,
        generatedPrompt,
        provider: buffers.provider,
      },
    };
  } catch (e) {
    if (input.derivation) {
      meterAssetDerivation({
        ctx: meteringCtx,
        phase: "generate",
        status: "failed",
        sourceKind: input.derivation.sourceKind,
        targetKind: input.kind,
        sourceAssetId: input.derivation.sourceAssetId,
        sourceAssetName: input.derivation.sourceName,
      });
    } else {
      meterOpenAiSceneImage({
        ctx: meteringCtx,
        status: "failed",
        imageRecordId: generationId,
        providerId,
      });
    }
    const message = e instanceof Error ? e.message : "Asset reference generation failed.";
    const presented = presentAssetReferenceGenerationError(message);
    return {
      error: presented.userMessageKey,
      code: presented.code,
      status: 502,
      providerMessage: presented.providerMessage,
    };
  }
}

function promptSeed(prompt: string, generationId: string): string {
  return createHash("sha256").update(`${generationId}:${prompt}`).digest("hex").slice(0, 16);
}
