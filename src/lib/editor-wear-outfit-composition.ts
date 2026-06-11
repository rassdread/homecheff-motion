import {
  addCompositionReference,
  analyzeCompositionReference,
  appendCompositionPlanItem,
  buildCompositionPlanItem,
  ensureCompositionPlan,
  patchCompositionPlan,
} from "@/lib/editor-composition-plan";
import { ensureFusionPlan, patchFusionPlan } from "@/lib/editor-fusion-plan";
import type {
  EditorCompositionPlan,
  EditorCompositionReference,
  EditorFusionPreservationRule,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const WEAR_OUTFIT_CLOTHING_CANONICAL = [
  "Jacket",
  "Shirt",
  "Tie",
  "Pants",
  "Shoes",
  "Accessories",
] as const;

export const WEAR_OUTFIT_PRESERVE_RULES = [
  "face",
  "identity",
  "hair",
  "expression",
  "body_proportions",
  "pose",
] as const;

const CLOTHING_KEYWORDS = [
  "jacket",
  "shirt",
  "tie",
  "pants",
  "trousers",
  "shoes",
  "boots",
  "accessory",
  "accessories",
  "coat",
  "outfit",
  "clothing",
  "dress",
  "skirt",
];

export function isClothingObjectLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return CLOTHING_KEYWORDS.some((kw) => lower.includes(kw));
}

export function detectClothingLabelsFromReference(
  reference: EditorCompositionReference
): string[] {
  const fromAnalysis =
    reference.editableObjectLabels?.filter((label) => isClothingObjectLabel(label)) ?? [];
  const unique = [...new Set(fromAnalysis.map((l) => l.trim()).filter(Boolean))];
  if (unique.length > 0) {
    return unique;
  }
  return [...WEAR_OUTFIT_CLOTHING_CANONICAL];
}

export function buildWearOutfitPlanItems(input: {
  outfitReference: EditorCompositionReference;
  orderOffset?: number;
}): ReturnType<typeof buildCompositionPlanItem>[] {
  const labels = detectClothingLabelsFromReference(input.outfitReference);
  const offset = input.orderOffset ?? 0;
  return labels.map((label, index) =>
    buildCompositionPlanItem({
      targetRole: "character",
      reference: input.outfitReference,
      sourceObjectLabel: label,
      instruction: `Replace ${label.toLowerCase()} with outfit from reference — clothing only`,
      order: offset + index,
    })
  );
}

export function buildWearOutfitCompositionPlanSummary(plan: EditorCompositionPlan): string[] {
  return [
    "Replace clothing only from outfit reference",
    ...WEAR_OUTFIT_PRESERVE_RULES.map((rule) => `Preserve ${rule}`),
    `${plan.items.length} clothing items in plan`,
  ];
}

export function applyWearOutfitComposition(
  document: EditorCanvasDocument,
  outfitImageUrl: string,
  outfitName = "Outfit reference"
): EditorCanvasDocument {
  const outfitAnalyzed = analyzeCompositionReference({
    name: outfitName,
    url: outfitImageUrl,
    type: "style",
  });

  let next = ensureCompositionPlan(document);
  next = addCompositionReference(next, outfitAnalyzed);

  const items = buildWearOutfitPlanItems({ outfitReference: outfitAnalyzed });
  for (const item of items) {
    next = appendCompositionPlanItem(next, item);
  }

  const plan = next.instructionStudioState?.compositionPlan;
  if (!plan) {
    return next;
  }

  const preserveNotes = WEAR_OUTFIT_PRESERVE_RULES.map((r) => `Preserve ${r}`);
  const userNotes = ["Wear outfit from reference", ...preserveNotes].join(". ");
  const fusionInstructions = ["Replace clothing only from outfit reference", ...preserveNotes].join(". ");

  const patched = patchCompositionPlan(next, {
    ...plan,
    userNotes,
  });

  let withFusion = ensureFusionPlan(
    { ...patched, instructionStudioState: { ...patched.instructionStudioState, combineIntent: "outfit_from_reference" } },
    "outfit_from_reference"
  );
  const fusion = withFusion.instructionStudioState?.fusionPlan;
  if (fusion) {
    withFusion = patchFusionPlan(withFusion, {
      ...fusion,
      items: patched.instructionStudioState!.compositionPlan!.items,
      references: patched.instructionStudioState!.compositionPlan!.references,
      userInstructions: fusionInstructions,
      preservation: {
        ...fusion.preservation,
        rules: [...WEAR_OUTFIT_PRESERVE_RULES] as EditorFusionPreservationRule[],
        toggles: Object.fromEntries(
          WEAR_OUTFIT_PRESERVE_RULES.map((r) => [r, true])
        ) as Partial<Record<EditorFusionPreservationRule, boolean>>,
      },
    });
  }

  return withFusion;
}
