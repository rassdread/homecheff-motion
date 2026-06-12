import { activeApprovedVariant } from "@/lib/editor-instruction-approval";
import { listInstructionVariants } from "@/lib/editor-instruction-version";
import { persistGenerationPackage } from "@/lib/editor-generation-package-persist";
import { orderedTransformationResultUrls } from "@/lib/editor-transformation-session";
import type { EditorReferenceAssignment } from "@/types/editor-reference-metadata";
import type {
  EditorGenerationPackage,
  EditorGenerationPackageAsset,
} from "@/types/editor-generation-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function createGenerationPackageId(): string {
  return `genpkg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toAsset(
  input: Omit<EditorGenerationPackageAsset, "createdAt"> & { createdAt?: string }
): EditorGenerationPackageAsset {
  return {
    ...input,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function buildGenerationPackageFromDocument(document: EditorCanvasDocument): EditorGenerationPackage {
  const now = new Date().toISOString();
  const intake = document.instructionStudioState?.referenceIntake;
  const assignments = (intake?.roleAssignments ?? []).filter(
    (a): a is EditorReferenceAssignment => Boolean(a.url && a.instanceId && a.name)
  );
  const session = document.instructionStudioState?.transformationSession;
  const variants = listInstructionVariants(document).filter(
    (v) => v.status === "completed" && v.resultUrl?.trim()
  );

  const generatedImages: EditorGenerationPackageAsset[] = variants
    .filter((v) => v.variantType !== "combined" || !session)
    .map((v) =>
      toAsset({
        id: v.id,
        kind: "generated_image",
        url: v.resultUrl!,
        storageKey: v.resultStorageKey,
        label: v.name,
        variantId: v.id,
      })
    );

  const sequenceFrames: EditorGenerationPackageAsset[] = session
    ? session.steps
        .filter((step) => step.resultUrl)
        .sort((a, b) => a.index - b.index)
        .map((step) =>
          toAsset({
            id: step.id,
            kind: "sequence_frame",
            url: step.resultUrl!,
            label: `Step ${step.index + 1}`,
            stepIndex: step.index,
            variantId: step.variantId,
          })
        )
    : variants
        .filter((v) => v.variantType === "combined")
        .map((v, index) =>
          toAsset({
            id: v.id,
            kind: "sequence_frame",
            url: v.resultUrl!,
            storageKey: v.resultStorageKey,
            label: v.name,
            stepIndex: index,
            variantId: v.id,
          })
        );

  const approved = activeApprovedVariant(document);
  const primaryUrl = approved?.resultUrl ?? sequenceFrames.at(-1)?.url ?? generatedImages[0]?.url;

  const orderedFrameUrls =
    session ? orderedTransformationResultUrls(session)
    : sequenceFrames.sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0)).map((f) => f.url);

  if (primaryUrl && !generatedImages.some((g) => g.url === primaryUrl)) {
    generatedImages.unshift(
      toAsset({
        id: approved?.id ?? `primary_${document.sessionId}`,
        kind: "generated_image",
        url: primaryUrl,
        label: approved?.name ?? "Primary result",
        variantId: approved?.id,
      })
    );
  }

  return {
    id: document.instructionStudioState?.generationPackage?.id ?? createGenerationPackageId(),
    editorSessionId: document.sessionId,
    workflow: (document.instructionStudioState?.fusionPlan?.intent ??
      document.instructionStudioState?.combineIntent ??
      "custom_composition") as EditorGenerationPackage["workflow"],
    sourceReferences: assignments,
    metadataSnapshot: assignments,
    generatedImages,
    sequenceFrames,
    thumbnails: primaryUrl
      ? [
          toAsset({
            id: `thumb_${document.sessionId}`,
            kind: "thumbnail",
            url: primaryUrl,
            label: "Thumbnail",
          }),
        ]
      : [],
    motionOutputs: [],
    exportOutputs: [],
    transformationSessionId: session?.id,
    orderedFrameUrls,
    motionDurationSec: intake?.motionDurationSec,
    createdAt: document.instructionStudioState?.generationPackage?.createdAt ?? now,
    updatedAt: now,
  };
}

export function patchDocumentGenerationPackage(document: EditorCanvasDocument): EditorCanvasDocument {
  const pkg = buildGenerationPackageFromDocument(document);
  const persisted = typeof window !== "undefined" ? persistGenerationPackage(pkg) : pkg;
  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      generationPackage: persisted,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function syncTransformationSessionFromVariants(
  document: EditorCanvasDocument
): EditorCanvasDocument {
  const session = document.instructionStudioState?.transformationSession;
  if (!session) {
    return document;
  }

  const sequenceVariants = listInstructionVariants(document)
    .filter((v) => v.status === "completed" && v.resultUrl && v.variantType === "combined")
    .sort((a, b) => {
      const aIndex = Number(a.name?.match(/(\d+)\//)?.[1] ?? 0);
      const bIndex = Number(b.name?.match(/(\d+)\//)?.[1] ?? 0);
      return aIndex - bIndex;
    });

  const steps = session.steps.map((step) => {
    const variant = sequenceVariants.find((v) => v.name?.includes(`${step.index + 1}/`));
    if (!variant?.resultUrl) {
      return step;
    }
    return {
      ...step,
      resultUrl: variant.resultUrl,
      variantId: variant.id,
      status: "completed" as const,
    };
  });

  return {
    ...document,
    instructionStudioState: {
      ...document.instructionStudioState,
      transformationSession: {
        ...session,
        steps,
        updatedAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}
