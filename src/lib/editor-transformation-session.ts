import { fusionIntentDefinition, normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import { interpolateTransformationStrengths } from "@/lib/editor-generation-cost";
import type {
  EditorTransformationPreserveRule,
  EditorTransformationSession,
  EditorTransformationSessionType,
  EditorTransformationStep,
  EditorTransformationStepCount,
  SequenceConsistencyScore,
} from "@/types/editor-generation-access";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export const DEFAULT_TRANSFORMATION_PRESERVE: EditorTransformationPreserveRule[] = [
  "face_identity",
  "pose",
  "background",
  "lighting",
  "composition",
];

export function fusionIntentToTransformationType(intent: EditorFusionIntent): EditorTransformationSessionType | null {
  const normalized = normalizeFusionIntent(intent);
  switch (normalized) {
    case "life_timeline":
    case "how_will_i_look":
      return "AGE_TIMELINE";
    case "human_into_mascot":
      return "HUMAN_TO_MASCOT";
    case "mascot_into_human":
      return "MASCOT_TO_HUMAN";
    case "animal_fusion":
    case "animal_human_fusion":
    case "fantasy_creature":
      return "FANTASY_CREATURE";
    case "outfit_from_reference":
    case "person_outfit":
      return "OUTFIT_TRANSFORMATION";
    case "product_family":
    case "product_branding":
      return "PRODUCT_EVOLUTION";
    case "future_professions":
      return "STYLE_EVOLUTION";
    case "campaign_variant":
      return "BRAND_EVOLUTION";
    default:
      return null;
  }
}

export function isTransformationEligibleIntent(intent: EditorFusionIntent): boolean {
  return fusionIntentToTransformationType(intent) !== null || fusionIntentDefinition(intent).category !== "marketing_content";
}

export function createTransformationSessionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTransformationStepId(): string {
  return `txstep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildTransformationSteps(input: {
  stepCount: EditorTransformationStepCount;
  type: EditorTransformationSessionType;
  targetDescription: string;
}): EditorTransformationStep[] {
  const strengths = interpolateTransformationStrengths(input.stepCount);
  return strengths.map((strength, index) => ({
    id: createTransformationStepId(),
    index,
    strength,
    instruction: buildTransformationStepInstruction({
      type: input.type,
      stepIndex: index,
      stepCount: input.stepCount,
      strength,
      targetDescription: input.targetDescription,
      preserveRules: DEFAULT_TRANSFORMATION_PRESERVE,
    }),
    status: "pending" as const,
    costEstimate: 0.04,
  }));
}

export function createTransformationSession(input: {
  type: EditorTransformationSessionType;
  sourceImageUrl: string;
  targetReferenceUrls?: string[];
  stepCount?: EditorTransformationStepCount;
  targetDescription?: string;
  preserveRules?: EditorTransformationPreserveRule[];
}): EditorTransformationSession {
  const stepCount = input.stepCount ?? 3;
  const strengths = interpolateTransformationStrengths(stepCount);
  const now = new Date().toISOString();
  const targetDescription = input.targetDescription ?? "target transformation";
  return {
    id: createTransformationSessionId(),
    type: input.type,
    sourceImageUrl: input.sourceImageUrl,
    targetReferenceUrls: input.targetReferenceUrls ?? [],
    stepCount,
    strengthCurve: strengths,
    preserveRules: input.preserveRules ?? [...DEFAULT_TRANSFORMATION_PRESERVE],
    motionReady: false,
    upscaleMode: "none",
    steps: buildTransformationSteps({
      stepCount,
      type: input.type,
      targetDescription,
    }),
    createdAt: now,
    updatedAt: now,
  };
}

export function buildTransformationStepInstruction(input: {
  type: EditorTransformationSessionType;
  stepIndex: number;
  stepCount: number;
  strength: number;
  targetDescription: string;
  preserveRules: EditorTransformationPreserveRule[];
  userInstruction?: string;
}): string {
  const preserve = input.preserveRules.map((rule) => rule.replace(/_/g, " ")).join(", ");
  const phase =
    input.strength <= 20 ? "subtle"
    : input.strength <= 50 ? "medium"
    : input.strength <= 80 ? "strong"
    : "near-final";

  return [
    `Step ${input.stepIndex + 1} of ${input.stepCount} (${input.type.replace(/_/g, " ").toLowerCase()}).`,
    `Apply a ${input.strength}% ${phase} transformation toward ${input.targetDescription}.`,
    `Preserve: ${preserve}.`,
    input.userInstruction?.trim() ? `User note: ${input.userInstruction.trim()}` : "",
    input.strength < 100 ? "Do not fully reach the final target form yet." : "Reach the final target form.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildTransformationStepPrompt(input: {
  session: EditorTransformationSession;
  step: EditorTransformationStep;
  userInstruction?: string;
  referenceAssignments?: import("@/types/editor-reference-metadata").EditorReferenceAssignment[];
}): string {
  const { session, step } = input;
  const metadataBlock =
    input.referenceAssignments && input.referenceAssignments.length > 0
      ? [
          "",
          "REFERENCE METADATA",
          ...input.referenceAssignments.map((a) => {
            const parts = [
              a.metadata?.view,
              a.metadata?.familyType,
              a.metadata?.clothingType,
              a.metadata?.animalType,
            ]
              .filter(Boolean)
              .join(", ");
            return parts ? `- ${a.role}: ${parts}` : `- ${a.role}`;
          }),
        ]
      : [];
  return [
    "TRANSFORMATION SEQUENCE STEP",
    buildTransformationStepInstruction({
      type: session.type,
      stepIndex: step.index,
      stepCount: session.stepCount,
      strength: step.strength,
      targetDescription: session.type.replace(/_/g, " ").toLowerCase(),
      preserveRules: session.preserveRules,
      userInstruction: input.userInstruction,
    }),
    "",
    "SOURCE IMAGE",
    session.sourceImageUrl,
    session.targetReferenceUrls.length > 0
      ? `TARGET REFERENCES: ${session.targetReferenceUrls.join(", ")}`
      : "",
    "",
    "QUALITY",
    "- Keep consistent aspect ratio, framing, background, and subject centering.",
    "- Avoid large pose jumps or sudden identity drift between steps.",
    ...metadataBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

export function estimateTransformationUpscaleCredits(session: EditorTransformationSession): number {
  switch (session.upscaleMode) {
    case "final_only":
      return 1;
    case "all_steps":
      return session.stepCount;
    default:
      return 0;
  }
}

export function scoreTransformationSequenceConsistency(
  session: EditorTransformationSession
): SequenceConsistencyScore {
  const completed = session.steps.filter((step) => step.status === "completed" && step.resultUrl);
  const ratio = session.stepCount > 0 ? completed.length / session.stepCount : 0;
  const base = Math.round(ratio * 100);
  const driftPenalty = session.stepCount >= 6 ? 5 : 0;
  const overall = Math.max(0, Math.min(100, base - driftPenalty));
  return {
    overall,
    faceConsistency: overall,
    poseConsistency: Math.max(0, overall - 3),
    backgroundConsistency: Math.max(0, overall - 2),
    lightingConsistency: Math.max(0, overall - 4),
    styleConsistency: Math.max(0, overall - 1),
  };
}

export function markTransformationMotionReady(
  session: EditorTransformationSession
): EditorTransformationSession {
  const score = scoreTransformationSequenceConsistency(session);
  return {
    ...session,
    motionReady: score.overall >= 60 && session.steps.every((s) => s.status === "completed" || s.status === "pending"),
    updatedAt: new Date().toISOString(),
  };
}

export function orderedTransformationResultUrls(session: EditorTransformationSession): string[] {
  return session.steps
    .filter((step) => step.resultUrl)
    .sort((a, b) => a.index - b.index)
    .map((step) => step.resultUrl!);
}

export function parseTransformationDirectorRequest(prompt: string): {
  stepCount: EditorTransformationStepCount;
  targetDescription: string;
  motionIntent: boolean;
} {
  const lower = prompt.toLowerCase();
  const stepMatch = lower.match(/(\d)[\s-]*step/);
  const stepCount = (stepMatch ? Number(stepMatch[1]) : 3) as EditorTransformationStepCount;
  const normalizedStepCount = ([1, 3, 4, 6] as const).includes(stepCount as 1 | 3 | 4 | 6)
    ? stepCount
    : 3;
  return {
    stepCount: normalizedStepCount,
    targetDescription: prompt.trim(),
    motionIntent: /motion|animation|video|morph/.test(lower),
  };
}
