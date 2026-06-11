import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import {
  buildInheritedTraits,
  createInitialFusionPlan,
  defaultPreservationSettings,
} from "@/lib/editor-fusion-plan";
import type { EditorFusionIntent, EditorFusionPlan } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type ParsedFusionDirectorRequest = {
  rawPrompt: string;
  intent: EditorFusionIntent;
  fusionStrength: number;
  userInstructions: string;
  detectedAge?: number;
  detectedProfession?: string;
  detectedMascotStyle?: string;
  isSimulation: boolean;
};

type FusionIntentRule = {
  intent: EditorFusionIntent;
  patterns: RegExp[];
  defaultStrength?: number;
};

const INTENT_RULES: FusionIntentRule[] = [
  {
    intent: "outfit_from_reference",
    patterns: [/wear (?:this|the) outfit/, /make me wear/, /outfit from reference/, /add logo to (?:apron|jacket)/],
  },
  {
    intent: "character_fusion",
    patterns: [/combine (?:these|the) characters/, /character fusion/, /merge (?:these|the) characters/],
  },
  {
    intent: "human_into_mascot",
    patterns: [/turn (?:me|him|her) into a mascot/, /human into mascot/, /make (?:me|him|her) a mascot/],
  },
  {
    intent: "mascot_into_human",
    patterns: [
      /turn globe man into (?:a )?realistic human/,
      /mascot into human/,
      /humanize (?:the )?mascot/,
      /realistic human version/,
    ],
    defaultStrength: 70,
  },
  {
    intent: "animal_fusion",
    patterns: [/combine (?:this|the) (?:wolf|dog|cat|eagle|horse)/, /animal fusion/, /wolf and eagle/],
  },
  {
    intent: "animal_human_fusion",
    patterns: [/give my dog my eyes/, /dog with (?:my|human) (?:eyes|face|traits)/, /animal.*human fusion/],
  },
  {
    intent: "pet_customization",
    patterns: [/customize (?:my|the) pet/, /pet outfit/, /add sunglasses to (?:my|the) dog/],
  },
  {
    intent: "fantasy_creature",
    patterns: [/fantasy creature/, /dragon.*wolf/, /create a creature/],
  },
  {
    intent: "product_family",
    patterns: [/premium version/, /product family/, /luxury version of this product/],
  },
  {
    intent: "ad_composition",
    patterns: [/ad composition/, /campaign creative/, /instagram post with product/],
  },
  {
    intent: "how_will_i_look",
    patterns: [/how will i look at \d+/, /show me at \d+ years old/, /look at (?:60|70|75|80)/],
    defaultStrength: 60,
  },
  {
    intent: "life_timeline",
    patterns: [/life timeline/, /\+10 years/, /age timeline/],
  },
  {
    intent: "genetic_blend",
    patterns: [/genetic blend/, /inherit.*from (?:mother|father|parents)/],
  },
  {
    intent: "future_child",
    patterns: [/what would my (?:daughter|son|child) look like/, /generate a (?:son|daughter) from/],
  },
  {
    intent: "future_professions",
    patterns: [/turn me into an astronaut/, /future profession/, /visualize myself as a chef/],
  },
  {
    intent: "future_home",
    patterns: [/show my house after/, /luxury renovation/, /future home/],
  },
  {
    intent: "product_branding",
    patterns: [/product.*branding/, /add logo to product/],
  },
];

export function detectFusionIntentFromPrompt(prompt: string): EditorFusionIntent {
  const lower = prompt.toLowerCase();
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((p) => p.test(lower))) {
      return rule.intent;
    }
  }
  if (/combine|merge|fusion|mix/.test(lower)) {
    return "custom_composition";
  }
  return "custom_composition";
}

export function parseFusionDirectorRequest(prompt: string): ParsedFusionDirectorRequest {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();
  const intent = detectFusionIntentFromPrompt(trimmed);
  const rule = INTENT_RULES.find((r) => r.intent === intent);
  const ageMatch = lower.match(/(?:at|age)\s*(\d{2})/);
  const professionMatch = lower.match(
    /(?:as an?|into an?)\s+(astronaut|chef|designer|gardener|viking|knight|scientist|athlete)/
  );
  const normalized = normalizeFusionIntent(intent);
  const isSimulation = [
    "how_will_i_look",
    "life_timeline",
    "genetic_blend",
    "future_child",
    "future_professions",
    "future_home",
  ].includes(normalized);

  return {
    rawPrompt: trimmed,
    intent: normalized,
    fusionStrength: rule?.defaultStrength ?? 50,
    userInstructions: trimmed,
    detectedAge: ageMatch ? Number(ageMatch[1]) : undefined,
    detectedProfession: professionMatch?.[1],
    isSimulation,
  };
}

export function buildFusionPlanFromDirectorRequest(
  document: EditorCanvasDocument,
  parsed: ParsedFusionDirectorRequest
): EditorFusionPlan {
  const plan = createInitialFusionPlan(document, parsed.intent);
  const settings: EditorFusionPlan["generationSettings"] = { ...plan.generationSettings };
  if (parsed.detectedAge !== undefined) {
    settings.targetAge = parsed.detectedAge;
  }
  if (parsed.detectedProfession) {
    settings.profession = parsed.detectedProfession;
  }
  return {
    ...plan,
    fusionStrength: parsed.fusionStrength,
    userInstructions: parsed.userInstructions,
    inheritedTraits: buildInheritedTraits(parsed.intent),
    preservation: defaultPreservationSettings(parsed.intent),
    generationSettings: settings,
    simulationDisclaimer: parsed.isSimulation ? plan.simulationDisclaimer : undefined,
  };
}
