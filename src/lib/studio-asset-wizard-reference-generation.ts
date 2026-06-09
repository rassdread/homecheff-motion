import {
  analyzeAssetStyleDnaApi,
} from "@/lib/studio-asset-derivation-client";
import { generateStudioAssetReferenceApi } from "@/lib/studio-asset-reference-client";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { clearWizardGeneratedReferenceOutput, resolveWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import { resolveTransformLabelForGeneration } from "@/lib/studio-asset-wizard-source-flow";
import { resolveAssetGenerationIntent } from "@/lib/studio-asset-generation-intent";
import {
  buildStricterPreservePatch,
  computeVariantFidelityScore,
  buildAssetIdentityGenerationAudit,
  resolveIdentityLockLevel,
} from "@/lib/studio-asset-identity-preservation";
import {
  buildSourceTransformSummaryPrompt,
  buildSourceTransformUserPrompt,
  buildTransformPromptPreviewFields,
  resolveVariantLabelForDraft,
} from "@/lib/studio-asset-transform-prompt";
import { buildAssetSemanticGenerationInputFromDraft } from "@/lib/studio-asset-semantic-generation-context";
import { buildAssetSemanticGenerationContext } from "@/lib/studio-asset-semantic-generation-context";
import type { VariantFidelityScore } from "@/types/studio-asset-identity-preservation";
import type { StudioAssetKind } from "@/types/studio-asset-creation";
import type { AssetImageGenerationMode } from "@/types/studio-asset-image-generation";

export type ReferenceGenerationOutcome =
  | {
      ok: true;
      referenceImageUrl: string;
      referenceStorageKey: string;
      generatedPrompt: string;
      variantFidelityScore: VariantFidelityScore | null;
      generationMode?: AssetImageGenerationMode;
      identityFailure?: boolean;
      autoRecovered?: boolean;
    }
  | {
      ok: false;
      error: string;
      errorKey: string | null;
      providerMessage: string | null;
    };

export function buildReferenceGenerationPayload(
  draft: AssetWizardDraft,
  kind: StudioAssetKind,
  generationId: string
) {
  const source = resolveWizardSourceReference(draft);
  const transformLabel = resolveTransformLabelForGeneration(draft);
  const summaryPrompt = source
    ? buildSourceTransformSummaryPrompt(draft)
    : draft.summaryPrompt.trim();
  const userPrompt = source ? buildSourceTransformUserPrompt(draft) : undefined;
  const visionPromptBlock = buildAssetSemanticGenerationContext(
    buildAssetSemanticGenerationInputFromDraft(draft)
  );
  const styleDna = draft.derivationStyleDna;
  const derivationSource = draft.derivationSource;

  const sourceReference =
    source ?
      {
        name: source.sourceReferenceName,
        imageUrl: source.sourceReferenceImageUrl,
        transformLabel,
        userPrompt: userPrompt || undefined,
        preserveHint: draft.sourceTransformPreserve.trim() || undefined,
        changeHint: draft.sourceTransformChange.trim() || undefined,
        forbiddenHint: draft.sourceTransformForbidden.trim() || undefined,
        visionHint: visionPromptBlock || undefined,
      }
    : undefined;

  const previewFields = source ? buildTransformPromptPreviewFields(draft) : null;
  const generationIntent = resolveAssetGenerationIntent({
    sourceImageUrl: source?.sourceReferenceImageUrl,
    derivationSourceAssetId: derivationSource?.assetId,
  });
  const identityLockLevel = resolveIdentityLockLevel({
    strictRegeneration: draft.variantRegenerationStrict,
    identityLockLevel: draft.variantRegenerationStrict ? 2 : 1,
  });
  const identityAudit =
    source ?
      buildAssetIdentityGenerationAudit({
        sourceName: source.sourceReferenceName,
        sourceImageUrl: source.sourceReferenceImageUrl,
        vision: draft.sourceVisionAnalysis,
        preserveRules: previewFields!.preserve,
        changeRules: previewFields!.change,
        forbiddenRules: previewFields!.forbidden,
        strictRegeneration: draft.variantRegenerationStrict,
        variantLabel: resolveVariantLabelForDraft(draft),
        generationIntent,
        identityLockLevel,
      })
    : undefined;

  return {
    kind,
    summaryPrompt,
    choices: draft.choices,
    customTexts: draft.customTexts,
    generationId,
    sourceReference,
    identityAudit,
    derivation:
      styleDna && (derivationSource || source)
        ? {
            styleDna,
            sourceName: derivationSource?.assetName ?? source!.sourceReferenceName,
            sourceKind: derivationSource?.sourceKind ?? kind,
            sourceAssetId: derivationSource?.assetId,
          }
        : undefined,
  };
}

async function scoreVariantFidelity(params: {
  sourceVision: NonNullable<AssetWizardDraft["sourceVisionAnalysis"]>;
  sourceName: string;
  generatedImageUrl: string;
  kind: StudioAssetKind;
  generationId: string;
  profileLevel?: AssetWizardDraft["identityProfileLevel"];
}): Promise<VariantFidelityScore | null> {
  const fidelityAnalyze = await analyzeAssetStyleDnaApi({
    imageUrl: params.generatedImageUrl,
    sourceKind: params.kind,
    sourceName: `${params.sourceName} variant`,
    derivationJobId: params.generationId,
  });
  if (!fidelityAnalyze.ok) {
    return null;
  }
  return computeVariantFidelityScore({
    source: params.sourceVision,
    generated: fidelityAnalyze.data.visionAnalysis,
    profileLevel: params.profileLevel,
  });
}

export async function runAssetReferenceGeneration(params: {
  draft: AssetWizardDraft;
  kind: StudioAssetKind;
  forceNewId?: boolean;
}): Promise<{ generationId: string; outcome: ReferenceGenerationOutcome }> {
  const { draft, kind, forceNewId = false } = params;
  const generationId =
    forceNewId || !draft.referenceGenerationId
      ? crypto.randomUUID()
      : draft.referenceGenerationId;

  const workingDraft = draft.variantRegenerationStrict
    ? { ...draft, ...buildStricterPreservePatch(draft) }
    : draft;

  let styleDna = workingDraft.derivationStyleDna;
  let visionAnalysis = workingDraft.sourceVisionAnalysis;
  let derivationSource = workingDraft.derivationSource;
  const source = resolveWizardSourceReference(workingDraft);

  if (source && !styleDna && source.sourceReferenceImageUrl) {
    const analyze = await analyzeAssetStyleDnaApi({
      imageUrl: source.sourceReferenceImageUrl,
      sourceKind: draft.derivationTargetKind ?? kind,
      sourceName: source.sourceReferenceName,
      derivationJobId: generationId,
    });
    if (analyze.ok) {
      styleDna = analyze.data.styleDna;
      visionAnalysis = analyze.data.visionAnalysis;
      if (!derivationSource) {
        derivationSource = {
          sourceType: "upload",
          sourceKind: draft.derivationTargetKind ?? kind,
          assetId: null,
          assetName: source.sourceReferenceName,
          referenceImageUrl: source.sourceReferenceImageUrl,
          referenceStorageKey: source.sourceReferenceStorageKey,
        };
      }
    }
  }

  const payloadDraft = {
    ...workingDraft,
    derivationStyleDna: styleDna,
    sourceVisionAnalysis: visionAnalysis,
    derivationSource,
    summaryPrompt: source
      ? buildSourceTransformSummaryPrompt(workingDraft)
      : workingDraft.summaryPrompt,
  };

  const payload = buildReferenceGenerationPayload(payloadDraft, kind, generationId);
  const res = await generateStudioAssetReferenceApi(payload);

  if (!res.ok) {
    const data = res.data as { error?: string; providerMessage?: string | null };
    return {
      generationId,
      outcome: {
        ok: false,
        error: data.error ?? "Generation failed.",
        errorKey: data.error?.startsWith("studio.") ? data.error : null,
        providerMessage: data.providerMessage ?? null,
      },
    };
  }

  let variantFidelityScore: VariantFidelityScore | null = null;
  let autoRecovered = false;

  if (source && visionAnalysis && res.data.referenceImageUrl) {
    variantFidelityScore = await scoreVariantFidelity({
      sourceVision: visionAnalysis,
      sourceName: source.sourceReferenceName,
      generatedImageUrl: res.data.referenceImageUrl,
      kind,
      generationId,
      profileLevel: workingDraft.identityProfileLevel,
    });

    if (
      variantFidelityScore?.recoveryTier === "strict_regenerate" &&
      !workingDraft.variantRegenerationStrict
    ) {
      const strictDraft = {
        ...payloadDraft,
        ...buildStricterPreservePatch(payloadDraft),
        variantRegenerationStrict: true,
      };
      const retryPayload = buildReferenceGenerationPayload(strictDraft, kind, generationId);
      const retryRes = await generateStudioAssetReferenceApi(retryPayload);
      if (retryRes.ok && retryRes.data.referenceImageUrl) {
        autoRecovered = true;
        const retryScore = await scoreVariantFidelity({
          sourceVision: visionAnalysis,
          sourceName: source.sourceReferenceName,
          generatedImageUrl: retryRes.data.referenceImageUrl,
          kind,
          generationId,
          profileLevel: strictDraft.identityProfileLevel,
        });
        return {
          generationId,
          outcome: {
            ok: true,
            referenceImageUrl: retryRes.data.referenceImageUrl,
            referenceStorageKey: retryRes.data.referenceStorageKey,
            generatedPrompt: retryRes.data.generatedPrompt,
            variantFidelityScore: retryScore,
            generationMode: retryRes.data.generationMode,
            identityFailure: retryScore?.recoveryTier === "identity_failure",
            autoRecovered: true,
          },
        };
      }
    }
  }

  return {
    generationId,
    outcome: {
      ok: true,
      referenceImageUrl: res.data.referenceImageUrl,
      referenceStorageKey: res.data.referenceStorageKey,
      generatedPrompt: res.data.generatedPrompt,
      variantFidelityScore,
      generationMode: res.data.generationMode,
      identityFailure: variantFidelityScore?.recoveryTier === "identity_failure",
      autoRecovered,
    },
  };
}

export function draftPatchForGenerationStart(
  draft: AssetWizardDraft,
  generationId: string
): Partial<AssetWizardDraft> {
  const source = resolveWizardSourceReference(draft);
  return {
    ...clearWizardGeneratedReferenceOutput(draft),
    referenceGenerationStatus: "generating",
    referenceGenerationError: "",
    referenceGenerationId: generationId,
    summaryPrompt: source ? buildSourceTransformSummaryPrompt(draft) : draft.summaryPrompt,
  };
}

export function draftPatchForGenerationSuccess(
  outcome: Extract<ReferenceGenerationOutcome, { ok: true }>
): Partial<AssetWizardDraft> {
  const recoveryTier = outcome.variantFidelityScore?.recoveryTier;
  return {
    referenceGenerationStatus: "preview",
    generatedReferencePreviewUrl: outcome.referenceImageUrl,
    generatedReferenceStorageKey: outcome.referenceStorageKey,
    referenceGenerationPrompt: outcome.generatedPrompt,
    variantFidelityScore: outcome.variantFidelityScore,
    variantFidelityStatus: outcome.variantFidelityScore ? "ready" : "idle",
    variantRegenerationStrict:
      recoveryTier === "strict_regenerate" ||
      recoveryTier === "identity_failure" ||
      outcome.autoRecovered === true,
  };
}

export function draftPatchForGenerationFailure(errorMessage: string): Partial<AssetWizardDraft> {
  return {
    referenceGenerationStatus: "failed",
    referenceGenerationError: errorMessage,
  };
}
