import { createHash } from "node:crypto";
import { resolveAssetGenerationIntent } from "@/lib/studio-asset-generation-intent";
import { buildAssetReferenceGenerationPrompt } from "@/lib/studio-asset-reference-prompt";
import { buildDerivationReferenceGenerationPrompt } from "@/lib/studio-asset-derivation-prompt";
import { presentAssetReferenceGenerationError } from "@/lib/studio-asset-reference-errors";
import { resolveIdentityLockLevel } from "@/lib/studio-asset-identity-preservation";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import { isSceneImageProviderAvailable } from "@/lib/studio-regeneration-guard";
import { getSelectedSceneImageProviderId } from "@/server/scene-image-providers";
import { uploadStudioAssetReferenceBuffers } from "@/server/studio/studio-asset-reference-blob";
import { generateImageBuffersFromPrompt } from "@/server/studio/studio-image-generation-core";
import {
  logOpenAiImageGenerationRequest,
  openAiImageModelSupportsEdit,
  resolveOpenAiImageEditModel,
  resolveOpenAiImageModel,
} from "@/lib/openai-image-generation";
import {
  meterAssetDerivation,
  meterOpenAiSceneImage,
  type StudioMeteringContext,
} from "@/server/provider-cost/studio-cost-metering";
import type { AssetIdentityGenerationAudit } from "@/types/studio-asset-identity-generation-audit";
import type { AssetImageGenerationMode } from "@/types/studio-asset-image-generation";
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
    preserveHint?: string;
    changeHint?: string;
    forbiddenHint?: string;
    visionHint?: string;
  };
  derivation?: {
    styleDna: AssetStyleDna;
    sourceName: string;
    sourceKind: string;
    sourceAssetId?: string | null;
  };
  identityAudit?: AssetIdentityGenerationAudit;
};

export type GenerateAssetReferenceResult = {
  referenceImageUrl: string;
  referenceStorageKey: string;
  thumbnailUrl: string;
  generatedPrompt: string;
  provider: string;
  generationMode?: AssetImageGenerationMode;
  generationIntent?: import("@/types/studio-asset-image-generation").AssetGenerationIntent;
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
        imageUrl: input.sourceReference.imageUrl?.trim(),
        transformLabel: input.sourceReference.transformLabel?.trim(),
        userPrompt: input.sourceReference.userPrompt?.trim(),
        preserveHint: input.sourceReference.preserveHint?.trim(),
        changeHint: input.sourceReference.changeHint?.trim(),
        forbiddenHint: input.sourceReference.forbiddenHint?.trim(),
        visionHint: input.sourceReference.visionHint?.trim(),
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
        preserveHint: sourceRef?.preserveHint,
        changeHint: sourceRef?.changeHint,
        forbiddenHint: sourceRef?.forbiddenHint,
        userPrompt: sourceRef?.userPrompt,
      })
    : buildAssetReferenceGenerationPrompt({
        kind: input.kind,
        summaryPrompt: summary,
        choices: input.choices,
        customTexts: input.customTexts,
        sourceReference: sourceRef,
      });

  const generationIntent = resolveAssetGenerationIntent({
    sourceImageUrl: sourceRef?.imageUrl ?? input.identityAudit?.sourceImageUrl,
    derivationSourceAssetId: input.derivation?.sourceAssetId,
  });
  const identityLockLevel = resolveIdentityLockLevel({
    strictRegeneration: input.identityAudit?.strictRegeneration,
    identityLockLevel: input.identityAudit?.identityLockLevel,
  });
  const sourceImageUrl = sourceRef?.imageUrl ?? input.identityAudit?.sourceImageUrl ?? undefined;
  const willUseImageEdit =
    generationIntent === "TRANSFORM_EXISTING_ASSET" &&
    Boolean(sourceImageUrl?.trim()) &&
    openAiImageModelSupportsEdit(resolveOpenAiImageEditModel());

  console.info(
    "[asset-references/generate:identity-audit]",
    JSON.stringify({
      generationId,
      kind: input.kind,
      generationIntent,
      identityLockLevel,
      imageGenerationMode: willUseImageEdit ? "image_edit" : "text_to_image",
      hasSourceImage: input.identityAudit?.hasSourceImage ?? Boolean(sourceImageUrl),
      sourceImageUrl: sourceImageUrl ?? null,
      brandIdentity: input.identityAudit?.brandIdentity ?? null,
      assetFamily: input.identityAudit?.assetFamily ?? null,
      characterLineage: input.identityAudit?.characterLineage ?? null,
      identityFingerprintHash: input.identityAudit?.identityFingerprintHash ?? null,
      preserveRules: input.identityAudit?.preserveRules ?? sourceRef?.preserveHint ?? null,
      changeRules: input.identityAudit?.changeRules ?? sourceRef?.changeHint ?? null,
      forbiddenRules: input.identityAudit?.forbiddenRules ?? sourceRef?.forbiddenHint ?? null,
      strictRegeneration: input.identityAudit?.strictRegeneration ?? false,
      finalPromptLength: generatedPrompt.length,
      finalPromptExcerpt: generatedPrompt.slice(0, 1200),
      finalPrompt: generatedPrompt,
    })
  );

  const meteringCtx: StudioMeteringContext = {
    userId: viewer.id,
    feature: input.derivation ? "asset_derivation" : "asset_reference_generate",
    relatedJobId: generationId,
  };

  const providerId = getSelectedSceneImageProviderId();
  const resolvedModel = resolveOpenAiImageModel();

  logOpenAiImageGenerationRequest({
    helperPath: "generateAssetReference→generateImageBuffersFromPrompt",
    route: "/api/studio/asset-references/generate",
    model: resolvedModel,
    body: {
      model: resolvedModel,
      providerId,
      feature: input.derivation ? "asset_derivation" : "asset_reference_generate",
      generationId,
    },
  });

  try {
    const buffers = await generateImageBuffersFromPrompt({
      prompt: generatedPrompt,
      correlationId: generationId,
      ownerId: viewer.id,
      seed: promptSeed(generatedPrompt, generationId),
      logRoute: "/api/studio/asset-references/generate",
      sourceImageUrl,
      generationIntent,
      identityLockLevel,
    });

    const uploaded = await uploadStudioAssetReferenceBuffers({
      ownerId: viewer.id,
      kind: input.kind,
      generationId,
      imageBuffer: buffers.imageBuffer,
      thumbnailBuffer: buffers.thumbnailBuffer,
      imageContentType: buffers.contentType,
      thumbContentType: "image/jpeg",
      promptSummary: summary.slice(0, 240),
      sourceAssetName: sourceRef?.name ?? input.derivation?.sourceName ?? null,
      sourceAssetId: input.derivation?.sourceAssetId ?? null,
      origin: input.derivation ? "derived" : "generated",
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
          referenceImageUrl: uploaded.referenceImageUrl,
          referenceStorageKey: uploaded.referenceStorageKey,
          thumbnailUrl: uploaded.thumbnailUrl,
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
        generationMode: buffers.generationMode,
        generationIntent,
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
