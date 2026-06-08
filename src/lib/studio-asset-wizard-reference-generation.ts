import {
  analyzeAssetStyleDnaApi,
} from "@/lib/studio-asset-derivation-client";
import { generateStudioAssetReferenceApi } from "@/lib/studio-asset-reference-client";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { clearWizardGeneratedReferenceOutput, resolveWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import { resolveTransformLabelForGeneration } from "@/lib/studio-asset-wizard-source-flow";
import {
  buildSourceTransformSummaryPrompt,
  buildSourceTransformUserPrompt,
} from "@/lib/studio-asset-transform-prompt";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export type ReferenceGenerationOutcome =
  | {
      ok: true;
      referenceImageUrl: string;
      referenceStorageKey: string;
      generatedPrompt: string;
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
      }
    : undefined;

  return {
    kind,
    summaryPrompt,
    choices: draft.choices,
    customTexts: draft.customTexts,
    generationId,
    sourceReference,
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

  let styleDna = draft.derivationStyleDna;
  let derivationSource = draft.derivationSource;
  const source = resolveWizardSourceReference(draft);

  if (source && !styleDna && source.sourceReferenceImageUrl) {
    const analyze = await analyzeAssetStyleDnaApi({
      imageUrl: source.sourceReferenceImageUrl,
      sourceKind: draft.derivationTargetKind ?? kind,
      sourceName: source.sourceReferenceName,
      derivationJobId: generationId,
    });
    if (analyze.ok) {
      styleDna = analyze.data.styleDna;
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

  const payload = buildReferenceGenerationPayload(
    {
      ...draft,
      derivationStyleDna: styleDna,
      derivationSource,
      summaryPrompt: source
        ? buildSourceTransformSummaryPrompt(draft)
        : draft.summaryPrompt,
    },
    kind,
    generationId
  );

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

  return {
    generationId,
    outcome: {
      ok: true,
      referenceImageUrl: res.data.referenceImageUrl,
      referenceStorageKey: res.data.referenceStorageKey,
      generatedPrompt: res.data.generatedPrompt,
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
  return {
    referenceGenerationStatus: "preview",
    generatedReferencePreviewUrl: outcome.referenceImageUrl,
    generatedReferenceStorageKey: outcome.referenceStorageKey,
    referenceGenerationPrompt: outcome.generatedPrompt,
  };
}

export function draftPatchForGenerationFailure(errorMessage: string): Partial<AssetWizardDraft> {
  return {
    referenceGenerationStatus: "failed",
    referenceGenerationError: errorMessage,
  };
}
