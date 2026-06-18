/**
 * Unified vision taxonomy resolution and merge (mascot, human, animal).
 */

import {
  mergeIllustrationPartsWithAnimalTaxonomy,
  resolveAnimalTaxonomyKind,
  type AnimalTaxonomyKind,
} from "@/lib/editor-animal-parts-taxonomy";
import {
  mergeIllustrationPartsWithHumanTaxonomy,
  resolveHumanTaxonomyKind,
  type HumanTaxonomyKind,
} from "@/lib/editor-human-parts-taxonomy";
import {
  mergeIllustrationPartsWithMascotTaxonomy,
  resolveMascotTaxonomyKind,
  type MascotTaxonomyKind,
} from "@/lib/editor-mascot-parts-taxonomy";
import { publicEditablePartLabels } from "@/lib/editor-taxonomy-shared";
import type { IllustrationPartAnalysisResult } from "@/types/editor-illustration-parts";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type VisionTaxonomyType = "mascot" | "human" | "animal";

export type VisionTaxonomyResolved =
  | { type: "mascot"; kind: MascotTaxonomyKind }
  | { type: "human"; kind: HumanTaxonomyKind }
  | { type: "animal"; kind: AnimalTaxonomyKind };

export type VisionTaxonomyContext = {
  vision: AssetVisionAnalysis;
  documentName?: string;
  semanticLayerLabels?: string[];
  sourceKind?: EditorCanvasDocument["sourceKind"];
};

export function resolveVisionTaxonomy(input: VisionTaxonomyContext): VisionTaxonomyResolved | null {
  const human = resolveHumanTaxonomyKind(input);
  const animal = resolveAnimalTaxonomyKind(input);
  const mascot = resolveMascotTaxonomyKind(input);

  if (input.vision.objectType === "animal" && animal) {
    return { type: "animal", kind: animal };
  }
  if (input.vision.objectType === "human" && human) {
    return { type: "human", kind: human };
  }

  if (mascot && mascot !== "generic_character") {
    return { type: "mascot", kind: mascot };
  }
  if (input.vision.objectType === "mascot" || input.vision.objectType === "character") {
    if (mascot) {
      return { type: "mascot", kind: mascot };
    }
  }

  if (human) {
    return { type: "human", kind: human };
  }
  if (animal) {
    return { type: "animal", kind: animal };
  }
  if (mascot) {
    return { type: "mascot", kind: mascot };
  }

  return null;
}

export function mergeIllustrationPartsWithVisionTaxonomy(
  analysis: IllustrationPartAnalysisResult,
  input: VisionTaxonomyContext
): { analysis: IllustrationPartAnalysisResult; taxonomy: VisionTaxonomyResolved | null } {
  const taxonomy = resolveVisionTaxonomy(input);
  if (!taxonomy) {
    return { analysis, taxonomy: null };
  }

  let merged = analysis;
  switch (taxonomy.type) {
    case "human":
      merged = mergeIllustrationPartsWithHumanTaxonomy(merged, taxonomy.kind, input.vision);
      break;
    case "animal":
      merged = mergeIllustrationPartsWithAnimalTaxonomy(merged, taxonomy.kind, input.vision);
      break;
    case "mascot":
      merged = mergeIllustrationPartsWithMascotTaxonomy(merged, taxonomy.kind, input.vision);
      break;
  }

  return { analysis: merged, taxonomy };
}

export type VisionTaxonomyAuditScenario = {
  id: string;
  label: string;
  vision: AssetVisionAnalysis;
  documentName?: string;
};

export type VisionTaxonomyAuditResult = {
  scenarioId: string;
  taxonomyType: VisionTaxonomyType | "none";
  taxonomyKind: string | null;
  editablePartCount: number;
  sampleParts: string[];
  fallsBackToGeneric: boolean;
};

export function auditVisionTaxonomyScenario(
  scenario: VisionTaxonomyAuditScenario
): VisionTaxonomyAuditResult {
  const taxonomy = resolveVisionTaxonomy({
    vision: scenario.vision,
    documentName: scenario.documentName,
  });

  const shallow: IllustrationPartAnalysisResult = {
    parts: [
      {
        key: "main",
        label: scenario.vision.objectTypeLabel || "Main subject",
        category: "prop",
        group: "character",
        bbox: { x: 0.2, y: 0.1, width: 0.6, height: 0.8 },
        source: "estimated",
        confidence: 0.5,
        editable: true,
      },
    ],
    characterLabel: scenario.vision.objectTypeLabel || "Subject",
    openAiUsed: false,
    templateUsed: false,
  };

  const { analysis } = mergeIllustrationPartsWithVisionTaxonomy(shallow, {
    vision: scenario.vision,
    documentName: scenario.documentName,
  });

  const labels = publicEditablePartLabels(analysis);
  const genericOnly =
    labels.length <= 2 &&
    labels.every((l) => /main subject|object|image|product/i.test(l));

  return {
    scenarioId: scenario.id,
    taxonomyType: taxonomy?.type ?? "none",
    taxonomyKind: taxonomy ? String(taxonomy.kind) : null,
    editablePartCount: labels.length,
    sampleParts: labels.slice(0, 12),
    fallsBackToGeneric: !taxonomy || genericOnly,
  };
}

export { publicEditablePartLabels };
