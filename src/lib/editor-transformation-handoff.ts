import { orderedTransformationResultUrls } from "@/lib/editor-transformation-session";
import type { EditorTransformationSession } from "@/types/editor-generation-access";

export function buildTransformationMotionHandoffQuery(input: {
  session: EditorTransformationSession;
  editorSessionId: string;
  transitionDurationSec?: number;
}): string {
  const urls = orderedTransformationResultUrls(input.session);
  const params = new URLSearchParams({
    editorSession: input.editorSessionId,
    transformationSession: input.session.id,
    transformationType: input.session.type,
    stepCount: String(input.session.stepCount),
    transitionDurationSec: String(input.transitionDurationSec ?? 4),
    motionIntent: "transformation_sequence",
  });
  for (const [index, url] of urls.entries()) {
    params.set(`stepImage${index}`, url);
  }
  for (const [index, strength] of input.session.strengthCurve.entries()) {
    params.set(`stepStrength${index}`, String(strength));
  }
  if (input.session.preserveRules.length > 0) {
    params.set("preserveRules", input.session.preserveRules.join(","));
  }
  return params.toString();
}

export function editorTransformationMotionUrl(input: {
  session: EditorTransformationSession;
  editorSessionId: string;
  transitionDurationSec?: number;
}): string {
  return `/animate/instant?${buildTransformationMotionHandoffQuery(input)}`;
}
