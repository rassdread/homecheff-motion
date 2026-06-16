import type { AssistantInterpretation } from "@/types/assistant-interpretation";
import type { AssistantStudioContext } from "@/types/assistant-studio-brain";
import type { ProducerProductionPlan, ProducerPlanStep } from "@/types/assistant-producer-plan";

function isNl(locale?: string): boolean {
  return !locale || locale.startsWith("nl");
}

function step(
  order: number,
  id: string,
  title: string,
  module: ProducerPlanStep["module"],
  status: ProducerPlanStep["status"] = "pending",
  missingAssets?: string[]
): ProducerPlanStep {
  return {
    order,
    id,
    title,
    module,
    status,
    missingAssets,
  };
}

export function buildProducerProductionPlan(input: {
  message: string;
  interpretation: AssistantInterpretation;
  studio: AssistantStudioContext;
  locale?: string;
}): ProducerProductionPlan {
  const nl = isNl(input.locale);
  const intent = input.interpretation.detectedIntent;
  const hasCharacter = input.studio.characters.length > 0;

  if (intent === "studio_story" || /promotie|promotion|homecheff/i.test(input.message)) {
    const steps: ProducerPlanStep[] = [
      step(1, "story", nl ? "Verhaal maken" : "Create story", "studio"),
      step(
        2,
        "characters",
        nl ? "Personages kiezen" : "Choose characters",
        "characters",
        hasCharacter ? "ready" : "blocked",
        hasCharacter ? undefined : [nl ? "personage" : "character"]
      ),
      step(3, "voice", nl ? "Voice-over bepalen" : "Plan voice-over", "studio"),
      step(4, "video", nl ? "Video genereren" : "Generate video", "motion"),
      step(5, "publish", nl ? "TikTok-versie maken" : "Prepare TikTok version", "publish"),
    ];
    return {
      goal: input.interpretation.understoodGoal,
      steps,
      estimatedCredits: hasCharacter ? 18 : 42,
      estimatedRenderCount: 1,
      estimatedAssetGenerations: hasCharacter ? 1 : 4,
      reuseSavingsPercent: hasCharacter ? 35 : 0,
      expectedOutcome: nl ? "Promotievideo met story + export" : "Promotional video with story + export",
    };
  }

  if (intent === "mascot_variant") {
    const steps: ProducerPlanStep[] = [
      step(
        1,
        "source",
        nl ? "Bron mascotte kiezen" : "Pick source mascot",
        "library",
        hasCharacter ? "ready" : "blocked",
        hasCharacter ? undefined : [nl ? "mascotte" : "mascot"]
      ),
      step(2, "variant", nl ? "Variant ontwerpen" : "Design variant", "editor"),
      step(3, "motion_ready", nl ? "Animatieklaar maken (optioneel)" : "Make motion-ready (optional)", "characters"),
    ];
    return {
      goal: input.interpretation.understoodGoal,
      steps,
      estimatedCredits: hasCharacter ? 8 : 22,
      estimatedRenderCount: 0,
      estimatedAssetGenerations: hasCharacter ? 1 : 2,
      reuseSavingsPercent: hasCharacter ? 80 : 0,
      expectedOutcome: nl ? "Nieuwe mascotte-variant in bibliotheek" : "New mascot variant in library",
    };
  }

  if (intent === "create_motion_video" || intent === "motion_video") {
    const steps: ProducerPlanStep[] = [
      step(
        1,
        "character",
        nl ? "Personage vinden" : "Find character",
        "characters",
        hasCharacter ? "ready" : "blocked",
        hasCharacter ? undefined : [nl ? "personage" : "character"]
      ),
      step(2, "scene", nl ? "Scene / preset kiezen" : "Pick scene / preset", "motion"),
      step(3, "render", nl ? "Video genereren" : "Generate video", "motion"),
    ];
    return {
      goal: input.interpretation.understoodGoal,
      steps,
      estimatedCredits: hasCharacter ? 12 : 28,
      estimatedRenderCount: 1,
      estimatedAssetGenerations: hasCharacter ? 0 : 2,
      reuseSavingsPercent: hasCharacter ? 80 : 0,
      expectedOutcome: nl ? "Korte actieclip" : "Short action clip",
    };
  }

  if (intent === "publish_export" || intent === "publish_help") {
    return {
      goal: input.interpretation.understoodGoal,
      steps: [
        step(1, "select", nl ? "Video kiezen" : "Select video", "library"),
        step(2, "subtitles", nl ? "Ondertitels / taal" : "Subtitles / language", "publish"),
        step(3, "export", nl ? "Export voorbereiden" : "Prepare export", "publish"),
      ],
      estimatedCredits: 4,
      estimatedRenderCount: 0,
      estimatedAssetGenerations: 0,
      expectedOutcome: nl ? "Publicatieklare export" : "Publish-ready export",
    };
  }

  return {
    goal: input.interpretation.understoodGoal,
    steps: [
      step(1, "clarify", nl ? "Richting kiezen" : "Pick direction", "studio"),
      step(2, "prepare", nl ? "Assets voorbereiden" : "Prepare assets", "library"),
      step(3, "execute", nl ? "Workflow openen" : "Open workflow", "studio"),
    ],
    estimatedCredits: 10,
    estimatedRenderCount: 0,
    estimatedAssetGenerations: 1,
  };
}
