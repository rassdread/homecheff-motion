import { orderedTransformationResultUrls } from "@/lib/editor-transformation-session";
import type { EditorReferenceAssignment } from "@/types/editor-reference-metadata";
import type { EditorTransformationSession } from "@/types/editor-generation-access";

export function buildTransformationMotionHandoffQuery(input: {
  session: EditorTransformationSession;
  editorSessionId: string;
  transitionDurationSec?: number;
  referenceAssignments?: EditorReferenceAssignment[];
  metadataQueryParams?: Record<string, string>;
}): string {
  const urls = orderedTransformationResultUrls(input.session);
  const params = new URLSearchParams({
    editorSession: input.editorSessionId,
    transformationSession: input.session.id,
    transformationType: input.session.type,
    stepCount: String(input.session.stepCount),
    transitionDurationSec: String(input.transitionDurationSec ?? 4),
    motionIntent: "transformation_sequence",
    handoffMode: "animation",
  });
  for (const [index, url] of urls.entries()) {
    params.set(`stepImage${index}`, url);
    params.set(`stepOrder${index}`, String(index));
  }
  for (const [index, strength] of input.session.strengthCurve.entries()) {
    params.set(`stepStrength${index}`, String(strength));
  }
  if (input.session.preserveRules.length > 0) {
    params.set("preserveRules", input.session.preserveRules.join(","));
  }
  if (input.referenceAssignments?.length) {
    params.set(
      "referenceMetadata",
      JSON.stringify(
        input.referenceAssignments.map((a) => ({
          roleId: a.roleId,
          role: a.role,
          metadata: a.metadata,
        }))
      )
    );
  }
  if (input.metadataQueryParams) {
    for (const [key, value] of Object.entries(input.metadataQueryParams)) {
      params.set(key, value);
    }
  }
  return params.toString();
}

export function editorTransformationMotionUrl(input: {
  session: EditorTransformationSession;
  editorSessionId: string;
  transitionDurationSec?: number;
  referenceAssignments?: EditorReferenceAssignment[];
  metadataQueryParams?: Record<string, string>;
}): string {
  return `/animate/instant?${buildTransformationMotionHandoffQuery(input)}`;
}
