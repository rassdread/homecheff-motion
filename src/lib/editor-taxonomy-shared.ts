/**
 * Shared helpers for vision taxonomy fallback parts (mascot, human, animal).
 */

import type { IllustrationPartAnalysisResult, IllustrationPartSpec } from "@/types/editor-illustration-parts";
import type { EditorCanvasBounds } from "@/types/homecheff-visual-editor";

export const ZERO_TAXONOMY_BBOX: EditorCanvasBounds = { x: 0, y: 0, width: 0, height: 0 };

/** Labels that must never appear in taxonomy output (sensitive / non-visual inference). */
export const BLOCKED_SENSITIVE_TAXONOMY_LABELS =
  /\b(ethnicity|race|religion|attractiveness|skin\s*tone|nationality|disability|health\s*condition|age\s*group|gender\s*identity)\b/i;

export function taxonomySpec(
  input: Omit<IllustrationPartSpec, "bbox" | "source" | "confidence" | "editable"> & {
    bbox?: EditorCanvasBounds;
    confidence?: number;
    editable?: boolean;
    taxonomyTab?: string;
  }
): IllustrationPartSpec | null {
  if (BLOCKED_SENSITIVE_TAXONOMY_LABELS.test(input.label)) {
    return null;
  }
  return {
    bbox: input.bbox ?? ZERO_TAXONOMY_BBOX,
    source: "taxonomy_fallback",
    confidence: input.confidence ?? 0.52,
    editable: input.editable ?? true,
    key: input.key,
    label: input.label,
    category: input.category,
    parentKey: input.parentKey,
    group: input.group,
    taxonomyTab: input.taxonomyTab,
  };
}

export function normalizePartKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export function labelDedupeKey(label: string): string {
  return label.toLowerCase().trim().replace(/\s+/g, " ");
}

export function mergeTaxonomyFallbackParts(
  analysis: IllustrationPartAnalysisResult,
  fallback: IllustrationPartSpec[]
): IllustrationPartAnalysisResult {
  const byKey = new Map<string, IllustrationPartSpec>();
  const byLabel = new Map<string, IllustrationPartSpec>();

  for (const part of analysis.parts) {
    byKey.set(normalizePartKey(part.key), part);
    byLabel.set(labelDedupeKey(part.label), part);
  }

  for (const part of fallback) {
    const key = normalizePartKey(part.key);
    const labelKey = labelDedupeKey(part.label);
    const existing = byKey.get(key) ?? byLabel.get(labelKey);
    if (existing) {
      byKey.set(key, {
        ...existing,
        label: existing.label || part.label,
        confidence: Math.max(existing.confidence, part.confidence),
        editable: existing.editable || part.editable,
        taxonomyTab: existing.taxonomyTab ?? part.taxonomyTab,
      });
      continue;
    }
    byKey.set(key, part);
    byLabel.set(labelKey, part);
  }

  return {
    ...analysis,
    parts: [...byKey.values()],
    templateUsed: true,
  };
}

export function publicEditablePartLabels(analysis: IllustrationPartAnalysisResult): string[] {
  return analysis.parts.filter((p) => p.editable).map((p) => p.label);
}
