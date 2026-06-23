import {
  fusionArchetypeDefinitionForIntent,
  seedArchetypeOutputSettings,
} from "@/lib/editor-fusion-archetype-definitions";
import { BRAND_PROTECTION_PROMPT_RULES } from "@/lib/brand-asset-protection-layer";
import type {
  FusionArchetype,
  FusionArchetypeAnalysis,
  FusionArchetypeInputContext,
  FusionArchetypeQuestion,
  FusionArchetypeSaveMetadata,
  FusionArchetypeValidationResult,
  FusionOutfitItem,
} from "@/lib/editor-fusion-archetype-types";
import { fusionIntentDefinition } from "@/lib/editor-image-fusion-catalog";
import type { EditorFusionGenerationSettings, EditorFusionIntent } from "@/types/editor-instruction-studio";

export function analyzeFusionInputs(ctx: FusionArchetypeInputContext): FusionArchetypeAnalysis {
  const archetype = fusionArchetypeDefinitionForIntent(ctx.intent);
  const required = archetype.requiredInputRoles;
  const filledRoles = ctx.slots
    .filter((slot) => slot.instances.length > 0)
    .map((slot) => slot.role);
  const missing = required.filter((role) => !filledRoles.includes(role));
  const semanticObjects: Record<string, string> = {};

  for (const slot of ctx.slots) {
    for (const instance of slot.instances) {
      const key = `${slot.roleId || slot.role}_${instance.instanceId}`;
      semanticObjects[key] = instance.document.name;
      if (instance.analysis.faceDetected) {
        semanticObjects[`${key}_face`] = "detected";
      }
      if (instance.analysis.clothingDetected) {
        semanticObjects[`${key}_clothing`] = "detected";
      }
    }
  }

  const warnings: string[] = [];
  if (missing.length > 0) {
    warnings.push(`missing_roles:${missing.join(",")}`);
  }
  if (archetype.minCharacterCount) {
    const characterCount = ctx.slots.reduce(
      (sum, slot) => sum + (slot.role === "character" || slot.role === "animal" ? slot.instances.length : 0),
      0
    );
    if (characterCount < archetype.minCharacterCount) {
      warnings.push(`min_characters:${archetype.minCharacterCount}`);
    }
  }

  return {
    ready: missing.length === 0 && warnings.every((w) => !w.startsWith("min_characters")),
    detectedObjects: filledRoles,
    semanticObjects,
    warnings,
  };
}

export function extractFusionSemanticObjects(ctx: FusionArchetypeInputContext): Record<string, string> {
  return analyzeFusionInputs(ctx).semanticObjects;
}

export function resolveFusionDynamicQuestions(
  intent: EditorFusionIntent,
  ctx?: FusionArchetypeInputContext
): FusionArchetypeQuestion[] {
  const archetype = fusionArchetypeDefinitionForIntent(intent);
  const base = [...archetype.questions];

  if (archetype.supportsOutfitItems) {
    base.push({
      id: "outfit_item_types",
      labelKey: "editor.fusion.question.outfitItemTypes",
      outputKey: "outfitItemTypes",
      type: "multi_choice",
      choices: ["jacket", "shirt", "pants", "shoes", "dress", "accessory", "full_outfit", "custom"],
    });
  }

  if (ctx && archetype.id === "future_child") {
    const parentCount = ctx.slots
      .filter((s) => s.role === "person")
      .reduce((sum, s) => sum + s.instances.length, 0);
    if (parentCount < 2) {
      base.unshift({
        id: "add_second_parent",
        labelKey: "editor.fusion.question.addSecondParent",
        outputKey: "needsSecondParent",
        type: "boolean",
      });
    }
  }

  return base;
}

export function buildFusionOutputSettings(
  intent: EditorFusionIntent,
  answers: Record<string, string | boolean | string[] | number[]>
): EditorFusionGenerationSettings {
  const archetype = fusionArchetypeDefinitionForIntent(intent);
  const settings: EditorFusionGenerationSettings = {
    ...seedArchetypeOutputSettings(intent),
  };

  for (const question of archetype.questions) {
    const value = answers[question.id];
    if (value === undefined) {
      continue;
    }
    if (question.type === "multi_choice" && Array.isArray(value)) {
      if (question.outputKey === "selectedAges") {
        settings.selectedAges = value.map((v) => Number(v));
      } else {
        settings[question.outputKey] = value;
      }
      continue;
    }
    if (question.type === "choice" && typeof value === "string" && question.outputKey === "styleStrength") {
      settings[question.outputKey] = Number(value);
      continue;
    }
    settings[question.outputKey] = value as never;
  }

  if (answers.outfit_items && Array.isArray(answers.outfit_items)) {
    (settings as Record<string, unknown>).outfitItems = answers.outfit_items;
  }

  return settings;
}

export function buildFusionArchetypePromptLines(
  intent: EditorFusionIntent,
  settings: EditorFusionGenerationSettings
): string[] {
  const archetype = fusionArchetypeDefinitionForIntent(intent);
  const def = fusionIntentDefinition(intent);
  const lines: string[] = [`FUSION ARCHETYPE: ${archetype.id}`, `INTENT: ${intent}`, `CATEGORY: ${def.category}`];

  for (const field of archetype.outputFields) {
    const value = settings[field.key] ?? field.defaultValue;
    if (field.type === "boolean") {
      if (value === true) {
        lines.push(`- ${field.key}: enabled`);
      }
      continue;
    }
    if (field.type === "multi_choice" && Array.isArray(value)) {
      lines.push(`- ${field.key}: ${value.join(", ")}`);
      continue;
    }
    lines.push(`- ${field.key}: ${String(value)}`);
  }

  const outfitItems = (settings as Record<string, unknown>).outfitItems;
  if (Array.isArray(outfitItems) && outfitItems.length > 0) {
    lines.push("- outfit items:");
    for (const item of outfitItems as FusionOutfitItem[]) {
      lines.push(`  - ${item.type}: ${item.description}`);
    }
  }

  return lines;
}

export function buildFusionArchetypeNegativePrompt(
  intent: EditorFusionIntent,
  settings: EditorFusionGenerationSettings
): string {
  const archetype = fusionArchetypeDefinitionForIntent(intent);
  const lines = [...archetype.negativePromptLines];

  if (settings.preserveLogoExact === true) {
    lines.push("Do not redraw or stylize logos or brand marks.");
    lines.push(...BRAND_PROTECTION_PROMPT_RULES.slice(0, 4));
  }
  if (settings.preserveIdentity === true || settings.preserveCharacterIdentity === true || settings.preserveHumanIdentity === true) {
    lines.push("Do not alter facial identity.");
  }
  if (settings.protectFace === true || settings.preserveFace === true) {
    lines.push("Do not modify face, expression, or hairstyle.");
  }
  if (settings.protectPose === true || settings.preservePose === true) {
    lines.push("Do not change body pose.");
  }
  if (settings.protectBackground === true) {
    lines.push("Do not change background.");
  }
  if (settings.protectSkin === true) {
    lines.push("Do not modify skin tone or texture.");
  }
  if (settings.protectHair === true) {
    lines.push("Do not modify hairstyle.");
  }
  if (settings.preserveMascotStyle === true) {
    lines.push("Do not convert mascot to photorealistic human.");
  }
  if (settings.clothingOnly === true) {
    lines.push("Change clothing only — protect face, skin, hair, pose, and background.");
  }

  return lines.join(" ");
}

export function validateFusionOutput(
  intent: EditorFusionIntent,
  settings: EditorFusionGenerationSettings,
  ctx?: FusionArchetypeInputContext
): FusionArchetypeValidationResult {
  const archetype = fusionArchetypeDefinitionForIntent(intent);
  const issues: string[] = [];

  for (const rule of archetype.validationRules) {
    if (rule.check === "boolean_true" && rule.settingKey) {
      if (settings[rule.settingKey] !== true) {
        issues.push(rule.id);
      }
    }
    if (rule.check === "array_min_length" && rule.settingKey) {
      const value = settings[rule.settingKey];
      if (!Array.isArray(value) || value.length === 0) {
        issues.push(rule.id);
      }
    }
    if (rule.check === "both_parents_present" && ctx) {
      const parents = ctx.slots
        .filter((s) => s.role === "person")
        .reduce((sum, s) => sum + s.instances.length, 0);
      if (parents < 2) {
        issues.push(rule.id);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

export function buildFusionSaveMetadata(input: {
  intent: EditorFusionIntent;
  slots: FusionArchetypeInputContext["slots"];
  questionAnswers: Record<string, string | boolean | string[] | number[]>;
  outputSettings: EditorFusionGenerationSettings;
}): FusionArchetypeSaveMetadata {
  const archetype = fusionArchetypeDefinitionForIntent(input.intent);
  const sourceAssets = input.slots.flatMap((slot) =>
    slot.instances.map((instance) => ({
      role: slot.role,
      roleId: slot.roleId,
      url: instance.document.backgroundUrl,
      name: instance.document.name,
    }))
  );

  return {
    fusionIntent: input.intent,
    fusionArchetype: archetype.id,
    sourceAssets,
    questionAnswers: input.questionAnswers as FusionArchetypeSaveMetadata["questionAnswers"],
    outputSettings: input.outputSettings,
    generationProfile: archetype.id,
    validatedAt: new Date().toISOString(),
  };
}

export function runFusionArchetypeEngine(input: {
  intent: EditorFusionIntent;
  slots: FusionArchetypeInputContext["slots"];
  questionAnswers?: Record<string, string | boolean | string[] | number[]>;
}): {
  archetype: FusionArchetype;
  analysis: FusionArchetypeAnalysis;
  questions: FusionArchetypeQuestion[];
  outputSettings: EditorFusionGenerationSettings;
  validation: FusionArchetypeValidationResult;
  saveMetadata: FusionArchetypeSaveMetadata;
} {
  const ctx: FusionArchetypeInputContext = { intent: input.intent, slots: input.slots };
  const archetype = fusionArchetypeDefinitionForIntent(input.intent);
  const analysis = analyzeFusionInputs(ctx);
  const questions = resolveFusionDynamicQuestions(input.intent, ctx);
  const answers = { ...seedDefaultAnswers(questions), ...input.questionAnswers };
  const outputSettings = buildFusionOutputSettings(input.intent, answers);
  const validation = validateFusionOutput(input.intent, outputSettings, ctx);
  const saveMetadata = buildFusionSaveMetadata({
    intent: input.intent,
    slots: input.slots,
    questionAnswers: answers,
    outputSettings,
  });

  return { archetype, analysis, questions, outputSettings, validation, saveMetadata };
}

function seedDefaultAnswers(questions: FusionArchetypeQuestion[]): Record<string, string | boolean | string[]> {
  const answers: Record<string, string | boolean | string[]> = {};
  for (const question of questions) {
    if (question.type === "boolean") {
      answers[question.id] = true;
    } else if (question.type === "multi_choice" && question.choices?.length) {
      answers[question.id] = question.outputKey === "selectedAges" ? ["20", "30", "40", "50"] : [question.choices[0]!];
    } else if (question.type === "choice" && question.choices?.length) {
      answers[question.id] = question.choices[0]!;
    }
  }
  return answers;
}
