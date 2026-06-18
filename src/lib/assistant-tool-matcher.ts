/**
 * Assistant V4 tool matching engine.
 */

import { detectEditorMorphActionFromMessage } from "@/lib/editor-morph-actions";
import { enrichToolMatchWithIdentity } from "@/lib/assistant-identity-preservation";
import {
  getAssistantToolCapability,
  listAssistantToolsForAsset,
} from "@/lib/assistant-tool-capability-registry";
import { buildAssistantToolRoute, mergeToolSettings } from "@/lib/assistant-v4-route-builder";
import { resolveRegistryActionCreditCost } from "@/lib/studio-billing-sync";
import type { AssistantV3TurnInput } from "@/lib/assistant-v3-intelligence";
import {
  resolveAssistantV3AssetContext,
  resolveAssistantV3PartContext,
} from "@/lib/assistant-v3-intelligence";
import type {
  AssistantToolCapability,
  AssistantToolMatchResult,
  AssistantToolMatchSettings,
} from "@/types/assistant-v4";
import type { StudioPricingCatalogPublicEntry } from "@/types/studio-pricing-catalog";

export type AssistantToolMatcherInput = {
  message: string;
  locale: "nl" | "en";
  turnInput: AssistantV3TurnInput;
  availableCredits?: number;
  pricingCatalog?: StudioPricingCatalogPublicEntry[];
  identityOverrides?: import("@/types/assistant-identity-preservation").IdentityPreservationOverrides;
};

const SENSITIVE_TRAIT_PATTERNS =
  /(etniciteit|ethnicity|huidskleur|skin\s*tone|leeftijd|age|ouder|jonger|older|younger|race|geslacht|gender)/i;

function nl(locale: "nl" | "en", nlText: string, enText: string): string {
  return locale === "en" ? enText : nlText;
}

function estimateCredits(
  tool: AssistantToolCapability,
  pricingCatalog?: StudioPricingCatalogPublicEntry[]
): number {
  if (tool.isFreeLocal) {
    return 0;
  }
  if (tool.estimatedCredits != null) {
    return tool.estimatedCredits;
  }
  const resolved = resolveRegistryActionCreditCost({
    actionType: tool.creditActionType,
    pricingCatalog,
  });
  return resolved?.creditCost ?? 0;
}

function scoreTool(
  tool: AssistantToolCapability,
  input: {
    assetType: string;
    partGroup: string | null;
    actionHint: string | null;
    morphId: string | null;
  }
): number {
  let score = 0;
  if (tool.morphActionId && input.morphId === tool.morphActionId) {
    score += 100;
  }
  if (tool.toolId === input.morphId) {
    score += 100;
  }
  if (tool.supportedAssetTypes.includes(input.assetType as AssistantToolCapability["supportedAssetTypes"][number])) {
    score += 30;
  }
  if (input.partGroup && tool.supportedPartTypes.includes(input.partGroup)) {
    score += 40;
  }
  if (input.partGroup && tool.supportedPartTypes.includes("*")) {
    score += 10;
  }
  if (input.actionHint && tool.supportedActions.some((a) => input.actionHint!.includes(a))) {
    score += 25;
  }
  return score;
}

function inferActionHint(message: string): string | null {
  const text = message.toLowerCase();
  if (/groter|bigger|enlarge/.test(text)) {
    return "enlarge";
  }
  if (/kleiner|smaller|shrink/.test(text)) {
    return "shrink";
  }
  if (/blauw|blue|kleur|color|recolor/.test(text)) {
    return "color";
  }
  if (/vrolijker|blijer|happier|friendlier|glimlach|smile/.test(text)) {
    return "happy";
  }
  if (/cartoon|tekenfilm/.test(text)) {
    return "cartoon";
  }
  if (/mascot|mascotte/.test(text)) {
    return "mascot";
  }
  if (/outfit|kleding|chef|zakelijk|casual|garden|designer/.test(text)) {
    return "outfit";
  }
  if (/voice|stem/.test(text)) {
    return "voice";
  }
  if (/render|video|motion/.test(text)) {
    return "render";
  }
  if (/export|publiceer|publish/.test(text)) {
    return "export";
  }
  return null;
}

function buildPartEditMatch(
  tool: AssistantToolCapability,
  input: AssistantToolMatcherInput,
  assetName: string,
  partName: string,
  partGroup: string
): AssistantToolMatchResult {
  const operation = /groter|bigger|enlarge/i.test(input.message)
    ? "enlarge"
    : /kleiner|smaller/i.test(input.message)
      ? "shrink"
      : /blauw|blue|kleur|color/i.test(input.message)
        ? "color"
        : "adjust";

  const settings: AssistantToolMatchSettings = {
    ...tool.defaultSettings,
    targetPart: partGroup,
    operation,
    mode: "masked",
  };

  if (partGroup === "eyes" || /ogen|eye/i.test(partName)) {
    settings.targetPart = "eyes";
    settings.operation = operation;
  }

  const preserve: string[] = [];
  if (/globe|wereldbol/i.test(assetName) || partGroup !== "globe") {
    settings.preserveGlobe = true;
    preserve.push("globe");
  }
  settings.preserveOutfit = true;
  settings.preservePose = true;
  settings.preserveBackground = true;
  preserve.push("outfit", "pose", "background");

  const merged = mergeToolSettings(tool, settings);
  const route = buildAssistantToolRoute(tool, merged);

  return {
    bestTool: tool,
    alternativeTools: [],
    requiredSettings: { targetPart: String(merged.targetPart), operation: String(merged.operation) },
    recommendedSettings: merged,
    preserveConstraints: preserve,
    estimatedCredits: estimateCredits(tool, input.pricingCatalog),
    warnings: [],
    route,
    morphActionId: tool.morphActionId,
    actionId: tool.actionId,
    blocked: false,
    unavailable: false,
  };
}

function buildMascotExpressionMatch(
  input: AssistantToolMatcherInput,
  assetName: string
): AssistantToolMatchResult | null {
  const tool = getAssistantToolCapability("mascot_expression_morph");
  if (!tool) {
    return null;
  }
  const expression = /vrolijker|blijer|happier|friendlier/i.test(input.message)
    ? "happy"
    : /serieuzer|serious/i.test(input.message)
      ? "serious"
      : "happy";

  const settings = mergeToolSettings(tool, {
    targetPart: "expression",
    expression,
    preserveGlobe: true,
    preserveOutfit: true,
    preservePose: true,
  });

  return {
    bestTool: tool,
    alternativeTools: [],
    requiredSettings: { expression },
    recommendedSettings: settings,
    preserveConstraints: ["globe", "outfit", "pose"],
    estimatedCredits: estimateCredits(tool, input.pricingCatalog),
    warnings: [],
    route: buildAssistantToolRoute(tool, settings),
    morphActionId: "mascot_expression_morph",
    blocked: false,
    unavailable: false,
  };
}

function buildPetMascotMatch(input: AssistantToolMatcherInput): AssistantToolMatchResult | null {
  const tool = getAssistantToolCapability("pet_to_mascot");
  if (!tool) {
    return null;
  }
  const settings = mergeToolSettings(tool, {
    preserveBreedShape: true,
    preserveFurPattern: true,
    preserveEyeColor: true,
    style: "friendly_mascot",
  });
  return {
    bestTool: tool,
    alternativeTools: [getAssistantToolCapability("pet_to_cartoon")!].filter(Boolean),
    requiredSettings: {
      preserveBreedShape: true,
      preserveFurPattern: true,
      preserveEyeColor: true,
    },
    recommendedSettings: settings,
    preserveConstraints: ["breed_shape", "fur_pattern", "eye_color"],
    estimatedCredits: estimateCredits(tool, input.pricingCatalog),
    warnings: [],
    route: buildAssistantToolRoute(tool, settings),
    morphActionId: "pet_to_mascot",
    blocked: false,
    unavailable: false,
  };
}

function buildHumanCartoonMatch(input: AssistantToolMatcherInput): AssistantToolMatchResult | null {
  const tool = getAssistantToolCapability("human_to_cartoon");
  if (!tool) {
    return null;
  }
  const settings = mergeToolSettings(tool, {
    preserveIdentity: true,
    preserveFace: true,
    preserveBackground: true,
  });
  return {
    bestTool: tool,
    alternativeTools: [],
    requiredSettings: { preserveIdentity: true, preserveFace: true },
    recommendedSettings: settings,
    preserveConstraints: ["identity", "face", "background"],
    estimatedCredits: estimateCredits(tool, input.pricingCatalog),
    warnings: [],
    route: buildAssistantToolRoute(tool, settings),
    morphActionId: "human_to_cartoon",
    blocked: false,
    unavailable: false,
  };
}

function buildOutfitMatch(input: AssistantToolMatcherInput, assetName: string): AssistantToolMatchResult | null {
  const tool = getAssistantToolCapability("editor_outfit_change");
  if (!tool) {
    return null;
  }
  const outfitStyle = /chef/i.test(input.message)
    ? "chef"
    : /zakelijk|business/i.test(input.message)
      ? "business"
      : /casual/i.test(input.message)
        ? "casual"
        : /garden/i.test(input.message)
          ? "garden"
          : /designer/i.test(input.message)
            ? "designer"
            : "custom";

  const settings = mergeToolSettings(tool, {
    targetPart: "clothing",
    outfitStyle,
    preserveIdentity: true,
    preserveFace: true,
    preserveBackground: true,
  });

  return {
    bestTool: tool,
    alternativeTools: [],
    requiredSettings: { targetPart: "clothing", outfitStyle },
    recommendedSettings: settings,
    preserveConstraints: ["identity", "face", "background"],
    estimatedCredits: estimateCredits(tool, input.pricingCatalog),
    warnings: [],
    route: buildAssistantToolRoute(tool, settings),
    morphActionId: "outfit_change",
    blocked: false,
    unavailable: false,
  };
}

function buildVoiceMatch(input: AssistantToolMatcherInput, projectId?: string): AssistantToolMatchResult | null {
  const tool = getAssistantToolCapability("audio_voice_generation");
  if (!tool) {
    return null;
  }
  const route = projectId
    ? `${buildAssistantToolRoute(tool, {})}${buildAssistantToolRoute(tool, {}).includes("?") ? "&" : "?"}projectId=${projectId}`
    : tool.route;
  return {
    bestTool: tool,
    alternativeTools: [],
    requiredSettings: { project: projectId ?? "required" },
    recommendedSettings: {},
    preserveConstraints: [],
    estimatedCredits: estimateCredits(tool, input.pricingCatalog),
    warnings: [],
    route,
    actionId: "prepare_music",
    blocked: false,
    unavailable: false,
  };
}

function buildMotionRenderMatch(input: AssistantToolMatcherInput, projectId?: string): AssistantToolMatchResult | null {
  const tool = getAssistantToolCapability("motion_story_render");
  if (!tool) {
    return null;
  }
  const settings = mergeToolSettings(tool, {
    mode: "story",
    preserveCharacters: true,
    subtitles: "recommended",
    ...(projectId ? { projectId } : {}),
  });
  const route = projectId
    ? buildAssistantToolRoute(tool, settings).replace(
        /$/,
        buildAssistantToolRoute(tool, settings).includes("projectId") ? "" : `&projectId=${projectId}`
      )
    : buildAssistantToolRoute(tool, settings);

  return {
    bestTool: tool,
    alternativeTools: [getAssistantToolCapability("motion_image_to_video")!].filter(Boolean),
    requiredSettings: { mode: "story" },
    recommendedSettings: settings,
    preserveConstraints: ["characters"],
    estimatedCredits: estimateCredits(tool, input.pricingCatalog),
    warnings: [],
    route,
    actionId: "create_motion_video",
    blocked: false,
    unavailable: false,
  };
}

export function matchAssistantTool(input: AssistantToolMatcherInput): AssistantToolMatchResult | null {
  const raw = matchAssistantToolImpl(input);
  if (!raw || raw.blocked) {
    return raw;
  }
  const asset = resolveAssistantV3AssetContext(input.turnInput);
  const assetType = asset?.assetType ?? input.turnInput.editorContext?.selectedAssetType ?? "image";
  const assetName = asset?.assetName ?? input.turnInput.editorContext?.selectedAssetName ?? "asset";
  const taxonomyType = input.turnInput.editorContext?.taxonomyType ?? null;
  return enrichToolMatchWithIdentity({
    match: raw,
    assetType,
    assetName,
    taxonomyType,
    message: input.message,
    locale: input.locale,
    overrides: input.identityOverrides,
  });
}

function matchAssistantToolImpl(input: AssistantToolMatcherInput): AssistantToolMatchResult | null {
  const text = input.message.trim().toLowerCase();
  if (!text) {
    return null;
  }

  const asset = resolveAssistantV3AssetContext(input.turnInput);
  const part = resolveAssistantV3PartContext(input.turnInput, asset?.assetName);
  const assetType = asset?.assetType ?? input.turnInput.editorContext?.selectedAssetType ?? "image";
  const partGroup = part?.partGroup ?? input.turnInput.editorContext?.selectedPartGroup ?? null;
  const assetName = asset?.assetName ?? input.turnInput.editorContext?.selectedAssetName ?? "asset";

  if (SENSITIVE_TRAIT_PATTERNS.test(text) && (assetType === "human" || assetType === "mascot")) {
    const blockedTool = getAssistantToolCapability("human_to_cartoon") ?? getAssistantToolCapability("editor_image_edit");
    if (blockedTool) {
      return {
        bestTool: blockedTool,
        alternativeTools: [],
        requiredSettings: {},
        recommendedSettings: {},
        preserveConstraints: [],
        estimatedCredits: 0,
        warnings: [],
        route: blockedTool.route,
        blocked: true,
        blockedReason: nl(
          input.locale,
          "Ik kan geen gevoelige eigenschappen zoals etniciteit, leeftijd of huidskleur aanpassen. Ik kan wel stijl, outfit of expressie wijzigen.",
          "I cannot adjust sensitive traits like ethnicity, age, or skin tone. I can change style, outfit, or expression instead."
        ),
        unavailable: false,
      };
    }
  }

  const morphId = detectEditorMorphActionFromMessage(input.message);
  if (morphId) {
    const tool = getAssistantToolCapability(morphId);
    if (tool) {
      let settings = mergeToolSettings(tool, {});
      if (morphId === "pet_to_mascot") {
        settings = mergeToolSettings(tool, {
          preserveBreedShape: true,
          preserveFurPattern: true,
          preserveEyeColor: true,
          style: "friendly_mascot",
        });
      }
      if (morphId === "human_to_cartoon") {
        settings = mergeToolSettings(tool, {
          preserveIdentity: true,
          preserveFace: true,
          preserveBackground: true,
        });
      }
      if (morphId === "mascot_expression_morph" || /vrolijker|blijer|happier/i.test(text)) {
        return buildMascotExpressionMatch(input, assetName);
      }
      return {
        bestTool: tool,
        alternativeTools: [],
        requiredSettings: tool.defaultSettings,
        recommendedSettings: settings,
        preserveConstraints: tool.preserveOptions,
        estimatedCredits: estimateCredits(tool, input.pricingCatalog),
        warnings: [],
        route: buildAssistantToolRoute(tool, settings),
        morphActionId: tool.morphActionId,
        actionId: tool.actionId,
        blocked: false,
        unavailable: false,
      };
    }
  }

  if (/maak.*(hond|kat|pet|dier).*(mascot|mascotte)/i.test(text) || /pet.*mascot|dog.*mascot/i.test(text)) {
    return buildPetMascotMatch(input);
  }

  if (partGroup === "eyes" && /groter|kleiner|bigger|smaller|blauw|blue|kleur|color/i.test(text)) {
    const tool = getAssistantToolCapability("editor_masked_edit");
    if (tool) {
      return buildPartEditMatch(tool, input, assetName, part?.partName ?? "eyes", "eyes");
    }
  }

  if (partGroup === "outfit" || /outfit|kleding|chef|zakelijk|casual|garden|designer/i.test(text)) {
    if (partGroup === "outfit" || /outfit|kleding|chef|zakelijk|casual|garden|designer/i.test(text)) {
      const outfitMatch = buildOutfitMatch(input, assetName);
      if (outfitMatch && (partGroup === "outfit" || /outfit|chef|zakelijk|casual/i.test(text))) {
        return outfitMatch;
      }
    }
  }

  if (
    (assetType === "mascot" || /globe\s*man/i.test(assetName)) &&
    /vrolijker|blijer|happier|expressie|expression|friendlier/i.test(text)
  ) {
    return buildMascotExpressionMatch(input, assetName);
  }

  if (assetType === "human" && /cartoon|tekenfilm/i.test(text)) {
    return buildHumanCartoonMatch(input);
  }

  if (/voice|stem|voice-over|voiceover/i.test(text)) {
    const projectId = input.turnInput.activeProject?.id ?? input.turnInput.memory.selectedProjectId ?? undefined;
    return buildVoiceMatch(input, projectId ?? undefined);
  }

  if (/render|motion.*video|video.*render/i.test(text)) {
    const projectId = input.turnInput.activeProject?.id ?? input.turnInput.memory.selectedProjectId ?? undefined;
    return buildMotionRenderMatch(input, projectId ?? undefined);
  }

  const actionHint = inferActionHint(input.message);
  if (!actionHint && !partGroup && !morphId) {
    return null;
  }

  const candidates = listAssistantToolsForAsset(assetType);
  const scored = candidates
    .map((tool) => ({ tool, score: scoreTool(tool, { assetType, partGroup, actionHint, morphId }) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return null;
  }

  const best = scored[0].tool;
  const settings = mergeToolSettings(best, {});
  return {
    bestTool: best,
    alternativeTools: scored.slice(1, 4).map((r) => r.tool),
    requiredSettings: best.defaultSettings,
    recommendedSettings: settings,
    preserveConstraints: best.preserveOptions,
    estimatedCredits: estimateCredits(best, input.pricingCatalog),
    warnings: [],
    route: buildAssistantToolRoute(best, settings),
    morphActionId: best.morphActionId,
    actionId: best.actionId,
    blocked: false,
    unavailable: false,
  };
}

export function explainNoToolAvailable(locale: "nl" | "en", assetType?: string): string {
  return nl(
    locale,
    `Ik kan geen geschikte tool vinden voor dit verzoek${assetType ? ` op ${assetType}` : ""}. Kies een onderdeel in de Editor of beschrijf wat je wilt veranderen.`,
    `I cannot find a suitable tool for this request${assetType ? ` on ${assetType}` : ""}. Select a part in the Editor or describe what you want to change.`
  );
}
