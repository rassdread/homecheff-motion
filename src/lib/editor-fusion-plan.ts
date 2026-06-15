import {
  ensureCompositionPlan,
  getCompositionPlan,
  patchCompositionPlan,
  resolveCompositionBaseImageUrl,
} from "@/lib/editor-composition-plan";
import { seedCategoryOutputSettings } from "@/lib/editor-fusion-archetypes";
import {
  defaultInheritedTraits,
  fusionIntentDefinition,
  FUTURE_IDENTITY_DISCLAIMER,
  normalizeFusionIntent,
} from "@/lib/editor-image-fusion-catalog";
import type {
  EditorFusionInheritedTrait,
  EditorFusionIntent,
  EditorFusionPlan,
  EditorFusionPreservationRule,
  EditorFusionPreservationSettings,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export function createFusionPlanId(): string {
  return `fusion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultPreservationSettings(
  intent: EditorFusionIntent
): EditorFusionPreservationSettings {
  const def = fusionIntentDefinition(intent);
  const toggles: Partial<Record<EditorFusionPreservationRule, boolean>> = {};
  for (const rule of def.defaultPreservation) {
    toggles[rule] = true;
  }
  return {
    rules: [...def.defaultPreservation],
    strength: def.isSimulation ? "high" : "strict",
    toggles,
  };
}

export function buildInheritedTraits(intent: EditorFusionIntent): EditorFusionInheritedTrait[] {
  return defaultInheritedTraits(intent).map((trait) => ({
    ...trait,
    enabled: true,
  }));
}

export function createInitialFusionPlan(
  document: EditorCanvasDocument,
  intent: EditorFusionIntent
): EditorFusionPlan {
  const normalized = normalizeFusionIntent(intent);
  const def = fusionIntentDefinition(normalized);
  const base = resolveCompositionBaseImageUrl(document);
  const now = new Date().toISOString();
  return {
    id: createFusionPlanId(),
    intent: normalized,
    category: def.category,
    fusionStrength: def.defaultFusionStrength,
    preservation: defaultPreservationSettings(normalized),
    inheritedTraits: buildInheritedTraits(normalized),
    styleRules: [],
    brandRules: [],
    userInstructions: "",
    simulationDisclaimer: def.isSimulation ? FUTURE_IDENTITY_DISCLAIMER : undefined,
    generationSettings: seedCategoryOutputSettings(normalized),
    baseImageUrl: base.url,
    baseVariantId: base.variantId,
    references: [],
    items: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getFusionPlan(document: EditorCanvasDocument): EditorFusionPlan | undefined {
  return document.instructionStudioState?.fusionPlan;
}

export function patchFusionPlan(
  document: EditorCanvasDocument,
  plan: EditorFusionPlan
): EditorCanvasDocument {
  const compositionSynced = patchCompositionPlan(document, {
    id: plan.id,
    baseImageUrl: plan.baseImageUrl,
    baseVariantId: plan.baseVariantId,
    items: plan.items,
    references: plan.references,
    userNotes: plan.userInstructions,
    createdAt: plan.createdAt,
    updatedAt: new Date().toISOString(),
  });
  return {
    ...compositionSynced,
    instructionStudioState: {
      ...compositionSynced.instructionStudioState,
      fusionPlan: { ...plan, updatedAt: new Date().toISOString() },
      combineIntent: plan.intent,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function ensureFusionPlan(
  document: EditorCanvasDocument,
  intent?: EditorFusionIntent
): EditorCanvasDocument {
  const existing = getFusionPlan(document);
  if (existing) {
    return document;
  }
  const resolvedIntent =
    intent ?? document.instructionStudioState?.combineIntent ?? "custom_composition";
  const withComposition = ensureCompositionPlan(document);
  const plan = createInitialFusionPlan(withComposition, resolvedIntent);
  return patchFusionPlan(withComposition, plan);
}

export function activePreservationRules(plan: EditorFusionPlan): EditorFusionPreservationRule[] {
  return plan.preservation.rules.filter((rule) => plan.preservation.toggles[rule] !== false);
}

export function toggleFusionPreservation(
  document: EditorCanvasDocument,
  rule: EditorFusionPreservationRule,
  enabled: boolean
): EditorCanvasDocument {
  const plan = getFusionPlan(document);
  if (!plan) {
    return document;
  }
  const toggles = { ...plan.preservation.toggles, [rule]: enabled };
  const rules = enabled
    ? [...new Set([...plan.preservation.rules, rule])]
    : plan.preservation.rules;
  return patchFusionPlan(document, {
    ...plan,
    preservation: { ...plan.preservation, toggles, rules },
  });
}

export function setFusionStrength(document: EditorCanvasDocument, strength: number): EditorCanvasDocument {
  const plan = getFusionPlan(document);
  if (!plan) {
    return document;
  }
  return patchFusionPlan(document, {
    ...plan,
    fusionStrength: Math.max(0, Math.min(100, strength)),
  });
}

export function setFusionPreservationStrength(
  document: EditorCanvasDocument,
  strength: EditorFusionPreservationSettings["strength"]
): EditorCanvasDocument {
  const plan = getFusionPlan(document);
  if (!plan) {
    return document;
  }
  return patchFusionPlan(document, {
    ...plan,
    preservation: { ...plan.preservation, strength },
  });
}

export function toggleInheritedTrait(
  document: EditorCanvasDocument,
  traitId: string,
  enabled: boolean
): EditorCanvasDocument {
  const plan = getFusionPlan(document);
  if (!plan) {
    return document;
  }
  return patchFusionPlan(document, {
    ...plan,
    inheritedTraits: plan.inheritedTraits.map((t) =>
      t.id === traitId ? { ...t, enabled } : t
    ),
  });
}

export function fusionPlanSummaryLines(plan: EditorFusionPlan): string[] {
  const preserve = activePreservationRules(plan);
  const traits = plan.inheritedTraits.filter((t) => t.enabled).map((t) => t.label);
  const lines = [
    `Intent: ${plan.intent}`,
    `Fusion strength: ${plan.fusionStrength}%`,
    `Preservation strength: ${plan.preservation.strength}`,
  ];
  if (preserve.length > 0) {
    lines.push(`Preserve: ${preserve.join(", ")}`);
  }
  if (traits.length > 0) {
    lines.push(`Inherited traits: ${traits.join(", ")}`);
  }
  if (plan.items.length > 0) {
    lines.push(`${plan.items.length} fusion operations`);
  }
  if (plan.simulationDisclaimer) {
    lines.push(plan.simulationDisclaimer);
  }
  return lines;
}

export function syncFusionPlanFromComposition(document: EditorCanvasDocument): EditorCanvasDocument {
  const composition = getCompositionPlan(document);
  const fusion = getFusionPlan(document);
  if (!composition || !fusion) {
    return document;
  }
  return patchFusionPlan(document, {
    ...fusion,
    items: composition.items,
    references: composition.references,
    baseImageUrl: composition.baseImageUrl,
    baseVariantId: composition.baseVariantId,
  });
}
