import type { EditorReferenceAssignment } from "@/types/editor-reference-metadata";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorMetadataPipelinePayload = {
  assignments: EditorReferenceAssignment[];
  promptLines: string[];
  motionQueryParams: Record<string, string>;
  exportMetadata: Record<string, string>;
  analysisHints: string[];
};

function assignmentKey(assignment: EditorReferenceAssignment, index: number): string {
  return `${assignment.roleId}_${assignment.instanceId ?? index}`;
}

export function collectEditorMetadataPipeline(
  document: EditorCanvasDocument
): EditorMetadataPipelinePayload {
  const assignments = (document.instructionStudioState?.referenceIntake?.roleAssignments ?? []).filter(
    (a): a is EditorReferenceAssignment => Boolean(a.url && a.instanceId && a.name)
  );

  const promptLines: string[] = [];
  const motionQueryParams: Record<string, string> = {};
  const exportMetadata: Record<string, string> = {};
  const analysisHints: string[] = [];

  for (const [index, assignment] of assignments.entries()) {
    const key = assignmentKey(assignment, index);
    const meta = assignment.metadata;
    if (meta?.view) {
      motionQueryParams[`ref_${key}_view`] = meta.view;
      exportMetadata[`${key}.view`] = meta.view;
      analysisHints.push(`${assignment.role} ${meta.view}`);
    }
    if (meta?.clothingType) {
      motionQueryParams[`ref_${key}_clothing`] = meta.clothingType;
      exportMetadata[`${key}.clothingType`] = meta.clothingType;
      analysisHints.push(`${meta.clothingType} ${meta.view ?? "reference"}`);
    }
    if (meta?.familyType) {
      motionQueryParams[`ref_${key}_family`] = meta.familyType;
      exportMetadata[`${key}.familyType`] = meta.familyType;
      analysisHints.push(`family:${meta.familyType}`);
    }
    if (meta?.animalType) {
      motionQueryParams[`ref_${key}_animal`] = meta.animalType;
      exportMetadata[`${key}.animalType`] = meta.animalType;
    }
    if (meta?.notes?.trim()) {
      exportMetadata[`${key}.notes`] = meta.notes.trim();
    }
    motionQueryParams[`ref_${key}_url`] = assignment.url;
    motionQueryParams[`ref_${key}_role`] = assignment.role;
  }

  if (assignments.length > 0) {
    motionQueryParams.referenceMetadata = JSON.stringify(
      assignments.map((a) => ({
        roleId: a.roleId,
        role: a.role,
        url: a.url,
        metadata: a.metadata,
      }))
    );
  }

  const clothingItems = assignments.filter((a) => a.role === "outfit" || a.metadata?.clothingType);
  if (clothingItems.length >= 2) {
    promptLines.push("Reconstruct one complete outfit using all uploaded clothing references.");
  }

  const familyRefs = assignments.filter((a) => a.metadata?.familyType);
  if (familyRefs.length >= 1) {
    promptLines.push("Use maternal and paternal aging references when available.");
  }
  if (familyRefs.length >= 3) {
    promptLines.push("Use extended family references for aging estimation.");
  }

  return {
    assignments,
    promptLines,
    motionQueryParams,
    exportMetadata,
    analysisHints,
  };
}

export function metadataEnrichedGenerationPrompt(
  basePrompt: string,
  document: EditorCanvasDocument
): string {
  const pipeline = collectEditorMetadataPipeline(document);
  if (pipeline.promptLines.length === 0 && pipeline.assignments.length === 0) {
    return basePrompt;
  }
  const lines = [basePrompt, "", "REFERENCE PIPELINE"];
  if (pipeline.promptLines.length > 0) {
    lines.push(...pipeline.promptLines.map((line) => `- ${line}`));
  }
  for (const assignment of pipeline.assignments) {
    if (!assignment.metadata) {
      continue;
    }
    const parts = [
      assignment.metadata.view,
      assignment.metadata.clothingType?.replace(/_/g, " "),
      assignment.metadata.familyType?.replace(/_/g, " "),
      assignment.metadata.animalType,
    ].filter(Boolean);
    if (parts.length > 0) {
      lines.push(`- ${assignment.role}: ${parts.join(", ")}`);
    }
  }
  return lines.join("\n");
}
