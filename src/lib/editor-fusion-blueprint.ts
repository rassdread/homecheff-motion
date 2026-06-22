/**
 * Workflow-specific Fusion Blueprint builders.
 */

import { fusionIntentDefinition, normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import { activePreservationRules } from "@/lib/editor-fusion-plan";
import { summarizeReferenceProfile } from "@/lib/editor-fusion-reference-profile";
import type {
  FusionBlueprint,
  FusionBlueprintTraitSource,
  ReferenceAnalysisProfile,
} from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent, EditorFusionPlan } from "@/types/editor-instruction-studio";

function createBlueprintId(): string {
  return `fusion_bp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function refKey(index: number): FusionBlueprintTraitSource {
  if (index === 0) return "reference_a";
  if (index === 1) return "reference_b";
  return `reference_${index + 1}`;
}

function profileByRole(
  profiles: ReferenceAnalysisProfile[],
  roleId?: string
): ReferenceAnalysisProfile | undefined {
  if (roleId) {
    return profiles.find((p) => p.roleId === roleId || p.role === roleId);
  }
  return undefined;
}

function characterFusionBlueprint(
  profiles: ReferenceAnalysisProfile[],
  plan: EditorFusionPlan
): FusionBlueprint {
  const a = profiles[0];
  const b = profiles[1];
  const traitAssignments: Record<string, FusionBlueprintTraitSource> = {
    eyes: refKey(0),
    hair: refKey(0),
    skinTone: "blend",
    nose: refKey(1),
    mouth: refKey(1),
    jawline: "blend",
    clothing: refKey(0),
    accessories: refKey(0),
    pose: "harmonized",
    lighting: "harmonized",
    background: "new",
    style: "blend",
  };

  const renderInstructions = [
    "Generate a new cohesive character by blending analyzed traits from both references.",
    a ? `Reference A (${a.name ?? a.role ?? "A"}): ${summarizeReferenceProfile(a)}` : "",
    b ? `Reference B (${b.name ?? b.role ?? "B"}): ${summarizeReferenceProfile(b)}` : "",
    `Fusion strength: ${plan.fusionStrength}%.`,
    "Do not use generic inheritance — apply the specific analyzed traits listed above.",
  ].filter(Boolean);

  return {
    id: createBlueprintId(),
    workflowType: plan.intent,
    createdAt: new Date().toISOString(),
    references: profiles.map((p, i) => ({
      referenceId: p.referenceId,
      role: p.role,
      roleId: p.roleId,
      name: p.name,
      summary: summarizeReferenceProfile(p) || `Reference ${i + 1}`,
    })),
    traitAssignments,
    renderInstructions,
    preservationRules: activePreservationRules(plan),
    styleNotes: [
      a?.styleDNA?.visualStyle ? `Style A: ${a.styleDNA.visualStyle}` : "",
      b?.styleDNA?.visualStyle ? `Style B: ${b.styleDNA.visualStyle}` : "",
    ].filter(Boolean),
    simulationDisclaimer: plan.simulationDisclaimer,
  };
}

function animalHumanFusionBlueprint(
  profiles: ReferenceAnalysisProfile[],
  plan: EditorFusionPlan
): FusionBlueprint {
  const animal = profileByRole(profiles, "animal") ?? profiles.find((p) => p.objectType === "animal") ?? profiles[0];
  const human = profileByRole(profiles, "human") ?? profileByRole(profiles, "person") ?? profiles[1];

  return {
    id: createBlueprintId(),
    workflowType: plan.intent,
    createdAt: new Date().toISOString(),
    references: profiles.map((p) => ({
      referenceId: p.referenceId,
      role: p.role,
      roleId: p.roleId,
      name: p.name,
      summary: summarizeReferenceProfile(p),
    })),
    traitAssignments: {
      fur: animal?.referenceId ?? refKey(0),
      animalEyes: animal?.referenceId ?? refKey(0),
      animalEars: animal?.referenceId ?? refKey(0),
      snout: animal?.referenceId ?? refKey(0),
      humanEyes: human?.referenceId ?? refKey(1),
      humanFace: human?.referenceId ?? refKey(1),
      humanHair: human?.referenceId ?? refKey(1),
      pose: "harmonized",
      style: "blend",
    },
    renderInstructions: [
      "Blend animal and human references using analyzed fur, facial, and pose traits.",
      animal ? `Animal: ${summarizeReferenceProfile(animal)}` : "",
      human ? `Human: ${summarizeReferenceProfile(human)}` : "",
    ].filter(Boolean),
    preservationRules: activePreservationRules(plan),
    styleNotes: [],
    simulationDisclaimer: plan.simulationDisclaimer,
  };
}

function geneticFamilyBlueprint(
  profiles: ReferenceAnalysisProfile[],
  plan: EditorFusionPlan,
  mode: "genetic_blend" | "future_child"
): FusionBlueprint {
  const parentA = profileByRole(profiles, "mother") ?? profileByRole(profiles, "parent_a") ?? profiles[0];
  const parentB = profileByRole(profiles, "father") ?? profileByRole(profiles, "parent_b") ?? profiles[1];

  return {
    id: createBlueprintId(),
    workflowType: plan.intent,
    createdAt: new Date().toISOString(),
    references: profiles.map((p) => ({
      referenceId: p.referenceId,
      role: p.role,
      roleId: p.roleId,
      name: p.name,
      summary: summarizeReferenceProfile(p),
    })),
    traitAssignments: {
      eyeColor: "blend",
      faceShape: "blend",
      hairColor: "blend",
      skinTone: "blend",
      proportions: "blend",
      expression: mode === "future_child" ? "new" : "blend",
    },
    renderInstructions: [
      mode === "future_child"
        ? "Simulate a plausible child using analyzed parental phenotypes."
        : "Blend parental genetic traits from analyzed references.",
      parentA ? `Parent A: ${summarizeReferenceProfile(parentA)}` : "",
      parentB ? `Parent B: ${summarizeReferenceProfile(parentB)}` : "",
      "Use specific eye, hair, skin, and face-shape cues from analysis — not generic family blending.",
    ].filter(Boolean),
    preservationRules: activePreservationRules(plan),
    styleNotes: [],
    simulationDisclaimer: plan.simulationDisclaimer,
  };
}

function outfitTransferBlueprint(
  profiles: ReferenceAnalysisProfile[],
  plan: EditorFusionPlan
): FusionBlueprint {
  const person = profileByRole(profiles, "person") ?? profileByRole(profiles, "character") ?? profiles[0];
  const outfit = profileByRole(profiles, "outfit") ?? profileByRole(profiles, "clothing_item") ?? profiles[1];

  const clothingLabels = outfit?.clothing.length
    ? outfit.clothing
    : outfit?.parts.filter((p) => p.category === "clothing").map((p) => p.label) ?? [];

  return {
    id: createBlueprintId(),
    workflowType: plan.intent,
    createdAt: new Date().toISOString(),
    references: profiles.map((p) => ({
      referenceId: p.referenceId,
      role: p.role,
      roleId: p.roleId,
      name: p.name,
      summary: summarizeReferenceProfile(p),
    })),
    traitAssignments: {
      clothing: outfit?.referenceId ?? refKey(1),
      face: person?.referenceId ?? refKey(0),
      hair: person?.referenceId ?? refKey(0),
      pose: person?.referenceId ?? refKey(0),
      accessories: outfit?.referenceId ?? refKey(1),
    },
    renderInstructions: [
      "Transfer analyzed outfit segments onto the person reference.",
      person ? `Person (preserve): ${summarizeReferenceProfile(person)}` : "",
      outfit
        ? `Outfit source: ${clothingLabels.join(", ") || summarizeReferenceProfile(outfit)}`
        : "",
      "Use detected clothing segments and colors — no generic placeholder garments.",
    ].filter(Boolean),
    preservationRules: ["face", "identity", "hair", "pose", "body_proportions"],
    styleNotes: outfit?.styleDNA?.colorTheme ? [`Outfit palette: ${outfit.styleDNA.colorTheme}`] : [],
  };
}

function mascotBlueprint(
  profiles: ReferenceAnalysisProfile[],
  plan: EditorFusionPlan,
  direction: "human_into_mascot" | "mascot_into_human"
): FusionBlueprint {
  const source = profiles[0];
  return {
    id: createBlueprintId(),
    workflowType: plan.intent,
    createdAt: new Date().toISOString(),
    references: profiles.map((p) => ({
      referenceId: p.referenceId,
      role: p.role,
      roleId: p.roleId,
      name: p.name,
      summary: summarizeReferenceProfile(p),
    })),
    traitAssignments: {
      face: source?.referenceId ?? refKey(0),
      colors: source?.referenceId ?? refKey(0),
      accessories: source?.referenceId ?? refKey(0),
      clothing: source?.referenceId ?? refKey(0),
      style: source?.referenceId ?? refKey(0),
      personality: "blend",
    },
    renderInstructions: [
      direction === "human_into_mascot"
        ? "Transform analyzed human traits into a mascot while preserving identity cues."
        : "Transform analyzed mascot traits into a believable human while preserving brand identity.",
      source ? `Source: ${summarizeReferenceProfile(source)}` : "",
    ].filter(Boolean),
    preservationRules: activePreservationRules(plan),
    styleNotes: source?.styleDNA?.brandIdentity
      ? [`Brand: ${source.styleDNA.brandIdentity}`]
      : [],
  };
}

function productBlueprint(
  profiles: ReferenceAnalysisProfile[],
  plan: EditorFusionPlan,
  mode: "product_branding" | "product_packaging" | "product_family"
): FusionBlueprint {
  const product = profileByRole(profiles, "product") ?? profiles[0];
  const branding = profileByRole(profiles, "logo") ?? profileByRole(profiles, "brand");

  return {
    id: createBlueprintId(),
    workflowType: plan.intent,
    createdAt: new Date().toISOString(),
    references: profiles.map((p) => ({
      referenceId: p.referenceId,
      role: p.role,
      roleId: p.roleId,
      name: p.name,
      summary: summarizeReferenceProfile(p),
    })),
    traitAssignments: {
      productForm: product?.referenceId ?? refKey(0),
      material: product?.referenceId ?? refKey(0),
      labelAreas: product?.referenceId ?? refKey(0),
      logo: branding?.referenceId ?? "primary",
      logoPlacement: "harmonized",
      perspective: "harmonized",
      lighting: "harmonized",
      shadow: "harmonized",
    },
    renderInstructions: [
      mode === "product_branding"
        ? "Place logo asset 1:1 using analyzed product surfaces — do not reinterpret the logo."
        : mode === "product_packaging"
          ? "Apply analyzed product form to packaging composition."
          : "Generate product family variants from analyzed product DNA.",
      product ? `Product analysis: ${summarizeReferenceProfile(product)}` : "",
      branding ? "Logo: use original asset exactly — analyze placement surface only." : "",
    ].filter(Boolean),
    preservationRules: ["logo", "brand_identity", "product_form"],
    styleNotes: product?.styleDNA?.visualStyle ? [product.styleDNA.visualStyle] : [],
  };
}

function personBackgroundBlueprint(
  profiles: ReferenceAnalysisProfile[],
  plan: EditorFusionPlan
): FusionBlueprint {
  const person = profileByRole(profiles, "person") ?? profiles[0];
  const background = profileByRole(profiles, "background") ?? profileByRole(profiles, "environment") ?? profiles[1];

  return {
    id: createBlueprintId(),
    workflowType: plan.intent,
    createdAt: new Date().toISOString(),
    references: profiles.map((p) => ({
      referenceId: p.referenceId,
      role: p.role,
      roleId: p.roleId,
      name: p.name,
      summary: summarizeReferenceProfile(p),
    })),
    traitAssignments: {
      identity: person?.referenceId ?? refKey(0),
      face: person?.referenceId ?? refKey(0),
      clothing: person?.referenceId ?? refKey(0),
      background: background?.referenceId ?? refKey(1),
      lighting: "harmonized",
      perspective: "harmonized",
    },
    renderInstructions: [
      "Composite person onto analyzed background with matched lighting and perspective.",
      person ? `Person: ${summarizeReferenceProfile(person)}` : "",
      background ? `Background: ${background.background ?? summarizeReferenceProfile(background)}` : "",
    ].filter(Boolean),
    preservationRules: ["face", "identity", "body_proportions"],
    styleNotes: [],
  };
}

function defaultBlueprint(
  profiles: ReferenceAnalysisProfile[],
  plan: EditorFusionPlan
): FusionBlueprint {
  return {
    id: createBlueprintId(),
    workflowType: plan.intent,
    createdAt: new Date().toISOString(),
    references: profiles.map((p) => ({
      referenceId: p.referenceId,
      role: p.role,
      roleId: p.roleId,
      name: p.name,
      summary: summarizeReferenceProfile(p),
    })),
    traitAssignments: Object.fromEntries(
      ["eyes", "hair", "face", "style", "lighting"].map((trait, index) => [
        trait,
        refKey(index % profiles.length),
      ])
    ),
    renderInstructions: [
      "Generate from HomeCheff Fusion Blueprint using analyzed reference traits.",
      ...profiles.map((p, i) => `Reference ${i + 1}: ${summarizeReferenceProfile(p)}`),
    ],
    preservationRules: activePreservationRules(plan),
    styleNotes: [],
    simulationDisclaimer: plan.simulationDisclaimer,
  };
}

export function buildFusionBlueprint(input: {
  intent: EditorFusionIntent;
  plan: EditorFusionPlan;
  profiles: ReferenceAnalysisProfile[];
}): FusionBlueprint {
  const intent = normalizeFusionIntent(input.intent);
  const { profiles, plan } = input;
  fusionIntentDefinition(intent);

  switch (intent) {
    case "character_fusion":
      return characterFusionBlueprint(profiles, plan);
    case "animal_human_fusion":
      return animalHumanFusionBlueprint(profiles, plan);
    case "genetic_blend":
      return geneticFamilyBlueprint(profiles, plan, "genetic_blend");
    case "future_child":
      return geneticFamilyBlueprint(profiles, plan, "future_child");
    case "outfit_from_reference":
    case "person_outfit":
      return outfitTransferBlueprint(profiles, plan);
    case "human_into_mascot":
      return mascotBlueprint(profiles, plan, "human_into_mascot");
    case "mascot_into_human":
      return mascotBlueprint(profiles, plan, "mascot_into_human");
    case "person_background":
      return personBackgroundBlueprint(profiles, plan);
    case "product_branding":
    case "product_packaging":
    case "product_family":
      return productBlueprint(profiles, plan, intent);
    case "life_timeline":
      return {
        ...defaultBlueprint(profiles, plan),
        renderInstructions: [
          "Generate life timeline stages using consistent analyzed identity across ages.",
          ...profiles.map((p) => summarizeReferenceProfile(p)),
        ],
      };
    default:
      return defaultBlueprint(profiles, plan);
  }
}

export function formatFusionBlueprintTraitLines(blueprint: FusionBlueprint): string[] {
  return Object.entries(blueprint.traitAssignments).map(
    ([trait, source]) => `- ${trait}: ${source}`
  );
}
