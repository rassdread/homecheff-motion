import type { MotionActionPresetId } from "@/types/motion-action-presets";
import { getMotionActionPreset } from "@/lib/motion-action-presets";
import type { AssistantContextSnapshot } from "@/lib/assistant-context-layer";
import type { AssistantExecutionChain, AssistantExecutionChainStep } from "@/types/assistant-producer-plan";

function isNl(locale?: string): boolean {
  return !locale || locale.startsWith("nl");
}

export function buildGoalCelebrationExecutionChain(
  snapshot: AssistantContextSnapshot,
  locale?: string
): AssistantExecutionChain {
  const nl = isNl(locale);
  const character = snapshot.library.characters[0];
  const outfit = snapshot.library.fusionOutputs.find((row) =>
    `${row.assetName} ${row.promptSummary ?? ""}`.toLowerCase().includes("outfit")
  );
  const location = snapshot.library.assets.find((row) =>
    `${row.assetName} ${row.promptSummary ?? ""}`.toLowerCase().includes("stadion")
  );

  const steps: AssistantExecutionChainStep[] = [
    {
      order: 1,
      label: nl ? "Personage vinden" : "Find character",
      actionId: "open_asset",
      assetId: character?.registryAssetId,
      assetName: character?.assetName,
      status: character ? "found" : "missing",
    },
    {
      order: 2,
      label: nl ? "Outfit vinden" : "Find outfit",
      actionId: "prepare_outfit",
      assetId: outfit?.registryAssetId,
      assetName: outfit?.assetName,
      status: outfit ? "found" : "prepare",
    },
    {
      order: 3,
      label: nl ? "Stadion vinden" : "Find stadium",
      actionId: "prepare_location",
      assetId: location?.registryAssetId,
      assetName: location?.assetName,
      status: location ? "found" : "prepare",
    },
    {
      order: 4,
      label: nl ? "Motion-plan bouwen" : "Build motion plan",
      actionId: "create_motion_video",
      status: "prepare",
    },
    {
      order: 5,
      label: nl ? "Wizard openen" : "Open wizard",
      actionId: "create_motion_video",
      status: "prepare",
    },
  ];

  return {
    goal: nl ? "Doelpuntvideo voorbereiden" : "Prepare goal celebration video",
    steps,
    readyToOpenWizard: Boolean(character),
    requiresConfirmation: true,
    suggestedRoute: "/animate/instant",
  };
}

export function buildExecutionChainForPreset(
  presetId: MotionActionPresetId,
  snapshot: AssistantContextSnapshot,
  locale?: string
): AssistantExecutionChain | null {
  const preset = getMotionActionPreset(presetId);
  if (!preset) {
    return null;
  }
  if (presetId === "goal_celebration" || preset.category === "sports") {
    return buildGoalCelebrationExecutionChain(snapshot, locale);
  }
  const nl = isNl(locale);
  const character = snapshot.library.characters[0];
  return {
    goal: preset.title,
    steps: [
      {
        order: 1,
        label: nl ? "Personage vinden" : "Find character",
        actionId: "open_asset",
        assetId: character?.registryAssetId,
        assetName: character?.assetName,
        status: character ? "found" : "missing",
      },
      {
        order: 2,
        label: nl ? "Motion wizard openen" : "Open motion wizard",
        actionId: "create_motion_video",
        status: "prepare",
      },
    ],
    readyToOpenWizard: Boolean(character),
    requiresConfirmation: true,
    suggestedRoute: "/animate/instant",
  };
}

export function executionChainSummary(chain: AssistantExecutionChain, locale?: string): string {
  const nl = isNl(locale);
  const found = chain.steps.filter((step) => step.status === "found").length;
  const missing = chain.steps.filter((step) => step.status === "missing").length;
  return nl
    ? `Ik kan ${found} asset(s) direct hergebruiken en ${missing} stap(pen) voorbereiden voordat de wizard opent.`
    : `I can reuse ${found} asset(s) directly and prepare ${missing} step(s) before opening the wizard.`;
}
