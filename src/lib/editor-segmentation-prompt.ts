/** Maps Editor layer hints to Replicate SAM3 text prompts. */

export type EditorClickSegmentPrompt =
  | "globe"
  | "logo"
  | "tie"
  | "head"
  | "person"
  | "background"
  | "text"
  | "product";

const PROMPT_ALIASES: Record<string, EditorClickSegmentPrompt> = {
  globe: "globe",
  world: "globe",
  earth: "globe",
  logo: "logo",
  brand: "logo",
  emblem: "logo",
  tie: "tie",
  necktie: "tie",
  head: "head",
  face: "head",
  person: "person",
  people: "person",
  human: "person",
  character: "person",
  mascot: "person",
  man: "person",
  woman: "person",
  background: "background",
  sky: "background",
  text: "text",
  headline: "text",
  title: "text",
  product: "product",
  prop: "product",
  object: "product",
};

export function normalizeEditorSegmentPrompt(raw: string | undefined | null): string {
  const trimmed = raw?.trim().toLowerCase() ?? "";
  if (!trimmed) {
    return "person";
  }
  for (const [key, prompt] of Object.entries(PROMPT_ALIASES)) {
    if (trimmed === key || trimmed.includes(key)) {
      return prompt;
    }
  }
  return trimmed.slice(0, 48);
}

export function resolveEditorSegmentPrompt(input: {
  category?: string | null;
  semanticType?: string | null;
  label?: string | null;
  objectHint?: string | null;
  explicitPrompt?: string | null;
}): string {
  if (input.explicitPrompt?.trim()) {
    return normalizeEditorSegmentPrompt(input.explicitPrompt);
  }

  const category = input.category?.trim().toLowerCase() ?? "";
  const semantic = input.semanticType?.trim().toLowerCase() ?? "";
  const label = input.label?.trim().toLowerCase() ?? "";
  const hint = input.objectHint?.trim().toLowerCase() ?? "";

  for (const token of [category, semantic, hint, label]) {
    if (!token) {
      continue;
    }
    const mapped = PROMPT_ALIASES[token];
    if (mapped) {
      return mapped;
    }
    for (const [key, prompt] of Object.entries(PROMPT_ALIASES)) {
      if (token.includes(key)) {
        return prompt;
      }
    }
  }

  if (label) {
    return normalizeEditorSegmentPrompt(label);
  }
  return "person";
}
