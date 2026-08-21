import { buildFusionLibraryFields } from "@/lib/library-consistency-completion";
import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import {
  fusionWorkflowUsesIntelligence,
  buildFusionIntelligenceCostState,
} from "@/lib/editor-fusion-workflow-credits";
import { buildFusionIntelligencePrompt } from "@/lib/editor-fusion-render-payload";
import { resolveFusionVariantImageSlots } from "@/lib/editor-fusion-variant-render";
import { validateEditorInstructionVariantImageSource } from "@/server/editor/editor-image-ownership";
import { resolveFusionRenderCreditsRequired } from "@/server/editor/editor-fusion-render-billing";
import {
  executeClothingFusionTransformation,
  shouldUseClothingTransformationRuntime,
} from "@/server/editor/studio-clothing-transformation-execute";
import {
  executeLocationFusionTransformation,
  shouldUseLocationTransformationRuntime,
} from "@/server/editor/studio-location-transformation-execute";
import {
  executeProductLogoFusionTransformation,
  shouldUseProductLogoTransformationRuntime,
} from "@/server/editor/studio-product-logo-transformation-execute";
import { executeEditorInstructionVariant } from "@/server/editor/editor-instruction-variant-service";
import { ensureCompletedGenerationInLibrary } from "@/server/studio/library-consistency-service";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type {
  EditorInstructionReference,
  EditorInstructionSelection,
} from "@/types/editor-instruction-studio";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { LibraryFusionMetadata } from "@/types/library-consistency";
import type { SessionUser } from "@/server/auth/session";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

export type FusionWizardRenderRequest = {
  workflowType: EditorFusionIntent;
  sessionId: string;
  imageUrl: string;
  prompt: string;
  fusionRenderPayload: FusionRenderPayload;
  references?: EditorInstructionReference[];
  instruction?: Partial<EditorInstructionSelection>;
  confirmed?: boolean;
  hcProjectId?: string | null;
  projectTitle?: string | null;
  fusionMetadata?: LibraryFusionMetadata | null;
};

export type FusionWizardRenderSuccess = {
  ok: true;
  resultUrl: string;
  storageKey: string;
  provider: string;
  model: string;
  costEstimateUsd?: number;
  fusionRun?: import("@/types/editor-fusion-intelligence").FusionRunRecord;
  providerSupportsMultiReference: boolean;
  referenceImageCount: number;
  fusionCreditsCharged: number;
  analysisCreditsCharged: number;
  totalCreditsCharged: number;
  librarySaved: boolean;
  libraryAssetId: string | null;
  transformationExecution?: import("@/types/studio-image-transformation").TransformationExecutionRecord;
};

export type FusionWizardRenderFailure = {
  ok: false;
  code:
    | "invalid_request"
    | "validation"
    | "ownership"
    | "analysis_failed"
    | "render_failed";
  message: string;
};

function normalizeInstruction(
  instruction: Partial<EditorInstructionSelection> | undefined
): EditorInstructionSelection {
  return {
    objectKey: instruction?.objectKey?.trim() || "combine",
    objectLabel: instruction?.objectLabel?.trim() || "Combined composition",
    category: instruction?.category ?? "other",
    action: instruction?.action ?? "replace",
    replacement: instruction?.replacement?.trim(),
    customPrompt: instruction?.customPrompt?.trim(),
    sliders: {
      ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS,
      ...instruction?.sliders,
    },
    preserveCharacter: instruction?.preserveCharacter ?? true,
    logoReferenceId: instruction?.logoReferenceId,
    styleReferenceId: instruction?.styleReferenceId,
    productReferenceId: instruction?.productReferenceId,
    brandingPlacementHint: instruction?.brandingPlacementHint,
  };
}

async function validateFusionReferences(input: {
  userId: string;
  sessionId: string;
  imageUrl: string;
  payload: FusionRenderPayload;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const urls = new Set<string>([input.imageUrl.trim()]);
  for (const slot of resolveFusionVariantImageSlots({
    primaryImageUrl: input.imageUrl,
    payload: input.payload,
  })) {
    urls.add(slot.url.trim());
  }
  for (const url of urls) {
    if (!url) {
      continue;
    }
    const ownership = await validateEditorInstructionVariantImageSource({
      userId: input.userId,
      sessionId: input.sessionId,
      imageUrl: url,
    });
    if (!ownership.ok) {
      return { ok: false, message: "Reference image not allowed." };
    }
  }
  return { ok: true };
}

function validatePremiumProfiles(payload: FusionRenderPayload): boolean {
  if (!payload.referenceAnalysis?.length) {
    return false;
  }
  return payload.referenceAnalysis.every(
    (profile) => profile.premiumCached || profile.parts.length > 0
  );
}

export function resolveFusionWizardRenderCredits(body: FusionWizardRenderRequest): {
  renderCredits: number;
  analysisCredits: number;
  totalCredits: number;
} {
  const workflowType = normalizeFusionIntent(body.workflowType);
  const costState = buildFusionIntelligenceCostState({
    workflowType,
    profiles: body.fusionRenderPayload.referenceAnalysis ?? [],
  });
  const renderCredits = resolveFusionRenderCreditsRequired(workflowType);
  return {
    renderCredits,
    analysisCredits: costState.analysisCreditsRequired,
    totalCredits: renderCredits + costState.analysisCreditsRequired,
  };
}

export async function executeFusionWizardRender(input: {
  user: Pick<SessionUser, "id" | "email" | "role">;
  body: FusionWizardRenderRequest;
}): Promise<FusionWizardRenderSuccess | FusionWizardRenderFailure> {
  const workflowType = normalizeFusionIntent(input.body.workflowType);
  if (!fusionWorkflowUsesIntelligence(workflowType)) {
    return {
      ok: false,
      code: "invalid_request",
      message: "Workflow does not support fusion wizard render.",
    };
  }

  const sessionId = input.body.sessionId?.trim();
  const imageUrl = input.body.imageUrl?.trim();
  const prompt =
    input.body.prompt?.trim() || buildFusionIntelligencePrompt(input.body.fusionRenderPayload);
  const payload = input.body.fusionRenderPayload;

  if (!sessionId || !imageUrl || !payload?.blueprint) {
    return {
      ok: false,
      code: "validation",
      message: "sessionId, imageUrl, and fusionRenderPayload are required.",
    };
  }

  const ownership = await validateFusionReferences({
    userId: input.user.id,
    sessionId,
    imageUrl,
    payload,
  });
  if (!ownership.ok) {
    return { ok: false, code: "ownership", message: ownership.message };
  }

  if (!validatePremiumProfiles(payload)) {
    return {
      ok: false,
      code: "analysis_failed",
      message: "Premium analysis incomplete for one or more references.",
    };
  }

  const credits = resolveFusionWizardRenderCredits(input.body);

  const useClothingRuntime = shouldUseClothingTransformationRuntime({
    workflowType,
    payload,
  });
  const useLocationRuntime = shouldUseLocationTransformationRuntime({
    workflowType,
  });
  const useProductLogoRuntime = shouldUseProductLogoTransformationRuntime({
    workflowType,
  });

  const result = useClothingRuntime
    ? await executeClothingFusionTransformation({
        userId: input.user.id,
        sessionId,
        imageUrl,
        prompt,
        instruction: normalizeInstruction(input.body.instruction),
        references: input.body.references,
        fusionWorkflowType: workflowType,
        fusionRenderPayload: payload,
        fusionCreditsCharged: credits.renderCredits,
      })
    : useLocationRuntime
      ? await executeLocationFusionTransformation({
          userId: input.user.id,
          sessionId,
          imageUrl,
          prompt,
          instruction: normalizeInstruction(input.body.instruction),
          references: input.body.references,
          fusionWorkflowType: workflowType,
          fusionRenderPayload: payload,
          fusionCreditsCharged: credits.renderCredits,
        })
      : useProductLogoRuntime
        ? await executeProductLogoFusionTransformation({
            userId: input.user.id,
            sessionId,
            imageUrl,
            prompt,
            instruction: normalizeInstruction(input.body.instruction),
            references: input.body.references,
            fusionWorkflowType: workflowType,
            fusionRenderPayload: payload,
            fusionCreditsCharged: credits.renderCredits,
          })
        : await executeEditorInstructionVariant({
            userId: input.user.id,
            sessionId,
            imageUrl,
            prompt,
            instruction: normalizeInstruction(input.body.instruction),
            references: input.body.references,
            fusionWorkflowType: workflowType,
            fusionRenderPayload: payload,
            fusionCreditsCharged: credits.renderCredits,
          });

  if (!result.ok) {
    return {
      ok: false,
      code: "render_failed",
      message: result.message,
    };
  }

  let librarySaved = false;
  let libraryAssetId: string | null = null;
  try {
    const fusion = buildFusionLibraryFields(input.body.fusionMetadata);
    const libraryRecord = await ensureCompletedGenerationInLibrary({
      ownerId: input.user.id,
      createdBy: input.user.id,
      generationType: "editor_variant",
      assetUrl: result.resultUrl,
      storageKey: result.storageKey,
      thumbnailUrl: result.resultUrl,
      assetName: input.body.projectTitle?.trim() || `Fusion ${workflowType}`,
      promptSummary: prompt.slice(0, 240),
      projectId: input.body.hcProjectId?.trim() || sessionId,
      projectTitle: input.body.projectTitle?.trim() || null,
      sourceModule: "editor",
      backingId: result.storageKey.split("/").pop()?.replace(/\.png$/i, "") ?? undefined,
      assetType: "fusion_output",
      workflow: fusion.workflow ?? "combine",
      fusionIntent: fusion.fusionIntent ?? workflowType,
      fusionArchetype: fusion.fusionArchetype,
      fusionMetadata: fusion.fusionMetadata,
      usedInModules: ["editor", "studio"],
    });
    librarySaved = Boolean(libraryRecord);
    libraryAssetId = libraryRecord?.registryAssetId ?? null;
  } catch (error) {
    console.error("[fusion-wizard] library register failed", error);
  }

  return {
    ok: true,
    resultUrl: result.resultUrl,
    storageKey: result.storageKey,
    provider: result.provider,
    model: result.model,
    costEstimateUsd: result.costEstimateUsd,
    fusionRun: result.fusionRun,
    providerSupportsMultiReference: result.providerSupportsMultiReference,
    referenceImageCount: result.referenceImageCount,
    fusionCreditsCharged: credits.renderCredits,
    analysisCreditsCharged: credits.analysisCredits,
    totalCreditsCharged: credits.totalCredits,
    librarySaved,
    libraryAssetId,
    transformationExecution: result.fusionRun?.transformationExecution,
  };
}
