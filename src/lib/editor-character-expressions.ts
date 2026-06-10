import type {
  EditorCharacterExpression,
  EditorObjectPart,
  EditorObjectHierarchy,
} from "@/types/homecheff-visual-editor";

export const FACE_EXPRESSION_PART_TYPES = ["face", "head"] as const;

export function partSupportsExpression(part: EditorObjectPart): boolean {
  return part.partCategory === "face" || part.partCategory === "head";
}

export function setPartExpression(
  part: EditorObjectPart,
  expression: EditorCharacterExpression
): EditorObjectPart {
  if (!partSupportsExpression(part)) return part;
  return { ...part, expression };
}

export function setExpressionInHierarchy(
  hierarchy: EditorObjectHierarchy,
  partId: string,
  expression: EditorCharacterExpression
): EditorObjectHierarchy {
  return {
    ...hierarchy,
    parts: hierarchy.parts.map((p) =>
      p.id === partId ? setPartExpression(p, expression) : p
    ),
  };
}

export function collectExpressions(
  hierarchies: Record<string, EditorObjectHierarchy>
): Record<string, EditorCharacterExpression> {
  const expressions: Record<string, EditorCharacterExpression> = {};
  for (const hierarchy of Object.values(hierarchies)) {
    for (const part of hierarchy.parts) {
      if (part.expression) {
        expressions[part.id] = part.expression;
      }
    }
  }
  return expressions;
}

export function defaultExpressionForPart(part: EditorObjectPart): EditorCharacterExpression {
  return part.expression ?? "neutral";
}

/** Future-ready: maps expression to prompt hint for generative replace (not executed in V4). */
export function expressionPromptHint(expression: EditorCharacterExpression): string {
  switch (expression) {
    case "happy":
      return "warm smile, cheerful expression";
    case "focused":
      return "attentive, focused gaze";
    case "surprised":
      return "raised brows, surprised look";
    case "confident":
      return "confident, assured expression";
    default:
      return "neutral, relaxed expression";
  }
}
