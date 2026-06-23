/**
 * Sprint CC9 — workflow-specific character consistency rules (no new AI).
 */

import type { FusionBlueprint } from "@/types/editor-fusion-intelligence";
import type { ReferenceAnalysisProfile } from "@/types/editor-fusion-intelligence";
import type {
  CharacterConsistencyRule,
  CharacterConsistencyRuleSet,
} from "@/types/character-consistency-audit";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

const RULE_SETS: Partial<Record<EditorFusionIntent, CharacterConsistencyRule[]>> = {
  character_fusion: [
    { attribute: "eye_color", action: "preserve", source: "reference_a" },
    { attribute: "glasses", action: "preserve", source: "reference_a" },
    { attribute: "beard", action: "preserve", source: "reference_a" },
    { attribute: "hair_color", action: "blend", source: "blend" },
  ],
  future_child: [
    { attribute: "eye_color", action: "inherit", source: "blend" },
    { attribute: "hair_color", action: "inherit", source: "blend" },
    { attribute: "face_shape", action: "blend", source: "blend" },
  ],
  genetic_blend: [
    { attribute: "eye_color", action: "inherit", source: "blend" },
    { attribute: "hair_color", action: "inherit", source: "blend" },
  ],
  human_into_mascot: [
    { attribute: "hair_color", action: "preserve", source: "reference_a" },
    { attribute: "glasses", action: "preserve", source: "reference_a" },
    { attribute: "accessories", action: "preserve", source: "reference_a" },
    { attribute: "mascot_palette", action: "preserve", source: "reference_a" },
  ],
  mascot_into_human: [
    { attribute: "mascot_palette", action: "preserve", source: "reference_a" },
    { attribute: "mascot_emblem", action: "preserve", source: "reference_a" },
    { attribute: "accessories", action: "preserve", source: "reference_a" },
  ],
  character_upgrade: [
    { attribute: "mascot_emblem", action: "preserve", source: "reference_a" },
    { attribute: "accessories", action: "preserve", source: "reference_a" },
    { attribute: "mascot_palette", action: "preserve", source: "reference_a" },
  ],
  outfit_from_reference: [
    { attribute: "clothing", action: "preserve", source: "reference_b" },
    { attribute: "eye_color", action: "preserve", source: "reference_a" },
    { attribute: "hair_color", action: "preserve", source: "reference_a" },
    { attribute: "face_shape", action: "preserve", source: "reference_a" },
  ],
};

const ATTRIBUTE_LABELS: Record<CharacterConsistencyRule["attribute"], string> = {
  eyes: "eyes",
  eye_color: "eye color",
  glasses: "glasses",
  beard: "beard",
  mustache: "mustache",
  face_shape: "face shape",
  hair_color: "hair color",
  hair_style: "hair style",
  hair_length: "hair length",
  clothing: "clothing",
  accessories: "accessories",
  style_dna: "visual style",
  mascot_head: "mascot head shape",
  mascot_body: "mascot body shape",
  mascot_emblem: "emblem",
  mascot_palette: "mascot color palette",
};

export function getCharacterConsistencyRuleSet(
  workflow: EditorFusionIntent
): CharacterConsistencyRuleSet {
  return {
    workflow,
    rules: RULE_SETS[workflow] ?? [],
  };
}

function ruleToInstruction(rule: CharacterConsistencyRule): string {
  const label = ATTRIBUTE_LABELS[rule.attribute];
  if (rule.action === "preserve") {
    return `PRESERVE ${label} from analyzed reference (${rule.source ?? "primary"}).`;
  }
  if (rule.action === "inherit") {
    return `INHERIT ${label} from parental references — use analyzed colors/traits, not generic blending.`;
  }
  return `BLEND ${label} harmoniously using analyzed trait data from both references.`;
}

export function buildCharacterConsistencyRenderInstructions(input: {
  workflow: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  blueprint: FusionBlueprint;
}): string[] {
  const ruleSet = getCharacterConsistencyRuleSet(input.workflow);
  if (ruleSet.rules.length === 0) {
    return [];
  }

  const lines = [
    "CHARACTER CONSISTENCY RULES",
    ...ruleSet.rules.map((rule) => `- ${ruleToInstruction(rule)}`),
  ];

  for (const profile of input.profiles) {
    const label = profile.name ?? profile.role ?? profile.referenceId;
    const person = profile.personConsistency;
    if (!person) continue;
    const traits: string[] = [];
    if (person.eyeColor) traits.push(`eye color ${person.eyeColor}`);
    if (person.hairColor) traits.push(`hair color ${person.hairColor}`);
    if (person.glasses) traits.push("glasses");
    if (person.beard) traits.push("beard");
    if (traits.length) {
      lines.push(`Analyzed ${label}: ${traits.join(", ")}`);
    }
  }

  return lines;
}

export function applyConsistencyRulesToBlueprintPreservation(
  blueprint: FusionBlueprint,
  workflow: EditorFusionIntent
): FusionBlueprint {
  const ruleSet = getCharacterConsistencyRuleSet(workflow);
  if (ruleSet.rules.length === 0) {
    return blueprint;
  }

  const preserveLabels = ruleSet.rules
    .filter((r) => r.action === "preserve")
    .map((r) => ATTRIBUTE_LABELS[r.attribute]);

  const mergedRules = [...new Set([...blueprint.preservationRules, ...preserveLabels])];

  return {
    ...blueprint,
    preservationRules: mergedRules,
  };
}
